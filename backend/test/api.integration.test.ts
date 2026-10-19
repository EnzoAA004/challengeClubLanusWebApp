import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import test from 'node:test';
import { Op } from 'sequelize';

process.env.NODE_ENV = 'test';
process.env.PORT = '4000';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/test';
process.env.CHALLENGE_LOGIN_EMAIL = 'demo@lanus.test';
process.env.CHALLENGE_LOGIN_PASSWORD = 'TestPass123!';

type SessionRecord = { expiresAt: Date };
const sessions = new Map<string, SessionRecord>();
const fixtureAccount = { id: '00000000-0000-4000-8000-000000000001', code: 'GRANATE-DEMO', name: 'Granate', balance: '978.85', currency: 'USD' };
const fixtureMovements = [
  { id: '00000000-0000-4000-8000-000000000101', accountId: fixtureAccount.id, counterparty: 'Adobe', description: 'Pago de suscripción', amount: '125.00', currency: 'USD', type: 'subscription', occurredAt: new Date('2026-10-01T12:00:00.000Z') },
  { id: '00000000-0000-4000-8000-000000000102', accountId: fixtureAccount.id, counterparty: 'Juan Suárez', description: 'Pago recibido', amount: '95.00', currency: 'USD', type: 'received', occurredAt: new Date('2026-10-02T12:00:00.000Z') },
  { id: '00000000-0000-4000-8000-000000000103', accountId: fixtureAccount.id, counterparty: 'Juan Rodríguez', description: 'Pago enviado', amount: '95.00', currency: 'USD', type: 'sent', occurredAt: new Date('2026-10-03T12:00:00.000Z') },
];

