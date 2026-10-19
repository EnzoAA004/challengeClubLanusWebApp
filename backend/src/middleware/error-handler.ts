import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const status = Number((error as { status?: number }).status) || 500;
  const message = status >= 500 && env.nodeEnv === 'production'
    ? 'Internal server error.'
    : error instanceof Error ? error.message : 'Unexpected server error.';
  response.status(status).json({ status: 'error', message });
};
