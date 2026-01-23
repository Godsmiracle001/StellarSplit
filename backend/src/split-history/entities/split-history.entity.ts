import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Split } from '@/entities/split.entity';

export enum SplitRole {
  CREATOR = 'creator',
  PARTICIPANT = 'participant',
}

@Entity('split_history')
@Index(['userId'])
export class SplitHistory {
  @PrimaryGeneratedColumn('uuid')
    id!: string;

  @Column()
    userId!: string; // wallet address

  @ManyToOne(() => Split, { onDelete: 'CASCADE' })
    split!: Split;

  @Column({
        type: 'enum',
        enum: SplitRole,
    })
    role!: SplitRole;

  @Column('decimal', { precision: 18, scale: 6 })
    finalAmount!: string; // paid (-) or received (+)

  @CreateDateColumn()
    completionTime!: Date;
}
