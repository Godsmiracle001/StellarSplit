import { Injectable, Inject, Logger } from "@nestjs/common";
import { Repository, DataSource } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Payment } from "../entities/payment.entity";
import { Participant } from "../entities/participant.entity";
import { SpendingTrendsDto } from "./dto/spending-trends.dto";
import { Cache } from "cache-manager";
import { CACHE_MANAGER } from "@nestjs/cache-manager/dist/cache.constants";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { AnalyticsReport } from "./reports.entity";
import { ExportRequestDto } from "./dto/export.dto";

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Payment) private paymentRepository: Repository<Payment>,
    @InjectRepository(Participant)
    private participantRepository: Repository<Participant>,
    @InjectRepository(AnalyticsReport)
    private reportsRepository: Repository<AnalyticsReport>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectQueue("analytics-export") private readonly exportQueue: Queue,
    private readonly dataSource: DataSource,
  ) {}

  private getTruncUnit(granularity: "daily" | "weekly" | "monthly") {
    switch (granularity) {
      case "daily":
        return "day";
      case "weekly":
        return "week";
      default:
        return "month";
    }
  }

  async getSpendingTrends(dto: SpendingTrendsDto) {
    const from = dto.dateFrom ? new Date(dto.dateFrom) : null;
    const to = dto.dateTo ? new Date(dto.dateTo) : null;
    const granularity = dto.granularity || "monthly";
    const truncUnit = this.getTruncUnit(granularity);

    const cacheKey = `analytics:spending-trends:${dto.userId || "all"}:${dto.dateFrom || "null"}:${dto.dateTo || "null"}:${granularity}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const qb = this.paymentRepository
      .createQueryBuilder("payment")
      .select(`date_trunc('${truncUnit}', payment."createdAt")`, "period")
      .addSelect("SUM(payment.amount::numeric)", "total_spent")
      .addSelect("COUNT(*)", "tx_count")
      .addSelect("AVG(payment.amount::numeric)", "avg_tx_amount")
      .where("payment.status = :status", { status: "confirmed" });

    if (from) {
      qb.andWhere('payment."createdAt" >= :from', { from: from.toISOString() });
    }

    if (to) {
      qb.andWhere('payment."createdAt" <= :to', { to: to.toISOString() });
    }

    if (dto.userId) {
      qb.innerJoin(
        Participant,
        "participant",
        "participant.id = payment.participantId",
      ).andWhere("participant.userId = :userId", { userId: dto.userId });
    }

    qb.groupBy("period").orderBy("period", "ASC");

    const raw = await qb.getRawMany();

    const result = raw.map((r) => ({
      period: r.period,
      totalSpent: Number(r.total_spent),
      transactionCount: Number(r.tx_count),
      avgTransactionAmount: Number(r.avg_tx_amount),
    }));

    // Cache result for a short period to improve performance (ttl seconds)
    await this.cacheManager.set(cacheKey, result, 300);

    return result;
  }

  async invalidateUserCache(userId: string) {
    const prefixes = [
      "analytics:spending-trends",
      "analytics:category-breakdown",
      "analytics:top-partners",
    ];
    const store: any = (this.cacheManager as any).store;
    const client = store?.getClient
      ? store.getClient()
      : store?.getRedisClient
        ? store.getRedisClient()
        : store;

    if (client && client.keys) {
      for (const prefix of prefixes) {
        const pattern = `${prefix}:${userId}:*`;
        try {
          const keys: string[] = await client.keys(pattern);
          for (const k of keys) {
            await client.del(k);
          }
        } catch (err) {
          this.logger.warn(
            "Failed to run redis keys/del; falling back to individual deletions",
            err,
          );
        }
      }
    }

    // Best effort fallbacks
    try {
      await this.cacheManager.del(
        `analytics:spending-trends:${userId}:null:null:monthly`,
      );
      await this.cacheManager.del(
        `analytics:category-breakdown:${userId}:null:null`,
      );
      await this.cacheManager.del(
        `analytics:top-partners:${userId}:null:null:limit=10`,
      );
      this.logger.debug(`Invalidated analytics cache for user ${userId}`);
    } catch (err) {
      this.logger.warn("Failed to delete cache keys via cacheManager.del", err);
    }
  }

  async refreshMaterializedViewsNow() {
    try {
      await this.dataSource.query(
        "REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_spending_trends_monthly",
      );
      await this.dataSource.query(
        "REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_category_spend",
      );
      this.logger.debug("Materialized views refreshed (manual)");
    } catch (err) {
      this.logger.error(
        "Failed to refresh materialized views (manual)",
        err as any,
      );
    }
  }

  async cleanupOldReports(retentionDays = 30) {
    // Delegate to helper to keep test imports isolated
    const { cleanupOldReportsHelper } = require("./cleanup.helper");
    await cleanupOldReportsHelper(
      this.dataSource,
      this.reportsRepository,
      this.logger,
      retentionDays,
    );
  }

  async getCategoryBreakdown(dto: SpendingTrendsDto) {
    const from = dto.dateFrom ? new Date(dto.dateFrom) : null;
    const to = dto.dateTo ? new Date(dto.dateTo) : null;

    const cacheKey = `analytics:category-breakdown:${dto.userId || "all"}:${dto.dateFrom || "null"}:${dto.dateTo || "null"}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const qb = this.dataSource
      .createQueryBuilder()
      .select("COALESCE(i.category, 'uncategorized')", "category")
      .addSelect("SUM(i.totalPrice::numeric)", "amount")
      .from("items", "i")
      .innerJoin("splits", "sp", 'i."splitId" = sp.id')
      .innerJoin("participants", "p", 'p."splitId" = sp.id')
      .groupBy("category")
      .orderBy("amount", "DESC");

    if (from)
      qb.andWhere('sp."createdAt" >= :from', { from: from.toISOString() });
    if (to) qb.andWhere('sp."createdAt" <= :to', { to: to.toISOString() });
    if (dto.userId) qb.andWhere('p."userId" = :userId', { userId: dto.userId });

    const raw = await qb.getRawMany();
    const result = raw.map((r: any) => ({
      category: r.category,
      amount: Number(r.amount),
    }));

    await this.cacheManager.set(cacheKey, result, 300);
    return result;
  }

  async getTopPartners(opts: {
    dateFrom?: string;
    dateTo?: string;
    userId?: string;
    limit?: number;
  }) {
    const from = opts.dateFrom ? new Date(opts.dateFrom) : null;
    const to = opts.dateTo ? new Date(opts.dateTo) : null;
    const limit = opts.limit || 10;

    const cacheKey = `analytics:top-partners:${opts.userId || "all"}:${opts.dateFrom || "null"}:${opts.dateTo || "null"}:limit=${limit}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const qb = this.dataSource
      .createQueryBuilder()
      .select('p_other."userId"', "partnerId")
      .addSelect("SUM(payment.amount::numeric)", "totalAmount")
      .addSelect("COUNT(*)", "interactions")
      .from("participants", "p_self")
      .innerJoin(
        "participants",
        "p_other",
        'p_self."splitId" = p_other."splitId"',
      )
      .innerJoin("payments", "payment", 'payment."participantId" = p_other.id')
      .where('p_self."userId" = :userId', { userId: opts.userId })
      .andWhere('p_other."userId" != :userId', { userId: opts.userId })
      .andWhere("payment.status = 'confirmed'")
      .groupBy("partnerId")
      .orderBy("totalAmount", "DESC")
      .limit(limit);

    if (from)
      qb.andWhere('payment."createdAt" >= :from', { from: from.toISOString() });
    if (to) qb.andWhere('payment."createdAt" <= :to', { to: to.toISOString() });

    const raw = await qb.getRawMany();
    const result = raw.map((r: any) => ({
      partnerId: r.partnerid || r.partnerId,
      totalAmount: Number(r.totalamount),
      interactions: Number(r.interactions),
    }));

    await this.cacheManager.set(cacheKey, result, 300);
    return result;
  }

  async getMonthlyReport(month: string, userId?: string) {
    // month expected as YYYY-MM
    const periodStart = `${month}-01`;
    const rows = await this.dataSource.query(
      `SELECT * FROM analytics_spending_trends_monthly WHERE period = date_trunc('month', $1::date) AND user_id = $2`,
      [periodStart, userId || null],
    );

    const categories = await this.dataSource.query(
      `SELECT category, total_by_category FROM analytics_category_spend WHERE period = date_trunc('month', $1::date) AND user_id = $2`,
      [periodStart, userId || null],
    );

    return { trends: rows, categories };
  }

  async enqueueExport(body: ExportRequestDto) {
    // Create a report record
    const report = this.reportsRepository.create({
      userId: body.userId,
      type: body.type,
      params: {
        dateFrom: body.dateFrom,
        dateTo: body.dateTo,
        month: body.month,
      },
      status: "pending",
    });

    let saved = await this.reportsRepository.save(report);

    // Handle unexpected repository behavior where save may not return an id
    if (!saved || !saved.id) {
      const fallbackId = `report-${Date.now()}`;
      saved = { ...report, id: fallbackId } as any;
      // Persist fallback id back to DB if possible
      try {
        await this.reportsRepository.save(saved);
      } catch (err) {
        // ignore -- best effort
      }
    }

    // Add to queue
    await this.exportQueue.add("export", {
      reportId: saved.id,
      type: body.type,
      params: report.params,
      format: body.format,
      userId: body.userId,
    });

    return { id: saved.id, status: saved.status || "pending" };
  }

  async getReportStatus(id: string) {
    const report = await this.reportsRepository.findOne({ where: { id } });
    if (!report) return null;

    // If file is in S3, generate presigned URL
    if (report.filePath && report.filePath.startsWith("s3://")) {
      try {
        const [, bucket, ...rest] = report.filePath.split("/");
        const key = rest.join("/");
        const region = process.env.AWS_REGION;
        const s3Client = new (require("@aws-sdk/client-s3").S3Client)({
          region,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });
        const { GetObjectCommand } = require("@aws-sdk/client-s3");
        const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
        const ttl = parseInt(process.env.REPORT_PRESIGNED_URL_TTL || "900", 10);
        const signedUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({ Bucket: bucket, Key: key }),
          { expiresIn: ttl },
        );
        return { ...report, downloadUrl: signedUrl };
      } catch (err) {
        this.logger.warn("Failed to create presigned url for report", err);
        return report;
      }
    }

    return report;
  }
}
