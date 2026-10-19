import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { GET, POST } from '../src/app/api/[...path]/route';

process.env.API_PROXY_URL = 'https://api.example.test';

test('same-origin proxy forwards only the session cookie and a minimal header allowlist', async (t) => {
  const originalFetch = globalThis.fetch;
  let observedRequest: { url: string; method?: string; headers: Headers; body?: ArrayBuffer } | undefined;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    observedRequest = {
      url: String(input),
      method: init?.method,
      headers: new Headers(init?.headers),
      ...(init?.body instanceof ArrayBuffer ? { body: init.body } : {}),
    };
    return Response.json({ status: 'ok' }, {
      status: 401,
      headers: { 'set-cookie': 'grana_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0', 'x-internal': 'hidden' },
    });
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  const request = new NextRequest('https://frontend.example.test/api/accounts/demo?view=summary', {
    headers: {
      cookie: 'grana_session=opaque_token; analytics_id=private-value',
      authorization: 'Bearer should-not-forward',
      'x-forwarded-for': '203.0.113.5',
      accept: 'application/json',
    },
  });
  const response = await GET(request);

  assert.equal(response.status, 401);
  assert.equal(observedRequest?.url, 'https://api.example.test/api/accounts/demo?view=summary');
  assert.equal(observedRequest?.method, 'GET');
  assert.equal(observedRequest?.headers.get('cookie'), 'grana_session=opaque_token');
  assert.equal(observedRequest?.headers.get('accept'), 'application/json');
  assert.equal(observedRequest?.headers.has('authorization'), false);
  assert.equal(observedRequest?.headers.has('x-forwarded-for'), false);
  assert.match(response.headers.get('set-cookie') ?? '', /HttpOnly/);
  assert.equal(response.headers.has('x-internal'), false);
});

test('same-origin proxy forwards JSON and preserves the login cookie', async (t) => {
  const originalFetch = globalThis.fetch;
  let observedBody = '';
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    observedBody = new TextDecoder().decode(init?.body as ArrayBuffer);
    return Response.json({ status: 'ok' }, {
      headers: { 'set-cookie': 'grana_session=new_token; Path=/; HttpOnly; SameSite=Lax' },
    });
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  const request = new NextRequest('https://frontend.example.test/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: 'analytics_id=private-value' },
    body: JSON.stringify({ email: 'demo@example.test', password: 'test-password', rememberMe: false }),
  });
  const response = await POST(request);
  assert.equal(response.status, 200);
  assert.equal(observedBody, JSON.stringify({ email: 'demo@example.test', password: 'test-password', rememberMe: false }));
  assert.match(response.headers.get('set-cookie') ?? '', /grana_session=new_token/);
});

test('same-origin proxy rejects unsupported methods and oversized bodies', async () => {
  const unsupported = new NextRequest('https://frontend.example.test/api/auth/login', { method: 'DELETE' });
  assert.equal((await GET(unsupported)).status, 405);

  const oversized = new NextRequest('https://frontend.example.test/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: 'x'.repeat(16 * 1024 + 1),
  });
  assert.equal((await POST(oversized)).status, 413);
});
