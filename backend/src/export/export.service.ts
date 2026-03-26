import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { InjectRepository } from "@nestjs/typeorm";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { Job, Queue } from "bull";
import { LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { CreateExportDto, CreateExportTemplateDto, ExportFilterDto, ScheduleExportDto } from "./dto/export-request.dto";
import { CsvGeneratorService } from "./csv-generator.service";
import { EmailService } from "./email.service";
import { ExportFailureCode, ExportFormat, ExportJob, ExportStatus, ReportType } from "./entities/export-job.entity";
import { ExportTemplate } from "./entities/export-template.entity";
import { OfxGeneratorService } from "./ofx-generator.service";
import { PdfGeneratorService } from "./pdf-generator.service";
import { QuickBooksGeneratorService } from "./quickbooks-generator.service";
import { ExportDownloadDescriptor, StorageService } from "./storage.service";

export interface ExportQueueJobData { jobId: string; }
interface PartnerEntry { partnerId: string; partnerName: string; totalOwedToYou: number; totalYouOwe: number; netBalance: number; expenseCount: number; lastInteraction: Date; }
interface MonthEntry { month: string; totalExpenses: number; totalAmount: number; expenseCount: number; categories: Record<string, number>; settlements: number; settlementAmount: number; }

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    @InjectQueue("export") private readonly exportQueue: Queue<ExportQueueJobData>,
    @InjectRepository(ExportJob) private readonly exportJobRepository: Repository<ExportJob>,
    @InjectRepository(ExportTemplate) private readonly exportTemplateRepository: Repository<ExportTemplate>,
    private readonly configService: ConfigService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly quickBooksGeneratorService: QuickBooksGeneratorService,
    private readonly ofxGeneratorService: OfxGeneratorService,
    private readonly emailService: EmailService,
    private readonly storageService: StorageService,
    private readonly csvGeneratorService: CsvGeneratorService,
  ) {}

  async createExport(userId: string, dto: CreateExportDto): Promise<ExportJob> {
    this.validateExportRequest(dto);
    const eligibility = await this.checkEligibility(userId);
    if (!eligibility.canExport) throw new BadRequestException("Monthly export limit reached");
    const exportJob = this.exportJobRepository.create({
      userId,
      format: dto.format,
      reportType: dto.reportType,
      filters: dto.filters ?? {},
      status: ExportStatus.PENDING,
      expiresAt: this.getExpiryDate(),
      emailRecipient: dto.emailRecipient,
      isTaxCompliant: dto.isTaxCompliant ?? false,
      taxYear: dto.taxYear,
      progress: 0,
      retryCount: 0,
      maxRetries: this.getMaxRetries(),
      currentStep: "queued",
      metadata: { settings: dto.settings ?? {}, userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone, cancellationRequested: false },
    });
    const savedJob = await this.exportJobRepository.save(exportJob);
    await this.enqueueExportJob(savedJob);
    return this.getExportStatus(savedJob.id, userId);
  }

  async retryExport(jobId: string, userId: string): Promise<ExportJob> {
    const job = await this.getExportStatus(jobId, userId);
    if (![ExportStatus.FAILED, ExportStatus.CANCELLED, ExportStatus.EXPIRED].includes(job.status)) {
      throw new BadRequestException(`Export ${jobId} cannot be retried from status ${job.status}`);
    }
    await this.exportJobRepository.update(jobId, {
      status: ExportStatus.PENDING,
      progress: 0,
      retryCount: 0,
      currentStep: "queued",
      errorMessage: null as never,
      failureCode: null,
      failureReason: null,
      queueJobId: null,
      startedAt: null,
      completedAt: null,
      emailSent: false,
      emailSentAt: null,
      fileName: null as never,
      fileUrl: null as never,
      s3Key: null as never,
      fileSize: 0,
      recordCount: 0,
      summary: null as never,
      expiresAt: this.getExpiryDate(),
      metadata: { ...(job.metadata ?? {}), cancellationRequested: false } as Record<string, any>,
    });
    await this.enqueueExportJob({ ...job, id: jobId } as ExportJob);
    return this.getExportStatus(jobId, userId);
  }

  async cancelExport(jobId: string, userId: string): Promise<ExportJob> {
    const job = await this.getExportStatus(jobId, userId);
    if (![ExportStatus.PENDING, ExportStatus.PROCESSING].includes(job.status)) {
      throw new BadRequestException(`Export ${jobId} cannot be cancelled from status ${job.status}`);
    }
    if (job.status === ExportStatus.PENDING && job.queueJobId) {
      const queueJob = await this.exportQueue.getJob(job.queueJobId);
      if (queueJob) await queueJob.remove();
    } else {
      await this.exportJobRepository.update(jobId, {
        metadata: { ...(job.metadata ?? {}), cancellationRequested: true } as Record<string, any>,
        currentStep: "cancellation_requested",
      });
    }
    await this.failJob(jobId, ExportStatus.CANCELLED, ExportFailureCode.CANCELLED, "Export cancelled by user", 0, "cancelled");
    return this.getExportStatus(jobId, userId);
  }

  async getExportStatus(jobId: string, userId: string): Promise<ExportJob> {
    const job = await this.exportJobRepository.findOne({ where: { id: jobId, userId } });
    if (!job) throw new NotFoundException(`Export job ${jobId} not found`);
    return job;
  }

  async listExports(userId: string, page = 1, limit = 20): Promise<{ jobs: ExportJob[]; total: number; page: number; totalPages: number; }> {
    const safePage = Number.isFinite(page) ? Math.max(1, Number(page)) : 1;
    const safeLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Number(limit))) : 20;
    const [jobs, total] = await this.exportJobRepository.findAndCount({
      where: { userId },
      order: { createdAt: "DESC" },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });
    return { jobs, total, page: safePage, totalPages: Math.ceil(total / safeLimit) };
  }

  async downloadExport(jobId: string, userId: string): Promise<{ fileName: string; download: ExportDownloadDescriptor; }> {
    const job = await this.exportJobRepository.findOne({ where: { id: jobId, userId } });
    if (!job) throw new NotFoundException("Export not found");
    if (job.status !== ExportStatus.COMPLETED) throw new BadRequestException("Export is not ready for download");
    if (new Date() > job.expiresAt) {
      await this.expireJob(job, ExportFailureCode.FILE_EXPIRED, "Export file has expired");
      throw new BadRequestException("Export file has expired");
    }
    if (!job.s3Key || !job.fileName) {
      await this.failJob(job.id, ExportStatus.FAILED, ExportFailureCode.FILE_NOT_FOUND, "Export file metadata is missing", job.progress, "file_missing");
      throw new NotFoundException("Export file metadata is missing");
    }
    try {
      const download = await this.storageService.getDownloadDescriptor(job.s3Key);
      return { fileName: job.fileName, download };
    } catch (error) {
      await this.failJob(job.id, ExportStatus.FAILED, ExportFailureCode.FILE_NOT_FOUND, error instanceof Error ? error.message : "Export file is unavailable", job.progress, "file_missing");
      throw new NotFoundException("Export file is unavailable");
    }
  }

  async createTemplate(userId: string, dto: CreateExportTemplateDto): Promise<ExportTemplate> {
    if (dto.isDefault) await this.exportTemplateRepository.update({ userId, isDefault: true }, { isDefault: false });
    const template = this.exportTemplateRepository.create({ userId, ...dto });
    return this.exportTemplateRepository.save(template);
  }

  async listTemplates(userId: string): Promise<ExportTemplate[]> {
    return this.exportTemplateRepository.find({ where: { userId }, order: { isDefault: "DESC", createdAt: "DESC" } });
  }

  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    const result = await this.exportTemplateRepository.delete({ id: templateId, userId });
    if (result.affected === 0) throw new NotFoundException("Template not found");
  }

  async scheduleExport(userId: string, dto: ScheduleExportDto): Promise<ExportTemplate> {
    const template = await this.createTemplate(userId, {
      name: dto.name ?? `Scheduled ${dto.reportType} Export`,
      description: `Automated export scheduled with cron: ${dto.scheduleCron}`,
      format: dto.format,
      reportType: dto.reportType,
      filters: dto.filters ?? new ExportFilterDto(),
      settings: dto.settings,
      isDefault: false,
      isScheduled: true,
      scheduleCron: dto.scheduleCron,
    });
    this.scheduleRecurringExport(template);
    return template;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredExports(): Promise<void> {
    const expiredJobs = await this.exportJobRepository.find({
      where: { expiresAt: LessThanOrEqual(new Date()), status: ExportStatus.COMPLETED },
    });
    for (const job of expiredJobs) {
      try {
        await this.expireJob(job, ExportFailureCode.FILE_EXPIRED, "Export file expired and was cleaned up");
        this.logger.log(`Cleaned up expired export ${job.id}`);
      } catch (error) {
        this.logger.error(`Failed to clean up export ${job.id}`, error);
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processScheduledExports(): Promise<void> {
    const templates = await this.exportTemplateRepository.find({ where: { isScheduled: true } });
    const now = new Date();
    for (const template of templates) {
      if (!this.shouldRunScheduledExport(template, now)) continue;
      try {
        await this.createExport(template.userId, {
          format: template.format,
          reportType: template.reportType,
          filters: template.filters,
          settings: template.settings ?? undefined,
          emailRecipient: template.emailRecipients?.[0] ?? undefined,
          isTaxCompliant: template.settings?.includeTaxFields ?? false,
        });
        this.logger.log(`Queued scheduled export from template ${template.id}`);
      } catch (error) {
        this.logger.error(`Failed to queue scheduled export ${template.id}`, error);
      }
    }
  }

  async processQueuedExport(jobId: string, queueJob?: Job<ExportQueueJobData>): Promise<void> {
    const exportJob = await this.exportJobRepository.findOne({ where: { id: jobId } });
    if (!exportJob) throw new NotFoundException(`Export job ${jobId} not found`);
    await this.updateJobProgress(jobId, ExportStatus.PROCESSING, 5, "preparing", {
      startedAt: new Date(),
      queueJobId: queueJob ? String(queueJob.id) : exportJob.queueJobId,
      retryCount: queueJob?.attemptsMade ?? exportJob.retryCount,
    });
    try {
      await this.assertNotCancelled(jobId);
      await this.updateJobProgress(jobId, ExportStatus.PROCESSING, 20, "collecting_data");
      const data = await this.fetchExportData(exportJob.userId, exportJob.filters ?? {}, exportJob.reportType);
      await this.assertNotCancelled(jobId);
      await this.updateJobProgress(jobId, ExportStatus.PROCESSING, 55, "generating_file");
      const { fileBuffer, fileName } = await this.generateFile(exportJob, data);
      await this.assertNotCancelled(jobId);
      await this.updateJobProgress(jobId, ExportStatus.PROCESSING, 80, "uploading_file");
      const uploadResult = await this.storageService.uploadFile(fileBuffer, fileName, exportJob.userId);
      const recordCount = this.countRecords(data);
      const summary = data.summary ?? this.calculateSummary(data);
      await this.exportJobRepository.update(jobId, {
        status: ExportStatus.COMPLETED,
        progress: 100,
        currentStep: "completed",
        fileName,
        fileUrl: uploadResult.url,
        s3Key: uploadResult.key,
        fileSize: fileBuffer.length,
        recordCount,
        summary,
        completedAt: new Date(),
        errorMessage: null as never,
        failureCode: null,
        failureReason: null,
        expiresAt: this.getExpiryDate(),
      });
      if (exportJob.emailRecipient) await this.sendExportEmail(jobId);
      this.logger.log(`Export ${jobId} completed successfully`);
    } catch (error) {
      const failure = this.classifyExportError(error);
      await this.failJob(jobId, failure.status, failure.code, failure.message, failure.progress, failure.step);
      throw error;
    }
  }

  async checkEligibility(userId: string): Promise<{ canExport: boolean; exportsThisMonth: number; monthlyLimit: number; remainingExports: number; }> {
    const monthlyLimit = parseInt(this.configService.get<string>("EXPORT_MONTHLY_LIMIT") ?? "10", 10);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const exportsThisMonth = await this.exportJobRepository.count({
      where: { userId, createdAt: MoreThanOrEqual(startOfMonth) },
    });
    const remainingExports = Math.max(0, monthlyLimit - exportsThisMonth);
    return { canExport: remainingExports > 0, exportsThisMonth, monthlyLimit, remainingExports };
  }

  private validateExportRequest(dto: CreateExportDto): void {
    if (dto.filters?.startDate && dto.filters?.endDate) {
      const start = new Date(dto.filters.startDate);
      const end = new Date(dto.filters.endDate);
      if (start > end) throw new BadRequestException("Start date cannot be after end date");
    }
  }

  private async enqueueExportJob(job: ExportJob): Promise<void> {
    try {
      const queuedJob = await this.exportQueue.add("process", { jobId: job.id }, {
        jobId: job.id,
        attempts: job.maxRetries,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
      await this.exportJobRepository.update(job.id, {
        status: ExportStatus.PENDING,
        queueJobId: String(queuedJob.id),
        currentStep: "queued",
      });
    } catch (error) {
      this.logger.error(`Failed to enqueue export ${job.id}`, error);
      await this.failJob(job.id, ExportStatus.FAILED, ExportFailureCode.QUEUE_ERROR, error instanceof Error ? error.message : "Failed to queue export", 0, "queue_error");
      throw new BadRequestException("Unable to queue export");
    }
  }

  private async generateFile(job: ExportJob, data: any): Promise<{ fileBuffer: Buffer; fileName: string; }> {
    try {
      switch (job.format) {
        case ExportFormat.CSV:
          return { fileBuffer: await this.csvGeneratorService.generateCsv(data, job), fileName: this.generateFileName(job, "csv") };
        case ExportFormat.PDF:
          return { fileBuffer: await this.pdfGeneratorService.generatePdf(data, job), fileName: this.generateFileName(job, "pdf") };
        case ExportFormat.JSON:
          return { fileBuffer: Buffer.from(JSON.stringify(data, null, 2)), fileName: this.generateFileName(job, "json") };
        case ExportFormat.QBO:
          return { fileBuffer: await this.quickBooksGeneratorService.generateQbo(data, job), fileName: this.generateFileName(job, "qbo") };
        case ExportFormat.OFX:
          return { fileBuffer: await this.ofxGeneratorService.generateOfx(data, job), fileName: this.generateFileName(job, "ofx") };
        case ExportFormat.XLSX:
          return { fileBuffer: await this.csvGeneratorService.generateXlsx(data, job), fileName: this.generateFileName(job, "xlsx") };
        default:
          throw new BadRequestException(`Unsupported export format: ${job.format}`);
      }
    } catch (error) {
      throw new Error(`File generation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async fetchExportData(userId: string, filters: ExportFilterDto, reportType: ReportType): Promise<any> {
    const expenses: any[] = [];
    const settlements: any[] = [];
    let filteredExpenses = expenses;
    if (filters.participants?.length) {
      filteredExpenses = filteredExpenses.filter((expense) => expense.participants.some((participant: any) => filters.participants!.includes(participant.userId)));
    }
    if (filters.paidByMe) filteredExpenses = filteredExpenses.filter((expense) => expense.paidBy === userId);
    if (filters.owedToMe) {
      filteredExpenses = filteredExpenses.filter((expense) => expense.participants.some((participant: any) => participant.userId === userId && participant.amount > 0));
    }
    switch (reportType) {
      case ReportType.MONTHLY_SUMMARY:
        return this.formatMonthlySummary(filteredExpenses, settlements);
      case ReportType.ANNUAL_TAX_REPORT:
        return this.formatAnnualTaxReport(filteredExpenses, settlements);
      case ReportType.CATEGORY_BREAKDOWN:
        return this.formatCategoryBreakdown(filteredExpenses, settlements);
      case ReportType.PARTNER_WISE_SUMMARY:
        return this.formatPartnerWiseSummary(userId, filteredExpenses, settlements);
      case ReportType.PAYMENT_HISTORY:
        return this.formatPaymentHistory(filteredExpenses, settlements);
      default:
        return { expenses: filteredExpenses, settlements, metadata: { totalExpenses: filteredExpenses.length, totalSettlements: settlements.length, generatedAt: new Date().toISOString() } };
    }
  }

  private formatMonthlySummary(expenses: any[], settlements: any[]) {
    const monthlyData: Record<string, MonthEntry> = {};
    const ensureMonth = (month: string): void => {
      if (!monthlyData[month]) monthlyData[month] = { month, totalExpenses: 0, totalAmount: 0, expenseCount: 0, categories: {}, settlements: 0, settlementAmount: 0 };
    };
    expenses.forEach((expense) => {
      const month = expense.createdAt.toISOString().substring(0, 7);
      ensureMonth(month);
      monthlyData[month].totalExpenses += expense.amount;
      monthlyData[month].expenseCount++;
      monthlyData[month].categories[expense.category] = (monthlyData[month].categories[expense.category] ?? 0) + expense.amount;
    });
    settlements.forEach((settlement) => {
      const month = settlement.createdAt.toISOString().substring(0, 7);
      ensureMonth(month);
      monthlyData[month].settlements++;
      monthlyData[month].settlementAmount += settlement.amount;
    });
    return { monthlyData: Object.values(monthlyData), summary: this.calculateSummary({ expenses, settlements }), metadata: { reportType: "MONTHLY_SUMMARY", generatedAt: new Date().toISOString() } };
  }

  private formatAnnualTaxReport(expenses: any[], settlements: any[]) {
    const taxData = {
      businessExpenses: expenses.filter((expense) => this.isBusinessExpense(expense)),
      personalExpenses: expenses.filter((expense) => !this.isBusinessExpense(expense)),
      incomeFromSettlements: settlements.filter((settlement) => settlement.direction === "incoming"),
      paymentsMade: settlements.filter((settlement) => settlement.direction === "outgoing"),
      deductibleAmount: this.calculateDeductibleAmount(expenses),
      taxableIncome: this.calculateTaxableIncome(settlements),
    };
    return {
      ...taxData,
      summary: {
        totalBusinessExpenses: taxData.businessExpenses.reduce((sum: number, expense: any) => sum + expense.amount, 0),
        totalPersonalExpenses: taxData.personalExpenses.reduce((sum: number, expense: any) => sum + expense.amount, 0),
        totalIncome: taxData.incomeFromSettlements.reduce((sum: number, settlement: any) => sum + settlement.amount, 0),
        totalPayments: taxData.paymentsMade.reduce((sum: number, settlement: any) => sum + settlement.amount, 0),
        deductibleAmount: taxData.deductibleAmount,
        taxableIncome: taxData.taxableIncome,
      },
      metadata: { reportType: "ANNUAL_TAX_REPORT", generatedAt: new Date().toISOString(), taxDisclaimer: "Consult with a tax professional for accurate tax filing" },
    };
  }

  private formatCategoryBreakdown(expenses: any[], settlements: any[]) {
    const categoryData: Record<string, { category: string; totalAmount: number; expenseCount: number; averageAmount: number; percentage: number; }> = {};
    expenses.forEach((expense) => {
      if (!categoryData[expense.category]) categoryData[expense.category] = { category: expense.category, totalAmount: 0, expenseCount: 0, averageAmount: 0, percentage: 0 };
      categoryData[expense.category].totalAmount += expense.amount;
      categoryData[expense.category].expenseCount++;
    });
    const totalAmount = Object.values(categoryData).reduce((sum, category) => sum + category.totalAmount, 0);
    Object.values(categoryData).forEach((category) => {
      category.averageAmount = category.totalAmount / category.expenseCount;
      category.percentage = totalAmount > 0 ? (category.totalAmount / totalAmount) * 100 : 0;
    });
    return { categories: Object.values(categoryData), summary: { totalAmount, totalExpenses: expenses.length, categoryCount: Object.keys(categoryData).length }, metadata: { reportType: "CATEGORY_BREAKDOWN", generatedAt: new Date().toISOString() }, expenses, settlements };
  }

  private async formatPartnerWiseSummary(userId: string, expenses: any[], settlements: any[]) {
    const partnerData: Record<string, PartnerEntry> = {};
    expenses.forEach((expense) => {
      expense.participants.forEach((participant: any) => {
        if (participant.userId === userId) return;
        const partnerId = participant.userId;
        if (!partnerData[partnerId]) {
          partnerData[partnerId] = { partnerId, partnerName: participant.user?.name ?? "Unknown", totalOwedToYou: 0, totalYouOwe: 0, netBalance: 0, expenseCount: 0, lastInteraction: expense.createdAt };
        }
        if (expense.paidBy === userId) partnerData[partnerId].totalOwedToYou += participant.amount;
        else if (expense.paidBy === partnerId) partnerData[partnerId].totalYouOwe += participant.amount;
        partnerData[partnerId].expenseCount++;
        partnerData[partnerId].lastInteraction = new Date(Math.max(new Date(partnerData[partnerId].lastInteraction).getTime(), new Date(expense.createdAt).getTime()));
      });
    });
    settlements.forEach((settlement) => {
      const partnerId = settlement.counterpartyId;
      if (!partnerData[partnerId]) {
        partnerData[partnerId] = { partnerId, partnerName: "Unknown", totalOwedToYou: 0, totalYouOwe: 0, netBalance: 0, expenseCount: 0, lastInteraction: settlement.createdAt };
      }
      if (settlement.direction === "incoming") partnerData[partnerId].totalOwedToYou -= settlement.amount;
      else partnerData[partnerId].totalYouOwe -= settlement.amount;
    });
    for (const partnerId of Object.keys(partnerData)) partnerData[partnerId].netBalance = partnerData[partnerId].totalOwedToYou - partnerData[partnerId].totalYouOwe;
    return {
      partners: Object.values(partnerData),
      summary: {
        totalOwedToYou: Object.values(partnerData).reduce((sum, partner) => sum + partner.totalOwedToYou, 0),
        totalYouOwe: Object.values(partnerData).reduce((sum, partner) => sum + partner.totalYouOwe, 0),
        netPosition: Object.values(partnerData).reduce((sum, partner) => sum + partner.netBalance, 0),
        partnerCount: Object.keys(partnerData).length,
      },
      metadata: { reportType: "PARTNER_WISE_SUMMARY", generatedAt: new Date().toISOString() },
      expenses,
      settlements,
    };
  }

  private formatPaymentHistory(expenses: any[], settlements: any[]) {
    const timeline = [
      ...expenses.map((expense) => ({ type: "EXPENSE" as const, date: expense.createdAt, amount: expense.amount, currency: expense.currency, description: expense.description, category: expense.category, participants: expense.participants.length, id: expense.id })),
      ...settlements.map((settlement) => ({ type: "SETTLEMENT" as const, date: settlement.createdAt, amount: settlement.amount, currency: settlement.currency, description: settlement.description ?? "Payment settlement", direction: settlement.direction, counterparty: settlement.counterpartyName, id: settlement.id })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return {
      timeline,
      summary: {
        totalExpenses: expenses.length,
        totalSettlements: settlements.length,
        totalAmount: timeline.reduce((sum, item) => sum + item.amount, 0),
        periodCovered: timeline.length > 0 ? `${new Date(timeline[timeline.length - 1].date).toISOString().split("T")[0]} to ${new Date(timeline[0].date).toISOString().split("T")[0]}` : "No data",
      },
      metadata: { reportType: "PAYMENT_HISTORY", generatedAt: new Date().toISOString() },
      expenses,
      settlements,
    };
  }

  private calculateSummary(data: { expenses?: any[]; settlements?: any[] }) {
    const expenses = data.expenses ?? [];
    const settlements = data.settlements ?? [];
    const currencyBreakdown: Record<string, number> = {};
    const categoryBreakdown: Record<string, number> = {};
    let totalAmount = 0;
    expenses.forEach((expense: any) => {
      totalAmount += expense.amount;
      currencyBreakdown[expense.currency] = (currencyBreakdown[expense.currency] ?? 0) + expense.amount;
      categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] ?? 0) + expense.amount;
    });
    const totalSettlements = settlements.reduce((sum: number, settlement: any) => sum + settlement.amount, 0);
    return { totalAmount, totalExpenses: expenses.length, totalSettlements: settlements.length, settlementAmount: totalSettlements, currencyBreakdown, categoryBreakdown };
  }

  private countRecords(data: any): number {
    if (Array.isArray(data)) return data.length;
    if (data?.expenses || data?.settlements) return (data.expenses?.length ?? 0) + (data.settlements?.length ?? 0);
    return Object.values(data ?? {}).reduce<number>((count, value) => count + (Array.isArray(value) ? value.length : 0), 0);
  }

  private generateFileName(job: ExportJob, extension: string): string {
    const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const timestamp = Date.now();
    const prefixMap: Partial<Record<ReportType, string>> = {
      [ReportType.MONTHLY_SUMMARY]: "monthly-summary",
      [ReportType.ANNUAL_TAX_REPORT]: `tax-report-${job.taxYear ?? new Date().getFullYear()}`,
      [ReportType.CATEGORY_BREAKDOWN]: "category-breakdown",
      [ReportType.PARTNER_WISE_SUMMARY]: "partner-summary",
      [ReportType.PAYMENT_HISTORY]: "payment-history",
    };
    const prefix = prefixMap[job.reportType] ?? "export";
    return `${prefix}-${date}-${timestamp}.${extension}`;
  }

  private getExpiryDate(): Date {
    const days = parseInt(this.configService.get<string>("EXPORT_EXPIRY_DAYS") ?? "7", 10);
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  private getMaxRetries(): number {
    return parseInt(this.configService.get<string>("EXPORT_MAX_RETRIES") ?? "3", 10);
  }

  private async updateJobProgress(jobId: string, status: ExportStatus, progress: number, currentStep: string, extra: Partial<ExportJob> = {}): Promise<void> {
    await this.exportJobRepository.update(jobId, { status, progress, currentStep, ...extra });
  }

  private async failJob(jobId: string, status: ExportStatus, failureCode: ExportFailureCode, failureReason: string, progress: number, currentStep: string): Promise<void> {
    await this.exportJobRepository.update(jobId, {
      status,
      progress,
      currentStep,
      errorMessage: failureReason,
      failureCode,
      failureReason,
      completedAt: status === ExportStatus.FAILED || status === ExportStatus.CANCELLED ? new Date() : null,
    });
  }

  private async expireJob(job: ExportJob, code: ExportFailureCode, reason: string): Promise<void> {
    if (job.s3Key) await this.storageService.deleteFile(job.s3Key);
    await this.exportJobRepository.update(job.id, {
      status: ExportStatus.EXPIRED,
      progress: 100,
      currentStep: "expired",
      failureCode: code,
      failureReason: reason,
      errorMessage: reason,
      fileUrl: null as never,
      s3Key: null as never,
    });
  }

  private async assertNotCancelled(jobId: string): Promise<void> {
    const job = await this.exportJobRepository.findOne({ where: { id: jobId } });
    if (!job) throw new Error("Export job no longer exists");
    if (job.status === ExportStatus.CANCELLED) throw new Error("Export cancelled by user");
    if (job.metadata?.cancellationRequested) throw new Error("Export cancellation requested");
  }

  private async sendExportEmail(jobId: string): Promise<void> {
    const job = await this.exportJobRepository.findOne({ where: { id: jobId } });
    if (!job || !job.emailRecipient || job.emailSent) return;
    if (!job.fileName) return;
    try {
      const appUrl = this.configService.get<string>("APP_URL") ?? "http://localhost:3000";
      await this.emailService.sendExportEmail(job.emailRecipient, job.fileName, `${appUrl}/api/v1/export/download/${job.id}`, job.format, job.reportType, job.expiresAt);
      await this.exportJobRepository.update(jobId, { emailSent: true, emailSentAt: new Date() });
    } catch (error) {
      this.logger.error(`Failed to send email for export ${jobId}`, error);
      await this.exportJobRepository.update(jobId, {
        failureCode: ExportFailureCode.EMAIL_DELIVERY_FAILED,
        failureReason: error instanceof Error ? error.message : "Export completed but email delivery failed",
      });
    }
  }

  private classifyExportError(error: unknown): { status: ExportStatus; code: ExportFailureCode; message: string; progress: number; step: string; } {
    const message = error instanceof Error ? error.message : "Unknown export error";
    if (message.includes("cancel")) return { status: ExportStatus.CANCELLED, code: ExportFailureCode.CANCELLED, message, progress: 0, step: "cancelled" };
    if (message.includes("generation")) return { status: ExportStatus.FAILED, code: ExportFailureCode.GENERATION_FAILED, message, progress: 55, step: "generating_file" };
    if (message.includes("upload")) return { status: ExportStatus.FAILED, code: ExportFailureCode.STORAGE_UPLOAD_FAILED, message, progress: 80, step: "uploading_file" };
    return { status: ExportStatus.FAILED, code: ExportFailureCode.DATA_FETCH_FAILED, message, progress: 20, step: "collecting_data" };
  }

  private calculateDeductibleAmount(expenses: any[]): number {
    const deductible = ["business", "office", "travel", "equipment", "education", "professional"];
    return expenses.filter((expense) => deductible.includes(expense.category)).reduce((sum: number, expense: any) => sum + expense.amount, 0);
  }

  private calculateTaxableIncome(settlements: any[]): number {
    return settlements.filter((settlement) => settlement.direction === "incoming").reduce((sum: number, settlement: any) => sum + settlement.amount, 0);
  }

  private isBusinessExpense(expense: any): boolean {
    return ["business", "office", "travel", "equipment", "education", "professional"].includes(expense.category);
  }

  private scheduleRecurringExport(template: ExportTemplate): void {
    this.logger.log(`Scheduled export template ${template.id} with cron ${template.scheduleCron}`);
  }

  private shouldRunScheduledExport(template: ExportTemplate, now: Date): boolean {
    if (template.reportType === ReportType.MONTHLY_SUMMARY) return now.getDate() === 1 && now.getHours() === 9;
    return false;
  }
}
