import { Op, WhereOptions } from 'sequelize';
import { AppError } from '../errors/app-error';
import { initializeModels, MovementType } from '../models';

const demoAccountCode = 'GRANATE-DEMO';
const searchLimit = 100;

export interface MovementFilters {
  search?: string;
  type?: MovementType;
  limit?: number;
}

async function findDemoAccountId(): Promise<string> {
  const { Account } = initializeModels();
  const account = await Account.findOne({ where: { code: demoAccountCode }, attributes: ['id'] });
  if (!account) throw new AppError(404, 'No encontramos la cuenta de demostración.');
  return account.id;
}

export async function listDemoMovements(filters: MovementFilters = {}) {
  const { Movement } = initializeModels();
  const accountId = await findDemoAccountId();
  const where: Record<PropertyKey, unknown> = { accountId };

  if (filters.type) where.type = filters.type;
  if (filters.search) {
    where[Op.or] = [
      { counterparty: { [Op.iLike]: `%${filters.search}%` } },
      { description: { [Op.iLike]: `%${filters.search}%` } },
    ];
  }

  const rows = await Movement.findAll({
    where: where as WhereOptions,
    order: [['occurredAt', 'DESC'], ['id', 'ASC']],
    ...(filters.limit ? { limit: filters.limit } : {}),
  });

  return rows.map((movement) => ({
    id: movement.id,
    counterparty: movement.counterparty,
    description: movement.description,
    amount: movement.amount,
    currency: movement.currency,
    type: movement.type,
    occurredAt: movement.occurredAt.toISOString(),
  }));
}

export async function getDemoMovement(id: string) {
  const { Movement } = initializeModels();
  const accountId = await findDemoAccountId();
  const movement = await Movement.findOne({ where: { id, accountId } });
  if (!movement) throw new AppError(404, 'No encontramos ese movimiento.');

  return {
    id: movement.id,
    counterparty: movement.counterparty,
    description: movement.description,
    amount: movement.amount,
    currency: movement.currency,
    type: movement.type,
    occurredAt: movement.occurredAt.toISOString(),
  };
}

export function parseMovementType(value: string): MovementType | undefined {
  if (value === 'subscription' || value === 'received' || value === 'sent') return value;
  throw new AppError(400, 'El tipo de movimiento no es válido.');
}

export function validateSearch(value: string): string {
  const normalized = value.trim();
  if (normalized.length > searchLimit) throw new AppError(400, 'La búsqueda no puede superar 100 caracteres.');
  return normalized;
}

export function parseLimit(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw new AppError(400, 'El límite debe ser un número entero positivo.');
  const limit = Number(value);
  if (limit > 100) throw new AppError(400, 'El límite máximo es 100 movimientos.');
  return limit;
}
