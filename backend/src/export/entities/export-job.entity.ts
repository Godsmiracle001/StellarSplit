import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "@/entities/user.entity";

export enum ExportFormat {
  CSV = "CSV",
  PDF = "PDF",
  JSON = "JSON",
  QBO = "QBO", // QuickBooks
  OFX = "OFX", // Open Financial Exchange
  XLSX = "XLSX",
}

export enum ExportStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

export enum ExportFailureCode {
  VALIDATION_ERROR = "VALIDATION_ERROR",
  QUEUE_ERROR = "QUEUE_ERROR",
  DATA_FETCH_FAILED = "DATA_FETCH_FAILED",
  GENERATION_FAILED = "GENERATION_FAILED",
  STORAGE_UPLOAD_FAILED = "STORAGE_UPLOAD_FAILED",
  EMAIL_DELIVERY_FAILED = "EMAIL_DELIVERY_FAILED",
  FILE_EXPIRED = "FILE_EXPIRED",
  FILE_NOT_FOUND = "FILE_NOT_FOUND",
  CANCELLED = "CANCELLED",
  UNKNOWN = "UNKNOWN",
}

export enum ReportType {
  MONTHLY_SUMMARY = "MONTHLY_SUMMARY",
  ANNUAL_TAX_REPORT = "ANNUAL_TAX_REPORT",
  CATEGORY_BREAKDOWN = "CATEGORY_BREAKDOWN",
  PARTNER_WISE_SUMMARY = "PARTNER_WISE_SUMMARY",
  PAYMENT_HISTORY = "PAYMENT_HISTORY",
  CUSTOM = "CUSTOM",
}

@Entity("export_jobs")
export class ExportJob {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id" })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({
    type: "enum",
    enum: ExportFormat,
    default: ExportFormat.CSV,
  })
  format!: ExportFormat;

  @Column({
    type: "enum",
    enum: ReportType,
    default: ReportType.CUSTOM,
  })
  reportType!: ReportType;

  @Column({
    type: "enum",
    enum: ExportStatus,
    default: ExportStatus.PENDING,
  })
  status!: ExportStatus;

  @Column({ type: "jsonb", nullable: true })
  filters!: {
    startDate?: string;
    endDate?: string;
    categories?: string[];
    participants?: string[];
    minAmount?: number;
    maxAmount?: number;
    currency?: string;
    paidByMe?: boolean;
    owedToMe?: boolean;
    settled?: boolean;
  };

  @Column({ nullable: true })
  fileName!: string | null;

  @Column({ nullable: true })
  fileUrl!: string | null;

  @Column({ name: "s3_key", nullable: true })
  s3Key!: string | null;

  @Column({ type: "int", default: 0 })
  fileSize!: number;

  @Column({ name: "record_count", type: "int", default: 0 })
  recordCount!: number;

  @Column({ type: "jsonb", nullable: true })
  summary!: {
    totalAmount: number;
    totalExpenses: number;
    totalSettlements: number;
    currencyBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
  } | null;

  @Column({ name: "error_message", nullable: true })
  errorMessage!: string | null;

  @Column({ name: "failure_code", nullable: true })
  failureCode!: string | null;

  @Column({ name: "failure_reason", type: "text", nullable: true })
  failureReason!: string | null;

  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt!: Date;

  @Column({ name: "is_scheduled", default: false })
  isScheduled!: boolean;

  @Column({ name: "schedule_id", nullable: true })
  scheduleId!: string | null;

  @Column({ name: "email_recipient", nullable: true })
  emailRecipient!: string | null;

  @Column({ name: "email_sent", default: false })
  emailSent!: boolean;

  @Column({ name: "email_sent_at", type: "timestamp", nullable: true })
  emailSentAt!: Date | null;

  @Column({ type: "int", default: 0 })
  progress!: number;

  @Column({ name: "current_step", nullable: true })
  currentStep!: string | null;

  @Column({ name: "queue_job_id", nullable: true })
  queueJobId!: string | null;

  @Column({ name: "retry_count", type: "int", default: 0 })
  retryCount!: number;

  @Column({ name: "max_retries", type: "int", default: 3 })
  maxRetries!: number;

  @Column({ name: "started_at", type: "timestamp", nullable: true })
  startedAt!: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @Column({ name: "completed_at", type: "timestamp", nullable: true })
  completedAt!: Date | null;

  @Index()
  @Column({ name: "is_tax_compliant", default: false })
  isTaxCompliant!: boolean;

  @Column({ name: "tax_year", type: "int", nullable: true })
  taxYear!: number | null;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, any>;
}
