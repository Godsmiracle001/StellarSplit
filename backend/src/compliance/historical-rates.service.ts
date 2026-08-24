import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import { HistoricalRateCache } from './entities/historical-rate-cache.entity';

@Injectable()
export class HistoricalRatesService {
  private readonly logger = new Logger(HistoricalRatesService.name);
  private readonly apiUrl = 'https://api.coingecko.com/api/v3/coins/stellar/history';

  /** Total attempts against CoinGecko before giving up. */
  private readonly maxAttempts = 3;
  /** First backoff delay; doubles per retry (250ms, then 500ms). */
  private readonly baseBackoffMs = 250;

  constructor(
    @InjectRepository(HistoricalRateCache)
    private readonly rateRepo: Repository<HistoricalRateCache>,
  ) {}

  /**
   * Historical price of XLM in a target currency on a specific date.
   *
   * Reads from the persistent cache first. The previous implementation used a
   * `Map` on the service instance, which meant the cache died with the process
   * and every horizontally-scaled replica kept its own copy — multiplying calls
   * to a rate-limited third-party API. Rows here never expire, because a
   * closing price for a past date does not change.
   *
   * @param date Date of the split.
   * @param currency Target fiat currency, e.g. 'USD' or 'EUR'.
   */
  async getXlmPrice(date: Date, currency: string = 'usd'): Promise<number> {
    const dateStr = this.toDateString(date);
    const normalizedCurrency = currency.toLowerCase();

    const cached = await this.rateRepo.findOne({
      where: { date: dateStr, currency: normalizedCurrency },
    });

    if (cached) {
      // `decimal` columns come back as strings from the driver, so this must be
      // coerced rather than returned as-is.
      return Number(cached.rate);
    }

    const price = await this.fetchPriceWithRetry(dateStr, normalizedCurrency);
    await this.persist(dateStr, normalizedCurrency, price);
    return price;
  }

  /** Converts an XLM amount to fiat using the historical rate for `date`. */
  async convertXlmToFiat(
    amountXlm: number,
    date: Date,
    currency: string = 'usd',
  ): Promise<number> {
    const rate = await this.getXlmPrice(date, currency);
    return amountXlm * rate;
  }

  /**
   * Fetch from CoinGecko, retrying transient failures with exponential backoff.
   *
   * Only transient conditions are retried. Retrying a 404 or a malformed-request
   * 400 cannot succeed and would just delay the error by the full backoff while
   * consuming rate-limit budget; a 429 or 5xx, by contrast, is usually gone on
   * the next attempt.
   */
  private async fetchPriceWithRetry(
    dateStr: string,
    currency: string,
  ): Promise<number> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        return await this.fetchPrice(dateStr, currency);
      } catch (error) {
        lastError = error;

        if (!this.isRetryable(error) || attempt === this.maxAttempts) {
          break;
        }

        const delayMs = this.baseBackoffMs * 2 ** (attempt - 1);
        this.logger.warn(
          `CoinGecko attempt ${attempt}/${this.maxAttempts} failed for ${dateStr} (${currency}); retrying in ${delayMs}ms`,
        );
        await this.sleep(delayMs);
      }
    }

    const reason =
      lastError instanceof Error ? lastError.message : 'unknown provider error';
    this.logger.error(
      `Failed to fetch historical rate for ${dateStr} (${currency}) after ${this.maxAttempts} attempts: ${reason}`,
    );

    throw new ServiceUnavailableException(
      `Could not fetch historical rate for ${dateStr}: ${reason}`,
    );
  }

  private async fetchPrice(dateStr: string, currency: string): Promise<number> {
    // CoinGecko expects dd-mm-yyyy.
    const [year, month, day] = dateStr.split('-');

    const response = await axios.get(this.apiUrl, {
      timeout: 5000,
      params: {
        date: `${day}-${month}-${year}`,
        localization: 'false',
      },
      headers: {
        'User-Agent': 'StellarSplit-Historical-Rates/1.0',
      },
    });

    const price = Number(
      response.data?.market_data?.current_price?.[currency],
    );

    // CoinGecko omits currencies it has no data for, which previously cached
    // `undefined` as the rate and produced NaN in exported figures.
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(
        `Provider returned no usable ${currency.toUpperCase()} price for ${dateStr}`,
      );
    }

    return price;
  }

  /**
   * Persist a fetched rate.
   *
   * A concurrent fetch of the same date on another replica can insert first, so
   * a unique-constraint violation here is an expected race and not a failure —
   * the value is identical either way, and failing a tax export over it would
   * be absurd.
   */
  private async persist(
    dateStr: string,
    currency: string,
    rate: number,
  ): Promise<void> {
    try {
      await this.rateRepo
        .createQueryBuilder()
        .insert()
        .into(HistoricalRateCache)
        .values({
          date: dateStr,
          currency,
          rate,
          source: 'CoinGecko',
          fetchedAt: new Date(),
        })
        .orIgnore()
        .execute();
    } catch (error) {
      // Never let a cache write failure break the caller: the rate is already
      // in hand and correct.
      this.logger.warn(
        `Could not persist historical rate for ${dateStr} (${currency}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private isRetryable(error: unknown): boolean {
    if (!axios.isAxiosError(error)) {
      // Includes the "no usable price" case above, which is a data problem
      // rather than a transient one.
      return false;
    }

    // No response at all: timeout, DNS, connection reset.
    if (!error.response) {
      return true;
    }

    const status = error.response.status;
    return status === 429 || status >= 500;
  }

  /**
   * Uses `unref` so a pending backoff cannot hold the process open — the
   * previous absence of this is a common cause of hanging test runs.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);
      timer.unref?.();
    });
  }

  /** `YYYY-MM-DD` in UTC, matching the entity's `date` column. */
  toDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Fetches historical rates for a batch of dates.
   * Deduplicates lookups, limits concurrency to avoid rate limits,
   * and handles failures gracefully by returning null for failed dates.
   */
  async getXlmPricesForDates(
    dates: Date[],
    currency: string = 'usd',
  ): Promise<Map<string, number | null>> {
    const normalizedCurrency = currency.toLowerCase();

    // Group and deduplicate by date string
    const dateMap = new Map<string, Date>();
    for (const date of dates) {
      const dateStr = this.toDateString(date);
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, date);
      }
    }

    const uniqueDateStrs = Array.from(dateMap.keys());
    const result = new Map<string, number | null>();

    // Limit concurrency to 2 to stay well under rate limits
    const limit = pLimit(2);

    const promises = uniqueDateStrs.map((dateStr) => {
      return limit(async () => {
        try {
          const dateObj = dateMap.get(dateStr)!;
          const price = await this.getXlmPrice(dateObj, normalizedCurrency);
          result.set(dateStr, price);
        } catch (error) {
          this.logger.warn(
            `Failed to fetch historical rate for date ${dateStr} during batch export: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          result.set(dateStr, null);
        }
      });
    });

    await Promise.all(promises);
    return result;
  }
}

/**
 * A simple concurrency limiter helper.
 */
function pLimit(concurrency: number) {
  const queue: (() => void)[] = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()!();
    }
  };

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        activeCount++;
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          next();
        }
      };

      if (activeCount < concurrency) {
        run();
      } else {
        queue.push(run);
      }
    });
  };
}
