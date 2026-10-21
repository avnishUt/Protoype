const PptxGenJS = require('pptxgenjs');
const path = require('path');

const OUT = '/home/avnish/DQms/voice-fill-prototype/DQMS-Voice-Fill-Prototype.pptx';
const SHOTS = '/home/avnish/DQms/voice-fill-prototype/presentation/screens';
const shot = (n) => path.join(SHOTS, n);

const C = {
  red: 'E0362C', redSoft: 'FDECEA', ai: '5B4BC4', aiSoft: 'EEECFB', ink: '1A1A1A', muted: '6B6B70',
  line: 'E6E6E9', bg: 'F7F7F8', dark: '161618', ok: '2E8B57', okSoft: 'E8F5EE', warn: 'B7791F', warnSoft: 'FDF5E3',
};
const FONT = 'Calibri';

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5
pptx.title = 'DQMS Voice Fill — Prototype';

let pageNo = 0;
function base(title, kicker) {
  const s = pptx.addSlide();
  pageNo += 1;
  s.background = { color: 'FFFFFF' };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: C.red }, line: { color: C.red } });
  if (kicker) s.addText(kicker.toUpperCase(), { x: 0.6, y: 0.35, w: 10, h: 0.3, fontFace: FONT, fontSize: 11, bold: true, color: C.red, charSpacing: 2 });
  if (title) s.addText(title, { x: 0.6, y: 0.62, w: 12.1, h: 0.75, fontFace: FONT, fontSize: 28, bold: true, color: C.ink });
  s.addText(`DQMS Voice Fill · Prototype   ${pageNo}`, { x: 9.3, y: 7.05, w: 3.7, h: 0.3, fontFace: FONT, fontSize: 9, color: C.muted, align: 'right' });
  return s;
}


// Rich bullets with a bold lead-in.
function richBullets(s, items, opts) {
  const runs = [];
  items.forEach(([head, rest], i) => {
    runs.push({ text: head, options: { bold: true, bullet: { indent: 18 }, breakLine: false } });
    runs.push({ text: ` ${rest}`, options: { breakLine: i < items.length - 1, paraSpaceAfter: 10 } });
  });
  s.addText(runs, { fontFace: FONT, fontSize: 15, color: C.ink, valign: 'top', ...opts });
}

function card(s, x, y, w, h, { title, body, num, fill = C.bg, accent = C.ai, bodySize = 13 }) {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: C.line, width: 1 }, rectRadius: 0.12 });
  let ty = y + 0.2;
  if (num !== undefined) {
    s.addShape(pptx.ShapeType.ellipse, { x: x + 0.25, y: y + 0.25, w: 0.42, h: 0.42, fill: { color: accent }, line: { color: accent } });
    s.addText(String(num), { x: x + 0.25, y: y + 0.25, w: 0.42, h: 0.42, align: 'center', valign: 'middle', fontFace: FONT, fontSize: 14, bold: true, color: 'FFFFFF' });
    ty = y + 0.8;
  }
  s.addText(title, { x: x + 0.25, y: ty, w: w - 0.5, h: 0.4, fontFace: FONT, fontSize: 17, bold: true, color: C.ink, valign: 'top' });
  s.addText(body, { x: x + 0.25, y: ty + 0.45, w: w - 0.5, h: h - (ty - y) - 0.6, fontFace: FONT, fontSize: bodySize, color: C.muted, valign: 'top', paraSpaceAfter: bodySize > 13 ? 6 : 0 });
}

function screenshot(s, file, x, y, w) {
  const h = w * (913 / 1440);
  s.addShape(pptx.ShapeType.rect, { x: x - 0.02, y: y - 0.02, w: w + 0.04, h: h + 0.04, fill: { color: C.line }, line: { color: C.line }, shadow: { type: 'outer', blur: 8, offset: 3, angle: 90, color: '000000', opacity: 0.18 } });
  s.addImage({ path: shot(file), x, y, w, h });
  return h;
}


