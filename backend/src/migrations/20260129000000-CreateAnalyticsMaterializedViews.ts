import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAnalyticsMaterializedViews20260129000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Spending trends materialized view (monthly aggregates)
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_spending_trends_monthly AS
      SELECT
        p.userId::varchar AS user_id,
        date_trunc('month', payment."createdAt") AS period,
        SUM(payment.amount::numeric) AS total_spent,
        COUNT(*) AS tx_count,
        AVG(payment.amount::numeric) AS avg_tx_amount
      FROM payments payment
      INNER JOIN participants p ON p.id = payment."participantId"
      WHERE payment.status = 'confirmed'
      GROUP BY user_id, period;
    `);

    // Unique index required for CONCURRENTLY refresh
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_spending_trends_monthly_user_period
      ON analytics_spending_trends_monthly (user_id, period);
    `);

    // Category breakdown materialized view (monthly)
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_category_spend AS
      SELECT
        p.userId::varchar AS user_id,
        COALESCE(i.category, 'uncategorized') AS category,
        date_trunc('month', sp."createdAt") AS period,
        SUM(i.totalPrice::numeric) AS total_by_category
      FROM items i
      INNER JOIN splits sp ON i."splitId" = sp.id
      INNER JOIN participants p ON p."splitId" = sp.id
      GROUP BY user_id, category, period;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_category_spend_user_period ON analytics_category_spend (user_id, period);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "DROP MATERIALIZED VIEW IF EXISTS analytics_spending_trends_monthly",
    );
    await queryRunner.query(
      "DROP MATERIALIZED VIEW IF EXISTS analytics_category_spend",
    );
  }
}
