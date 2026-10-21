import { extractLocally } from './extractLocal.js';
import { validateChanges } from './validate.js';
import { load, save } from './storage.js';

const CODE_KEY = 'vf-access-code';

export async function getConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    // Static hosting with no /api (e.g. a plain `vite preview`): offline mode.
    return { engine: { kind: 'local' }, passwordRequired: false };
  }
}

function localNowIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 19);
}

/** Runs the offline parser in the browser: same output shape as the API. */
function runLocally({ transcript, blocks, activeRow }, notice = null) {
  const started = performance.now();
  const raw = extractLocally({ transcript });
  return {
    engine: 'local',
    model: 'offline-parser-v1',
    notice,
    changes: validateChanges(raw.changes, { blocks }, { activeRow, now: new Date() }),
    unrecognized: raw.unrecognized,
    latencyMs: Math.round(performance.now() - started),
  };
}

/**
 * Ask the server (Claude) to map a transcript onto the form. Falls back to the
 * in-browser parser if the API is missing or down, so a demo never dead-ends.
 * Throws only for user-actionable errors (rate limit, bad input).
 */
export async function voiceFill({ transcript, blocks, activeRow }, { askCode } = {}) {
  const body = JSON.stringify({ transcript, blocks, activeRow, clientNow: localNowIso() });
  for (let attempt = 0; attempt < 2; attempt++) {
    let res;
    try {
      res = await fetch('/api/voice-fill', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-demo-key': load(CODE_KEY, '') },
        body,
      });
    } catch {
      return runLocally({ transcript, blocks, activeRow }, 'Server unreachable, so the offline parser was used');
    }
    if (res.status === 401 && attempt === 0 && askCode) {
      const code = await askCode();
      if (!code) return runLocally({ transcript, blocks, activeRow }, 'No access code entered, so the offline parser was used');
      save(CODE_KEY, code);
      continue;
    }
    if (res.status === 404) return runLocally({ transcript, blocks, activeRow });
    const json = await res.json().catch(() => ({}));
    if (res.status === 400 || res.status === 429) throw new Error(json.message || 'Request rejected');
    if (!res.ok) return runLocally({ transcript, blocks, activeRow }, `AI unavailable (HTTP ${res.status}), so the offline parser was used`);
    return json;
  }
  save(CODE_KEY, '');
  return runLocally({ transcript, blocks, activeRow }, 'Access code not accepted, so the offline parser was used');
}
