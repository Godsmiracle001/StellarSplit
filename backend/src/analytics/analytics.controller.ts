import { Controller, Get, Query, Param, Post, Body } from "@nestjs/common";
import { SpendingTrendsDto } from "./dto/spending-trends.dto";
import { ExportRequestDto } from "./dto/export.dto";
import { AnalyticsService } from "./analytics.service";

@Controller("api/analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("spending-trends")
  async getSpendingTrends(@Query() query: SpendingTrendsDto) {
    return this.analyticsService.getSpendingTrends(query);
  }
  @Get("category-breakdown")
  async getCategoryBreakdown(@Query() query: SpendingTrendsDto) {
    return this.analyticsService.getCategoryBreakdown(query);
  }

  @Get("top-partners")
  async getTopPartners(
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("userId") userId?: string,
    @Query("limit") limit = "10",
  ) {
    return this.analyticsService.getTopPartners({
      dateFrom,
      dateTo,
      userId,
      limit: parseInt(limit, 10),
    });
  }

  @Get("monthly-report/:month")
  async getMonthlyReport(
    @Query("userId") userId: string,
    @Param("month") month: string,
  ) {
    return this.analyticsService.getMonthlyReport(month, userId);
  }

  @Post("export")
  async export(@Body() body: ExportRequestDto) {
    return this.analyticsService.enqueueExport(body);
  }

  @Get("reports/:id")
  async getReport(@Param("id") id: string) {
    return this.analyticsService.getReportStatus(id);
  }
}
