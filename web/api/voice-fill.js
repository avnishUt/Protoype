import { claudeEnabled, extractWithClaude, MODEL } from '../src/lib/extractClaude.js';
import { extractLocally } from '../src/lib/extractLocal.js';
import { validateChanges } from '../src/lib/validate.js';
import { authorized, rateLimited } from './_shared.js';

const MAX_TRANSCRIPT = 1500;

/**
 * POST { transcript, blocks, activeRow, clientNow }
 * → { engine, model, notice, changes, unrecognized, latencyMs }
 *
 * Claude proposes; validateChanges() checks every proposal against the form
 * (keys, rows, types, spec limits) before the executive sees it.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!authorized(req)) return res.status(401).json({ message: 'Access code required' });

  const { transcript, blocks, activeRow = null, clientNow } = req.body ?? {};
  if (typeof transcript !== 'string' || !transcript.trim()) {
    return res.status(400).json({ message: 'Empty transcript' });
  }
  if (transcript.length > MAX_TRANSCRIPT) {
    return res.status(400).json({ message: `Keep each capture under ${MAX_TRANSCRIPT} characters` });
  }
  if (!blocks || typeof blocks !== 'object') return res.status(400).json({ message: 'Missing record state' });
  if (rateLimited(req)) {
    return res.status(429).json({ message: 'Too many captures in the last minute. Wait a moment and try again.' });
  }

  const now = clientNow ? new Date(clientNow) : new Date();
  const state = { blocks };
  const started = Date.now();
  let engine = 'local';
  let notice = null;
  let raw;

  if (claudeEnabled()) {
    try {
      const { usage, ...result } = await extractWithClaude({ transcript, state, activeRow, now });
      raw = result;
      engine = 'claude';
      console.log('[voice-fill] usage', JSON.stringify(usage));
    } catch (err) {
      console.error('[voice-fill] Claude failed, using offline parser:', err.message);
      notice = `AI unavailable (${err.status ? `HTTP ${err.status}` : err.message}), so the offline parser was used`;
    }
  }
  raw ??= extractLocally({ transcript });

  res.status(200).json({
    engine,
    model: engine === 'claude' ? MODEL : 'offline-parser-v1',
    notice,
    changes: validateChanges(raw.changes, state, { activeRow, now }),
    unrecognized: raw.unrecognized,
    latencyMs: Date.now() - started,
  });
}
