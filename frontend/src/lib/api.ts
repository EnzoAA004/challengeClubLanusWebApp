export type ApiErrorPayload = { message?: string };

export function apiUrl(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export async function fetchApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      cache: 'no-store',
      credentials: 'same-origin',
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new Error('No pudimos conectar con el servidor. Revisá tu conexión e intentá nuevamente.');
  }
  let result: T & ApiErrorPayload;
  try {
    result = await response.json() as T & ApiErrorPayload;
  } catch {
    throw new Error('El servidor respondió con un error. Intentá nuevamente.');
  }
  if (!response.ok) throw new Error(result.message ?? 'No pudimos cargar la información.');
  return result;
}
