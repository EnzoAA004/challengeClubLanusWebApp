import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { getDemoMovement } from '../services/movement-service';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getMovement(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = request.params;
    if (typeof id !== 'string' || !uuidPattern.test(id)) throw new AppError(400, 'El identificador del movimiento no es válido.');
    response.json({ data: await getDemoMovement(id) });
  } catch (error) {
    next(error);
  }
}
