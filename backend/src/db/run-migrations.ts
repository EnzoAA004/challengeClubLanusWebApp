import { QueryTypes } from 'sequelize';
import { createDatabase } from '../config/database';
import { requireMigrationDatabaseUrl } from '../config/env';
import { migrations } from './migrations';

async function runMigrations(): Promise<void> {
  const sequelize = createDatabase(requireMigrationDatabaseUrl());
  try {
    await sequelize.authenticate();
    await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        'CREATE TABLE IF NOT EXISTS "schema_migrations" ("name" VARCHAR(160) PRIMARY KEY, "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())',
        { transaction },
      );
      await sequelize.query("SELECT pg_advisory_xact_lock(hashtext('club-lanus:schema-migrations'))", { transaction });
      const applied = await sequelize.query<{ name: string }>(
        'SELECT "name" FROM "schema_migrations"',
        { type: QueryTypes.SELECT, transaction },
      );
      const appliedNames = new Set(applied.map((row) => row.name));

      for (const migration of migrations) {
        if (appliedNames.has(migration.name)) continue;
        await migration.up(sequelize.getQueryInterface(), transaction);
        await sequelize.query('INSERT INTO "schema_migrations" ("name") VALUES (:name)', {
          replacements: { name: migration.name }, transaction,
        });
        console.info(`Applied migration ${migration.name}`);
      }
    });
    console.info('Database migrations are up to date.');
  } finally {
    await sequelize.close();
  }
}

void runMigrations().catch((error: unknown) => {
  console.error('Database migrations failed.', error instanceof Error ? { name: error.name } : undefined);
  process.exitCode = 1;
});
