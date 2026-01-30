import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueIndexToCategorySpend20260129020000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_category_spend_user_category_period
      ON analytics_category_spend (user_id, category, period);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_analytics_category_spend_user_category_period;
    `);
  }
}
