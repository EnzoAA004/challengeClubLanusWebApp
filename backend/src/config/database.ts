import { Sequelize } from 'sequelize';
import { requireDatabaseUrl } from './env';

let sequelize: Sequelize | undefined;

export function getDatabase(): Sequelize {
  if (!sequelize) {
    sequelize = new Sequelize(requireDatabaseUrl(), {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
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
