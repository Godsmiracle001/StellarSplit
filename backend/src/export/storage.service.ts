import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as AWS from "aws-sdk";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

export type ExportDownloadDescriptor =
  | { type: "redirect"; url: string }
  | {
      type: "file";
      path: string;
      contentType: string;
    };

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  // s3 is only used when useS3 === true; definite assignment is guaranteed
  // by the branch below, so `!` tells TypeScript to trust us here.
  private readonly s3!: AWS.S3;
  private readonly bucketName: string;
  private readonly useS3: boolean;
  private readonly localStoragePath: string;

  constructor(private readonly configService: ConfigService) {
    // Assign scalar config values first — they're read by both branches
    this.useS3 = this.configService.get<string>("USE_S3_STORAGE") === "true";
    this.bucketName =
      this.configService.get<string>("AWS_S3_BUCKET") ?? "stellarsplit-exports";
    this.localStoragePath =
      this.configService.get<string>("LOCAL_STORAGE_PATH") ??
      "./storage/exports";

    if (this.useS3) {
      // Configure the SDK globally then create the client
      AWS.config.update({
        accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY_ID"),
        secretAccessKey: this.configService.get<string>(
          "AWS_SECRET_ACCESS_KEY",
        ),
        region: this.configService.get<string>("AWS_REGION") ?? "us-east-1",
      });
      this.s3 = new AWS.S3();
    } else {
      // Ensure local storage directory exists
      if (!fs.existsSync(this.localStoragePath)) {
        fs.mkdirSync(this.localStoragePath, { recursive: true });
      }
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  async uploadFile(
    buffer: Buffer,
    fileName: string,
  userId: string,
  ): Promise<{ url: string; key: string }> {
    const fileKey = `exports/${userId}/${uuidv4()}/${fileName}`;
    return this.useS3
      ? this.uploadToS3(buffer, fileKey)
      : this.uploadToLocal(buffer, fileKey);
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.useS3) {
      return this.s3.getSignedUrlPromise("getObject", {
        Bucket: this.bucketName,
        Key: key,
        Expires: expiresIn,
      });
    }
    const baseUrl =
      this.configService.get<string>("APP_URL") ?? "http://localhost:3000";
    return `${baseUrl}/storage/exports/${key}`;
  }

  async getDownloadDescriptor(
    key: string,
    expiresIn = 3600,
  ): Promise<ExportDownloadDescriptor> {
    if (this.useS3) {
      return {
        type: "redirect",
        url: await this.getSignedUrl(key, expiresIn),
      };
    }

    const filePath = this.resolveLocalFilePath(key);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Local export file not found for key ${key}`);
    }

    return {
      type: "file",
      path: filePath,
      contentType: this.getContentType(key),
    };
  }

  async deleteFile(key: string): Promise<void> {
    if (this.useS3) {
      try {
        await this.s3
          .deleteObject({ Bucket: this.bucketName, Key: key })
          .promise();
        this.logger.log(`Deleted file from S3: ${key}`);
      } catch (error) {
        this.logger.error(`Failed to delete file from S3: ${key}`, error);
      }
    } else {
      const filePath = this.resolveLocalFilePath(key);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          this.logger.log(`Deleted local file: ${filePath}`);
        } catch (error) {
          this.logger.error(`Failed to delete local file: ${filePath}`, error);
        }
      }
    }
  }

  async cleanupOldFiles(daysOld = 7): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    return this.useS3
      ? this.cleanupS3Files(cutoffDate)
      : this.cleanupLocalFiles(cutoffDate);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async uploadToS3(
    buffer: Buffer,
    key: string,
  ): Promise<{ url: string; key: string }> {
    const params: AWS.S3.PutObjectRequest = {
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: this.getContentType(key),
      ACL: "private",
      Metadata: { uploadedAt: new Date().toISOString() },
    };

    try {
      await this.s3.upload(params).promise();
      return { url: `https://${this.bucketName}.s3.amazonaws.com/${key}`, key };
    } catch (error) {
      this.logger.error("Failed to upload to S3:", error);
      throw error;
    }
  }

  private async uploadToLocal(
    buffer: Buffer,
    key: string,
  ): Promise<{ url: string; key: string }> {
    const filePath = this.resolveLocalFilePath(key);
    const dirPath = path.dirname(filePath);

    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(filePath, buffer);

    const baseUrl =
      this.configService.get<string>("APP_URL") ?? "http://localhost:3000";
    return { url: `${baseUrl}/storage/exports/${key}`, key };
  }

  private async cleanupS3Files(cutoffDate: Date): Promise<void> {
    try {
      const objects = await this.s3
        .listObjectsV2({ Bucket: this.bucketName, Prefix: "exports/" })
        .promise();

      const old = objects.Contents?.filter(
        (obj) => obj.LastModified && obj.LastModified < cutoffDate,
      );

      if (old?.length) {
        await this.s3
          .deleteObjects({
            Bucket: this.bucketName,
            Delete: {
              Objects: old.map((obj) => ({ Key: obj.Key! })),
              Quiet: false,
            },
          })
          .promise();
        this.logger.log(`Cleaned up ${old.length} old S3 files`);
      }
    } catch (error) {
      this.logger.error("Failed to cleanup S3 files:", error);
    }
  }

  private async cleanupLocalFiles(cutoffDate: Date): Promise<void> {
    const exportsPath = path.join(this.localStoragePath, "exports");
    if (!fs.existsSync(exportsPath)) return;

    let deletedCount = 0;

    const cleanupDirectory = (dirPath: string) => {
      for (const item of fs.readdirSync(dirPath, { withFileTypes: true })) {
        const fullPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
          cleanupDirectory(fullPath);
          try {
            fs.rmdirSync(fullPath);
          } catch {
            /* not empty, skip */
          }
        } else if (fs.statSync(fullPath).mtime < cutoffDate) {
          fs.unlinkSync(fullPath);
          deletedCount++;
        }
      }
    };

    cleanupDirectory(exportsPath);
    if (deletedCount > 0)
      this.logger.log(`Cleaned up ${deletedCount} old local files`);
  }

  private getContentType(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, string> = {
      csv: "text/csv",
      pdf: "application/pdf",
      json: "application/json",
      qbo: "application/x-qb",
      ofx: "application/x-ofx",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
      txt: "text/plain",
    };
    return map[ext] ?? "application/octet-stream";
  }

  private resolveLocalFilePath(key: string): string {
    const normalizedKey = key.replace(/\\/g, "/");
    const resolvedPath = path.resolve(this.localStoragePath, normalizedKey);
    const storageRoot = path.resolve(this.localStoragePath);

    if (!resolvedPath.startsWith(storageRoot)) {
      throw new Error(`Unsafe export file key: ${key}`);
    }

    return resolvedPath;
  }
}
