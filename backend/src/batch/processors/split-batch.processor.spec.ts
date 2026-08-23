import { Test, TestingModule } from "@nestjs/testing";
import { Job } from "bull";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { SplitBatchProcessor } from "./split-batch.processor";
import { BatchProgressService } from "../batch-progress.service";
import { BatchOperation, BatchOperationStatus } from "../entities/batch-operation.entity";
import { BatchJob } from "../entities/batch-job.entity";
import { SplitsService } from "../../modules/splits/splits.service";

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  save: jest.fn(),
});

const mockBatchProgressService = () => ({
  markOperationStarted: jest.fn(),
  markOperationCompleted: jest.fn(),
  markOperationFailed: jest.fn(),
});

const mockSplitsService = () => ({
  createSplit: jest.fn(),
});

describe("SplitBatchProcessor", () => {
  let processor: SplitBatchProcessor;
  let batchJobRepository: Repository<BatchJob>;
  let batchOperationRepository: Repository<BatchOperation>;
  let batchProgressService: BatchProgressService;
  let splitsService: SplitsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SplitBatchProcessor,
        {
          provide: getRepositoryToken(BatchJob),
          useFactory: mockRepository,
        },
        {
          provide: getRepositoryToken(BatchOperation),
          useFactory: mockRepository,
        },
        {
          provide: BatchProgressService,
          useFactory: mockBatchProgressService,
        },
        {
          provide: SplitsService,
          useFactory: mockSplitsService,
        },
      ],
    }).compile();

    processor = module.get<SplitBatchProcessor>(SplitBatchProcessor);
    batchJobRepository = module.get<Repository<BatchJob>>(getRepositoryToken(BatchJob));
    batchOperationRepository = module.get<Repository<BatchOperation>>(getRepositoryToken(BatchOperation));
    batchProgressService = module.get<BatchProgressService>(BatchProgressService);
    splitsService = module.get<SplitsService>(SplitsService);
  });

  it("should be defined", () => {
    expect(processor).toBeDefined();
  });

  describe("handleSplitBatch", () => {
    it("should process split batch successfully", async () => {
      const mockJob = {
        id: "job-1",
        data: {
          batchId: "batch-1",
          chunkSize: 2,
          concurrency: 1,
        },
        progress: jest.fn(),
      } as unknown as Job;

      const mockOperations = [
        {
          id: "op-1",
          payload: {
            totalAmount: 100,
            participants: [
              { userId: "user1", amount: 50 },
              { userId: "user2", amount: 50 },
            ],
          },
        },
        {
          id: "op-2",
          payload: {
            totalAmount: 200,
            participants: [
              { userId: "user2", amount: 100 },
              { userId: "user3", amount: 100 },
            ],
          },
        },
      ];

      (batchOperationRepository.find as jest.Mock).mockResolvedValue(mockOperations);
      (batchProgressService.markOperationStarted as jest.Mock).mockResolvedValue(undefined);
      (batchProgressService.markOperationCompleted as jest.Mock).mockResolvedValue(undefined);
      (splitsService.createSplit as jest.Mock)
        .mockResolvedValueOnce({
          id: "split-1",
          totalAmount: 100,
          status: "active",
          participants: [{}, {}],
          createdAt: new Date("2026-01-01"),
        })
        .mockResolvedValueOnce({
          id: "split-2",
          totalAmount: 200,
          status: "active",
          participants: [{}, {}],
          createdAt: new Date("2026-01-01"),
        });

      await processor.handleSplitBatch(mockJob);

      expect(batchOperationRepository.find).toHaveBeenCalledWith({
        where: {
          batch_id: "batch-1",
          status: BatchOperationStatus.PENDING,
        },
        order: { operation_index: "ASC" },
      });
      expect(splitsService.createSplit).toHaveBeenCalledTimes(2);
      expect(mockJob.progress).toHaveBeenCalled();
    });

    it("should handle empty operations", async () => {
      const mockJob = {
        id: "job-1",
        data: {
          batchId: "batch-1",
          chunkSize: 10,
          concurrency: 5,
        },
        progress: jest.fn(),
      } as unknown as Job;

      (batchOperationRepository.find as jest.Mock).mockResolvedValue([]);

      await processor.handleSplitBatch(mockJob);

      expect(batchOperationRepository.find).toHaveBeenCalled();
    });
  });

  describe("processOperation", () => {
    it("should process single split successfully and call SplitsService.createSplit", async () => {
      const operation = {
        id: "op-1",
        payload: {
          totalAmount: 100,
          participants: [
            { userId: "user1", amount: 50 },
            { userId: "user2", amount: 50 },
          ],
          description: "Test split",
          preferredCurrency: "USD",
          creatorWalletAddress: "GABC123",
        },
      };

      (batchProgressService.markOperationStarted as jest.Mock).mockResolvedValue(undefined);
      (batchProgressService.markOperationCompleted as jest.Mock).mockResolvedValue(undefined);
      (splitsService.createSplit as jest.Mock).mockResolvedValue({
        id: "split-real-1",
        totalAmount: 100,
        status: "active",
        participants: [{}, {}],
        createdAt: new Date("2026-01-01"),
      });

      await (processor as any).processOperation(operation);

      expect(batchProgressService.markOperationStarted).toHaveBeenCalledWith("op-1");
      expect(splitsService.createSplit).toHaveBeenCalledWith({
        totalAmount: 100,
        description: "Test split",
        creatorWalletAddress: "GABC123",
        preferredCurrency: "USD",
        participants: [
          { userId: "user1", amountOwed: 50, walletAddress: undefined },
          { userId: "user2", amountOwed: 50, walletAddress: undefined },
        ],
      });
      expect(batchProgressService.markOperationCompleted).toHaveBeenCalledWith("op-1", {
        splitId: "split-real-1",
        totalAmount: 100,
        participantCount: 2,
        status: "active",
        createdAt: expect.any(String),
      });
    });

    it("should handle processing errors from validation", async () => {
      const operation = {
        id: "op-1",
        payload: {
          totalAmount: 100,
          participants: [], // Invalid - no participants
        },
      };

      (batchProgressService.markOperationStarted as jest.Mock).mockResolvedValue(undefined);
      (batchProgressService.markOperationFailed as jest.Mock).mockResolvedValue(undefined);

      await (processor as any).processOperation(operation);

      expect(batchProgressService.markOperationFailed).toHaveBeenCalledWith(
        "op-1",
        expect.any(String),
        "VALIDATION_ERROR",
      );
      expect(splitsService.createSplit).not.toHaveBeenCalled();
    });

    it("should handle service errors and mark operation as failed", async () => {
      const operation = {
        id: "op-1",
        payload: {
          totalAmount: 100,
          participants: [
            { userId: "user1", amount: 50 },
            { userId: "user2", amount: 50 },
          ],
        },
      };

      (batchProgressService.markOperationStarted as jest.Mock).mockResolvedValue(undefined);
      (batchProgressService.markOperationFailed as jest.Mock).mockResolvedValue(undefined);
      (splitsService.createSplit as jest.Mock).mockRejectedValue(
        new Error("Database constraint violation"),
      );

      await (processor as any).processOperation(operation);

      expect(batchProgressService.markOperationFailed).toHaveBeenCalledWith(
        "op-1",
        "Database constraint violation",
        "UNKNOWN_ERROR",
      );
      expect(batchProgressService.markOperationCompleted).not.toHaveBeenCalled();
    });
  });

  describe("partial failure handling", () => {
    it("should report per-item success and failure in a mixed batch", async () => {
      const mockJob = {
        id: "job-1",
        data: {
          batchId: "batch-1",
          chunkSize: 3,
          concurrency: 1,
        },
        progress: jest.fn(),
      } as unknown as Job;

      const mockOperations = [
        {
          id: "op-success",
          payload: {
            totalAmount: 100,
            participants: [{ userId: "user1", amount: 100 }],
          },
        },
        {
          id: "op-fail-validation",
          payload: {
            totalAmount: 0, // Invalid amount
            participants: [{ userId: "user1", amount: 0 }],
          },
        },
        {
          id: "op-fail-service",
          payload: {
            totalAmount: 200,
            participants: [{ userId: "user2", amount: 200 }],
          },
        },
      ];

      (batchOperationRepository.find as jest.Mock).mockResolvedValue(mockOperations);
      (batchProgressService.markOperationStarted as jest.Mock).mockResolvedValue(undefined);
      (batchProgressService.markOperationCompleted as jest.Mock).mockResolvedValue(undefined);
      (batchProgressService.markOperationFailed as jest.Mock).mockResolvedValue(undefined);

      // First operation succeeds, third fails at service level
      (splitsService.createSplit as jest.Mock)
        .mockResolvedValueOnce({
          id: "split-ok",
          totalAmount: 100,
          status: "active",
          participants: [{}],
          createdAt: new Date("2026-01-01"),
        })
        .mockRejectedValueOnce(new Error("Insufficient funds"));

      await processor.handleSplitBatch(mockJob);

      // op-success: completed
      expect(batchProgressService.markOperationCompleted).toHaveBeenCalledWith(
        "op-success",
        expect.objectContaining({ splitId: "split-ok" }),
      );

      // op-fail-validation: failed (validation error before calling service)
      expect(batchProgressService.markOperationFailed).toHaveBeenCalledWith(
        "op-fail-validation",
        expect.any(String),
        "VALIDATION_ERROR",
      );

      // op-fail-service: failed (service threw)
      expect(batchProgressService.markOperationFailed).toHaveBeenCalledWith(
        "op-fail-service",
        "Insufficient funds",
        "UNKNOWN_ERROR",
      );

      // SplitsService called only for the valid operations (op-success and op-fail-service)
      expect(splitsService.createSplit).toHaveBeenCalledTimes(2);
    });

    it("should not fail the entire batch when one item fails", async () => {
      const mockJob = {
        id: "job-1",
        data: {
          batchId: "batch-1",
          chunkSize: 2,
          concurrency: 1,
        },
        progress: jest.fn(),
      } as unknown as Job;

      const mockOperations = [
        {
          id: "op-good",
          payload: {
            totalAmount: 50,
            participants: [{ userId: "user1", amount: 50 }],
          },
        },
        {
          id: "op-bad",
          payload: {
            totalAmount: 50,
            participants: [], // Invalid
          },
        },
      ];

      (batchOperationRepository.find as jest.Mock).mockResolvedValue(mockOperations);
      (batchProgressService.markOperationStarted as jest.Mock).mockResolvedValue(undefined);
      (batchProgressService.markOperationCompleted as jest.Mock).mockResolvedValue(undefined);
      (batchProgressService.markOperationFailed as jest.Mock).mockResolvedValue(undefined);
      (splitsService.createSplit as jest.Mock).mockResolvedValue({
        id: "split-good",
        totalAmount: 50,
        status: "active",
        participants: [{}],
        createdAt: new Date("2026-01-01"),
      });

      // Should NOT throw — partial failures are handled per-item
      await expect(processor.handleSplitBatch(mockJob)).resolves.toBeUndefined();

      // The batch is updated to 'processing' at start, but should NOT be updated to FAILED
      // after partial item failures (the error path in the catch block)
      expect(batchJobRepository.update).not.toHaveBeenCalledWith(
        "batch-1",
        expect.objectContaining({ status: "failed" }),
      );
    });
  });
});
