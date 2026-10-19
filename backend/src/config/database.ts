import { Sequelize } from 'sequelize';
import { requireDatabaseUrl } from './env';

let sequelize: Sequelize | undefined;

export function getDatabase(): Sequelize {
  if (!sequelize) {
    const databaseUrl = new URL(requireDatabaseUrl());
    // Neon connection strings commonly use sslmode=require. Make hostname
    // verification explicit so pg keeps the same secure behavior in future versions.
    databaseUrl.searchParams.set('sslmode', 'verify-full');

    sequelize = new Sequelize(databaseUrl.toString(), {
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30_000,
        idle: 10_000,
      },
    });
  }
  return sequelize;
}
