import { MigrationInterface, QueryRunner } from "typeorm";

export class EnhanceExportJobsQueueing1772400000000 implements MigrationInterface {
  name = "EnhanceExportJobsQueueing1772400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_jobs_status_enum') THEN
          BEGIN
            ALTER TYPE "export_jobs_status_enum" ADD VALUE IF NOT EXISTS 'CANCELLED';
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END;
        ELSIF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_status_enum') THEN
          BEGIN
            ALTER TYPE "export_status_enum" ADD VALUE IF NOT EXISTS 'CANCELLED';
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'export_jobs') THEN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'export_jobs' AND column_name = 'progress') THEN
            ALTER TABLE "export_jobs" ADD COLUMN "progress" integer NOT NULL DEFAULT 0;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'export_jobs' AND column_name = 'current_step') THEN
            ALTER TABLE "export_jobs" ADD COLUMN "current_step" character varying;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'export_jobs' AND column_name = 'queue_job_id') THEN
            ALTER TABLE "export_jobs" ADD COLUMN "queue_job_id" character varying;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'export_jobs' AND column_name = 'retry_count') THEN
            ALTER TABLE "export_jobs" ADD COLUMN "retry_count" integer NOT NULL DEFAULT 0;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'export_jobs' AND column_name = 'max_retries') THEN
            ALTER TABLE "export_jobs" ADD COLUMN "max_retries" integer NOT NULL DEFAULT 3;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'export_jobs' AND column_name = 'started_at') THEN
            ALTER TABLE "export_jobs" ADD COLUMN "started_at" timestamp;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'export_jobs' AND column_name = 'failure_code') THEN
            ALTER TABLE "export_jobs" ADD COLUMN "failure_code" character varying;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'export_jobs' AND column_name = 'failure_reason') THEN
            ALTER TABLE "export_jobs" ADD COLUMN "failure_reason" text;
          END IF;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'export_jobs') THEN
          ALTER TABLE "export_jobs" DROP COLUMN IF EXISTS "failure_reason";
          ALTER TABLE "export_jobs" DROP COLUMN IF EXISTS "failure_code";
          ALTER TABLE "export_jobs" DROP COLUMN IF EXISTS "started_at";
          ALTER TABLE "export_jobs" DROP COLUMN IF EXISTS "max_retries";
          ALTER TABLE "export_jobs" DROP COLUMN IF EXISTS "retry_count";
          ALTER TABLE "export_jobs" DROP COLUMN IF EXISTS "queue_job_id";
          ALTER TABLE "export_jobs" DROP COLUMN IF EXISTS "current_step";
          ALTER TABLE "export_jobs" DROP COLUMN IF EXISTS "progress";
        END IF;
      END
      $$;
    `);
  }
}
