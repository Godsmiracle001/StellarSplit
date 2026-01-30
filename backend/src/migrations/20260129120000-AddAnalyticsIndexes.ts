import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAnalyticsIndexes20260129120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants ("userId");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_items_split_id ON items ("splitId");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_items_category ON items (category);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_splits_created_at ON splits ("createdAt");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_payments_status_created_at ON payments (status, "createdAt");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_payments_participant_id_created_at ON payments ("participantId", "createdAt");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_participants_user_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_items_split_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_items_category;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_splits_created_at;`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_payments_status_created_at;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_payments_participant_id_created_at;`,
    );
  }
}
