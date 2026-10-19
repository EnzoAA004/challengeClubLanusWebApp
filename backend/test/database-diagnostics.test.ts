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

  assert.equal(diagnostics.errorClass, 'SequelizeConnectionError');
  assert.equal(diagnostics.postgresCode, '28P01');
  assert.equal(diagnostics.phase, 'postgres_authentication');
  assert.equal(diagnostics.reason, 'postgres_authentication_rejected');
  assert.equal(diagnostics.safeErrorMessage?.includes('private-user'), false);
  assert.equal(JSON.stringify(diagnostics).includes('private-user'), false);
});

test('database diagnostics classify DNS failures without recording hostnames or raw errors', () => {
  const diagnostics = getDatabaseDiagnostics({
    name: 'SequelizeConnectionError',
    original: { name: 'Error', code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND private-host.example' },
  });

  assert.equal(diagnostics.errorClass, 'SequelizeConnectionError');
  assert.equal(diagnostics.systemCode, 'ENOTFOUND');
  assert.equal(diagnostics.phase, 'dns_resolution');
  assert.equal(diagnostics.reason, 'dns_lookup_failed');
  assert.equal(diagnostics.safeErrorMessage?.includes('private-host'), false);
  assert.equal(JSON.stringify(diagnostics).includes('private-host'), false);
});

test('database diagnostics identify missing PostgreSQL passwords without retaining the error text', () => {
  const diagnostics = getDatabaseDiagnostics(new Error('SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string; password=sample-secret'));

  assert.equal(diagnostics.errorClass, 'Error');
  assert.equal(diagnostics.phase, 'postgres_authentication');
  assert.equal(diagnostics.reason, 'database_password_missing');
  assert.equal(diagnostics.safeErrorMessage?.includes('sample-secret'), false);
  assert.equal(diagnostics.safeErrorMessage?.includes('client password must be a string'), true);
  assert.equal(JSON.stringify(diagnostics).includes('sample-secret'), false);
});
