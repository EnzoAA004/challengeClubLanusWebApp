import { Router } from 'express';
import { getDatabase } from '../config/database';

export const healthRouter = Router();

healthRouter.get('/', (_request, response) => {
  response.json({ status: 'ok', service: 'club-lanus-api' });
});

healthRouter.get('/db', async (_request, response, next) => {
  try {
    await getDatabase().query('SELECT 1');
    response.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    next(error);
  }
});
