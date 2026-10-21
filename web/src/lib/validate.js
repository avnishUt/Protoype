import { FORM, findBlock, findField } from './form.js';

/**
 * The same gate a real `RecordsService.save()` would apply — every proposed
 * change, whichever engine produced it, passes through here before the
 * executive ever sees it. The model is never trusted to have produced a
 * valid key, row or value.
 */

/** 1-based row the executive is most likely talking about when they don't
 * name one: the active row they tapped, else the last row if it still has
 * gaps, else a fresh row (capped at the grid's maxRows). */
export function defaultRowFor(block, rows, activeRow) {
  if (activeRow && activeRow >= 1 && activeRow <= block.maxRows) return activeRow;
  const last = rows[rows.length - 1] ?? {};
  const filled = block.fields.filter((f) => last[f.key]?.raw).length;
  if (filled < block.fields.length) return rows.length;
  return Math.min(rows.length + 1, block.maxRows);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function normalizeDecimal(raw) {
  const cleaned = String(raw)
    .trim()
    .replace(/,/g, '.')
    .replace(/\s*(ppm|ntu|mg\/l)$/i, '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned) && !/^-?\.\d+$/.test(cleaned)) return null;
  return cleaned.startsWith('.') ? `0${cleaned}` : cleaned.replace(/^-\./, '-0.');
}

function normalizeTime(raw, now) {
  const s = String(raw).trim().toLowerCase();
  if (s === 'now') return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const m = s.match(/^(\d{1,2})(?:[:.\s]?(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? '0');
  const ampm = m[3]?.replace(/\./g, '');
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

function normalizeDate(raw, now) {
  const s = String(raw).trim().toLowerCase();
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (s === 'today') return fmt(now);
  if (s === 'yesterday') return fmt(new Date(now.getTime() - 86_400_000));
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return s;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  return null;
}

export function normalizeValue(field, raw, now) {
  if (field.type === 'decimal') return normalizeDecimal(raw);
  if (field.type === 'time') return normalizeTime(raw, now);
  if (field.type === 'date') return normalizeDate(raw, now);
  return String(raw).trim() || null;
}

export function specWarning(field, value) {
  if (!field.spec || field.type !== 'decimal') return null;
  const n = Number(value);
  const { min, max, exclusive } = field.spec;
  if (min !== undefined && n < min) return `Below spec (min ${min})`;
  if (max !== undefined && (exclusive ? n >= max : n > max)) {
    return `Above spec (${exclusive ? '<' : 'max '}${max}${field.unit ? ` ${field.unit}` : ''})`;
  }
  return null;
}

/**
 * @param {Array<{blockKey,rowIndex,fieldKey,value,heard,confidence}>} proposed
 *   rowIndex is 1-based for grids (as spoken: "round 2"), null for flat blocks.
 * @param {{blocks: Record<string, any>}} state current record
 * @param {{activeRow?: number|null, now: Date}} ctx
 */
export function validateChanges(proposed, state, ctx) {
  const out = [];
  const seen = new Map();
  proposed.forEach((p, i) => {
    const block = findBlock(p.blockKey);
    const field = block && findField(p.blockKey, p.fieldKey);
    const change = {
      id: `c${i + 1}`,
      blockKey: p.blockKey,
      blockTitle: block?.title ?? (block ? 'Header' : p.blockKey),
      rowIndex: null,
      fieldKey: p.fieldKey,
      label: field?.label ?? p.fieldKey,
      value: null,
      heard: p.heard ?? '',
      confidence: p.confidence ?? 'medium',
      previous: null,
      warnings: [],
      errors: [],
    };
    out.push(change);

    if (!block || !field) {
      change.errors.push('Not a field on this form');
      return;
    }
    if (block.kind === 'grid') {
      const rows = state.blocks[block.key] ?? [];
      const row = p.rowIndex ?? defaultRowFor(block, rows, ctx.activeRow);
      if (!Number.isInteger(row) || row < 1 || row > block.maxRows) {
        change.errors.push(`Row must be 1–${block.maxRows}`);
        return;
      }
      change.rowIndex = row;
      change.previous = rows[row - 1]?.[field.key]?.raw ?? null;
    } else {
      change.previous = state.blocks[block.key]?.[field.key]?.raw ?? null;
    }

    const value = normalizeValue(field, p.value, ctx.now);
    if (value === null) {
      change.errors.push(`"${p.value}" is not a valid ${field.type}`);
      return;
    }
    change.value = value;

    const spec = specWarning(field, value);
    if (spec) change.warnings.push(spec);
    if (change.previous !== null && change.previous !== value) {
      change.warnings.push(`Replaces ${change.previous}`);
    }
    if (change.confidence === 'low') change.warnings.push('Low confidence — check the value');

    // Same cell spoken twice in one capture: the later one wins.
    const cell = `${change.blockKey}:${change.rowIndex}:${change.fieldKey}`;
    if (seen.has(cell)) {
      const earlier = seen.get(cell);
      earlier.errors.push('Superseded by a later value in the same capture');
    }
    seen.set(cell, change);
  });
  return out;
}

/** What the model / parser needs to know about the record right now. */
export function describeState(state, activeRow) {
  const lines = [];
  for (const block of FORM.blocks) {
    if (block.kind === 'grid') {
      const rows = state.blocks[block.key] ?? [];
      lines.push(
        `${block.key} (grid, ${rows.length} of max ${block.maxRows} rows, default row if unspecified: ${defaultRowFor(block, rows, activeRow)})`,
      );
      rows.forEach((row, i) => {
        const vals = block.fields.map((f) => `${f.key}=${row[f.key]?.raw ?? '∅'}`).join(', ');
        lines.push(`  row ${i + 1}: ${vals}`);
      });
    } else {
      const vals = block.fields
        .map((f) => `${f.key}=${state.blocks[block.key]?.[f.key]?.raw ?? '∅'}`)
        .join(', ');
      lines.push(`${block.key} (flat): ${vals}`);
    }
  }
  return lines.join('\n');
}
