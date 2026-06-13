import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableRlsChannelConnections1749772800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable RLS so PostgREST (anon/authenticated JWT) cannot read this table directly.
    // The NestJS API uses the service_role key which bypasses RLS — no app code changes needed.
    await queryRunner.query(`ALTER TABLE public.channel_connections ENABLE ROW LEVEL SECURITY;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE public.channel_connections DISABLE ROW LEVEL SECURITY;`);
  }
}
