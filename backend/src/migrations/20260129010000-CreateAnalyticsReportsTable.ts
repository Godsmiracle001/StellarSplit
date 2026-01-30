import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateAnalyticsReportsTable20260129010000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "analytics_reports",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          { name: "userId", type: "varchar", isNullable: true },
          { name: "type", type: "varchar", isNullable: false },
          { name: "params", type: "jsonb", default: "'{}'" },
          { name: "status", type: "varchar", default: "'pending'" },
          { name: "filePath", type: "varchar", isNullable: true },
          { name: "fileName", type: "varchar", isNullable: true },
          { name: "error", type: "text", isNullable: true },
          {
            name: "createdAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("analytics_reports", true);
  }
}
