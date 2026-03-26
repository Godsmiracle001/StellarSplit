import { Module } from '@nestjs/common';
import { ReceiptToSplitController } from './receipt-to-split.controller';
import { ReceiptsModule } from '../../receipts/receipts.module';
import { SplitsModule } from '../splits/splits.module';

@Module({
  imports: [ReceiptsModule, SplitsModule],
  controllers: [ReceiptToSplitController],
})
export class ReceiptToSplitModule {}
