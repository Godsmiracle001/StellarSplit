import { Controller, Get, Param } from '@nestjs/common';
import { SplitHistoryService } from './split-history.service';

@Controller('api/split-history')
export class SplitHistoryController {
  constructor(private readonly service: SplitHistoryService) {}

  @Get('user/:walletAddress')
  getUserHistory(@Param('walletAddress') wallet: string) {
    return this.service.getUserHistory(wallet);
  }

  @Get('stats/:walletAddress')
  getUserStats(@Param('walletAddress') wallet: string) {
    return this.service.getUserStats(wallet);
  }
}
