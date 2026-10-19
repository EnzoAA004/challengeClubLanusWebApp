import type { RequestHandler } from 'express';
import {
  findSession,
  parseSessionCookie,
  unauthenticatedError,
} from '../services/session-service';

export const requireSession: RequestHandler = async (request, _response, next) => {
  try {
    const token = parseSessionCookie(request.headers.cookie);
    if (!token || !await findSession(token)) {
      next(unauthenticatedError());
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};
