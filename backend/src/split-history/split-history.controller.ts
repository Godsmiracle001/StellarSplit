import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SplitHistoryService } from './split-history.service';
import { HistoryQueryDto } from './dto/history-query.dto';
import { HistoryResponseDto } from './dto/history-response.dto';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';

@ApiTags('Split History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(['split-history', 'splits/history'])
export class SplitHistoryController {
  constructor(private readonly service: SplitHistoryService) {}

  /**
   * Paginated history with role, status, search, and date filters.
   * This is the primary endpoint for the frontend history page.
   */
  @Get()
  @ApiOperation({ summary: 'Get paginated split history for the authenticated user' })
  @ApiOkResponse({ description: 'Paginated history with summary', type: HistoryResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid history filters', type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication', type: ApiErrorResponseDto })
  getHistory(
    @Req() req: any,
    @Query(new ValidationPipe({ transform: true })) query: HistoryQueryDto,
  ): Promise<HistoryResponseDto> {
    return this.service.getHistory(req.user.id, query);
  }

  /**
   * Kept for backwards compatibility — resolves to the same data unfiltered.
   */
  @Get('user/:walletAddress')
  @ApiOperation({ summary: 'Get full history by wallet address (legacy)' })
  @ApiParam({ name: 'walletAddress', description: 'Stellar wallet address' })
  @ApiOkResponse({ description: 'Legacy split history response' })
  getUserHistory(@Param('walletAddress') wallet: string) {
    return this.service.getUserHistory(wallet);
  }

  @Get('stats/:walletAddress')
  @ApiOperation({ summary: 'Get aggregate stats by wallet address' })
  @ApiParam({ name: 'walletAddress', description: 'Stellar wallet address' })
  @ApiOkResponse({ description: 'History aggregate statistics' })
  getUserStats(@Param('walletAddress') wallet: string) {
    return this.service.getUserStats(wallet);
  }
}
