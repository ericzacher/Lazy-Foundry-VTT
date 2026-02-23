import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInviteCodeAndCampaignPlayers1771881784968 implements MigrationInterface {
    name = 'AddInviteCodeAndCampaignPlayers1771881784968'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_stores_campaign_id"`);
        await queryRunner.query(`CREATE TYPE "public"."campaign_players_status_enum" AS ENUM('invited', 'joined', 'ready')`);
        await queryRunner.query(`CREATE TABLE "campaign_players" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "campaignId" uuid NOT NULL, "playerName" character varying NOT NULL, "foundryUserId" character varying, "foundryActorId" character varying, "characterName" character varying, "characterData" jsonb, "status" "public"."campaign_players_status_enum" NOT NULL DEFAULT 'invited', "invitedAt" TIMESTAMP NOT NULL DEFAULT now(), "joinedAt" TIMESTAMP, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d3f99be3ccd39831826321737b4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "npcs" ADD "combatStats" jsonb`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD "inviteCode" character varying`);
        await queryRunner.query(`ALTER TABLE "campaigns" ADD CONSTRAINT "UQ_830fc155e18ca5f50e97c9343d3" UNIQUE ("inviteCode")`);
        await queryRunner.query(`ALTER TABLE "stores" ALTER COLUMN "parameters" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "stores" ALTER COLUMN "data" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "stores" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "stores" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "stores" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "stores" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "campaign_players" ADD CONSTRAINT "FK_874ed03cb943ef14b95d1402fec" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "campaign_players" DROP CONSTRAINT "FK_874ed03cb943ef14b95d1402fec"`);
        await queryRunner.query(`ALTER TABLE "stores" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "stores" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "stores" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "stores" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "stores" ALTER COLUMN "data" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "stores" ALTER COLUMN "parameters" SET DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP CONSTRAINT "UQ_830fc155e18ca5f50e97c9343d3"`);
        await queryRunner.query(`ALTER TABLE "campaigns" DROP COLUMN "inviteCode"`);
        await queryRunner.query(`ALTER TABLE "npcs" DROP COLUMN "combatStats"`);
        await queryRunner.query(`DROP TABLE "campaign_players"`);
        await queryRunner.query(`DROP TYPE "public"."campaign_players_status_enum"`);
        await queryRunner.query(`CREATE INDEX "idx_stores_campaign_id" ON "stores" ("campaignId") `);
    }

}
