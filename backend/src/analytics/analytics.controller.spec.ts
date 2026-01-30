import { Test, TestingModule } from "@nestjs/testing";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";

describe("AnalyticsController", () => {
  let controller: AnalyticsController;
  const mockService = {
    getSpendingTrends: jest.fn(),
    enqueueExport: jest.fn(),
    getReportStatus: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: mockService }],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  afterEach(() => jest.resetAllMocks());

  it("delegates to service.getSpendingTrends", async () => {
    mockService.getSpendingTrends.mockResolvedValue([
      { period: "2026-01-01", totalSpent: 100 },
    ]);
    const result = await controller.getSpendingTrends({});
    expect(result).toEqual([{ period: "2026-01-01", totalSpent: 100 }]);
    expect(mockService.getSpendingTrends).toHaveBeenCalled();
  });

  it("delegates export request to service.enqueueExport", async () => {
    mockService.enqueueExport.mockResolvedValue({
      id: "report-123",
      status: "pending",
    });
    const result = await controller.export({
      type: "spending-trends",
      format: "csv",
    } as any);
    expect(result).toEqual({ id: "report-123", status: "pending" });
    expect(mockService.enqueueExport).toHaveBeenCalled();
  });

  it("delegates getReport to service.getReportStatus", async () => {
    mockService.getReportStatus.mockResolvedValue({
      id: "report-123",
      status: "completed",
    });
    const result = await controller.getReport("report-123");
    expect(result).toEqual({ id: "report-123", status: "completed" });
    expect(mockService.getReportStatus).toHaveBeenCalledWith("report-123");
  });
});
