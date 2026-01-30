import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { WebhookDelivery } from './webhook-delivery.entity';

export enum WebhookEventType {
  SPLIT_CREATED = 'split.created',
  SPLIT_UPDATED = 'split.updated',
  SPLIT_COMPLETED = 'split.completed',
  PAYMENT_RECEIVED = 'payment.received',
  PAYMENT_MADE = 'payment.made',
  PARTICIPANT_ADDED = 'participant.added',
}

@Entity('webhooks')
@Index(['userId'])
@Index(['isActive'])
@Index(['userId', 'isActive'])
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  @Index()
  userId!: string;

  @Column({ type: 'varchar', length: 500 })
  url!: string;

  @Column({ type: 'jsonb', default: [] })
  events!: WebhookEventType[];

  @Column({ type: 'varchar', length: 255 })
  secret!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'integer', default: 0 })
  failureCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastTriggeredAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => WebhookDelivery, (delivery) => delivery.webhook)
  deliveries?: WebhookDelivery[];
}
