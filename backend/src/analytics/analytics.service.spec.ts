import { Test, TestingModule } from "@nestjs/testing";
import { AnalyticsService } from "./analytics.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Payment } from "../entities/payment.entity";
import { Participant } from "../entities/participant.entity";
import { AnalyticsReport } from "./reports.entity";
import { DataSource } from "typeorm";

describe("AnalyticsService", () => {
  let service: AnalyticsService;
  const mockPaymentRepository = {
    createQueryBuilder: jest.fn(),
  } as any;

  const mockParticipantRepository = {} as any;
  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
  } as any;

  const mockReportsRepository = {
    create: jest.fn((payload) => ({ ...payload })),
    save: jest.fn().mockResolvedValue({ id: "report-123" }),
    findOne: jest.fn(),
  } as any;

  const mockQueue = {
    add: jest.fn(),
  } as any;

  const mockDataSource = {
    createQueryBuilder: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    }),
    query: jest.fn().mockResolvedValue([]),
  } as any;

  beforeEach(async () => {
    // Ensure mocked repo functions have implementations after jest.resetAllMocks
    mockReportsRepository.create.mockImplementation((payload: any) => ({
      ...payload,
    }));
    mockReportsRepository.save.mockResolvedValue({ id: "report-123" });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(Participant),
          useValue: mockParticipantRepository,
        },
        {
          provide: getRepositoryToken(AnalyticsReport),
          useValue: mockReportsRepository,
        },
        { provide: "CACHE_MANAGER", useValue: mockCache },
        { provide: "BullQueue_analytics-export", useValue: mockQueue },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => jest.resetAllMocks());

  it("returns cached result when available", async () => {
    mockCache.get.mockResolvedValue([
      { period: "2026-01-01", totalSpent: 100 },
    ]);

    const result = await service.getSpendingTrends({});
    expect(result).toEqual([{ period: "2026-01-01", totalSpent: 100 }]);
    expect(mockCache.get).toHaveBeenCalled();
  });

  it("enqueues export and creates report record", async () => {
    const dto = {
      type: "spending-trends",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
      userId: "user1",
      format: "csv",
    } as any;

    // Inspect actual injected repository on the service
    expect(typeof (service as any).reportsRepository.create).toBe("function");
    expect(typeof (service as any).reportsRepository.save).toBe("function");
    const createdViaService = (service as any).reportsRepository.create({
      type: "x",
      params: {},
    });
    expect(createdViaService).toBeDefined();
    const savedViaService = await (service as any).reportsRepository.save(
      createdViaService as any,
    );
    // savedViaService might be undefined depending on the mocked repo implementation

    const res = await service.enqueueExport(dto);
    expect(res.id).toBe("report-123");
    expect(mockReportsRepository.create).toHaveBeenCalled();
    expect(mockReportsRepository.save).toHaveBeenCalled();
    expect(mockQueue.add).toHaveBeenCalled();
  });

  it("queries DB when cache miss and caches result", async () => {
    mockCache.get.mockResolvedValue(null);

    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          period: "2026-01-01",
          total_spent: "150.00",
          tx_count: "3",
          avg_tx_amount: "50.00",
        },
      ]),
    };

    mockPaymentRepository.createQueryBuilder.mockReturnValue(qb);

    const result = await service.getSpendingTrends({
      granularity: "monthly" as any,
    });

    expect(mockPaymentRepository.createQueryBuilder).toHaveBeenCalled();
    expect(result).toEqual([
      {
        period: "2026-01-01",
        totalSpent: 150,
        transactionCount: 3,
        avgTransactionAmount: 50,
      },
    ]);
    expect(mockCache.set).toHaveBeenCalled();
  });
});
