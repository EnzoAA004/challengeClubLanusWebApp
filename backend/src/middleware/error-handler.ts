import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../errors/app-error';

type DatabaseFailurePhase = 'configuration' | 'dns_resolution' | 'connection' | 'tls_authentication' | 'postgres_authentication' | 'query' | 'unknown';
type DatabaseFailureReason = 'invalid_connection_url' | 'dns_lookup_failed' | 'database_password_missing' | 'postgres_authentication_rejected' | 'tls_certificate_rejected' | 'connection_failed' | 'query_rejected' | 'unknown';

export function getDatabaseDiagnostics(error: unknown): {
  errorClass?: string;
  postgresCode?: string;
  systemCode?: string;
  phase: DatabaseFailurePhase;
  reason: DatabaseFailureReason;
  safeErrorMessage?: string;
} {
  const chain: object[] = [];
  const visited = new Set<object>();
  let current = error;
  while (typeof current === 'object' && current !== null && !visited.has(current) && chain.length < 5) {
    visited.add(current);
    chain.push(current);
    const candidate = current as { cause?: unknown; original?: unknown; parent?: unknown };
    current = candidate.cause ?? candidate.original ?? candidate.parent;
  }

  let errorClass: string | undefined;
  let postgresCode: string | undefined;
  let systemCode: string | undefined;
  let safeMessages = '';
  const messages: string[] = [];
  for (const item of chain) {
    const value = item as { name?: unknown; code?: unknown; message?: unknown };
    if (!errorClass && typeof value.name === 'string' && /^[A-Za-z][A-Za-z0-9_$]{0,63}$/.test(value.name)) {
      errorClass = value.name;
    }
    if (typeof value.code === 'string') {
      if (!postgresCode && /^[0-9A-Z]{5}$/.test(value.code)) postgresCode = value.code;
      if (!systemCode && /^(?:E[A-Z0-9_]{2,30}|ERR_[A-Z0-9_]{2,60})$/.test(value.code)) systemCode = value.code;
    }
    if (typeof value.message === 'string') {
      const message = value.message.slice(0, 300);
      safeMessages += ` ${message}`;
      messages.push(message);
    }
  }

  const message = safeMessages.toLowerCase();
  const reason: DatabaseFailureReason =
    /invalid url|database_url.*required|must be a valid url/.test(message) ? 'invalid_connection_url'
      : systemCode === 'ENOTFOUND' || systemCode === 'EAI_AGAIN' ? 'dns_lookup_failed'
        : /password must be a string|client password must be a string/.test(message) ? 'database_password_missing'
          : Boolean(postgresCode && (postgresCode === '28P01' || postgresCode === '28000')) || /password authentication failed|no pg_hba\.conf entry|sasl.*scram|scram-server-first-message/.test(message) ? 'postgres_authentication_rejected'
            : Boolean(systemCode && /^(?:ERR_TLS|ERR_SSL|CERT_|SELF_SIGNED_CERT|UNABLE_TO_VERIFY_LEAF_SIGNATURE)/.test(systemCode)) || /certificate|tls|ssl handshake/.test(message) ? 'tls_certificate_rejected'
              : Boolean(systemCode || (postgresCode && postgresCode.startsWith('08'))) ? 'connection_failed'
                : chain.some((item) => (item as { name?: unknown }).name === 'SequelizeDatabaseError') ? 'query_rejected'
                  : 'unknown';
  const phase: DatabaseFailurePhase =
    /invalid url|database_url.*required|must be a valid url/.test(message) ? 'configuration'
      : systemCode === 'ENOTFOUND' || systemCode === 'EAI_AGAIN' ? 'dns_resolution'
        : reason === 'database_password_missing' || reason === 'postgres_authentication_rejected' ? 'postgres_authentication'
          : Boolean(systemCode && /^(?:ERR_TLS|ERR_SSL|CERT_|SELF_SIGNED_CERT|UNABLE_TO_VERIFY_LEAF_SIGNATURE)/.test(systemCode)) || /certificate|tls|ssl handshake/.test(message) ? 'tls_authentication'
            : Boolean(systemCode || (postgresCode && postgresCode.startsWith('08'))) ? 'connection'
              : chain.some((item) => (item as { name?: unknown }).name === 'SequelizeDatabaseError') ? 'query'
                : 'unknown';

  const safeErrorMessage = messages.length > 0 ? sanitizeDatabaseErrorMessage(messages[messages.length - 1]!) : undefined;
  return {
    ...(errorClass ? { errorClass } : {}),
    ...(postgresCode ? { postgresCode } : {}),
    ...(systemCode ? { systemCode } : {}),
    phase,
    reason,
    ...(safeErrorMessage ? { safeErrorMessage } : {}),
  };
}

function sanitizeDatabaseErrorMessage(message: string): string {
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, '[connection string]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[url]')
    .replace(/([?&](?:password|passwd|pwd|token|secret|sslkey|sslcert|sslrootcert)=)[^&\s]+/gi, '$1[redacted]')
    .replace(/\b(password|passwd|pwd|token|secret|authorization|cookie)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/(password authentication failed for user)\s+[^\s,;]+/gi, '$1 [redacted]')
    .replace(/\b(?:role|user)\s+"?[^"\s,;]+"?/gi, '[database identity]')
    .replace(/\b(getaddrinfo\s+(?:ENOTFOUND|EAI_AGAIN)\s+)\S+/gi, '$1[host]')
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[email]')
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g, '[ip]')
    .replace(/(?:[a-z0-9-]+\.)+(?:neon\.tech|aws\.neon\.tech)/gi, '[database host]')
    .replace(/[\r\n\t\u0000-\u001f]+/g, ' ')
    .slice(0, 240);
}

function getDatabaseUrlDiagnostics(): Record<string, string | boolean> {
  const connectionString = env.databaseUrl;
  if (!connectionString) return { databaseUrlConfigured: false };

  try {
    const url = new URL(connectionString);
    return {
      databaseUrlConfigured: true,
      databaseUrlFormatValid: url.protocol === 'postgres:' || url.protocol === 'postgresql:',
      databaseHost: url.hostname,
      databaseHostIsNeon: url.hostname.endsWith('.neon.tech'),
      databaseConnectionPooled: /-pooler\./.test(url.hostname),
      databasePasswordConfigured: url.password.length > 0,
      databaseSslMode: url.searchParams.get('sslmode') ?? 'default',
    };
  } catch {
    return { databaseUrlConfigured: true, databaseUrlFormatValid: false };
  }
}

function getRequestId(request: Parameters<ErrorRequestHandler>[1]): string | undefined {
  const requestId = request.get('x-vercel-id') ?? request.get('x-request-id');
  return requestId && /^[A-Za-z0-9._:-]{1,128}$/.test(requestId) ? requestId : undefined;
}

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
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
    const isDatabaseHealthCheck = request.path === '/api/health/db';
    const isDatabaseOperation = isDatabaseHealthCheck || request.path.startsWith('/api/auth/');
    const requestId = getRequestId(request);
    console.error('Unhandled API error', {
      ...((isDatabaseOperation || (error instanceof Error && error.name.startsWith('Sequelize'))) ? getDatabaseDiagnostics(error) : {}),
      ...(isDatabaseHealthCheck ? getDatabaseUrlDiagnostics() : {}),
      ...(requestId ? { requestId } : {}),
    });
  }
  response.status(status).json({ status: 'error', message });
};