// 1 — Title
{
  const s = pptx.addSlide();
  pageNo += 1;
  s.background = { color: C.dark };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.25, h: 7.5, fill: { color: C.red }, line: { color: C.red } });
  s.addShape(pptx.ShapeType.roundRect, { x: 0.9, y: 1.3, w: 1.6, h: 0.42, fill: { color: C.ai }, line: { color: C.ai }, rectRadius: 0.2 });
  s.addText('PROTOTYPE', { x: 0.9, y: 1.3, w: 1.6, h: 0.42, align: 'center', valign: 'middle', fontFace: FONT, fontSize: 12, bold: true, color: 'FFFFFF', charSpacing: 2 });
  s.addText('Voice Fill for DQMS', { x: 0.9, y: 2.0, w: 11, h: 1.1, fontFace: FONT, fontSize: 54, bold: true, color: 'FFFFFF' });
  s.addText('Hands-free quality records: the QA executive speaks the readings, AI fills the form, the executive confirms.', { x: 0.9, y: 3.15, w: 10.5, h: 1.0, fontFace: FONT, fontSize: 22, color: 'C9C9CF' });
  s.addText('Demonstrated on the real Kinley form “Treated Water Analysis Record” (WA-FRM-1105-1.0.0.8)', { x: 0.9, y: 5.6, w: 11, h: 0.4, fontFace: FONT, fontSize: 14, color: '9A9AA2' });
  s.addText('October 2026', { x: 0.9, y: 6.05, w: 6, h: 0.4, fontFace: FONT, fontSize: 14, color: '9A9AA2' });
}

// 2 — The problem
{
  const s = base('Readings are taken hands-on, but recorded by typing', 'The problem');
  richBullets(
    s,
    [
      ['Shop-floor reality:', 'the executive samples at the line, often with gloves on or wet hands, then types each value into a tablet.'],
      ['High frequency:', 'forms such as Treated Water Analysis need a full set of readings every 4 hours, across many parameters.'],
      ['Typing is the slow part:', 'readings get written on paper first and keyed in later, which means double handling and a delay before the record is current.'],
      ['Data-integrity risk:', 'late or batched entry and transcription slips are exactly what auditors look for under ALCOA+ (attributable, contemporaneous, accurate).'],
    ],
    { x: 0.6, y: 1.6, w: 7.2, h: 4.8 },
  );
  card(s, 8.3, 1.7, 4.4, 4.4, {
    title: 'The opportunity',
    body: 'DQMS already holds ~160 digitised forms with typed fields, units and spec limits.\n\nThat structure is exactly what an AI needs to map spoken words onto the right field reliably, so the executive can record at the point of sampling, by voice.',
    fill: C.aiSoft,
  });
}

// 3 — The idea
{
  const s = base('Speak → Understand → Check → Confirm', 'The idea');
  const steps = [
    ['Speak', 'Hold the mic and say the readings naturally.\n“Round 1, time 10:30, chlorine zero, turbidity 0.18, pH 6.8, TDS 410.”'],
    ['Understand', 'Speech-to-text, then Claude maps the words onto this form’s own fields and rounds, including Hinglish and self-corrections.'],
    ['Check', 'Every value is type-checked, matched to spec limits, and flagged if it overwrites an existing reading.'],
    ['Confirm', 'The executive ticks what is right. Accepted values go into the draft with a full audit trail. Submitting stays manual.'],
  ];
  steps.forEach(([t, b], i) => card(s, 0.6 + i * 3.1, 1.75, 2.9, 3.9, { num: i + 1, title: t, body: b, accent: i === 3 ? C.red : C.ai }));
  s.addShape(pptx.ShapeType.roundRect, { x: 0.6, y: 5.95, w: 12.1, h: 0.75, fill: { color: C.redSoft }, line: { color: C.redSoft }, rectRadius: 0.1 });
  s.addText('The AI only proposes. A named person always confirms, and only a person submits.', { x: 0.85, y: 5.95, w: 11.6, h: 0.75, fontFace: FONT, fontSize: 16, bold: true, color: C.red, valign: 'middle' });
}

// 4 — Prototype: the fill page
{
  const s = base('The prototype: a real DQMS form, filled by voice', 'Demo');
  screenshot(s, '5-filled.png', 0.6, 1.55, 8.3);
  richBullets(
    s,
    [
      ['Real form:', 'same fields, keys, 6-round grid and daily block as the production seed.'],
      ['Voice dock:', 'hold the mic (or Space); the transcript appears live.'],
      ['Mic badge', 'on every voice-filled cell shows who confirmed it and when.'],
      ['Spec limits', 'are highlighted on the form itself (Turbidity 0.4 > 0.3).'],
      ['Manual edits', 'still work; voice is an extra input, not a replacement.'],
    ],
    { x: 9.2, y: 1.6, w: 3.7, h: 5.2, fontSize: 13 },
  );
}

// 5 — Review dialog
{
  const s = base('Nothing is saved until the executive accepts', 'Human in the loop');
  screenshot(s, '2-review.png', 0.6, 1.55, 8.3);
  richBullets(
    s,
    [
      ['Every value', 'is shown with the words it was heard from (“Heard as”).'],
      ['Row targeting:', '“round 2”, “second reading”, or the round the executive taps.'],
      ['Checks per value:', 'within spec, above or below spec, replaces an earlier reading, low confidence.'],
      ['Untick', 'anything wrong. Only ticked values reach the draft.'],
      ['Unplaced numbers', 'are listed as “heard but not placed”, never guessed.'],
    ],
    { x: 9.2, y: 1.6, w: 3.7, h: 5.2, fontSize: 13 },
  );
}

