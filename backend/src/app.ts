import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { accountsRouter } from './routes/accounts';
import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { movementsRouter } from './routes/movements';
import { requireSession } from './middleware/require-session';

export const app = express();

app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/health', healthRouter);
app.use('/api/accounts', requireSession, accountsRouter);
app.use('/api/movements', requireSession, movementsRouter);
app.use(errorHandler);
