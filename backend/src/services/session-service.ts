import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Op } from 'sequelize';
import { AppError } from '../errors/app-error';
import { initializeModels } from '../models';

export const SESSION_COOKIE_NAME = 'grana_session';
export const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
export const REMEMBERED_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function equalCredentials(received: string, expected: string): boolean {
  const receivedDigest = createHash('sha256').update(received).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(receivedDigest, expectedDigest);
}

export function credentialsMatch(email: unknown, password: unknown, expectedEmail: string, expectedPassword: string): boolean {
  if (typeof email !== 'string' || typeof password !== 'string') return false;
  return equalCredentials(email.trim().toLowerCase(), expectedEmail.trim().toLowerCase())
    && equalCredentials(password, expectedPassword);
}

export async function createSession(rememberMe: boolean): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const duration = rememberMe ? REMEMBERED_SESSION_DURATION_MS : SESSION_DURATION_MS;
  const expiresAt = new Date(Date.now() + duration);
  const { AuthSession } = initializeModels();
  await AuthSession.create({ tokenHash: hashToken(token), expiresAt });
  return { token, expiresAt };
}

export async function findSession(token: string) {
  const { AuthSession } = initializeModels();
  const session = await AuthSession.findOne({
    where: { tokenHash: hashToken(token), expiresAt: { [Op.gt]: new Date() } },
    attributes: ['tokenHash', 'expiresAt'],
  });
  if (!session) return null;
  return { expiresAt: session.expiresAt };
}

export async function revokeSession(token: string): Promise<void> {
  const { AuthSession } = initializeModels();
  await AuthSession.destroy({ where: { tokenHash: hashToken(token) } });
}

export async function cleanExpiredSessions(): Promise<void> {
  const { AuthSession } = initializeModels();
  await AuthSession.destroy({ where: { expiresAt: { [Op.lte]: new Date() } } });
}

export function parseSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== SESSION_COOKIE_NAME) continue;
    try {
      const token = decodeURIComponent(part.slice(separator + 1).trim());
      return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function serializeSessionCookie(token: string, options: { secure: boolean; maxAge?: number }): string {
  const attributes = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (options.secure) attributes.push('Secure');
  if (options.maxAge !== undefined) attributes.push(`Max-Age=${options.maxAge}`);
  return attributes.join('; ');
}

export function clearSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

export const unauthenticatedError = () => new AppError(401, 'Iniciá sesión para continuar.');
