import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bull";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { BatchJob } from "./entities/batch-job.entity";
import { BatchOperation } from "./entities/batch-operation.entity";
import { BatchService } from "./batch.service";
import { BatchController } from "./batch.controller";
import { SplitBatchProcessor } from "./processors/split-batch.processor";
import { PaymentBatchProcessor } from "./processors/payment-batch.processor";
import { ScheduledBatchProcessor } from "./processors/scheduled-batch.processor";
import { BatchProgressService } from "./batch-progress.service";
import { BatchEventsService } from "./batch-events.service";
import { PaymentsModule } from "../payments/payments.module";
import { SplitsModule } from "../modules/splits/splits.module";
import { QueueJobPolicy, JobPolicyTier } from "../common/queue-job-policy";

@Module({
  imports: [
    TypeOrmModule.forFeature([BatchJob, BatchOperation]),
    PaymentsModule,
    SplitsModule,
    BullModule.registerQueue(
      QueueJobPolicy.forQueue('batch_splits', JobPolicyTier.CRITICAL, {
        removeOnComplete: false,
        removeOnFail: false,
      }),
      QueueJobPolicy.forQueue('batch_payments', JobPolicyTier.CRITICAL, {
        removeOnComplete: false,
        removeOnFail: false,
      }),
      QueueJobPolicy.forQueue('batch_scheduled', JobPolicyTier.STANDARD, {
        removeOnComplete: true,
        removeOnFail: false,
      }),
    ),
  ],
  controllers: [BatchController],
  providers: [
    BatchService,
    BatchProgressService,
    BatchEventsService,
    SplitBatchProcessor,
    PaymentBatchProcessor,
    ScheduledBatchProcessor,
  ],
  exports: [BatchService, BatchProgressService],
})
export class BatchModule {}
