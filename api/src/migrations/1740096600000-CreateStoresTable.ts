import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStoresTable1740096600000 implements MigrationInterface {
  name = 'CreateStoresTable1740096600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stores" (
        "id"          uuid              NOT NULL DEFAULT gen_random_uuid(),
        "campaignId"  uuid,
        "name"        character varying NOT NULL,
        "storeType"   character varying NOT NULL,
        "parameters"  jsonb             NOT NULL DEFAULT '{}',
        "data"        jsonb             NOT NULL DEFAULT '{}',
        "createdAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stores" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_stores_campaignId" ON "stores" ("campaignId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stores_campaignId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stores"`);
  }
}
