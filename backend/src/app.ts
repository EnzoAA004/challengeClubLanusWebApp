import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { accountsRouter } from './routes/accounts';
import { healthRouter } from './routes/health';
import { movementsRouter } from './routes/movements';

export const app = express();

app.use(cors({ origin: env.corsOrigins }));
app.use(express.json());
app.post('/api/auth/login', (request, response) => {
  const { email, password } = request.body as { email?: string; password?: string };
  if (!env.challengeLoginEmail || !env.challengeLoginPassword) {
    response.status(503).json({ status: 'error', message: 'Demo login is not configured.' });
    return;
  }
  if (email !== env.challengeLoginEmail || password !== env.challengeLoginPassword) {
    response.status(401).json({ status: 'error', message: 'Email o contraseña incorrectos.' });
    return;
  }
  response.json({ status: 'ok' });
});
app.use('/api/health', healthRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/movements', movementsRouter);
app.use(errorHandler);
