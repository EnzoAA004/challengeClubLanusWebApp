import { Router } from 'express';
import { getMovement } from '../controllers/movements-controller';

export const movementsRouter = Router();

movementsRouter.get('/:id', getMovement);
