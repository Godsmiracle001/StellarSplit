import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateActivitiesTable1737684000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "activities",
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
                        name: "activityType",
                        type: "enum",
                        enum: [
                            "split_created",
                            "participant_added",
                            "payment_made",
                            "payment_received",
                            "split_completed",
                            "reminder_sent",
                            "split_edited",
                        ],
                        isNullable: false,
                    },
                    {
                        name: "splitId",
                        type: "uuid",
                        isNullable: true,
                    },
                    {
                        name: "metadata",
                        type: "jsonb",
                        default: "'{}'",
                        isNullable: false,
                    },
                    {
                        name: "isRead",
                        type: "boolean",
                        default: false,
                        isNullable: false,
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

        // Create composite index for userId and createdAt (most common query)
        await queryRunner.createIndex(
            "activities",
            new TableIndex({
                name: "idx_activities_userId_createdAt",
                columnNames: ["userId", "createdAt"],
            }),
        );

        // Create composite index for userId and activityType (filtering)
        await queryRunner.createIndex(
            "activities",
            new TableIndex({
                name: "idx_activities_userId_activityType",
                columnNames: ["userId", "activityType"],
            }),
        );

        // Create composite index for userId and isRead (unread count queries)
        await queryRunner.createIndex(
            "activities",
            new TableIndex({
                name: "idx_activities_userId_isRead",
                columnNames: ["userId", "isRead"],
            }),
        );

        // Create index for splitId (filtering by split)
        await queryRunner.createIndex(
            "activities",
            new TableIndex({
                name: "idx_activities_splitId",
                columnNames: ["splitId"],
            }),
        );

        // Create standalone index for userId
        await queryRunner.createIndex(
            "activities",
            new TableIndex({
                name: "idx_activities_userId",
                columnNames: ["userId"],
            }),
        );

        // Create standalone index for activityType
        await queryRunner.createIndex(
            "activities",
            new TableIndex({
                name: "idx_activities_activityType",
                columnNames: ["activityType"],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("activities", true);
    }
}
