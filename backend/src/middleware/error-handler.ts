import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../errors/app-error';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if ((error as { type?: string }).type === 'entity.parse.failed') {
    response.status(400).json({ status: 'error', message: 'El cuerpo JSON no es válido.' });
    return;
  }

  const status = error instanceof AppError
    ? error.statusCode
    : 500;
  const message = status >= 400 && status < 500 && error instanceof Error
    ? error.message
    : 'Ocurrió un error interno. Intentá nuevamente más tarde.';
  if (env.nodeEnv !== 'test' && status >= 500) {
    console.error('Unhandled API error', error instanceof Error ? { name: error.name } : undefined);
  }
  response.status(status).json({ status: 'error', message });
};
