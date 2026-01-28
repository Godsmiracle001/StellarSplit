import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import * as nodemailer from "nodemailer";
import * as handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../entities/user.entity";
import { ConfigService } from "@nestjs/config";

@Processor("email_queue")
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>("MAIL_HOST", "smtp.mailtrap.io"),
      port: this.configService.get<number>("MAIL_PORT", 2525),
      auth: {
        user: this.configService.get<string>("MAIL_USER"),
        pass: this.configService.get<string>("MAIL_PASS"),
      },
    });
  }

  @Process("sendEmail")
  async handleSendEmail(job: Job<any>) {
    const { to, type, context } = job.data;

    this.logger.log(`Processing email job ${job.id} of type ${type} to ${to}`);

    try {
      const user = await this.userRepository.findOne({ where: { email: to } });

      if (user) {
        if (
          user.lastEmailSentAt &&
          Date.now() - user.lastEmailSentAt.getTime() < 60000
        ) {
          this.logger.warn(
            `Rate limit exceeded for user ${to}. Skipping email.`,
          );
          return;
        }

        // Preference check
        const preferences = user.emailPreferences;
        const preferenceKeyMap: Record<string, keyof typeof preferences> = {
          invitation: "invitations",
          reminder: "reminders",
          confirmation: "receivedConfirmation",
          completed: "completion",
        };

        if (preferenceKeyMap[type] && !preferences[preferenceKeyMap[type]]) {
          this.logger.log(`User ${to} has disabled ${type} emails. Skipping.`);
          return;
        }
      }

      const templatePath = path.join(__dirname, "templates", `${type}.hbs`);
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found at ${templatePath}`);
      }

      const source = fs.readFileSync(templatePath, "utf8");
      const template = handlebars.compile(source);
      const html = template(context);

      const subjectMap: Record<string, string> = {
        invitation: "Invitation to join a new Split on StellarSplit",
        reminder: "Payment Reminder for StellarSplit",
        confirmation: "Payment Received Confirmation",
        completed: "Split Completed!",
      };

      await this.transporter.sendMail({
        from: '"StellarSplit" <noreply@stellarsplit.com>',
        to,
        subject: subjectMap[type] || "StellarSplit Notification",
        html,
      });

      if (user) {
        await this.userRepository.update(user.id, {
          lastEmailSentAt: new Date(),
        });
      }

      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw error;
    }
  }
}
