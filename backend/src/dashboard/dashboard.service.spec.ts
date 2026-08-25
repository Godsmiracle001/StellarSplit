import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { DashboardService } from './dashboard.service';
import { Participant } from '../entities/participant.entity';
import { Split } from '../entities/split.entity';
import { Activity } from '../entities/activity.entity';

// Mock ioredis
jest.mock('ioredis');

describe('DashboardService Caching', () => {
  let service: DashboardService;
  let participantRepo: Repository<Participant>;
  let splitRepo: Repository<Split>;
  let activityRepo: Repository<Activity>;

  const mockParticipantQb = {
    select: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ total: '150.00' }),
    getCount: jest.fn().mockResolvedValue(5),
  };

  const mockParticipantRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockParticipantQb),
  };

  const mockSplitQb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(3),
  };

  const mockSplitRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(mockSplitQb),
  };

  const mockActivityRepo = {
    count: jest.fn().mockResolvedValue(2),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('redis://localhost:6379'),
  };

  let mockRedisInstance: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRedisInstance = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      on: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
    };

    (Redis as any).mockImplementation(() => mockRedisInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(Participant),
          useValue: mockParticipantRepo,
        },
        {
          provide: getRepositoryToken(Split),
          useValue: mockSplitRepo,
        },
        {
          provide: getRepositoryToken(Activity),
          useValue: mockActivityRepo,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    participantRepo = module.get<Repository<Participant>>(getRepositoryToken(Participant));
    splitRepo = module.get<Repository<Split>>(getRepositoryToken(Split));
    activityRepo = module.get<Repository<Activity>>(getRepositoryToken(Activity));
  });

  describe('onModuleInit and onModuleDestroy', () => {
    it('should connect to Redis successfully', async () => {
      await service.onModuleInit();
      expect(mockRedisInstance.connect).toHaveBeenCalled();
    });
  });

  describe('getSummary with Redis Cache', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      (service as any).redisAvailable = true;
    });

    it('should query DB on cache miss and write to Redis', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await service.getSummary('user-1');

      expect(result.totalOwed).toBe(150.00);
      expect(result.activeSplits).toBe(5);
      expect(result.splitsCreated).toBe(3);
      expect(result.unreadNotifications).toBe(2);

      // Verify DB queries ran
      expect(participantRepo.createQueryBuilder).toHaveBeenCalled();
      expect(splitRepo.createQueryBuilder).toHaveBeenCalled();
      expect(activityRepo.count).toHaveBeenCalled();

      // Verify it was set in Redis
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'dashboard:summary:user-1',
        expect.any(String),
        'EX',
        15
      );
    });

    it('should return cached data on cache hit without running DB queries', async () => {
      const cachedSummary = {
        totalOwed: 50.00,
        totalOwedToUser: 100.00,
        activeSplits: 1,
        splitsCreated: 2,
        unreadNotifications: 0,
        quickActions: [],
      };
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(cachedSummary));

      const result = await service.getSummary('user-1');

      expect(result.totalOwed).toBe(50.00);
      expect(result.totalOwedToUser).toBe(100.00);
      expect(result.activeSplits).toBe(1);

      // Verify DB queries did NOT run
      expect(participantRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(splitRepo.createQueryBuilder).not.toHaveBeenCalled();
      expect(activityRepo.count).not.toHaveBeenCalled();
    });
  });

  describe('getSummary with Local In-Memory Fallback Cache', () => {
    beforeEach(() => {
      // Force Redis down
      (service as any).redisAvailable = false;
    });

    it('should use local in-memory fallback on second call (cache hit)', async () => {
      // First call (cache miss)
      const result1 = await service.getSummary('user-2');
      expect(result1.totalOwed).toBe(150.00);
      expect(participantRepo.createQueryBuilder).toHaveBeenCalledTimes(3);

      jest.clearAllMocks();

      // Second call (cache hit)
      const result2 = await service.getSummary('user-2');
      expect(result2.totalOwed).toBe(150.00);
      expect(participantRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should expire in-memory cache when TTL is exceeded', async () => {
      // First call
      await service.getSummary('user-3');
      expect(participantRepo.createQueryBuilder).toHaveBeenCalled();

      jest.clearAllMocks();

      // Advance time beyond 15 seconds TTL
      const entry = (service as any).fallbackCache.get('user-3');
      if (entry) {
        entry.expiresAt = Date.now() - 1000;
      }

      // Second call should query DB again
      await service.getSummary('user-3');
      expect(participantRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('invalidateSummary', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      (service as any).redisAvailable = true;
    });

    it('should evict both Redis and in-memory caches', async () => {
      // Populate in-memory and trigger mock Redis get
      mockRedisInstance.get.mockResolvedValue(null);
      await service.getSummary('user-4');

      expect((service as any).fallbackCache.has('user-4')).toBe(true);

      // Invalidate
      await service.invalidateSummary('user-4');

      expect((service as any).fallbackCache.has('user-4')).toBe(false);
      expect(mockRedisInstance.del).toHaveBeenCalledWith('dashboard:summary:user-4');
    });
  });
});
