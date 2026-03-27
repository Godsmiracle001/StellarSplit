import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bull";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ExportJob } from "./entities/export-job.entity";
import { ExportTemplate } from "./entities/export-template.entity";
import { ExportService } from "./export.service";
import { ExportController } from "./export.controller";
import { PdfGeneratorService } from "./pdf-generator.service";
import { CsvGeneratorService } from "./csv-generator.service";
import { QuickBooksGeneratorService } from "./quickbooks-generator.service";
import { OfxGeneratorService } from "./ofx-generator.service";
import { EmailService } from "./email.service";
import { StorageService } from "./storage.service";
import { ExportProcessor } from "./export.processor";

@Module({
  imports: [
    TypeOrmModule.forFeature([ExportJob, ExportTemplate]),
    BullModule.registerQueue({
      name: "export",
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [ExportController],
  providers: [
    ExportService,
    ExportProcessor,
    PdfGeneratorService,
    CsvGeneratorService,
    QuickBooksGeneratorService,
    OfxGeneratorService,
    EmailService,
    StorageService,
  ],
  exports: [ExportService],
})
export class ExportModule {}
