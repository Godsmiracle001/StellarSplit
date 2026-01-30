import { Processor, Process } from "@nestjs/bull";
import { Job } from "bull";
import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AnalyticsReport } from "./reports.entity";
import { AnalyticsService } from "./analytics.service";
import * as fs from "fs";
import * as path from "path";
import { ConfigService } from "@nestjs/config";
import { streamQueryToCsv } from "./stream.helper";

@Processor("analytics-export")
@Injectable()
export class AnalyticsProcessor {
  private readonly logger = new Logger(AnalyticsProcessor.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    @InjectRepository(AnalyticsReport)
    private readonly reportsRepository: Repository<AnalyticsReport>,
    private readonly configService: ConfigService,
  ) {}

  @Process("export")
  async handleExport(job: Job) {
    const { reportId, type, params, format, userId } = job.data as any;
    this.logger.debug(
      `Processing analytics export job ${job.id} for report ${reportId}`,
    );

    const report = await this.reportsRepository.findOne({
      where: { id: reportId },
    });
    if (!report) {
      this.logger.error(`Report ${reportId} not found`);
      return;
    }

    report.status = "processing";
    await this.reportsRepository.save(report);

    try {
      let data: any;

      switch (type) {
        case "spending-trends":
          data = await this.analyticsService.getSpendingTrends({
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            granularity: params.granularity || "monthly",
            userId,
          });
          break;
        case "category-breakdown":
          data = await this.analyticsService.getCategoryBreakdown({
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            userId,
          });
          break;
        case "top-partners":
          data = await this.analyticsService.getTopPartners({
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            userId,
            limit: params.limit || 10,
          });
          break;
        case "monthly-report":
          data = await this.analyticsService.getMonthlyReport(
            params.month,
            userId,
          );
          break;
        default:
          throw new Error(`Unknown export type ${type}`);
      }

      const exportDir =
        this.configService.get("ANALYTICS_EXPORT_DIR") ||
        path.join(process.cwd(), "tmp", "reports");
      await fs.promises.mkdir(exportDir, { recursive: true });

      const fileName = `${reportId}-${type}-${Date.now()}.${format === "csv" ? "csv" : "pdf"}`;
      const filePath = path.join(exportDir, fileName);

      if (format === "csv") {
        // Stream large CSV exports directly from the DB where possible to avoid OOM
        const shouldStream =
          type === "spending-trends" ||
          type === "category-breakdown" ||
          type === "top-partners" ||
          type === "monthly-report";

        if (shouldStream) {
          try {
            if (
              type === "spending-trends" &&
              (params.granularity || "monthly") === "monthly"
            ) {
              const sql = `SELECT period::text AS period, total_spent::text AS total_spent, tx_count::text AS tx_count, avg_tx_amount::text AS avg_tx_amount FROM analytics_spending_trends_monthly WHERE ($1::date IS NULL OR period >= date_trunc('month', $1::date)) AND ($2::date IS NULL OR period <= date_trunc('month', $2::date)) AND ($3::uuid IS NULL OR user_id = $3) ORDER BY period ASC`;
              await this.streamCsvFromQuery(
                filePath,
                sql,
                [
                  params.dateFrom || null,
                  params.dateTo || null,
                  userId || null,
                ],
                ["period", "total_spent", "tx_count", "avg_tx_amount"],
              );
            } else if (type === "category-breakdown") {
              const sql = `SELECT category, total_by_category::text AS total_by_category FROM analytics_category_spend WHERE ($1::date IS NULL OR period >= date_trunc('month', $1::date)) AND ($2::date IS NULL OR period <= date_trunc('month', $2::date)) AND ($3::uuid IS NULL OR user_id = $3) ORDER BY total_by_category DESC`;
              await this.streamCsvFromQuery(
                filePath,
                sql,
                [
                  params.dateFrom || null,
                  params.dateTo || null,
                  userId || null,
                ],
                ["category", "total_by_category"],
              );
            } else if (type === "top-partners") {
              const sql = `SELECT p_other."userId" AS partnerId, SUM(payment.amount::numeric)::text AS totalAmount, COUNT(*)::text AS interactions FROM participants p_self INNER JOIN participants p_other ON p_self."splitId" = p_other."splitId" INNER JOIN payments payment ON payment."participantId" = p_other.id WHERE p_self."userId" = $1 AND p_other."userId" != $1 AND payment.status = 'confirmed' GROUP BY partnerId ORDER BY totalAmount DESC LIMIT $2`;
              await streamQueryToCsv(
                sql,
                [userId || null, params.limit || 10],
                filePath,
                ["partnerid", "totalamount", "interactions"],
              );
            } else if (type === "monthly-report") {
              // Monthly report contains two sections; stream trends and categories sequentially
              const periodStart = params.month ? `${params.month}-01` : null;
              const sqlTrends = `SELECT period::text AS period, total_spent::text AS total_spent, tx_count::text AS tx_count, avg_tx_amount::text AS avg_tx_amount FROM analytics_spending_trends_monthly WHERE ($1::date IS NULL OR period = date_trunc('month', $1::date)) AND ($2::uuid IS NULL OR user_id = $2) ORDER BY period ASC`;
              await streamQueryToCsv(
                sqlTrends,
                [periodStart, userId || null],
                filePath,
                ["period", "total_spent", "tx_count", "avg_tx_amount"],
                "trends",
              );

              // Add a blank line then categories
              await fs.promises.appendFile(filePath, "\n");

              const sqlCats = `SELECT category, total_by_category::text AS total_by_category FROM analytics_category_spend WHERE ($1::date IS NULL OR period = date_trunc('month', $1::date)) AND ($2::uuid IS NULL OR user_id = $2) ORDER BY total_by_category DESC`;
              await streamQueryToCsv(
                sqlCats,
                [periodStart, userId || null],
                filePath,
                ["category", "total_by_category"],
                "categories",
              );
            } else {
              await this.writeCsvFromData(filePath, data);
            }
          } catch (err) {
            this.logger.warn(
              "Streaming CSV export failed, falling back to in-memory write",
              err as any,
            );
            await this.writeCsvFromData(filePath, data);
          }
        } else {
          await this.writeCsvFromData(filePath, data);
        }
      } else {
        // PDF export: generate a simple PDF with pdfkit
        const PDFDocument = require("pdfkit");
        await new Promise<void>((resolve, reject) => {
          try {
            const doc = new PDFDocument({ autoFirstPage: true });
            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            doc
              .fontSize(18)
              .text(`Analytics Export - ${type}`, { align: "center" });
            doc.moveDown(1);

            if (Array.isArray(data)) {
              if (data.length === 0) {
                doc.fontSize(12).text("No data");
              } else {
                const keys = Array.from(
                  new Set(data.flatMap((r: any) => Object.keys(r))),
                );
                doc.fontSize(12).text(keys.join(" | "));
                doc.moveDown(0.5);
                for (const row of data) {
                  doc
                    .fontSize(10)
                    .text(keys.map((k) => String(row[k] ?? "")).join(" | "));
                }
              }
            } else if (typeof data === "object") {
              for (const sectionKey of Object.keys(data)) {
                doc.addPage();
                doc.fontSize(14).text(sectionKey, { underline: true });
                doc.moveDown(0.5);
                const section = data[sectionKey];
                if (Array.isArray(section)) {
                  if (section.length === 0) {
                    doc.fontSize(12).text("No data");
                  } else {
                    const keys = Array.from(
                      new Set(section.flatMap((r: any) => Object.keys(r))),
                    );
                    doc.fontSize(12).text(keys.join(" | "));
                    doc.moveDown(0.5);
                    for (const row of section) {
                      doc
                        .fontSize(10)
                        .text(
                          keys.map((k) => String(row[k] ?? "")).join(" | "),
                        );
                    }
                  }
                } else {
                  doc.fontSize(12).text(JSON.stringify(section));
                }
              }
            }

            doc.end();
            stream.on("finish", () => resolve());
            stream.on("error", (err) => reject(err));
          } catch (err) {
            reject(err);
          }
        });
      }

      // Optionally upload to S3 if configured
      const bucket = this.configService.get("AWS_S3_BUCKET");
      if (bucket) {
        const region = this.configService.get("AWS_REGION");
        const s3Client = new (require("@aws-sdk/client-s3").S3Client)({
          region,
          credentials: {
            accessKeyId: this.configService.get("AWS_ACCESS_KEY_ID"),
            secretAccessKey: this.configService.get("AWS_SECRET_ACCESS_KEY"),
          },
        });

        const key = `analytics-reports/${fileName}`;
        const fileBody = await fs.promises.readFile(filePath);
        await s3Client.send(
          new (require("@aws-sdk/client-s3").PutObjectCommand)({
            Bucket: bucket,
            Key: key,
            Body: fileBody,
            ContentType: format === "csv" ? "text/csv" : "application/pdf",
          }),
        );

        // Save S3 location and remove local file
        report.filePath = `s3://${bucket}/${key}`;
        report.fileName = fileName;
        try {
          await fs.promises.unlink(filePath);
        } catch (_) {}

        await this.reportsRepository.save(report);
        this.logger.debug(`Export uploaded to s3://${bucket}/${key}`);
      } else {
        report.status = "completed";
        report.filePath = filePath;
        report.fileName = fileName;
        await this.reportsRepository.save(report);

        this.logger.debug(`Export completed: ${filePath}`);
      }
    } catch (err: any) {
      this.logger.error("Export failed", err);
      report.status = "failed";
      report.error = err.message;
      await this.reportsRepository.save(report);
    }
  }