// 6 — Safety in action
{
  const s = base('Built-in checks catch problems before they are saved', 'Safety in action');
  screenshot(s, '4-correction-review.png', 0.6, 1.55, 7.6);
  card(s, 8.6, 1.55, 4.1, 1.6, { title: 'Self-corrections', body: '“pH 7.2, no sorry 7.4” → only 7.4 is proposed, marked “Replaces 6.8”.', fill: C.aiSoft });
  card(s, 8.6, 3.3, 4.1, 1.6, { title: 'Out-of-spec', body: 'Turbidity 0.4 is flagged “Above spec (max 0.3)” in the review and on the form.', fill: C.redSoft });
  card(s, 8.6, 5.05, 4.1, 1.6, { title: 'Strict validation', body: 'Unknown fields, bad times, rows past the 6-round limit and non-numbers are rejected, whatever the AI said.', fill: C.bg });
}

// 7 — Audit trail
{
  const s = base('Every capture is logged: an audit trail QA can stand behind', 'Data integrity');
  screenshot(s, '6-audit.png', 0.6, 1.55, 7.6);
  richBullets(
    s,
    [
      ['Attributable:', 'who spoke and who confirmed (the logged-in executive).'],
      ['Contemporaneous:', 'captured at the point of sampling, time-stamped.'],
      ['Traceable:', 'exact transcript, AI model and prompt version for every capture.'],
      ['Complete:', 'what was proposed, what was accepted, what was rejected.'],
      ['Original:', 'the record still shows each value’s source (voice or manual).'],
    ],
    { x: 8.6, y: 1.6, w: 4.3, h: 5.2, fontSize: 14 },
  );
}

// 8 — Scope
{
  const s = base('What the prototype does today', 'Scope');
  card(s, 0.6, 1.6, 6.0, 5.0, {
    title: 'Included in the prototype',
    body:
      '•  Real Kinley form: Treated Water Analysis Record\n' +
      '•  Push-to-talk speech capture (English-India, Hindi)\n' +
      '•  Claude AI maps speech onto form fields and rounds\n' +
      '•  Handles number words, “round N”, Hinglish, corrections\n' +
      '•  Type, row and spec-limit validation on every value\n' +
      '•  Review and confirm dialog; save as draft; manual submit\n' +
      '•  Voice capture audit log\n' +
      '•  Offline fallback parser if the AI is unreachable',
    fill: C.okSoft,
    bodySize: 15,
  });
  card(s, 6.9, 1.6, 5.8, 5.0, {
    title: 'Not yet (intentionally)',
    body:
      '•  Not connected to production DQMS or its database\n' +
      '•  Single demo user, no real login\n' +
      '•  Browser speech recognition (Chrome/Edge) instead of Azure Speech\n' +
      '•  One form; grids with many columns (e.g. 50 valves) come later\n' +
      '•  No spoken read-back yet\n' +
      '•  Not validated for GMP use. This is a concept demo.',
    fill: C.warnSoft,
    bodySize: 15,
  });
}

// 9 — How it works (architecture)
{
  const s = base('How it works', 'Architecture');
  const boxes = [
    ['Executive', 'Tablet / phone\nhold-to-talk', C.dark],
    ['Speech-to-text', 'Prototype: browser\nProduction: Azure AI Speech', C.ai],
    ['Claude', 'Form schema + current\nrecord → structured JSON', C.ai],
    ['Validation', 'Types, rows, spec limits,\noverwrites (server-side)', C.ai],
    ['Review', 'Executive ticks\nand accepts', C.red],
  ];
  const w = 2.25, gap = 0.21, y = 2.1;
  boxes.forEach(([t, b, col], i) => {
    const x = 0.6 + i * (w + gap);
    s.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 1.7, fill: { color: col }, line: { color: col }, rectRadius: 0.12 });
    s.addText(t, { x, y: y + 0.15, w, h: 0.5, align: 'center', fontFace: FONT, fontSize: 17, bold: true, color: 'FFFFFF' });
    s.addText(b, { x: x + 0.1, y: y + 0.65, w: w - 0.2, h: 0.95, align: 'center', valign: 'top', fontFace: FONT, fontSize: 12, color: 'EDEDF2' });
    if (i < boxes.length - 1) s.addShape(pptx.ShapeType.rightArrow, { x: x + w + 0.01, y: y + 0.7, w: gap - 0.02, h: 0.3, fill: { color: C.muted }, line: { color: C.muted } });
  });
  const lowY = 4.5;
  [
    ['Draft record', 'Accepted values saved with source = voice; the executive submits as today.'],
    ['Audit log', 'Transcript, model, prompt version, proposed vs accepted, who and when.'],
    ['Fallback', 'If the AI is unreachable, an offline parser keeps the flow working.'],
  ].forEach(([t, b], i) => card(s, 0.6 + i * 4.07, lowY, 3.9, 1.9, { title: t, body: b }));
}

