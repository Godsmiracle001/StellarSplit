import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { FraudDetectionService } from "./fraud-detection.service";
import { FraudDetectionController } from "./fraud-detection.controller";
import { FraudAlert } from "./entities/fraud-alert.entity";

@Module({
  imports: [TypeOrmModule.forFeature([FraudAlert])],
  providers: [FraudDetectionService],
  controllers: [FraudDetectionController],
  exports: [FraudDetectionService],
})
export class FraudDetectionModule {}
