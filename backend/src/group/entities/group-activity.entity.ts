
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('group_activities')
export class GroupActivity {
  @PrimaryGeneratedColumn('uuid')
    id!: string;

  @Column()
    groupId!: string;

  @Column()
    actor!: string; // wallet address

  @Column()
    action!: string; // e.g. "ADD_MEMBER", "CREATE_SPLIT"

  @Column({ type: 'json', nullable: true })
  metadata?: any;

  @CreateDateColumn()
    createdAt!: Date;
}
