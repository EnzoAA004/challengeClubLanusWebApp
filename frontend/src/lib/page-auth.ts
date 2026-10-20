import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerApiHeaders } from './server-api-headers';

export async function requirePageSession(): Promise<void> {
  const sessionCookie = (await cookies()).get('grana_session');
  if (!sessionCookie) redirect('/login');
  const apiBaseUrl = (process.env.API_PROXY_URL ?? 'http://localhost:4000').replace(/\/$/, '');
  const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
    headers: createServerApiHeaders({
      sessionCookie: `${sessionCookie.name}=${encodeURIComponent(sessionCookie.value)}`,
    }),
    cache: 'no-store',
  }).catch(() => null);
  if (!response || (response.status !== 401 && !response.ok)) {
    throw new Error('No pudimos verificar tu sesión. Intentá nuevamente.');
  }
  if (response.status === 401) redirect('/login');
}
