import { FORM } from './form.mjs';

/**
 * Offline demo parser — used when no ANTHROPIC_API_KEY is set, or when the
 * Claude call fails, so a live demo never dead-ends. Deterministic keyword
 * matching: it handles clean "field value" phrasing, but not the messy,
 * self-correcting, Hinglish speech the LLM path is there for.
 */

const UNITS = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const ORDINALS = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 };

/** "ten point eight" → "10.8", "four hundred twenty" → "420". */
function wordsToDigits(text) {
  const tokens = text.split(/\s+/);
  const out = [];
  let i = 0;
  const isNumWord = (t) => t in UNITS || t in TENS || t === 'hundred';
  while (i < tokens.length) {
    if (!isNumWord(tokens[i])) {
      out.push(tokens[i++]);
      continue;
    }
    let total = 0;
    let current = 0;
    while (i < tokens.length && (isNumWord(tokens[i]) || tokens[i] === 'and')) {
      const t = tokens[i++];
      if (t in UNITS) current += UNITS[t];
      else if (t in TENS) current += TENS[t];
      else if (t === 'hundred') current = (current || 1) * 100;
    }
    total += current;
    let num = String(total);
    if (tokens[i] === 'point') {
      i++;
      let decimals = '';
      while (i < tokens.length && tokens[i] in UNITS && UNITS[tokens[i]] < 10) decimals += UNITS[tokens[i++]];
      if (decimals) num += `.${decimals}`;
    }
    out.push(num);
  }
  return out.join(' ');
}

function normalize(transcript) {
  let s = ` ${transcript.toLowerCase()} `
    .replace(/[,;]/g, ' ')
    .replace(/(\d)\s*point\s*(\d)/g, '$1.$2')
    .replace(/\bp\.?\s?h\b/g, 'ph')
    .replace(/\bt\.?\s?d\.?\s?s\b/g, 'tds')
    .replace(/\bc\s?l\s?2\b|\bcl two\b/g, 'cl2')
    .replace(/\s+/g, ' ');
  s = wordsToDigits(s.trim())
    .replace(/(\d) point (\d+)/g, '$1.$2')
    .replace(/(^|\s)point (\d+)/g, '$10.$2');
  return ` ${s} `;
}

const NUMBER = '(-?\\d+(?:\\.\\d+)?|\\.\\d+)';

export function extractLocally({ transcript }) {
  const text = normalize(transcript);
  const changes = [];
  const unrecognized = [];

  // Split into segments at "round N" / "row N" / "Nth reading" markers.
  const marker = /\b(?:round|row|reading)\s+(\d)\b|\b(first|second|third|fourth|fifth|sixth)\s+(?:round|reading|row)\b/g;
  const segments = [];
  let lastIdx = 0;
  let currentRow = null;
  for (const m of text.matchAll(marker)) {
    segments.push({ text: text.slice(lastIdx, m.index), row: currentRow });
    currentRow = m[1] ? Number(m[1]) : ORDINALS[m[2]];
    lastIdx = m.index + m[0].length;
  }
  segments.push({ text: text.slice(lastIdx), row: currentRow });

  // Longest aliases first so "calcium hardness" wins over "hardness".
  const aliasIndex = FORM.blocks
    .flatMap((block) =>
      block.fields.flatMap((field) => field.aliases.map((alias) => ({ alias, block, field }))),
    )
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const seg of segments) {
    const taken = [];
    const overlaps = (s, e) => taken.some(([ts, te]) => s < te && e > ts);
    for (const { alias, block, field } of aliasIndex) {
      if (alias === 'at' || alias === 'today') continue;
      const valuePattern =
        field.type === 'time'
          ? '(now|\\d{1,2}(?:[:.]\\d{2}|\\s\\d{2})?\\s?(?:am|pm|a\\.m\\.|p\\.m\\.)?)'
          : field.type === 'date'
            ? '(today|yesterday|\\d{1,2}[/-]\\d{1,2}[/-]\\d{4})'
            : NUMBER;
      const re = new RegExp(
        `\\b${alias.replace(/[-]/g, '[- ]?')}\\b(?:\\s(?:is|was|=|value|reading|hai|of))*\\s?${valuePattern}`,
        'g',
      );
      for (const m of seg.text.matchAll(re)) {
        const start = m.index;
        const end = start + m[0].length;
        if (overlaps(start, end)) continue;
        taken.push([start, end]);
        changes.push({
          blockKey: block.key,
          rowIndex: block.kind === 'grid' ? seg.row : null,
          fieldKey: field.key,
          value: m[1].replace(/\s(\d{2})$/, ':$1'),
          heard: m[0].trim(),
          confidence: 'high',
          _pos: start + (seg.row ?? 0) * 10_000,
          _seg: seg,
          _start: start,
        });
      }
    }
    // Leftover numbers nobody claimed: a self-correction ("pH 7.2, no sorry
    // 7.4") replaces the nearest earlier value; anything else is surfaced as
    // unrecognized rather than dropped silently.
    for (const m of seg.text.matchAll(/-?\d+(?:\.\d+)?/g)) {
      if (overlaps(m.index, m.index + m[0].length)) continue;
      const before = seg.text.slice(Math.max(0, m.index - 24), m.index);
      const segChanges = changes.filter((c) => c._seg === seg && c._start < m.index);
      const target = segChanges.sort((a, b) => b._start - a._start)[0];
      if (target && /\b(no|sorry|i mean|correction|galat|nahi)\b[\s\w]*$/.test(before)) {
        target.value = m[0];
        target.heard = seg.text.slice(target._start, m.index + m[0].length).trim();
        target.confidence = 'medium';
      } else {
        unrecognized.push(m[0]);
      }
    }
  }
  changes.sort((a, b) => a._pos - b._pos);
  return { changes: changes.map(({ _pos, _seg, _start, ...c }) => c), unrecognized };
}