  private async writeCsvFromData(filePath: string, data: any) {
    // Support arrays or an object of arrays (monthly report contains {trends, categories})
    const stream = fs.createWriteStream(filePath, { encoding: "utf8" });

    if (Array.isArray(data)) {
      await this.writeArrayAsCsv(stream, data);
      stream.end();
      return;
    }

    // object -> iterate sections
    for (const key of Object.keys(data)) {
      const section = data[key];
      stream.write(`${key}\n`);
      if (Array.isArray(section)) {
        await this.writeArrayAsCsv(stream, section);
      } else {
        stream.write(`${JSON.stringify(section)}\n`);
      }
      stream.write("\n");
    }

    stream.end();
  }

  // Stream a SQL query to CSV using pg-query-stream to avoid loading the whole result into memory
  private async streamCsvFromQuery(
    filePath: string,
    sql: string,
    params: any[],
    headers: string[],
    sectionLabel?: string,
  ) {
    const { Pool } = require("pg");
    const QueryStream = require("pg-query-stream");

    const pool = new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      user: process.env.DB_USERNAME || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      database: process.env.DB_NAME || "stellarsplit_dev",
    });

    const client = await pool.connect();
    try {
      const qs = new QueryStream(sql, params);
      const dbStream = client.query(qs);

      // If sectionLabel is provided, write a header line with the section name
      if (sectionLabel) {
        await fs.promises.appendFile(filePath, `${sectionLabel}\n`);
      }

      const writeStream = fs.createWriteStream(filePath, {
        flags: "a",
        encoding: "utf8",
      });
      // Write header
      writeStream.write(headers.join(",") + "\n");

      await new Promise<void>((resolve, reject) => {
        dbStream.on("data", (row: any) => {
          try {
            const line = headers
              .map((h) => this.escapeCsv(String(row[h] ?? "")))
              .join(",");
            writeStream.write(line + "\n");
          } catch (err) {
            reject(err);
          }
        });
        dbStream.on("end", () => {
          writeStream.end();
          resolve();
        });
        dbStream.on("error", (err: any) => reject(err));
        writeStream.on("error", (err) => reject(err));
      });
    } finally {
      client.release();
      await pool.end();
    }
  }

  private async writeArrayAsCsv(stream: fs.WriteStream, arr: any[]) {
    if (arr.length === 0) return;
    const keys = Array.from(new Set(arr.flatMap((r) => Object.keys(r))));
    stream.write(keys.join(",") + "\n");
    for (const row of arr) {
      const line = keys
        .map((k) => this.escapeCsv(String(row[k] ?? "")))
        .join(",");
      stream.write(line + "\n");
    }
  }

  private escapeCsv(value: string) {
    if (value.includes(",") || value.includes("\n") || value.includes('"')) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }
}