// 10 — Path to production
{
  const s = base('From prototype to production DQMS', 'Integration path');
  const hdr = (t) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: C.dark } } });
  const rows = [
    [hdr('Area'), hdr('Prototype'), hdr('Production in DQMS')],
    ['Speech-to-text', 'Browser Web Speech API', 'Azure AI Speech (en-IN / hi-IN), audio stays in the client’s Azure tenant'],
    ['AI', 'Claude via API key', 'Claude through Microsoft Foundry, behind an LLM adapter in dqms_be'],
    ['Form knowledge', 'One hand-copied form', 'Built from each FormVersion; optional voice aliases added per form in seed files'],
    ['Validation', 'Prototype rules', 'The same checks the record save already runs, shared'],
    ['Storage & audit', 'Local files', 'New voice_captures collection + audit-log entries; values carry source = voice'],
    ['Access', 'One demo user', 'Real login + new “record.voiceFill” permission, enabled per plant / form'],
  ];
  s.addTable(rows, {
    x: 0.6, y: 1.6, w: 12.1, colW: [2.2, 3.0, 6.9],
    fontFace: FONT, fontSize: 13, color: C.ink, border: { type: 'solid', color: C.line, pt: 1 },
    rowH: 0.62, valign: 'middle', fill: { color: 'FFFFFF' },
  });
}

// 11 — Rollout & measures
{
  const s = base('Phased rollout, measured at every step', 'Plan');
  card(s, 0.6, 1.6, 3.9, 3.3, { num: 1, title: 'Pilot', body: 'Flat fields and simple rounds on one high-volume form, one line. Push-to-talk, English + Hinglish.' });
  card(s, 4.7, 1.6, 3.9, 3.3, { num: 2, title: 'Grids', body: 'Large grids (“valve 12 gross 512.3”), spec-master rows by name, day-of-month rows. More forms per department.' });
  card(s, 8.8, 1.6, 3.9, 3.3, { num: 3, title: 'Hands-free', body: 'Continuous capture per field with spoken read-back (“Brix 10.8, confirm?”) for gloved or wet-hands work.' });
  s.addText('What we measure in the pilot', { x: 0.6, y: 5.15, w: 12, h: 0.4, fontFace: FONT, fontSize: 16, bold: true, color: C.ink });
  s.addText(
    [
      { text: 'Time to complete a form (voice vs typing)', options: { bullet: { indent: 18 }, breakLine: true } },
      { text: 'Share of AI-proposed values accepted unchanged', options: { bullet: { indent: 18 }, breakLine: true } },
      { text: 'Corrections after submission, and how soon after sampling each reading is recorded', options: { bullet: { indent: 18 } } },
    ],
    { x: 0.6, y: 5.55, w: 12, h: 1.3, fontFace: FONT, fontSize: 14, color: C.ink, valign: 'top' },
  );
}

// 12 — Next steps
{
  const s = base('What we need to move to a pilot', 'Next steps');
  const asks = [
    ['Pilot scope', 'Choose the pilot form and line.'],
    ['QA sign-off', 'QA head agrees the model: AI proposes, the executive confirms, every capture is logged.'],
    ['Azure access', 'Azure AI Speech and Claude in Microsoft Foundry in the client’s tenant.'],
    ['Audio policy', 'Keep transcripts only (recommended), or also store audio for a set retention period.'],
    ['Hardware', 'Tablets or phones on the line with a headset mic; a built-in mic will struggle next to a filler.'],
  ];
  asks.forEach(([t, b], i) => {
    const y = 1.65 + i * 0.98;
    s.addShape(pptx.ShapeType.ellipse, { x: 0.6, y: y + 0.08, w: 0.5, h: 0.5, fill: { color: C.red }, line: { color: C.red } });
    s.addText(String(i + 1), { x: 0.6, y: y + 0.08, w: 0.5, h: 0.5, align: 'center', valign: 'middle', fontFace: FONT, fontSize: 16, bold: true, color: 'FFFFFF' });
    s.addText(t, { x: 1.35, y, w: 3.0, h: 0.66, valign: 'middle', fontFace: FONT, fontSize: 17, bold: true, color: C.ink });
    s.addText(b, { x: 4.3, y, w: 8.4, h: 0.66, valign: 'middle', fontFace: FONT, fontSize: 15, color: C.muted });
  });
}

pptx.writeFile({ fileName: OUT }).then((f) => console.log('wrote', f));
