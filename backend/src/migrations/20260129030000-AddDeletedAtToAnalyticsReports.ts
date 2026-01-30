import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddDeletedAtToAnalyticsReports20260129030000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "analytics_reports",
      new TableColumn({
        name: "deleted_at",
        type: "timestamp",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("analytics_reports", "deleted_at");
  }
}
