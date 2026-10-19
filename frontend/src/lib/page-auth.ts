import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function requirePageSession(): Promise<void> {
  const cookieHeader = (await cookies()).getAll().map(({ name, value }) => `${name}=${value}`).join('; ');
  const apiBaseUrl = (process.env.API_PROXY_URL ?? 'http://localhost:4000').replace(/\/$/, '');
  const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  }).catch(() => null);
  if (!response || response.status >= 500) {
    throw new Error('No pudimos verificar tu sesión. Intentá nuevamente.');
  }
  if (!response.ok) redirect('/login');
}
