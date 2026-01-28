import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from "typeorm";

export class CreateRecurringSplitsTable1674316800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "recurring_splits",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            default: "gen_random_uuid()",
          },
          {
            name: "creator_id",
            type: "varchar",
            isNullable: false,
          },
          {
            name: "template_split_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "frequency",
            type: "varchar",
            isNullable: false,
            default: "'monthly'",
          },
          {
            name: "next_occurrence",
            type: "timestamp",
            isNullable: false,
          },
          {
            name: "end_date",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "is_active",
            type: "boolean",
            default: true,
            isNullable: false,
          },
          {
            name: "auto_remind",
            type: "boolean",
            default: true,
            isNullable: false,
          },
          {
            name: "reminder_days_before",
            type: "int",
            default: 1,
            isNullable: false,
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "CURRENT_TIMESTAMP",
            onUpdate: "CURRENT_TIMESTAMP",
            isNullable: false,
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ["template_split_id"],
            referencedTableName: "splits",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          }),
        ],
      }),
      true,
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      "recurring_splits",
      new TableIndex({
        name: "idx_recurring_splits_creator_id",
        columnNames: ["creator_id"],
      }),
    );

    await queryRunner.createIndex(
      "recurring_splits",
      new TableIndex({
        name: "idx_recurring_splits_template_split_id",
        columnNames: ["template_split_id"],
      }),
    );

    await queryRunner.createIndex(
      "recurring_splits",
      new TableIndex({
        name: "idx_recurring_splits_is_active",
        columnNames: ["is_active"],
      }),
    );

    await queryRunner.createIndex(
      "recurring_splits",
      new TableIndex({
        name: "idx_recurring_splits_next_occurrence",
        columnNames: ["next_occurrence"],
      }),
    );

    await queryRunner.createIndex(
      "recurring_splits",
      new TableIndex({
        name: "idx_recurring_splits_active_next_occurrence",
        columnNames: ["is_active", "next_occurrence"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("recurring_splits", true);
  }
}
