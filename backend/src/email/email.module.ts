import { Module, Global } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EmailService } from "./email.service";
import { EmailProcessor } from "./email.processor";
import { EmailController } from "./email.controller";
import { User } from "../entities/user.entity";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    BullModule.registerQueue({
      name: "email_queue",
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
      },
    }),
  ],
  controllers: [EmailController],
  providers: [EmailService, EmailProcessor],
  exports: [EmailService],
})
export class EmailModule {}
