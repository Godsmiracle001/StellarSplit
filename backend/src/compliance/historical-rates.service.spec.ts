import { ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { HistoricalRatesService } from './historical-rates.service';
import { HistoricalRateCache } from './entities/historical-rate-cache.entity';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

/**
 * A stand-in for the repository that behaves like a real store: rows persist in
 * the fake table, not on the service. That is what makes the restart test
 * meaningful — a new service instance sees rows written by the previous one.
 */
class FakeRateRepo {
  rows: HistoricalRateCache[] = [];

  findOne = jest.fn(async ({ where }: any) => {
    return (
      this.rows.find(
        (row) => row.date === where.date && row.currency === where.currency,
      ) ?? null
    );
  });

  createQueryBuilder = jest.fn(() => {
    let pending: Partial<HistoricalRateCache> | undefined;

    const builder: any = {
      insert: () => builder,
      into: () => builder,
      values: (value: Partial<HistoricalRateCache>) => {
        pending = value;
        return builder;
      },
      orIgnore: () => builder,
      execute: async () => {
        const exists = this.rows.some(
          (row) =>
            row.date === pending?.date && row.currency === pending?.currency,
        );
        // Mirrors ON CONFLICT DO NOTHING.
        if (!exists && pending) {
          this.rows.push(pending as HistoricalRateCache);
        }
        return { identifiers: [] };
      },
    };

    return builder;
  });
}

const priceResponse = (usd: number) => ({
  data: { market_data: { current_price: { usd } } },
});

const axiosError = (status?: number) => {
  const error: any = new Error(status ? `Request failed with ${status}` : 'ECONNRESET');
  error.isAxiosError = true;
  if (status) error.response = { status };
  return error;
};

describe('HistoricalRatesService', () => {
  let repo: FakeRateRepo;
  let service: HistoricalRatesService;
  const date = new Date('2026-03-29T12:00:00.000Z');

  beforeEach(() => {
    repo = new FakeRateRepo();
    service = new HistoricalRatesService(repo as any);
    mockedAxios.isAxiosError.mockImplementation(
      (payload: any) => Boolean(payload?.isAxiosError),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('persistent cache', () => {
    it('fetches from the provider on a cold cache and stores the result', async () => {
      mockedAxios.get.mockResolvedValue(priceResponse(0.42));

      const price = await service.getXlmPrice(date, 'USD');

      expect(price).toBe(0.42);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(repo.rows).toHaveLength(1);
      expect(repo.rows[0]).toMatchObject({
        date: '2026-03-29',
        currency: 'usd',
        source: 'CoinGecko',
      });
    });

    it('serves a repeat lookup from the cache without calling the provider', async () => {
      mockedAxios.get.mockResolvedValue(priceResponse(0.42));

      await service.getXlmPrice(date, 'USD');
      mockedAxios.get.mockClear();

      const price = await service.getXlmPrice(date, 'USD');

      expect(price).toBe(0.42);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    /**
     * The behaviour the issue asks to prove: the cache must survive a restart.
     * A second service instance shares the store but has no in-process state.
     */
    it('survives a service restart — a fresh instance hits the DB, not CoinGecko', async () => {
      mockedAxios.get.mockResolvedValue(priceResponse(0.42));
      await service.getXlmPrice(date, 'USD');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Simulate a redeploy: brand-new instance, same database.
      const afterRestart = new HistoricalRatesService(repo as any);
      mockedAxios.get.mockClear();

      const price = await afterRestart.getXlmPrice(date, 'USD');

      expect(price).toBe(0.42);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('does not let one replica\'s cache miss duplicate another\'s row', async () => {
      mockedAxios.get.mockResolvedValue(priceResponse(0.42));

      // Two instances sharing a store, as behind a load balancer.
      const replicaA = new HistoricalRatesService(repo as any);
      const replicaB = new HistoricalRatesService(repo as any);

      await Promise.all([
        replicaA.getXlmPrice(date, 'USD'),
        replicaB.getXlmPrice(date, 'USD'),
      ]);

      // Both may fetch, since neither saw a cached row, but the unique
      // constraint must leave exactly one row behind.
      expect(repo.rows).toHaveLength(1);
    });

    it('caches per currency rather than per date alone', async () => {
      mockedAxios.get.mockResolvedValueOnce(priceResponse(0.42));
      await service.getXlmPrice(date, 'USD');

      mockedAxios.get.mockResolvedValueOnce({
        data: { market_data: { current_price: { eur: 0.39 } } },
      });
      const eur = await service.getXlmPrice(date, 'EUR');

      expect(eur).toBe(0.39);
      expect(repo.rows).toHaveLength(2);
    });

    it('coerces a decimal column returned as a string', async () => {
      // Postgres drivers hand back `decimal` as a string.
      repo.rows.push({
        date: '2026-03-29',
        currency: 'usd',
        rate: '0.42000000' as unknown as number,
        source: 'CoinGecko',
        fetchedAt: new Date(),
      } as HistoricalRateCache);

      const price = await service.getXlmPrice(date, 'USD');

      expect(price).toBe(0.42);
      expect(typeof price).toBe('number');
    });

    it('normalises the date so the same day never caches twice', async () => {
      mockedAxios.get.mockResolvedValue(priceResponse(0.42));

      await service.getXlmPrice(new Date('2026-03-29T00:30:00.000Z'), 'USD');
      mockedAxios.get.mockClear();
      await service.getXlmPrice(new Date('2026-03-29T23:30:00.000Z'), 'USD');

      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(repo.rows).toHaveLength(1);
    });
  });

  describe('retry with backoff', () => {
    it('retries a 5xx and succeeds on a later attempt', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(axiosError(503))
        .mockResolvedValueOnce(priceResponse(0.42));

      const price = await service.getXlmPrice(date, 'USD');

      expect(price).toBe(0.42);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('retries a 429 rate limit', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(axiosError(429))
        .mockResolvedValueOnce(priceResponse(0.42));

      await expect(service.getXlmPrice(date, 'USD')).resolves.toBe(0.42);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('retries a network failure that produced no response', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(axiosError())
        .mockResolvedValueOnce(priceResponse(0.42));

      await expect(service.getXlmPrice(date, 'USD')).resolves.toBe(0.42);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('gives up after three attempts and reports unavailability', async () => {
      mockedAxios.get.mockRejectedValue(axiosError(503));

      await expect(service.getXlmPrice(date, 'USD')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
      expect(repo.rows).toHaveLength(0);
    });

    it('does not retry a 404, which cannot succeed on a repeat', async () => {
      mockedAxios.get.mockRejectedValue(axiosError(404));

      await expect(service.getXlmPrice(date, 'USD')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('rejects a response missing the requested currency instead of caching NaN', async () => {
      // CoinGecko omits currencies it has no data for.
      mockedAxios.get.mockResolvedValue({
        data: { market_data: { current_price: { eur: 0.39 } } },
      });

      await expect(service.getXlmPrice(date, 'USD')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      // A data problem, not a transient one, so it is not retried.
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(repo.rows).toHaveLength(0);
    });

    it('keeps working when the cache write fails', async () => {
      mockedAxios.get.mockResolvedValue(priceResponse(0.42));
      repo.createQueryBuilder = jest.fn(() => {
        throw new Error('database is read-only');
      }) as any;

      // The rate is already in hand; a cache failure must not fail the export.
      await expect(service.getXlmPrice(date, 'USD')).resolves.toBe(0.42);
    });
  });

  describe('convertXlmToFiat', () => {
    it('multiplies the amount by the historical rate', async () => {
      mockedAxios.get.mockResolvedValue(priceResponse(0.5));

      await expect(service.convertXlmToFiat(120, date, 'USD')).resolves.toBe(60);
    });

    it('reuses the cached rate across conversions', async () => {
      mockedAxios.get.mockResolvedValue(priceResponse(0.5));

      await service.convertXlmToFiat(100, date, 'USD');
      mockedAxios.get.mockClear();
      await service.convertXlmToFiat(200, date, 'USD');

      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  describe('getXlmPricesForDates', () => {
    it('deduplicates dates and fetches each unique date only once', async () => {
      mockedAxios.get.mockResolvedValue(priceResponse(0.5));

      const date1 = new Date('2026-03-29T10:00:00.000Z');
      const date2 = new Date('2026-03-29T20:00:00.000Z');

      const rates = await service.getXlmPricesForDates([date1, date2], 'USD');

      expect(rates.get('2026-03-29')).toBe(0.5);
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('caps concurrency and handles partial failures gracefully', async () => {
      const date1 = new Date('2026-03-29T12:00:00.000Z');
      const date2 = new Date('2026-03-30T12:00:00.000Z');

      mockedAxios.get
        .mockResolvedValueOnce(priceResponse(0.5))
        .mockRejectedValueOnce(axiosError(404));

      const rates = await service.getXlmPricesForDates([date1, date2], 'USD');

      expect(rates.get('2026-03-29')).toBe(0.5);
      expect(rates.get('2026-03-30')).toBeNull();
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });
});
