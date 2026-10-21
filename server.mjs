import { createServer } from 'node:http';
import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { FORM, emptyState } from './lib/form.mjs';
import { validateChanges } from './lib/validate.mjs';
import { extractLocally } from './lib/extract-local.mjs';
import { claudeEnabled, extractWithClaude, MODEL } from './lib/extract-claude.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const DATA = process.env.DATA_DIR || join(ROOT, 'data');
const PORT = Number(process.env.PORT || 4400);
// 127.0.0.1 locally; the Dockerfile sets 0.0.0.0 so the container is reachable.
const HOST = process.env.HOST || '127.0.0.1';
// Optional shared password (HTTP Basic auth, any username). Set it whenever
// the URL is public, so strangers can't spend the API key.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || '';
// AI calls per visitor IP per minute.
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MIN || 20);
const MAX_TRANSCRIPT = 1500;

// The demo user. In DQMS this is the logged-in executive from the JWT.
const USER = { id: 'u-1042', name: 'R. Sharma', role: 'QA Executive' };

await mkdir(DATA, { recursive: true });

// ---------- per-visitor sandbox ----------
// Every browser gets its own record + capture log (cookie `vf_sid`), so many
// people can try the demo at once without overwriting each other.
const SID_RE = /^[0-9a-f-]{36}$/;

function sessionFiles(req, res) {
  const cookie = /(?:^|;\s*)vf_sid=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
  let sid = cookie && SID_RE.test(cookie) ? cookie : null;
  if (!sid) {
    sid = randomUUID();
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    res.setHeader('set-cookie', `vf_sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`);
  }
  const dir = join(DATA, sid);
  return { dir, record: join(dir, 'record.json'), captures: join(dir, 'voice_captures.jsonl') };
}

async function loadRecord(files) {
  if (!existsSync(files.record)) return { id: 'REC-2026-0147', ...emptyState() };
  return JSON.parse(await readFile(files.record, 'utf8'));
}

async function writeRecord(files, record) {
  await mkdir(files.dir, { recursive: true });
  await writeFile(files.record, JSON.stringify(record, null, 2));
}

async function appendCapture(files, entry) {
  await mkdir(files.dir, { recursive: true });
  await appendFile(files.captures, JSON.stringify(entry) + '\n');
}

async function loadCaptures(files) {
  if (!existsSync(files.captures)) return [];
  const lines = (await readFile(files.captures, 'utf8')).split('\n').filter(Boolean);
  // Append-only log: a decision is a later line for the same capture id.
  const byId = new Map();
  for (const line of lines) {
    const entry = JSON.parse(line);
    byId.set(entry.id, { ...byId.get(entry.id), ...entry });
  }
  return [...byId.values()].reverse();
}

// ---------- guards ----------
function clientIp(req) {
  return (req.headers['x-forwarded-for']?.split(',')[0] ?? req.socket.remoteAddress ?? '').trim();
}

const hits = new Map();
function rateLimited(req) {
  const ip = clientIp(req);
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

function authorized(req) {
  if (!DEMO_PASSWORD) return true;
  const header = req.headers.authorization ?? '';
  if (!header.startsWith('Basic ')) return false;
  const password = Buffer.from(header.slice(6), 'base64').toString().split(':').slice(1).join(':');
  const a = Buffer.from(password);
  const b = Buffer.from(DEMO_PASSWORD);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------- http ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error('Body too large');
  }
  return raw ? JSON.parse(raw) : {};
}