let server: Server;
let baseUrl: string;
let models: typeof import('../src/models');
let originalFindAll: typeof import('../src/models').Movement.findAll;

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function sessionToken(cookie: string): string {
  return cookie.split(';')[0]!.split('=')[1]!;
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${baseUrl}${path}`, init);
}

test('API authentication, sessions, protected resources and movement filters', async (t) => {
  const [{ app }, loadedModels, { getDatabase }] = await Promise.all([
    import('../src/app'),
    import('../src/models'),
    import('../src/config/database'),
  ]);
  models = loadedModels;
  models.initializeModels();
  originalFindAll = models.Movement.findAll;

  const authSession = models.AuthSession as unknown as {
    create: (values: { tokenHash: string; expiresAt: Date }) => Promise<unknown>;
    findOne: (options: { where: { tokenHash: string; expiresAt: Record<symbol, Date> } }) => Promise<SessionRecord | null>;
    destroy: (options: { where: { tokenHash?: string; expiresAt?: Record<symbol, Date> } }) => Promise<number>;
  };
  authSession.create = async ({ tokenHash: hash, expiresAt }) => {
    sessions.set(hash, { expiresAt });
    return {};
  };
  authSession.findOne = async ({ where }) => {
    const record = sessions.get(where.tokenHash);
    return record && record.expiresAt > new Date() ? record : null;
  };
  authSession.destroy = async ({ where }) => {
    if (where.tokenHash) return Number(sessions.delete(where.tokenHash));
    const expiration = where.expiresAt?.[Op.lte];
    if (!expiration) return 0;
    let deleted = 0;
    for (const [hash, record] of sessions) {
      if (record.expiresAt <= expiration) {
        sessions.delete(hash);
        deleted += 1;
      }
    }
    return deleted;
  };

  models.Account.findOne = async () => fixtureAccount as never;
  models.Movement.findAll = async (options) => {
    const where = options?.where as Record<PropertyKey, unknown>;
    let result = [...fixtureMovements];
    if (where.type) result = result.filter((movement) => movement.type === where.type);
    const search = where[Op.or] as Array<Record<string, Record<symbol, string>>> | undefined;
    if (search) {
      const pattern = search[0]?.counterparty?.[Op.iLike] ?? search[0]?.description?.[Op.iLike] ?? '';
      const needle = pattern.replaceAll('%', '').toLowerCase();
      result = result.filter((movement) => `${movement.counterparty} ${movement.description}`.toLowerCase().includes(needle));
    }
    return result as never;
  };
  models.Movement.findOne = async (options) => {
    const where = options?.where as { id?: string } | undefined;
    return (fixtureMovements.find((movement) => movement.id === where?.id) as never) ?? null;
  };

  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    models.Movement.findAll = originalFindAll;
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await getDatabase().close();
    sessions.clear();
  });

  await t.test('health and protected endpoints', async () => {
    const health = await request('/api/health');
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok', service: 'club-lanus-api' });
    for (const path of ['/api/accounts/demo', '/api/accounts/demo/movements', `/api/movements/${fixtureMovements[0]!.id}`]) {
      assert.equal((await request(path)).status, 401);
    }
  });

  await t.test('validates login payload and rejects incorrect credentials', async () => {
    const malformed = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    const invalid = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'not-an-email', password: 'secret' }) });
    assert.equal(invalid.status, 400);
    const incorrect = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'demo@lanus.test', password: 'incorrect' }) });
    assert.equal(incorrect.status, 401);
  });

  await t.test('login sets an HttpOnly session, and authorized requests can read data', async () => {
    const login = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'DEMO@LANUS.TEST', password: 'TestPass123!', rememberMe: true }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie');
    assert.ok(cookie);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Max-Age=2592000/);
    assert.doesNotMatch(cookie, /Secure/);
    const token = sessionToken(cookie);
    assert.ok(sessions.has(tokenHash(token)));

    const me = await request('/api/auth/me', { headers: { cookie } });
    assert.equal(me.status, 200);
    const account = await request('/api/accounts/demo', { headers: { cookie } });
    assert.equal(account.status, 200);
    assert.deepEqual((await account.json() as { data: unknown }).data, { id: fixtureAccount.id, name: 'Granate', balance: '978.85', currency: 'USD' });
  });

  await t.test('movement search, filters, list and detail work', async () => {
    const login = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'demo@lanus.test', password: 'TestPass123!' }) });
    const cookie = login.headers.get('set-cookie')!;
    assert.match(cookie, /HttpOnly/);
    assert.doesNotMatch(cookie, /Max-Age=/);
    const listed = await request('/api/accounts/demo/movements?type=subscription&search=adobe', { headers: { cookie } });
    assert.equal(listed.status, 200);
    assert.deepEqual((await listed.json() as { data: Array<{ id: string }> }).data.map(({ id }) => id), [fixtureMovements[0]!.id]);
    const detail = await request(`/api/movements/${fixtureMovements[0]!.id}`, { headers: { cookie } });
    assert.equal(detail.status, 200);
    assert.equal((await detail.json() as { data: { counterparty: string } }).data.counterparty, 'Adobe');
    assert.equal((await request('/api/accounts/demo/movements?type=other', { headers: { cookie } })).status, 400);
    assert.equal((await request('/api/accounts/demo/movements?limit=101', { headers: { cookie } })).status, 400);
    assert.equal((await request('/api/movements/not-a-uuid', { headers: { cookie } })).status, 400);
    assert.equal((await request('/api/movements/00000000-0000-4000-8000-000000000199', { headers: { cookie } })).status, 404);
  });

  await t.test('internal failures return a generic 500 response', async () => {
    const login = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'demo@lanus.test', password: 'TestPass123!' }) });
    const cookie = login.headers.get('set-cookie')!;
    models.Movement.findAll = async () => { throw new Error('private database error'); };
    const failure = await request('/api/accounts/demo/movements', { headers: { cookie } });
    assert.equal(failure.status, 500);
    assert.match((await failure.json() as { message: string }).message, /error interno/i);
    models.Movement.findAll = async () => fixtureMovements as never;
  });

  await t.test('logout revokes the session, expired sessions are denied, and login attempts are limited', async () => {
    const login = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'demo@lanus.test', password: 'TestPass123!' }) });
    const cookie = login.headers.get('set-cookie')!;
    const logout = await request('/api/auth/logout', { method: 'POST', headers: { cookie } });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get('set-cookie') ?? '', /Max-Age=0/);
    assert.equal((await request('/api/auth/me', { headers: { cookie } })).status, 401);

    const expiredLogin = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'demo@lanus.test', password: 'TestPass123!' }) });
    const expiredCookie = expiredLogin.headers.get('set-cookie')!;
    const hash = tokenHash(sessionToken(expiredCookie));
    sessions.set(hash, { expiresAt: new Date(Date.now() - 1000) });
    const expired = await request('/api/auth/me', { headers: { cookie: expiredCookie } });
    assert.equal(expired.status, 401);
    assert.match(expired.headers.get('set-cookie') ?? '', /Max-Age=0/);
    const expiredProtected = await request('/api/accounts/demo', { headers: { cookie: expiredCookie } });
    assert.equal(expiredProtected.status, 401);
    assert.match(expiredProtected.headers.get('set-cookie') ?? '', /Max-Age=0/);

    for (let i = 0; i < 3; i += 1) {
      const response = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'demo@lanus.test', password: 'wrong' }) });
      assert.equal(response.status, 401);
    }
    const limited = await request('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'demo@lanus.test', password: 'wrong' }) });
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
  });
});
