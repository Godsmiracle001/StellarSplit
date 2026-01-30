import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type ReportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "deleted";

@Entity("analytics_reports")
export class AnalyticsReport {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", nullable: true })
  userId?: string;

  @Column({ type: "varchar" })
  type!: string;

  @Column({ type: "jsonb", default: {} })
  params!: Record<string, any>;

  @Column({ type: "varchar", default: "pending" })
  status!: ReportStatus;

  @Column({ type: "varchar", nullable: true })
  filePath?: string;

  @Column({ type: "varchar", nullable: true })
  fileName?: string;

  @Column({ type: "text", nullable: true })
  error?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: "timestamp", name: "deleted_at", nullable: true })
  deletedAt?: Date;
}
