import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateItemTable1769097834826 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "splitId" uuid NOT NULL,
                "name" character varying NOT NULL,
                "quantity" integer NOT NULL,
                "unitPrice" numeric(10,2) NOT NULL,
                "totalPrice" numeric(10,2) NOT NULL,
                "category" character varying,
                "assignedToIds" jsonb NOT NULL DEFAULT '[]',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_items_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "items" ADD CONSTRAINT "FK_items_splitId" 
            FOREIGN KEY ("splitId") REFERENCES "splits"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "items" DROP CONSTRAINT "FK_items_splitId"`);
        await queryRunner.query(`DROP TABLE "items"`);
    }

}
