import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { HistoricalRatesService } from './historical-rates.service';
import { ExpenseCategory } from './entities/expense-category.entity';
import { TaxExportRequest } from './entities/tax-export-request.entity';
import { HistoricalRateCache } from './entities/historical-rate-cache.entity';
import { Split } from '../entities/split.entity';
import { CSVExporterService } from './exporters/csv-exporter.service';
import { PDFExporterService } from './exporters/pdf-exporter.service';
import { QBOExporterService } from './exporters/qbo-exporter.service';
import { JSONExporterService } from './exporters/json-exporter.service';
import { OFXExporterService } from './exporters/ofx-exporter.service';
import { ComplianceProcessor } from './compliance.processor';
import { EmailModule } from '../email/email.module';
import { QueueJobPolicy, JobPolicyTier } from '../common/queue-job-policy';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            ExpenseCategory,
            TaxExportRequest,
            Split,
            HistoricalRateCache,
        ]),
        BullModule.registerQueue(
            QueueJobPolicy.forQueue('compliance-export', JobPolicyTier.STANDARD),
        ),
        EmailModule,
    ],
    controllers: [ComplianceController],
    providers: [
        ComplianceService,
        HistoricalRatesService,
        CSVExporterService,
        PDFExporterService,
        QBOExporterService,
        JSONExporterService,
        OFXExporterService,
        ComplianceProcessor,
    ],
    exports: [ComplianceService],
})
export class ComplianceModule { }
