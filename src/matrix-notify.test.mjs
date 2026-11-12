import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { matrixNotify, resolveRoomRef, matrixConfigured } from './matrix-notify.mjs';

let calls;
beforeEach(() => {
  calls = [];
  for (const k of Object.keys(process.env)) if (k.startsWith('MATRIX_') || k === 'GOOGLE_CHAT_WEBHOOK_URL') delete process.env[k];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('/directory/room/')) return new Response(JSON.stringify({ room_id: '!resolved:hs.test' }), { status: 200 });
    return new Response('{}', { status: 200 });
  };
});

const configure = () => {
  process.env.MATRIX_HOMESERVER = 'https://hs.test/';
  process.env.MATRIX_BOT_TOKEN = 'tok';
  process.env.MATRIX_ROOM_KAZ_OPS = '!kaz:hs.test';
  process.env.MATRIX_ROOM_ALERTS_FIREHOSE = '#alerts-firehose:hs.test';
};

test('unconfigured is a silent no-op', async () => {
  assert.equal(matrixConfigured(), false);
  assert.equal(await matrixNotify('kaz-ops', 'hello'), false);
  assert.equal(calls.length, 0);
});

test('logical names map to MATRIX_ROOM_* env vars, ids and aliases pass through', () => {
  configure();
  assert.equal(resolveRoomRef('kaz-ops'), '!kaz:hs.test');
  assert.equal(resolveRoomRef('#kaz-ops'), '!kaz:hs.test');
  assert.equal(resolveRoomRef('!x:y.z'), '!x:y.z');
  assert.equal(resolveRoomRef('#deploys:hs.test'), '#deploys:hs.test');
  assert.equal(resolveRoomRef('sp-ops'), null);
});

test('sends an m.notice with a bearer token via PUT', async () => {
  configure();
  assert.equal(await matrixNotify('kaz-ops', 'digest ready'), true);
  assert.equal(calls.length, 1);
  const { url, init } = calls[0];
  assert.match(url, /^https:\/\/hs\.test\/_matrix\/client\/v3\/rooms\/!kaz%3Ahs\.test\/send\/m\.room\.message\/[0-9a-f-]{36}$/);
  assert.equal(init.method, 'PUT');
  assert.equal(init.headers.authorization, 'Bearer tok');
  assert.deepEqual(JSON.parse(init.body), { msgtype: 'm.notice', body: 'digest ready' });
});

test('errors are mirrored to the firehose (alias resolved) and deduped', async () => {
  configure();
  process.env.MATRIX_SERVICE = 'svc';
  assert.equal(await matrixNotify('kaz-ops', 'boom', { level: 'error' }), true);
  const sends = calls.filter(c => c.init.method === 'PUT');
  assert.equal(sends.length, 2);
  assert.ok(sends.some(c => c.url.includes('!resolved%3Ahs.test') && JSON.parse(c.init.body).body === '[svc] 🚨 boom'));
  calls = [];
  await matrixNotify('kaz-ops', 'boom', { level: 'error' });
  assert.equal(calls.length, 0);
});

test('never throws; falls back to Google Chat for errors', async () => {
  configure();
  process.env.GOOGLE_CHAT_WEBHOOK_URL = 'https://chat.test/hook';
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).startsWith('https://chat.test')) return new Response('{}', { status: 200 });
    throw new Error('network down');
  };
  assert.equal(await matrixNotify('kaz-ops', 'db down', { level: 'error', firehose: false }), false);
  assert.ok(calls.some(c => c.url === 'https://chat.test/hook'));
});
