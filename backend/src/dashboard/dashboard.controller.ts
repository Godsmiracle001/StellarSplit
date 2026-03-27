import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { DashboardSummaryDto, DashboardActivityDto } from './dto/dashboard.dto';
import { ApiErrorResponseDto } from '../common/dto/api-error-response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get dashboard summary cards for the authenticated user' })
  @ApiOkResponse({ description: 'Summary stats', type: DashboardSummaryDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication', type: ApiErrorResponseDto })
  async getSummary(@Req() req: any): Promise<DashboardSummaryDto> {
    return this.dashboardService.getSummary(req.user.id);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent activity feed for the authenticated user' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({ description: 'Paginated activity list', type: DashboardActivityDto })
  @ApiBadRequestResponse({ description: 'Invalid pagination parameters', type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid authentication', type: ApiErrorResponseDto })
  async getActivity(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<DashboardActivityDto> {
    const safeLimit = Math.min(limit, 100);
    return this.dashboardService.getActivity(req.user.id, page, safeLimit);
  }
}
