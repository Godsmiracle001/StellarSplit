import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFraudDetectionTables1769704000000 implements MigrationInterface {
  name = 'CreateFraudDetectionTables1769704000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "alert_status_enum" AS ENUM ('open', 'under_review', 'resolved', 'false_positive')
    `);

    await queryRunner.query(`
      CREATE TYPE "alert_type_enum" AS ENUM (
        'high_risk_split', 
        'high_risk_payment', 
        'anomaly_detected', 
        'suspicious_pattern', 
        'rapid_creation', 
        'circular_payment'
      )
    `);

    // Create fraud_alerts table
    await queryRunner.query(`
      CREATE TABLE "fraud_alerts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "split_id" uuid,
        "participant_id" uuid,
        "alert_type" "alert_type_enum" NOT NULL,
        "risk_score" decimal(5,2) NOT NULL,
        "anomaly_score" decimal(5,2),
        "pattern_score" decimal(5,2),
        "model_version" varchar(20),
        "features" jsonb NOT NULL DEFAULT '{}',
        "flags" text[],
        "status" "alert_status_enum" NOT NULL DEFAULT 'open',
        "resolved_at" timestamp,
        "resolved_by" varchar(100),
        "resolution_notes" text,
        "is_true_positive" boolean,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fraud_alerts" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_fraud_alerts_split_id" ON "fraud_alerts" ("split_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fraud_alerts_status" ON "fraud_alerts" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fraud_alerts_created_at" ON "fraud_alerts" ("created_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fraud_alerts_risk_score" ON "fraud_alerts" ("risk_score")
    `);

    // Create fraud_detection_logs table
    await queryRunner.query(`
      CREATE TABLE "fraud_detection_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "entity_type" varchar(20) NOT NULL,
        "entity_id" uuid NOT NULL,
        "action" varchar(20) NOT NULL,
        "risk_score" decimal(5,2),
        "model_version" varchar(20),
        "processing_time_ms" integer,
        "created_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fraud_detection_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fraud_logs_entity" ON "fraud_detection_logs" ("entity_type", "entity_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fraud_logs_created_at" ON "fraud_detection_logs" ("created_at")
    `);

    // Create fraud_model_metrics table
    await queryRunner.query(`
      CREATE TABLE "fraud_model_metrics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "model_name" varchar(50) NOT NULL,
        "model_version" varchar(20) NOT NULL,
        "accuracy" decimal(5,4),
        "precision" decimal(5,4),
        "recall" decimal(5,4),
        "f1_score" decimal(5,4),
        "training_samples" integer,
        "tested_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fraud_model_metrics" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_model_metrics_name_version" ON "fraud_model_metrics" ("model_name", "model_version")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    await queryRunner.query(`DROP TABLE "fraud_model_metrics"`);
    await queryRunner.query(`DROP TABLE "fraud_detection_logs"`);
    await queryRunner.query(`DROP TABLE "fraud_alerts"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "alert_status_enum"`);
    await queryRunner.query(`DROP TYPE "alert_type_enum"`);
  }
}
