import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearSessionCookie,
  credentialsMatch,
  parseSessionCookie,
  REMEMBERED_SESSION_DURATION_MS,
  serializeSessionCookie,
  SESSION_DURATION_MS,
  SESSION_COOKIE_NAME,
} from '../src/services/session-service';

const token = 'a'.repeat(43);

test('challenge credentials compare email case-insensitively and password exactly', () => {
  assert.equal(credentialsMatch('Demo@Lanus.com', 'Secret!', 'demo@lanus.com', 'Secret!'), true);
  assert.equal(credentialsMatch('demo@lanus.com', 'secret!', 'demo@lanus.com', 'Secret!'), false);
  assert.equal(credentialsMatch(undefined, 'Secret!', 'demo@lanus.com', 'Secret!'), false);
});

test('session cookie parser accepts only the expected opaque token', () => {
  assert.equal(parseSessionCookie(`other=ignore; ${SESSION_COOKIE_NAME}=${token}`), token);
  assert.equal(parseSessionCookie(`${SESSION_COOKIE_NAME}=bad-token`), null);
  assert.equal(parseSessionCookie(undefined), null);
});

test('session cookies are HttpOnly, SameSite=Lax and Secure only in production', () => {
  const remembered = serializeSessionCookie(token, { secure: true, maxAge: 30 * 24 * 60 * 60 });
  assert.match(remembered, /HttpOnly/);
  assert.match(remembered, /SameSite=Lax/);
  assert.match(remembered, /Secure/);
  assert.match(remembered, /Max-Age=2592000/);
  assert.doesNotMatch(serializeSessionCookie(token, { secure: false }), /Secure/);
  assert.match(clearSessionCookie(true), /Max-Age=0/);
});

test('session lifetimes are 12 hours and 30 days', () => {
  assert.equal(SESSION_DURATION_MS, 12 * 60 * 60 * 1000);
  assert.equal(REMEMBERED_SESSION_DURATION_MS, 30 * 24 * 60 * 60 * 1000);
});
