import { Router } from 'express';
import { getAccount, getMovements } from '../controllers/accounts-controller';

export const accountsRouter = Router();

accountsRouter.get('/demo', getAccount);
accountsRouter.get('/demo/movements', getMovements);
