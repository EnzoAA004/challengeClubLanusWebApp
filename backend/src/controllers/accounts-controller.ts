import { NextFunction, Request, Response } from 'express';
import { getDemoAccount } from '../services/account-service';
import { listDemoMovements, parseLimit, parseMovementType, validateSearch } from '../services/movement-service';
import { AppError } from '../errors/app-error';

export async function getAccount(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    response.json({ data: await getDemoAccount() });
  } catch (error) {
    next(error);
  }
}

export async function getMovements(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const searchValue = request.query.search;
    const typeValue = request.query.type;
    const limitValue = request.query.limit;
    if (searchValue !== undefined && typeof searchValue !== 'string') throw new AppError(400, 'La búsqueda no es válida.');
    if (typeValue !== undefined && typeof typeValue !== 'string') throw new AppError(400, 'El tipo de movimiento no es válido.');
    if (limitValue !== undefined && typeof limitValue !== 'string') throw new AppError(400, 'El límite no es válido.');

    const items = await listDemoMovements({
      ...(searchValue !== undefined ? { search: validateSearch(searchValue) } : {}),
      ...(typeValue !== undefined ? { type: parseMovementType(typeValue) } : {}),
      ...(limitValue !== undefined ? { limit: parseLimit(limitValue) } : {}),
    });
    response.json({ data: items, meta: { count: items.length } });
  } catch (error) {
    next(error);
  }
}
