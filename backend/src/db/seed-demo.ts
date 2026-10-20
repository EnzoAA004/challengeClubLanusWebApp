import { createDatabase } from '../config/database';
import { requireMigrationDatabaseUrl } from '../config/env';
import { initializeModels, Account, Movement } from '../models';

const accountId = '00000000-0000-4000-8000-000000000001';
const accountCode = 'GRANATE-DEMO';

const movementSeeds = [
  ['00000000-0000-4000-8000-000000000101', 'Adobe', 'Pago de suscripción', '125.00', 'subscription', '2026-10-18T18:20:00.000Z'],
  ['00000000-0000-4000-8000-000000000102', 'José Suárez', 'Pago recibido', '95.00', 'received', '2026-10-18T15:40:00.000Z'],
  ['00000000-0000-4000-8000-000000000103', 'Figma', 'Pago de suscripción', '125.00', 'subscription', '2026-10-17T20:15:00.000Z'],
  ['00000000-0000-4000-8000-000000000104', 'Juan Pérez', 'Pago enviado', '95.00', 'sent', '2026-10-17T13:00:00.000Z'],
  ['00000000-0000-4000-8000-000000000105', 'Ronaldo', 'Pago recibido', '95.00', 'received', '2026-10-16T17:30:00.000Z'],
  ['00000000-0000-4000-8000-000000000106', 'Mariano Martínez', 'Pago enviado', '95.00', 'sent', '2026-10-16T10:10:00.000Z'],
  ['00000000-0000-4000-8000-000000000107', 'Julio César', 'Pago recibido', '95.00', 'received', '2026-10-15T19:05:00.000Z'],
  ['00000000-0000-4000-8000-000000000108', 'Juan Cabrera', 'Pago recibido', '42.50', 'received', '2026-10-14T14:25:00.000Z'],
] as const;

async function seedDemo(): Promise<void> {
  const sequelize = createDatabase(requireMigrationDatabaseUrl());
  initializeModels(sequelize);

  try {
    await sequelize.authenticate();
    await sequelize.transaction(async (transaction) => {
      await Account.upsert({
        id: accountId,
        code: accountCode,
        name: 'Granate',
        balance: '978.85',
        currency: 'USD',
      }, { transaction });

      const now = new Date();
      await Movement.bulkCreate(movementSeeds.map(([id, counterparty, description, amount, type, occurredAt]) => ({
        id,
        accountId,
        counterparty,
        description,
        amount,
        currency: 'USD',
        type,
        occurredAt: new Date(occurredAt),
        createdAt: now,
        updatedAt: now,
      })), {
        updateOnDuplicate: ['accountId', 'counterparty', 'description', 'amount', 'currency', 'type', 'occurredAt', 'updatedAt'],
        transaction,
      });
    });
    console.info(`Seed complete: ${movementSeeds.length} demo movements.`);
  } finally {
    await sequelize.close();
  }
}

void seedDemo().catch((error: unknown) => {
  console.error('Demo seed failed.', error instanceof Error ? { name: error.name } : undefined);
  process.exitCode = 1;
});
