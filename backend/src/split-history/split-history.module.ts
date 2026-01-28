import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SplitHistory } from './entities/split-history.entity';
import { SplitHistoryService } from './split-history.service';
import { SplitHistoryController } from './split-history.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SplitHistory])],
  providers: [SplitHistoryService],
  controllers: [SplitHistoryController],
  exports: [SplitHistoryService],
})
export class SplitHistoryModule {}
