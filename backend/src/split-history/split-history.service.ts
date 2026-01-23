import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SplitHistory,SplitRole } from './entities/split-history.entity';


@Injectable()
export class SplitHistoryService {
  constructor(
    @InjectRepository(SplitHistory)
    private readonly repo: Repository<SplitHistory>,
  ) {}

  async getUserHistory(wallet: string) {
    return this.repo.find({
      where: { userId: wallet },
      relations: ['split'],
      order: { completionTime: 'DESC' },
    });
  }

  async getUserStats(wallet: string) {
    const qb = this.repo.createQueryBuilder('sh');

    const [created, participated] = await Promise.all([
      qb.clone()
        .where('sh.userId = :wallet', { wallet })
        .andWhere('sh.role = :role', { role: SplitRole.CREATOR })
        .getCount(),

      qb.clone()
        .where('sh.userId = :wallet', { wallet })
        .andWhere('sh.role = :role', { role: SplitRole.PARTICIPANT })
        .getCount(),
    ]);

    const avgAmount = await qb
      .clone()
      .select('AVG(sh.finalAmount)', 'avg')
      .where('sh.userId = :wallet', { wallet })
      .getRawOne();

    const totalAmount = await qb
      .clone()
      .select('SUM(sh.finalAmount)', 'total')
      .where('sh.userId = :wallet', { wallet })
      .getRawOne();

    const frequentPartners = await qb
      .clone()
      .select('other.userId', 'partner')
      .addSelect('COUNT(*)', 'count')
      .innerJoin(
        SplitHistory,
        'other',
        'other.splitId = sh.splitId AND other.userId != sh.userId',
      )
      .where('sh.userId = :wallet', { wallet })
      .groupBy('other.userId')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalSplitsCreated: created,
      totalSplitsParticipated: participated,
      averageSplitAmount: avgAmount?.avg ?? 0,
      totalAmount: totalAmount?.total ?? 0,
      mostFrequentPartners: frequentPartners,
    };
  }
}
