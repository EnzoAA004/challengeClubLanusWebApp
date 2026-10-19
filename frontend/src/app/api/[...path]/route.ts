import type { NextRequest } from 'next/server';

const sessionCookieName = 'grana_session';
const maxRequestBytes = 16 * 1024;
const forwardedResponseHeaders = ['content-type', 'cache-control', 'retry-after', 'set-cookie'];

async function readRequestBody(request: NextRequest): Promise<ArrayBuffer | undefined> {
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxRequestBytes) {
      await reader.cancel();
      throw new RangeError('Request body is too large.');
    }
    chunks.push(value);
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

async function proxyApiRequest(request: NextRequest): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return Response.json({ status: 'error', message: 'Método no permitido.' }, { status: 405, headers: { Allow: 'GET, POST' } });
  }

  const apiBaseUrl = process.env.API_PROXY_URL ?? 'http://localhost:4000';
  let target: URL;
  try {
    target = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, apiBaseUrl);
  } catch {
    return Response.json({ status: 'error', message: 'La API no está disponible.' }, { status: 502 });
  }
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return Response.json({ status: 'error', message: 'La API no está disponible.' }, { status: 502 });
  }

  const sessionCookie = request.cookies.get(sessionCookieName);
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  const accept = request.headers.get('accept');
  const protectionBypassSecret = process.env.API_PREVIEW_BYPASS_SECRET;
  if (contentType) headers.set('content-type', contentType);
  if (accept) headers.set('accept', accept);
  if (protectionBypassSecret) headers.set('x-vercel-protection-bypass', protectionBypassSecret);
  if (sessionCookie) headers.set('cookie', `${sessionCookieName}=${encodeURIComponent(sessionCookie.value)}`);

  let body: ArrayBuffer | undefined;
  if (request.method === 'POST') {
    try {
      body = await readRequestBody(request);
    } catch (error) {
      if (error instanceof RangeError) {
        return Response.json({ status: 'error', message: 'La solicitud es demasiado grande.' }, { status: 413 });
      }
      return Response.json({ status: 'error', message: 'No pudimos leer la solicitud.' }, { status: 400 });
    }
    if (body && body.byteLength > maxRequestBytes) {
      return Response.json({ status: 'error', message: 'La solicitud es demasiado grande.' }, { status: 413 });
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, { method: request.method, headers, body, cache: 'no-store', redirect: 'manual' });
  } catch {
    return Response.json({ status: 'error', message: 'No pudimos conectar con el servidor.' }, { status: 502 });
  }

  const responseHeaders = new Headers();
  for (const name of forwardedResponseHeaders) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxyApiRequest;
export const POST = proxyApiRequest;
