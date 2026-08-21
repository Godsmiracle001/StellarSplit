import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Persistent cache of historical XLM prices, one row per (date, currency).
 *
 * Deliberately shaped differently from `CurrencyRateCache`, which carries an
 * `expiresAt` because live rates go stale. A historical closing price for a
 * date in the past does not change, so these rows never expire: once fetched,
 * the value is correct forever and re-querying CoinGecko can only cost a rate
 * limit. Adding a TTL here would re-introduce exactly the repeated external
 * calls this cache exists to remove.
 */
@Entity()
@Unique('UQ_historical_rate_date_currency', ['date', 'currency'])
export class HistoricalRateCache {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Calendar date of the price, as `YYYY-MM-DD`.
   *
   * Stored as a `date` rather than a timestamp on purpose. A timestamp would
   * carry a time-of-day and timezone, so the same calendar day could resolve to
   * two different instants and produce two cache rows — or worse, a lookup miss
   * for a date that was already fetched.
   */
  @Index()
  @Column({ type: 'date' })
  date!: string;

  /** Lower-case ISO currency code, matching the CoinGecko response keys. */
  @Column()
  currency!: string;

  @Column('decimal', { precision: 18, scale: 8 })
  rate!: number;

  /** Provider the value came from, for auditability of exported tax figures. */
  @Column()
  source!: string;

  @Column()
  fetchedAt!: Date;
}
