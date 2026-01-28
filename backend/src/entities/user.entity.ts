import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export interface EmailPreferences {
  invitations: boolean;
  reminders: boolean;
  receivedConfirmation: boolean;
  completion: boolean;
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", unique: true })
  email!: string;

  @Column({
    type: "jsonb",
    name: "email_preferences",
    default: {
      invitations: true,
      reminders: true,
      receivedConfirmation: true,
      completion: true,
    },
  })
  emailPreferences!: EmailPreferences;

  @Column({ type: "timestamp", name: "last_email_sent_at", nullable: true })
  lastEmailSentAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
