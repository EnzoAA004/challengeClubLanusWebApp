import type { RequestHandler } from 'express';

const windowMs = 15 * 60 * 1000;
const maxAttempts = 10;
const maxTrackedAddresses = 10_000;
const attemptsByAddress = new Map<string, { count: number; resetAt: number }>();
let nextCleanupAt = 0;

export const loginRateLimit: RequestHandler = (request, response, next) => {
  const now = Date.now();
  if (now >= nextCleanupAt) {
    for (const [address, state] of attemptsByAddress) {
      if (state.resetAt <= now) attemptsByAddress.delete(address);
    }
    nextCleanupAt = now + 60_000;
  }

  const key = request.ip || request.socket.remoteAddress || 'unknown';
  const current = attemptsByAddress.get(key);
  const state = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + windowMs };

  if (state.count >= maxAttempts) {
    response.setHeader('Retry-After', String(Math.max(1, Math.ceil((state.resetAt - now) / 1000))));
    response.status(429).json({ status: 'error', message: 'Demasiados intentos. Esperá unos minutos y volvé a intentar.' });
    return;
  }

  state.count += 1;
  if (!current && attemptsByAddress.size >= maxTrackedAddresses) {
    const oldestAddress = attemptsByAddress.keys().next().value;
    if (oldestAddress) attemptsByAddress.delete(oldestAddress);
  }
  attemptsByAddress.set(key, state);
  next();
};
