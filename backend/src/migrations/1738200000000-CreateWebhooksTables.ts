import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from "typeorm";

export class CreateWebhooksTables1738200000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create webhooks table
        await queryRunner.createTable(
            new Table({
                name: "webhooks",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        default: "gen_random_uuid()",
                    },
                    {
                        name: "userId",
                        type: "varchar",
                        isNullable: false,
                    },
                    {
                        name: "url",
                        type: "varchar",
                        length: "500",
                        isNullable: false,
                    },
                    {
                        name: "events",
                        type: "jsonb",
                        default: "'[]'",
                        isNullable: false,
                    },
                    {
                        name: "secret",
                        type: "varchar",
                        length: "255",
                        isNullable: false,
                    },
                    {
                        name: "isActive",
                        type: "boolean",
                        default: true,
                        isNullable: false,
                    },
                    {
                        name: "failureCount",
                        type: "integer",
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: "lastTriggeredAt",
                        type: "timestamp",
                        isNullable: true,
                    },
                    {
                        name: "createdAt",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                        isNullable: false,
                    },
                    {
                        name: "updatedAt",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

        // Create webhook_deliveries table
        await queryRunner.createTable(
            new Table({
                name: "webhook_deliveries",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        default: "gen_random_uuid()",
                    },
                    {
                        name: "webhookId",
                        type: "uuid",
                        isNullable: false,
                    },
                    {
                        name: "eventType",
                        type: "varchar",
                        isNullable: false,
                    },
                    {
                        name: "payload",
                        type: "jsonb",
                        isNullable: false,
                    },
                    {
                        name: "status",
                        type: "enum",
                        enum: ["pending", "success", "failed"],
                        default: "'pending'",
                        isNullable: false,
                    },
                    {
                        name: "attemptCount",
                        type: "integer",
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: "httpStatus",
                        type: "integer",
                        isNullable: true,
                    },
                    {
                        name: "responseBody",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "errorMessage",
                        type: "text",
                        isNullable: true,
                    },
                    {
                        name: "deliveredAt",
                        type: "timestamp",
                        isNullable: true,
                    },
                    {
                        name: "createdAt",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

        // Create foreign key for webhook_deliveries
        await queryRunner.createForeignKey(
            "webhook_deliveries",
            new TableForeignKey({
                columnNames: ["webhookId"],
                referencedColumnNames: ["id"],
                referencedTableName: "webhooks",
                onDelete: "CASCADE",
            }),
        );

        // Create indexes for webhooks table
        await queryRunner.createIndex(
            "webhooks",
            new TableIndex({
                name: "idx_webhooks_userId",
                columnNames: ["userId"],
            }),
        );

        await queryRunner.createIndex(
            "webhooks",
            new TableIndex({
                name: "idx_webhooks_isActive",
                columnNames: ["isActive"],
            }),
        );

        await queryRunner.createIndex(
            "webhooks",
            new TableIndex({
                name: "idx_webhooks_userId_isActive",
                columnNames: ["userId", "isActive"],
            }),
        );

        // Create indexes for webhook_deliveries table
        await queryRunner.createIndex(
            "webhook_deliveries",
            new TableIndex({
                name: "idx_webhook_deliveries_webhookId",
                columnNames: ["webhookId"],
            }),
        );

        await queryRunner.createIndex(
            "webhook_deliveries",
            new TableIndex({
                name: "idx_webhook_deliveries_status",
                columnNames: ["status"],
            }),
        );

        await queryRunner.createIndex(
            "webhook_deliveries",
            new TableIndex({
                name: "idx_webhook_deliveries_webhookId_status",
                columnNames: ["webhookId", "status"],
            }),
        );

        await queryRunner.createIndex(
            "webhook_deliveries",
            new TableIndex({
                name: "idx_webhook_deliveries_createdAt",
                columnNames: ["createdAt"],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("webhook_deliveries", true);
        await queryRunner.dropTable("webhooks", true);
    }
}
