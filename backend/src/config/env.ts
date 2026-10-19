import 'dotenv/config';

function parsePort(value: string | undefined): number {
  const port = Number(value ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return port;
}

const databaseUrl = process.env.DATABASE_URL;
const databaseUrlUnpooled = process.env.DATABASE_URL_UNPOOLED;

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parsePort(process.env.PORT),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  databaseUrl,
  databaseUrlUnpooled,
  challengeLoginEmail: process.env.CHALLENGE_LOGIN_EMAIL,
  challengeLoginPassword: process.env.CHALLENGE_LOGIN_PASSWORD,
};

export function requireDatabaseUrl(): string {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is required for the database health check.');
  }
  return env.databaseUrl;
}

export function requireMigrationDatabaseUrl(): string {
  const url = env.databaseUrlUnpooled ?? env.databaseUrl;
  if (!url) {
    throw new Error('DATABASE_URL_UNPOOLED or DATABASE_URL is required to run database migrations.');
  }
  return url;
}
