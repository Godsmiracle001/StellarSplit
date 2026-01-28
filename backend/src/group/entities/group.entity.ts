import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SplitType {
  EQUAL = 'equal',
  EXACT = 'exact',
  PERCENTAGE = 'percentage',
}

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
    id!: string;

  @Column()
    name!: string;

  @Column()
    creatorId!: string; // wallet address

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ type: 'json' })
    members: {
        wallet: string;
        role: 'admin' | 'member';
    }[] = [];

  @Column({
        type: 'enum',
        enum: SplitType,
        default: SplitType.EQUAL,
    })
    defaultSplitType: SplitType = SplitType.EQUAL;

  @CreateDateColumn()
    createdAt!: Date;

  @UpdateDateColumn()
    updatedAt!: Date;
}
