import { createServer } from 'node:http';
import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { FORM, emptyState } from './lib/form.mjs';
import { validateChanges } from './lib/validate.mjs';
import { extractLocally } from './lib/extract-local.mjs';
import { claudeEnabled, extractWithClaude, MODEL } from './lib/extract-claude.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC = join(ROOT, 'public');
const DATA = join(ROOT, 'data');
const RECORD_FILE = join(DATA, 'record.json');
const CAPTURES_FILE = join(DATA, 'voice_captures.jsonl');
const PORT = Number(process.env.PORT || 4400);

// The demo user. In DQMS this is the logged-in executive from the JWT.
const USER = { id: 'u-1042', name: 'R. Sharma', role: 'QA Executive' };

await mkdir(DATA, { recursive: true });

async function loadRecord() {
  if (!existsSync(RECORD_FILE)) return { id: 'REC-2026-0147', ...emptyState() };
  return JSON.parse(await readFile(RECORD_FILE, 'utf8'));
}

async function loadCaptures() {
  if (!existsSync(CAPTURES_FILE)) return [];
  const lines = (await readFile(CAPTURES_FILE, 'utf8')).split('\n').filter(Boolean);
  // Append-only log: a decision is a later line for the same capture id.
  const byId = new Map();
  for (const line of lines) {
    const entry = JSON.parse(line);
    byId.set(entry.id, { ...byId.get(entry.id), ...entry });
  }
  return [...byId.values()].reverse();
}

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

  'GET /api/record': loadRecord,

  'POST /api/record': async (req) => {
    const { blocks, submit } = await readJson(req);
    const record = await loadRecord();
    record.blocks = blocks;
    record.updatedAt = new Date().toISOString();
    if (submit) {
      record.status = 'submitted';
      record.submittedBy = USER.name;
      record.submittedAt = record.updatedAt;
    }
    await writeFile(RECORD_FILE, JSON.stringify(record, null, 2));
    return record;
  },

  'POST /api/record/reset': async () => {
    const record = { id: 'REC-2026-0147', ...emptyState() };
    await writeFile(RECORD_FILE, JSON.stringify(record, null, 2));
    await writeFile(CAPTURES_FILE, '');
    return record;
  },

  'POST /api/voice-fill': async (req) => {
    const { transcript, blocks, activeRow, clientNow, engine: wanted } = await readJson(req);
    if (!transcript?.trim()) return { httpStatus: 400, body: { message: 'Empty transcript' } };
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
      recordId: (await loadRecord()).id,
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
    await appendFile(CAPTURES_FILE, JSON.stringify(capture) + '\n');
    return { captureId: capture.id, engine, model: capture.model, notice, changes, unrecognized: raw.unrecognized, latencyMs: capture.latencyMs };
  },

  'POST /api/voice-fill/decision': async (req) => {
    const { captureId, acceptedIds, rejectedIds } = await readJson(req);
    const entry = { id: captureId, acceptedIds, rejectedIds, decidedBy: USER.name, decidedAt: new Date().toISOString() };
    await appendFile(CAPTURES_FILE, JSON.stringify(entry) + '\n');
    return { ok: true };
  },

  'GET /api/captures': loadCaptures,
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const handler = routes[`${req.method} ${url.pathname}`];
    if (handler) {
      const result = await handler(req);
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
}).listen(PORT, '127.0.0.1', () => {
  const engine = claudeEnabled() ? `Claude (${MODEL})` : 'offline demo parser (set ANTHROPIC_API_KEY for Claude)';
  console.log(`DQMS Voice Fill prototype → http://localhost:${PORT}\nExtraction engine: ${engine}`);
});
