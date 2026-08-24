import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { getRedisUrl } from '../config/redis.config';
import { Participant } from '../entities/participant.entity';
import { Split } from '../entities/split.entity';
import { Activity } from '../entities/activity.entity';
import { DashboardSummaryDto, DashboardActivityDto, QuickAction } from './dto/dashboard.dto';

@Injectable()
export class DashboardService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DashboardService.name);
  private redis: Redis | null = null;
  private redisAvailable = false;
  
  // Local in-memory cache fallback when Redis is down
  private readonly fallbackCache = new Map<string, { summary: DashboardSummaryDto; expiresAt: number }>();
  private readonly REDIS_TTL_S = 15; // 15 seconds TTL
  private readonly CACHE_TTL_MS = 15000;

  constructor(
    @InjectRepository(Participant)
    private readonly participantRepo: Repository<Participant>,
    @InjectRepository(Split)
    private readonly splitRepo: Repository<Split>,
    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = getRedisUrl(this.configService);
    try {
      this.redis = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        connectTimeout: 5000,
        enableOfflineQueue: false,
      });

      this.redis.on('error', (err: Error) => {
        if (this.redisAvailable) {
          this.logger.warn(`Dashboard Redis connection error: ${err.message}`);
        }
        this.redisAvailable = false;
      });

      this.redis.on('connect', () => {
        this.redisAvailable = true;
        this.logger.log('Dashboard Redis connected');
      });

      this.redis.on('close', () => {
        this.redisAvailable = false;
      });

      await this.redis.connect();
    } catch (err: any) {
      this.logger.warn(`Dashboard Redis unavailable — using fallback. ${err.message}`);
      this.redisAvailable = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit().catch(() => this.redis?.disconnect());
      this.redis = null;
      this.redisAvailable = false;
      this.logger.log('Dashboard Redis connection closed');
    }
  }

  /**
   * Evicts the cached summary for a user from both Redis and local cache.
   * Exposes a mutation-triggered invalidation path.
   */
  async invalidateSummary(userId: string): Promise<void> {
    const key = `dashboard:summary:${userId}`;
    this.fallbackCache.delete(userId);
    if (this.redis && this.redisAvailable) {
      try {
        await this.redis.del(key);
        this.logger.log(`Invalidated dashboard summary cache (Redis) for user ${userId}`);
      } catch (err: any) {
        this.logger.warn(`Failed to invalidate Redis cache for user ${userId}: ${err.message}`);
      }
    }
  }

  async getSummary(userId: string): Promise<DashboardSummaryDto> {
    const key = `dashboard:summary:${userId}`;

    // 1. Try serving from Redis Cache
    if (this.redis && this.redisAvailable) {
      try {
        const cached = await this.redis.get(key);
        if (cached) {
          this.logger.log(`Dashboard summary cache HIT (Redis) for user ${userId}`);
          return JSON.parse(cached) as DashboardSummaryDto;
        }
      } catch (err: any) {
        this.logger.warn(`Failed to read from Redis for user ${userId}: ${err.message}`);
      }
    }

    // 2. Try serving from Local In-Memory Fallback Cache
    const now = Date.now();
    const inMemoryCached = this.fallbackCache.get(userId);
    if (inMemoryCached && inMemoryCached.expiresAt > now) {
      this.logger.log(`Dashboard summary cache HIT (In-Memory) for user ${userId}`);
      return inMemoryCached.summary;
    }

    this.logger.log(`Dashboard summary cache MISS for user ${userId}`);

    // Run all aggregation queries in parallel for efficiency
    const [owedResult, owedToUserResult, activeSplitsCount, splitsCreatedCount, unreadCount] =
      await Promise.all([
        // Total the user owes (amountOwed - amountPaid) across non-completed splits
        this.participantRepo
          .createQueryBuilder('p')
          .select('COALESCE(SUM((p.amountOwed - p.amountPaid)::numeric), 0)', 'total')
          .innerJoin(Split, 's', 's.id = p.splitId')
          .where('p.userId = :userId', { userId })
          .andWhere("p.status != 'paid'")
          .andWhere("s.status != 'completed'")
          .andWhere('s.deletedAt IS NULL')
          .getRawOne<{ total: string }>(),

        // Total owed to the user: sum of what others owe on splits the user created
        this.participantRepo
          .createQueryBuilder('p')
          .select('COALESCE(SUM((p.amountOwed - p.amountPaid)::numeric), 0)', 'total')
          .innerJoin(Split, 's', 's.id = p.splitId')
          .where('s.creatorWalletAddress = :userId', { userId })
          .andWhere('p.userId != :userId', { userId })
          .andWhere("p.status != 'paid'")
          .andWhere("s.status != 'completed'")
          .andWhere('s.deletedAt IS NULL')
          .getRawOne<{ total: string }>(),

        // Active splits the user participates in
        this.participantRepo
          .createQueryBuilder('p')
          .innerJoin(Split, 's', 's.id = p.splitId')
          .where('p.userId = :userId', { userId })
          .andWhere("s.status != 'completed'")
          .andWhere('s.deletedAt IS NULL')
          .getCount(),

        // Splits the user created that are still active
        this.splitRepo
          .createQueryBuilder('s')
          .where('s.creatorWalletAddress = :userId', { userId })
          .andWhere("s.status != 'completed'")
          .andWhere('s.deletedAt IS NULL')
          .getCount(),

        // Unread activity count
        this.activityRepo.count({ where: { userId, isRead: false } }),
      ]);

    const totalOwed = parseFloat(owedResult?.total ?? '0');
    const totalOwedToUser = parseFloat(owedToUserResult?.total ?? '0');

    const quickActions: QuickAction[] = [
      { id: 'new-split', label: 'New Split', route: '/splits/new' },
      { id: 'my-splits', label: 'My Splits', route: '/splits', badge: activeSplitsCount },
      { id: 'activity', label: 'Activity', route: '/activity', badge: unreadCount || undefined },
      { id: 'analytics', label: 'Analytics', route: '/analytics' },
    ];

    const summary: DashboardSummaryDto = {
      totalOwed,
      totalOwedToUser,
      activeSplits: activeSplitsCount,
      splitsCreated: splitsCreatedCount,
      unreadNotifications: unreadCount,
      quickActions,
    };

    // 3. Write back to Redis Cache
    if (this.redis && this.redisAvailable) {
      try {
        await this.redis.set(key, JSON.stringify(summary), 'EX', this.REDIS_TTL_S);
      } catch (err: any) {
        this.logger.warn(`Failed to write to Redis for user ${userId}: ${err.message}`);
      }
    }

    // 4. Write back to Local In-Memory Fallback Cache & evict stale entries
    for (const [k, v] of this.fallbackCache.entries()) {
      if (v.expiresAt <= now) {
        this.fallbackCache.delete(k);
      }
    }
    this.fallbackCache.set(userId, {
      summary,
      expiresAt: now + this.CACHE_TTL_MS,
    });

    return summary;
  }

  async getActivity(
    userId: string,
    page: number,
    limit: number,
  ): Promise<DashboardActivityDto> {
    const [data, total] = await this.activityRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const unreadCount = await this.activityRepo.count({
      where: { userId, isRead: false },
    });

    return {
      data: data.map((a) => ({
        id: a.id,
        activityType: a.activityType,
        splitId: a.splitId,
        metadata: a.metadata,
        isRead: a.isRead,
        createdAt: a.createdAt,
      })),
      total,
      page,
      limit,
      hasMore: page * limit < total,
      unreadCount,
    };
  }
}
