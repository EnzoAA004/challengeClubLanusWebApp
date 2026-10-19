import assert from 'node:assert/strict';
import test from 'node:test';
import { getDatabaseDiagnostics } from '../src/middleware/error-handler';

test('database diagnostics classify PostgreSQL authentication failures without exposing messages', () => {
  const diagnostics = getDatabaseDiagnostics({
    name: 'SequelizeConnectionError',
    message: 'Connection failed',
    parent: {
      name: 'Error',
      code: '28P01',
      message: 'password authentication failed for user private-user',
    },
  });

  assert.deepEqual(diagnostics, {
    errorClass: 'SequelizeConnectionError',
    postgresCode: '28P01',
    phase: 'postgres_authentication',
  });
  assert.equal(JSON.stringify(diagnostics).includes('private-user'), false);
});

test('database diagnostics classify DNS failures without recording hostnames or raw errors', () => {
  const diagnostics = getDatabaseDiagnostics({
    name: 'SequelizeConnectionError',
    original: { name: 'Error', code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND private-host.example' },
  });

  assert.deepEqual(diagnostics, {
    errorClass: 'SequelizeConnectionError',
    systemCode: 'ENOTFOUND',
    phase: 'dns_resolution',
  });
  assert.equal(JSON.stringify(diagnostics).includes('private-host'), false);
});
