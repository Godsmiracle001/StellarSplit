import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum ActivityType {
  SPLIT_CREATED = 'split_created',
  PARTICIPANT_ADDED = 'participant_added',
  PAYMENT_MADE = 'payment_made',
  PAYMENT_RECEIVED = 'payment_received',
  SPLIT_COMPLETED = 'split_completed',
  REMINDER_SENT = 'reminder_sent',
  SPLIT_EDITED = 'split_edited',
}

@Entity('activities')
@Index(['userId', 'createdAt'])
@Index(['userId', 'activityType'])
@Index(['userId', 'isRead'])
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  @Index()
  userId!: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
  })
  @Index()
  activityType!: ActivityType;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  splitId?: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
