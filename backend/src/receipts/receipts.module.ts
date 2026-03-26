import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OcrModule } from "../ocr/ocr.module";
import { Receipt } from "./entities/receipt.entity";
import { ReceiptsController } from "./receipts.controller";
import { ReceiptsService } from "./receipts.service";
import { StorageProviderService } from "./storage-provider.service";
import { ThumbnailService } from "./thumbnail.service";

@Module({
  imports: [TypeOrmModule.forFeature([Receipt]), OcrModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, StorageProviderService, ThumbnailService],
})
export class ReceiptsModule {}
