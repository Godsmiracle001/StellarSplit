import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DataSource } from "typeorm";
import { AnalyticsService } from "./analytics.service";

@Injectable()
export class AnalyticsScheduler {
  private readonly logger = new Logger(AnalyticsScheduler.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly analyticsService: AnalyticsService,
  ) {}

  // Refresh materialized views hourly to keep analytics data relatively fresh
  @Cron(CronExpression.EVERY_HOUR)
  async refreshMaterializedViews() {
    try {
      this.logger.debug(
        "Refreshing analytics materialized views (concurrently)",
      );
      // Refresh concurrently where possible to avoid locking reads in production
      await this.dataSource.query(
        "REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_spending_trends_monthly",
      );
      // Category view now has a unique index (migration added); refresh concurrently as well
      await this.dataSource.query(
        "REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_category_spend",
      );
      this.logger.debug("Analytics materialized views refreshed");
    } catch (err) {
      this.logger.error("Failed to refresh materialized views", err as any);
    }
  }

  // Schedule monthly generation of reports for previous month on the 1st at 02:00 UTC
  @Cron("0 2 1 * *")
  async enqueueMonthlyReports() {
    try {
      // compute previous month YYYY-MM
      const now = new Date();
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const month = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

      this.logger.debug(`Enqueuing monthly reports for month=${month}`);

      const users = await this.dataSource.query("SELECT id FROM users");
      for (const u of users) {
        // Best-effort: enqueue per user; analyticsService will create report records
        await this.analyticsService.enqueueExport({
          type: "monthly-report",
          month,
          userId: u.id,
          format: "csv",
        } as any);
      }

      this.logger.debug(`Enqueued monthly reports for ${users.length} users`);
    } catch (err) {
      this.logger.error("Failed to enqueue monthly reports", err as any);
    }
  }

  // Daily cleanup of old reports (runs at 03:00 UTC)
  @Cron("0 3 * * *")
  async cleanupOldReports() {
    try {
      const retentionDays = parseInt(
        process.env.ANALYTICS_REPORT_RETENTION_DAYS || "30",
        10,
      );
      this.logger.debug(
        `Running cleanup of analytics reports older than ${retentionDays} days`,
      );
      await this.analyticsService.cleanupOldReports(retentionDays);
      this.logger.debug("Cleanup job completed");
    } catch (err) {
      this.logger.error("Failed to cleanup old reports", err as any);
    }
  }
}
