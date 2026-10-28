import Anthropic from '@anthropic-ai/sdk';
import { FORM } from './form.mjs';
import { describeState } from './validate.mjs';

export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5';

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

export const claudeEnabled = () => client !== null;

function formSpecText() {
  return FORM.blocks
    .map((block) => {
      const head =
        block.kind === 'grid'
          ? `Block "${block.key}" — "${block.title}" — GRID, one row per round, max ${block.maxRows} rows (row numbers are 1-based)`
          : `Block "${block.key}"${block.title ? ` — "${block.title}"` : ''} — FLAT (single value per field, rowIndex must be null)`;
      const fields = block.fields
        .map(
          (f) =>
            `  - ${f.key}: "${f.label}" type=${f.type}${f.unit ? ` unit=${f.unit}` : ''}; people say: ${f.aliases.map((a) => `"${a}"`).join(', ')}`,
        )
        .join('\n');
      return `${head}\n${fields}`;
    })
    .join('\n\n');
}

// Stable across every request so it caches; per-request facts (time, state,
// transcript) go in the user turn.
const SYSTEM = `You turn what a quality executive says out loud on a beverage plant floor into field values for one digital quality form. Your output is a proposal only: the executive reviews every value before anything is saved, so precision matters more than coverage.

Form: ${FORM.name} (${FORM.formCode}), ${FORM.line}.

${formSpecText()}

How to read the transcript:
- It comes from speech-to-text, often Indian English or Hinglish, and may contain recognition errors ("p h" = pH, "tea ds" = TDS, "point" = decimal point, "zero point two" = 0.2, "das" = 10).
- Propose a value only for a field the speaker actually gave a value for. Never infer, average, round, or fill a field that was not spoken. If something sounds like a reading but you can't tell which field it belongs to, put that phrase in "unrecognized" instead of guessing.
- value: digits only for decimals ("0.2", "10.8"), "HH:MM" 24-hour or "now" for time, "YYYY-MM-DD" or "today"/"yesterday" for date. Never add units.
- Grid rows: if the speaker names a round/row/reading ("round 2", "second reading", "dusra round"), use that number. If they give a time that matches an existing row's time, use that row. Otherwise use the default row given in the current state.
- If the speaker corrects themselves ("pH 7.2, no sorry 7.4"), output only the corrected value.
- heard: the exact words from the transcript that produced this value.
- confidence: "high" when field and value are unambiguous, "medium" when you resolved a likely speech-to-text error, "low" when it is a plausible but uncertain reading.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['changes', 'unrecognized'],
  properties: {
    changes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['blockKey', 'rowIndex', 'fieldKey', 'value', 'heard', 'confidence'],
        properties: {
          blockKey: { type: 'string', enum: FORM.blocks.map((b) => b.key) },
          rowIndex: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
          fieldKey: {
            type: 'string',
            enum: [...new Set(FORM.blocks.flatMap((b) => b.fields.map((f) => f.key)))],
          },
          value: { type: 'string' },
          heard: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    unrecognized: { type: 'array', items: { type: 'string' } },
  },
};

/**
 * @returns {Promise<{changes: any[], unrecognized: string[], usage: object}>}
 */
export async function extractWithClaude({ transcript, state, activeRow, now }) {
  if (!client) throw new Error('ANTHROPIC_API_KEY not set');
  const user = `Current local time: ${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 5)}

Current record state:
${describeState(state, activeRow)}

Transcript:
"""${transcript}"""`;

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 8000,
    // Low effort: this is a short, latency-sensitive extraction, not a hard reasoning task.
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    // On a safety decline, the API retries on a suitable fallback model inside the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
  });

  if (response.stop_reason === 'refusal') throw new Error('Model declined this request');
  if (response.stop_reason === 'max_tokens') throw new Error('Model output was cut off');
  const text = response.content.find((b) => b.type === 'text')?.text;
  if (!text) throw new Error('Model returned no output');
  const parsed = JSON.parse(text);
  return { changes: parsed.changes, unrecognized: parsed.unrecognized, usage: response.usage };
}
