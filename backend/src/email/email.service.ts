import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../entities/user.entity";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectQueue("email_queue") private readonly emailQueue: Queue,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async sendInvitation(
    to: string,
    context: {
      inviterName: string;
      splitDescription: string;
      amount: number;
      joinLink: string;
    },
  ) {
    await this.emailQueue.add("sendEmail", {
      to,
      type: "invitation",
      context,
    });
  }

  async sendPaymentReminder(
    to: string,
    context: {
      participantName: string;
      splitDescription: string;
      amountDue: number;
      paymentLink: string;
    },
  ) {
    await this.emailQueue.add("sendEmail", {
      to,
      type: "reminder",
      context,
    });
  }

  async sendPaymentConfirmation(
    to: string,
    context: { amount: number; splitDescription: string; txHash: string },
  ) {
    await this.emailQueue.add("sendEmail", {
      to,
      type: "confirmation",
      context,
    });
  }

  async sendSplitCompleted(
    to: string,
    context: { splitDescription: string; totalAmount: number },
  ) {
    await this.emailQueue.add("sendEmail", {
      to,
      type: "completed",
      context,
    });
  }

  async updatePreferences(userId: string, preferences: any) {
    await this.userRepository.update(userId, { emailPreferences: preferences });
  }

  async getUser(userId: string) {
    return this.userRepository.findOne({ where: { id: userId } });
  }
}
