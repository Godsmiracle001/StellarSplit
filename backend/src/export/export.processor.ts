import { Process, Processor } from "@nestjs/bull";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bull";
import { ExportService, ExportQueueJobData } from "./export.service";

@Processor("export")
@Injectable()
export class ExportProcessor {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(private readonly exportService: ExportService) {}

  @Process("process")
  async handleExport(job: Job<ExportQueueJobData>): Promise<void> {
    this.logger.log(`Processing export job ${job.data.jobId}`);
    await this.exportService.processQueuedExport(job.data.jobId, job);
  }
}
