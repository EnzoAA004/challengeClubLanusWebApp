import type { RequestHandler } from 'express';
import { env } from '../config/env';
import {
  clearSessionCookie,
  findSession,
  parseSessionCookie,
  unauthenticatedError,
} from '../services/session-service';

export const requireSession: RequestHandler = async (request, response, next) => {
  try {
    const token = parseSessionCookie(request.headers.cookie);
    const session = token ? await findSession(token) : null;
    if (!session) {
      response.setHeader('Set-Cookie', clearSessionCookie(env.nodeEnv === 'production'));
      next(unauthenticatedError());
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};
