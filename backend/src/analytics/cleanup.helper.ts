import { Logger } from "@nestjs/common";

export async function cleanupOldReportsHelper(
  dataSource: any,
  reportsRepository: any,
  logger: Logger,
  retentionDays = 30,
) {
  const threshold = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  // Use raw query for date comparison to be efficient
  const rows: any[] = await dataSource.query(
    "SELECT id, file_path, file_name FROM analytics_reports WHERE status = $1 AND created_at < $2",
    ["completed", threshold.toISOString()],
  );

  for (const r of rows) {
    try {
      const id = r.id;
      const filePath = r.file_path as string | null;

      if (filePath) {
        if (filePath.startsWith("s3://")) {
          const [, bucket, ...rest] = filePath.split("/");
          const key = rest.join("/");
          const region = process.env.AWS_REGION;
          const s3Client = new (require("@aws-sdk/client-s3").S3Client)({
            region,
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
          });
          const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
          await s3Client.send(
            new DeleteObjectCommand({ Bucket: bucket, Key: key }),
          );
        } else {
          try {
            await require("fs").promises.unlink(filePath);
          } catch (_) {
            // ignore
          }
        }
      }

      await reportsRepository.update(
        { id },
        { status: "deleted", deletedAt: new Date(), filePath: null },
      );
      logger.debug(`Deleted old report ${id}`);
    } catch (err) {
      logger.error(`Failed to delete old report ${r.id}`, err as any);
    }
  }
}
