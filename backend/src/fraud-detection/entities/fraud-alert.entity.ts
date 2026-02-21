import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum AlertStatus {
  OPEN = "open",
  UNDER_REVIEW = "under_review",
  RESOLVED = "resolved",
  FALSE_POSITIVE = "false_positive",
}

export enum AlertType {
  HIGH_RISK_SPLIT = "high_risk_split",
  HIGH_RISK_PAYMENT = "high_risk_payment",
  ANOMALY_DETECTED = "anomaly_detected",
  SUSPICIOUS_PATTERN = "suspicious_pattern",
  RAPID_CREATION = "rapid_creation",
  CIRCULAR_PAYMENT = "circular_payment",
}

@Entity("fraud_alerts")
@Index(["split_id"])
@Index(["status"])
@Index(["created_at"])
@Index(["risk_score"])
export class FraudAlert {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", nullable: true })
  split_id?: string;

  @Column({ type: "uuid", nullable: true })
  participant_id?: string;

  @Column({
    type: "enum",
    enum: AlertType,
  })
  alert_type!: AlertType;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  risk_score!: number;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  anomaly_score?: number;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  pattern_score?: number;

  @Column({ type: "varchar", length: 20, nullable: true })
  model_version?: string;

  @Column({ type: "jsonb", default: {} })
  features!: Record<string, any>;

  @Column({ type: "simple-array", nullable: true })
  flags?: string[];

  @Column({
    type: "enum",
    enum: AlertStatus,
    default: AlertStatus.OPEN,
  })
  status!: AlertStatus;

  @Column({ type: "timestamp", nullable: true })
  resolved_at?: Date;

  @Column({ type: "varchar", length: 100, nullable: true })
  resolved_by?: string;

  @Column({ type: "text", nullable: true })
  resolution_notes?: string;

  @Column({ type: "boolean", nullable: true })
  is_true_positive?: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
