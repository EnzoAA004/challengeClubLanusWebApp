import { Router } from 'express';
import { env } from '../config/env';
import { AppError } from '../errors/app-error';
import {
  clearSessionCookie,
  cleanExpiredSessions,
  createSession,
  credentialsMatch,
  findSession,
  parseSessionCookie,
  REMEMBERED_SESSION_DURATION_MS,
  revokeSession,
  SESSION_DURATION_MS,
  serializeSessionCookie,
} from '../services/session-service';

export const authRouter = Router();

authRouter.post('/login', async (request, response, next) => {
  try {
    const { email, password, rememberMe } = request.body as {
      email?: unknown;
      password?: unknown;
      rememberMe?: unknown;
    };
    if (rememberMe !== undefined && typeof rememberMe !== 'boolean') {
      throw new AppError(400, 'La opción Recordarme no es válida.');
    }
    if (!env.challengeLoginEmail || !env.challengeLoginPassword) {
      throw new AppError(503, 'El acceso de demostración no está configurado.');
    }
    if (!credentialsMatch(email, password, env.challengeLoginEmail, env.challengeLoginPassword)) {
      throw new AppError(401, 'Email o contraseña incorrectos.');
    }

    await cleanExpiredSessions();
    const remember = rememberMe === true;
    const session = await createSession(remember);
    const duration = remember ? REMEMBERED_SESSION_DURATION_MS : SESSION_DURATION_MS;
    response.setHeader('Set-Cookie', serializeSessionCookie(session.token, {
      secure: env.nodeEnv === 'production',
      ...(remember ? { maxAge: Math.floor(duration / 1000) } : {}),
    }));
    response.json({ status: 'ok', data: { expiresAt: session.expiresAt.toISOString() } });
  } catch (error) {
    next(error);
  }
});
authRouter.get('/me', async (request, response, next) => {
  try {
    const token = parseSessionCookie(request.headers.cookie);
    if (!token) throw new AppError(401, 'Tu sesión no está activa.');
    const session = await findSession(token);
    if (!session) {
      response.setHeader('Set-Cookie', clearSessionCookie(env.nodeEnv === 'production'));
      throw new AppError(401, 'Tu sesión venció. Iniciá sesión nuevamente.');
    }
    response.json({ status: 'ok', data: { authenticated: true, expiresAt: session.expiresAt.toISOString() } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', async (request, response, next) => {
  try {
    const token = parseSessionCookie(request.headers.cookie);
    if (token) await revokeSession(token);
    response.setHeader('Set-Cookie', clearSessionCookie(env.nodeEnv === 'production'));
    response.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});
