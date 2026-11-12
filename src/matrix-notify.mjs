// matrix-notify: post ops messages to a Matrix room as the ops bot.
// Canonical copy lives in jacobq61/ops (packages/matrix-notify). Repos vendor a copy; keep them in sync.
//
// Env (read at send time, so tests and late-loaded secrets work):
//   MATRIX_HOMESERVER       https://matrix.example.com
//   MATRIX_BOT_TOKEN        access token of the ops bot user
//   MATRIX_ROOM_<NAME>      room id or alias per logical room, e.g. MATRIX_ROOM_KAZ_OPS=!abc:matrix.example.com
//   MATRIX_SERVICE          optional label prefixed on firehose copies (e.g. "bracco-social")
//   GOOGLE_CHAT_WEBHOOK_URL optional backup channel, used for error-level messages Matrix didn't accept
//
// room is a logical name ("kaz-ops" -> MATRIX_ROOM_KAZ_OPS), a room id ("!abc:server") or an alias
// ("#kaz-ops:server"). Unconfigured means a silent no-op. Sending never throws.

import { randomUUID } from 'node:crypto';

const TIMEOUT_MS = 5000;
const DEDUPE_MS = 10 * 60 * 1000;
const FIREHOSE = 'alerts-firehose';
const recent = new Map();
const aliasCache = new Map();

const env = (k) => (process.env[k] ?? '').trim();
const envKey = (name) => `MATRIX_ROOM_${name.replace(/^#/, '').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase()}`;

export function matrixConfigured() {
  return Boolean(env('MATRIX_HOMESERVER') && env('MATRIX_BOT_TOKEN'));
}

/** Room id or alias for a logical name, id or alias; null when nothing is configured for it. */
export function resolveRoomRef(room) {
  const r = String(room ?? '').trim();
  if (!r) return null;
  if (/^[!#][^:\s]+:[A-Za-z0-9.-]+(:\d+)?$/.test(r)) return r;
  return env(envKey(r)) || null;
}

async function call(path, init = {}) {
  const base = env('MATRIX_HOMESERVER').replace(/\/+$/, '');
  return fetch(`${base}/_matrix/client/v3${path}`, {
    ...init,
    headers: { authorization: `Bearer ${env('MATRIX_BOT_TOKEN')}`, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'error',
  });
}

async function roomId(ref) {
  if (ref.startsWith('!')) return ref;
  if (aliasCache.has(ref)) return aliasCache.get(ref);
  const res = await call(`/directory/room/${encodeURIComponent(ref)}`);
  if (!res.ok) return null;
  const { room_id: id } = await res.json();
  if (id) aliasCache.set(ref, id);
  return id ?? null;
}

async function send(ref, content) {
  try {
    const id = await roomId(ref);
    if (!id) return false;
    // PUT with a fresh transaction id: the homeserver dedupes retries of the same txn.
    const res = await call(`/rooms/${encodeURIComponent(id)}/send/m.room.message/${randomUUID()}`, {
      method: 'PUT',
      body: JSON.stringify(content),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function googleChat(text) {
  const url = env('GOOGLE_CHAT_WEBHOOK_URL');
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=UTF-8' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/**
 * Post `message` to `room`. True when Matrix accepted it.
 * opts.level     'info' (default) | 'warn' | 'error'. Errors are mirrored to #alerts-firehose.
 * opts.html      optional formatted body (org.matrix.custom.html).
 * opts.dedupe    false to post even if the same text went to the same room in the last 10 minutes.
 * opts.firehose  override mirroring to #alerts-firehose.
 */
export async function matrixNotify(room, message, opts = {}) {
  const level = opts.level ?? 'info';
  const text = String(message ?? '').slice(0, 8000);
  if (!text) return false;
  const ref = resolveRoomRef(room);
  const mirror = (opts.firehose ?? level === 'error') && room !== FIREHOSE ? resolveRoomRef(FIREHOSE) : null;
  if (!matrixConfigured() || (!ref && !mirror)) {
    if (level === 'error') await googleChat(text);
    return false;
  }

  const key = `${ref}|${text.slice(0, 300)}`;
  const now = Date.now();
  if (opts.dedupe !== false && (recent.get(key) ?? 0) > now - DEDUPE_MS) return true;
  recent.set(key, now);
  if (recent.size > 500) recent.clear();

  const prefix = level === 'error' ? '🚨 ' : level === 'warn' ? '⚠️ ' : '';
  const body = prefix + text;
  const content = { msgtype: 'm.notice', body };
  if (opts.html) Object.assign(content, { format: 'org.matrix.custom.html', formatted_body: escapeHtml(prefix) + opts.html });

  const [ok] = await Promise.all([
    ref ? send(ref, content) : Promise.resolve(false),
    mirror && mirror !== ref
      ? send(mirror, { msgtype: 'm.notice', body: `${env('MATRIX_SERVICE') ? `[${env('MATRIX_SERVICE')}] ` : ''}${body}` })
      : null,
  ]);
  if (!ok && level === 'error') await googleChat(text);
  return ok;
}

export default matrixNotify;
