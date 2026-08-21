import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateHistoricalRateCache20260820120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'historical_rate_cache',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'rate',
            type: 'decimal',
            precision: 18,
            scale: 8,
            isNullable: false,
          },
          {
            name: 'source',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'fetchedAt',
            type: 'timestamp',
            isNullable: false,
          },
        ],
        indices: [
          {
            name: 'IDX_historical_rate_date',
            columnNames: ['date'],
          },
        ],
        uniques: [
          {
            // One rate per calendar date and currency. This is what makes the
            // upsert on write safe when two instances fetch the same date
            // concurrently: the second insert conflicts instead of creating a
            // duplicate row.
            name: 'UQ_historical_rate_date_currency',
            columnNames: ['date', 'currency'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('historical_rate_cache', true);
  }
}