const routes = {
  'GET /api/config': async () => ({
    form: FORM,
    user: USER,
    engine: claudeEnabled() ? { kind: 'claude', model: MODEL } : { kind: 'local' },
  }),

  'GET /api/record': (req, files) => loadRecord(files),

  'POST /api/record': async (req, files) => {
    const { blocks, submit } = await readJson(req);
    const record = await loadRecord(files);
    record.blocks = blocks;
    record.updatedAt = new Date().toISOString();
    if (submit) {
      record.status = 'submitted';
      record.submittedBy = USER.name;
      record.submittedAt = record.updatedAt;
    }
    await writeRecord(files, record);
    return record;
  },

  'POST /api/record/reset': async (req, files) => {
    const record = { id: 'REC-2026-0147', ...emptyState() };
    await writeRecord(files, record);
    await writeFile(files.captures, '');
    return record;
  },

  'POST /api/voice-fill': async (req, files) => {
    const { transcript, blocks, activeRow, clientNow, engine: wanted } = await readJson(req);
    if (!transcript?.trim()) return { httpStatus: 400, body: { message: 'Empty transcript' } };
    if (transcript.length > MAX_TRANSCRIPT) {
      return { httpStatus: 400, body: { message: `Keep each capture under ${MAX_TRANSCRIPT} characters` } };
    }
    if (rateLimited(req)) {
      return { httpStatus: 429, body: { message: 'Too many captures in the last minute. Wait a moment and try again.' } };
    }
    const now = clientNow ? new Date(clientNow) : new Date();
    const state = { blocks };
    const started = Date.now();

    let engine = 'local';
    let notice = null;
    let raw;
    let usage;
    if (claudeEnabled() && wanted !== 'local') {
      try {
        ({ usage, ...raw } = await extractWithClaude({ transcript, state, activeRow, now }));
        engine = 'claude';
      } catch (err) {
        console.error('[voice-fill] Claude extraction failed, using offline parser:', err.message);
        notice = `AI unavailable (${err.status ? `HTTP ${err.status}` : err.message}), so the offline parser was used`;
      }
    }
    raw ??= extractLocally({ transcript });

    const changes = validateChanges(raw.changes, state, { activeRow, now });
    const capture = {
      id: randomUUID(),
      recordId: (await loadRecord(files)).id,
      formCode: FORM.formCode,
      userId: USER.id,
      userName: USER.name,
      transcript,
      engine,
      model: engine === 'claude' ? MODEL : 'offline-parser-v1',
      promptVersion: 'vf-2026-10-19',
      proposed: changes,
      unrecognized: raw.unrecognized,
      latencyMs: Date.now() - started,
      usage: usage ?? null,
      createdAt: new Date().toISOString(),
    };
    await appendCapture(files, capture);
    return { captureId: capture.id, engine, model: capture.model, notice, changes, unrecognized: raw.unrecognized, latencyMs: capture.latencyMs };
  },

  'POST /api/voice-fill/decision': async (req, files) => {
    const { captureId, acceptedIds, rejectedIds } = await readJson(req);
    await appendCapture(files, { id: captureId, acceptedIds, rejectedIds, decidedBy: USER.name, decidedAt: new Date().toISOString() });
    return { ok: true };
  },

  'GET /api/captures': (req, files) => loadCaptures(files),
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    // Unauthenticated so platform health probes work.
    if (url.pathname === '/health') return send(res, 200, { ok: true });
    if (!authorized(req)) {
      res.writeHead(401, { 'www-authenticate': 'Basic realm="DQMS Voice Fill demo", charset="UTF-8"' });
      return res.end('Password required');
    }

    const handler = routes[`${req.method} ${url.pathname}`];
    if (handler) {
      const result = await handler(req, sessionFiles(req, res));
      if (result?.httpStatus) return send(res, result.httpStatus, result.body);
      return send(res, 200, result);
    }
    if (req.method !== 'GET') return send(res, 404, { message: 'Not found' });
    const path = normalize(join(PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname));
    if (!path.startsWith(PUBLIC) || !existsSync(path)) return send(res, 404, { message: 'Not found' });
    res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' });
    res.end(await readFile(path));
  } catch (err) {
    console.error(err);
    send(res, 500, { message: err.message });
  }
}).listen(PORT, HOST, () => {
  const engine = claudeEnabled() ? `Claude (${MODEL})` : 'offline demo parser (set ANTHROPIC_API_KEY for Claude)';
  console.log(`DQMS Voice Fill prototype → http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`Extraction engine: ${engine}`);
  console.log(DEMO_PASSWORD ? 'Password protection: on' : 'Password protection: OFF (set DEMO_PASSWORD before sharing a public URL)');
});
