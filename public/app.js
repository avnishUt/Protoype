const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const MIC_SVG =
  '<svg class="vbadge" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" fill="currentColor"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/></svg>';

const SAMPLES = [
  'Date today. Round 1, time 10:30, chlorine zero, turbidity 0.18, M alk 72, pH 6.8, TDS 410',
  'Round 2 time 2:30 pm turbidity point four, p h six point five, TDS four hundred twenty',
  'Total hardness 85, calcium hardness 60, chlorides 120, iron 0.05',
  'Round 1 pH 7.2, no sorry 7.4',
];

let config;
let record;
let activeRow = null; // 1-based, for the grid; null = let the server pick
let pending = null; // last /voice-fill response awaiting review
let flashCells = new Set();

// ---------- API ----------
async function api(path, body) {
  const res = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || res.statusText);
  return json;
}

// ---------- helpers ----------
function specWarning(field, raw) {
  if (!field.spec || field.type !== 'decimal' || raw === '' || raw == null) return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return 'Not a number';
  const { min, max, exclusive } = field.spec;
  if (min !== undefined && n < min) return `Below spec (min ${min})`;
  if (max !== undefined && (exclusive ? n >= max : n > max)) return `Above spec (${exclusive ? '<' : 'max '}${max})`;
  return null;
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 3200);
}

const gridBlock = () => config.form.blocks.find((b) => b.kind === 'grid');
const isLocked = () => record.status === 'submitted';

function localNowIso() {
  const d = new Date();
  // Send local wall-clock time so "now"/"today" resolve to the executive's clock.
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 19);
}

// ---------- rendering ----------
function cellHtml(field, value, cellId) {
  const raw = value?.raw ?? '';
  const warn = specWarning(field, raw);
  const voice = value?.source === 'voice';
  const type = field.type === 'decimal' ? 'text' : field.type;
  const title = voice
    ? `Voice · confirmed by ${value.by} at ${new Date(value.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : '';
  return `<div class="cell ${voice ? 'voice' : ''} ${warn ? 'oos' : ''} ${flashCells.has(cellId) ? 'flash' : ''}" title="${esc(title)}">
    <input data-cell="${cellId}" type="${type}" ${field.type === 'decimal' ? 'inputmode="decimal"' : ''} value="${esc(raw)}" ${isLocked() ? 'disabled' : ''} />
    ${voice ? MIC_SVG : ''}
    ${warn ? `<div class="caption">${esc(warn)}</div>` : ''}
  </div>`;
}

function render() {
  const { form } = config;
  $('#form-name').textContent = form.name;
  $('#form-code').textContent = form.formCode;
  $('#form-line').textContent = form.line;
  $('#crumb-dept').textContent = form.department;
  $('#crumb-form').textContent = form.name;
  $('#record-id').textContent = record.id;
  const badge = $('#status-badge');
  badge.textContent = record.status === 'submitted' ? `Submitted by ${record.submittedBy}` : 'Draft';
  badge.classList.toggle('submitted', record.status === 'submitted');
  $('#save-btn').disabled = $('#submit-btn').disabled = $('#mic-btn').disabled = isLocked();

  const html = form.blocks
    .map((block) => {
      const data = record.blocks[block.key];
      if (block.kind === 'flat') {
        const fields = block.fields
          .map(
            (f) => `<div class="field"><label>${esc(f.label)}${f.mandatory ? ' <span class="req">*</span>' : ''}</label>${cellHtml(f, data[f.key], `${block.key}::${f.key}`)}</div>`,
          )
          .join('');
        return `<section class="card">${block.title ? `<header><h3>${esc(block.title)}</h3><small>Once per day</small></header>` : ''}<div class="card-body"><div class="flat-grid">${fields}</div></div></section>`;
      }
      const head = `<tr><th></th>${block.fields.map((f) => `<th>${esc(f.label)}</th>`).join('')}</tr>`;
      const rows = data
        .map((row, i) => {
          const n = i + 1;
          return `<tr class="${activeRow === n ? 'active' : ''}"><td class="rowno" data-row="${n}" title="Click to make this the row voice fills by default">Round <b>${n}</b></td>${block.fields
            .map((f) => `<td>${cellHtml(f, row[f.key], `${block.key}:${n}:${f.key}`)}</td>`)
            .join('')}</tr>`;
        })
        .join('');
      return `<section class="card">
        <header><h3>${esc(block.title)}</h3><small>Every 4 hours · up to ${block.maxRows} rounds</small></header>
        <div class="card-body"><div class="grid-wrap"><table class="grid"><thead>${head}</thead><tbody>${rows}</tbody></table></div>
        <div class="grid-foot"><span>${activeRow ? `Voice goes to <b>Round ${activeRow}</b> unless you say a round. <a href="#" id="clear-active">Auto-pick</a>` : 'Say "round 2…" to target a row, or click a round number.'}</span>
        <button class="secondary" type="button" id="add-row" ${data.length >= block.maxRows || isLocked() ? 'disabled' : ''}>+ Add round</button></div></div>
      </section>`;
    })
    .join('');
  $('#form-root').innerHTML = html;
  flashCells = new Set();
}

// ---------- state edits ----------
function setCell(cellId, raw, meta) {
  const parts = cellId.split(':');
  const value = raw === '' ? undefined : { raw, at: new Date().toISOString(), by: config.user.name, ...meta };
  if (parts[1] === '') {
    // flat: "block::field"
    const [blockKey, , fieldKey] = parts;
    if (value) record.blocks[blockKey][fieldKey] = value;
    else delete record.blocks[blockKey][fieldKey];
  } else {
    const [blockKey, rowNo, fieldKey] = parts;
    const rows = record.blocks[blockKey];
    while (rows.length < Number(rowNo)) rows.push({});
    if (value) rows[Number(rowNo) - 1][fieldKey] = value;
    else delete rows[Number(rowNo) - 1][fieldKey];
  }
}

async function save(submit = false) {
  record = await api('/api/record', { blocks: record.blocks, submit });
  render();
}

// ---------- voice → review ----------
async function runVoiceFill(transcript) {
  transcript = transcript.trim();
  if (!transcript) return;
  $('#busy').hidden = false;
  try {
    pending = await api('/api/voice-fill', {
      transcript,
      blocks: record.blocks,
      activeRow,
      clientNow: localNowIso(),
    });
    pending.transcript = transcript;
    openReview();
  } catch (err) {
    toast(`Couldn't process that: ${err.message}`);
  } finally {
    $('#busy').hidden = true;
    refreshAuditCount();
  }
}

function engineLabel(engine, model) {
  return engine === 'claude' ? `Claude · ${model}` : 'Offline parser';
}

function openReview() {
  const p = pending;
  $('#review-transcript').textContent = p.transcript;
  const eng = $('#review-engine');
  eng.textContent = `${engineLabel(p.engine, p.model)} · ${(p.latencyMs / 1000).toFixed(1)}s`;
  eng.classList.toggle('local', p.engine !== 'claude');
  const notice = $('#review-notice');
  notice.hidden = !p.notice;
  notice.textContent = p.notice ?? '';

  const rows = p.changes.length
    ? p.changes
        .map((c) => {
          const ok = c.errors.length === 0;
          const tags = [
            ...c.errors.map((e) => `<span class="tag bad">${esc(e)}</span>`),
            ...c.warnings.map((w) => `<span class="tag ${/spec/i.test(w) ? 'bad' : 'warn'}">${esc(w)}</span>`),
            ok && !c.warnings.length ? '<span class="tag ok">Within spec</span>' : '',
            c.confidence !== 'high' ? `<span class="tag conf">${esc(c.confidence)} confidence</span>` : '',
          ].join('');
          return `<tr class="${ok ? '' : 'err'}">
            <td><input type="checkbox" data-change="${c.id}" ${ok ? 'checked' : 'disabled'} /></td>
            <td><b>${esc(c.label)}</b><br><small style="color:var(--muted)">${esc(c.blockTitle)}</small></td>
            <td>${c.rowIndex ? `Round ${c.rowIndex}` : '—'}</td>
            <td class="val">${c.previous && c.previous !== c.value ? `<span class="prev">${esc(c.previous)}</span>` : ''}${esc(c.value ?? '—')}</td>
            <td class="heard">${esc(c.heard)}</td>
            <td>${tags}</td>
          </tr>`;
        })
        .join('')
    : '<tr><td colspan="6" class="empty">No form values recognised in that. Try naming the field, e.g. "pH 6.8".</td></tr>';
  $('#review-rows').innerHTML = rows;

  const unrec = $('#review-unrec');
  unrec.hidden = !p.unrecognized?.length;
  unrec.innerHTML = p.unrecognized?.length
    ? `Heard but not placed (not filled): ${p.unrecognized.map((u) => `<b>${esc(u)}</b>`).join(', ')}`
    : '';
  updateAcceptLabel();
  $('#review').showModal();
}

function updateAcceptLabel() {
  const n = document.querySelectorAll('#review-rows input[type=checkbox]:checked').length;
  const btn = $('#accept-btn');
  btn.textContent = n ? `Accept ${n} value${n === 1 ? '' : 's'}` : 'Accept selected';
  btn.disabled = n === 0;
}

async function closeReview(accepted) {
  const p = pending;
  pending = null;
  if (!p) return;
  const checked = new Set(
    [...document.querySelectorAll('#review-rows input[type=checkbox]:checked')].map((el) => el.dataset.change),
  );
  const acceptedIds = accepted ? p.changes.filter((c) => checked.has(c.id)).map((c) => c.id) : [];
  const rejectedIds = p.changes.filter((c) => !acceptedIds.includes(c.id)).map((c) => c.id);

  if (acceptedIds.length) {
    for (const c of p.changes.filter((c) => acceptedIds.includes(c.id))) {
      const cellId = c.rowIndex ? `${c.blockKey}:${c.rowIndex}:${c.fieldKey}` : `${c.blockKey}::${c.fieldKey}`;
      setCell(cellId, c.value, { source: 'voice', captureId: p.captureId });
      flashCells.add(cellId);
    }
    await save(false);
    toast(`${acceptedIds.length} value${acceptedIds.length === 1 ? '' : 's'} added to the draft. Submitting is still up to you.`);
  } else {
    toast('Discarded. Nothing was changed.');
  }
  await api('/api/voice-fill/decision', { captureId: p.captureId, acceptedIds, rejectedIds });
  refreshAuditCount();
}

// ---------- speech recognition (browser Web Speech API) ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let finalText = '';
let listening = false;

function setLive(finalPart, interim = '') {
  $('#live').innerHTML =
    finalPart || interim
      ? `${esc(finalPart)} <span class="interim">${esc(interim)}</span>`
      : '<span class="hint">Listening… speak the readings</span>';
}

function startListening() {
  if (listening || isLocked()) return;
  if (!SR) {
    toast('Speech recognition needs Chrome or Edge. You can type below instead.');
    $('#type-input').focus();
    return;
  }
  finalText = '';
  recognition = new SR();
  recognition.lang = $('#lang').value;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (e) => {
    let interim = '';
    finalText = '';
    for (const r of e.results) {
      if (r.isFinal) finalText += r[0].transcript + ' ';
      else interim += r[0].transcript;
    }
    setLive(finalText, interim);
    recognition._interim = interim;
  };
  recognition.onerror = (e) => {
    if (e.error === 'not-allowed') toast('Microphone permission was denied.');
    else if (e.error !== 'aborted' && e.error !== 'no-speech') toast(`Speech error: ${e.error}`);
  };
  recognition.onend = () => {
    listening = false;
    $('#mic-btn').classList.remove('listening');
    const text = (finalText + ' ' + (recognition?._interim ?? '')).trim();
    if (text) runVoiceFill(text);
    else $('#live').innerHTML = '<span class="hint">Didn\'t catch anything. Hold the mic while you speak.</span>';
  };
  recognition.start();
  listening = true;
  $('#mic-btn').classList.add('listening');
  setLive('');
}

function stopListening() {
  if (listening && recognition) recognition.stop();
}

// ---------- audit drawer ----------
async function refreshAuditCount() {
  const caps = await api('/api/captures');
  $('#audit-count').textContent = caps.length;
  return caps;
}

async function openDrawer() {
  const caps = await refreshAuditCount();
  $('#drawer-list').innerHTML = caps.length
    ? caps
        .map((c) => {
          const accepted = c.acceptedIds?.length ?? 0;
          const decided = c.decidedAt ? `${accepted} of ${c.proposed.length} accepted` : 'Awaiting decision';
          return `<div class="cap">
            <div class="top"><span>${new Date(c.createdAt).toLocaleString()}</span><span>${esc(decided)}</span></div>
            <q>${esc(c.transcript)}</q>
            <div class="kv">
              <span>Spoken by</span><b>${esc(c.userName)}</b>
              <span>Engine</span><b>${esc(c.model)}</b>
              <span>Prompt</span><b>${esc(c.promptVersion)}</b>
              <span>Latency</span><b>${(c.latencyMs / 1000).toFixed(2)}s</b>
              <span>Proposed</span><b>${c.proposed.map((p) => `${esc(p.label.split(' (')[0])}${p.rowIndex ? ` R${p.rowIndex}` : ''} = ${esc(p.value ?? '✕')}`).join(', ') || '—'}</b>
              ${c.unrecognized?.length ? `<span>Not placed</span><b>${c.unrecognized.map(esc).join(', ')}</b>` : ''}
            </div>
          </div>`;
        })
        .join('')
    : '<div class="empty">No voice captures yet.</div>';
  $('#drawer').classList.add('open');
}

// ---------- wiring ----------
function wire() {
  const mic = $('#mic-btn');
  mic.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    mic.setPointerCapture(e.pointerId);
    startListening();
  });
  mic.addEventListener('pointerup', stopListening);
  mic.addEventListener('pointercancel', stopListening);

  let spaceDown = false;
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || spaceDown || e.repeat) return;
    if (e.target.closest('input, select, textarea, dialog')) return;
    e.preventDefault();
    spaceDown = true;
    startListening();
  });
  document.addEventListener('keyup', (e) => {
    if (e.code !== 'Space' || !spaceDown) return;
    spaceDown = false;
    stopListening();
  });

  $('#type-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#type-input').value;
    $('#type-input').value = '';
    if (v.trim()) {
      setLive(v);
      runVoiceFill(v);
    }
  });

  $('#samples').innerHTML =
    '<span class="label">Try:</span>' + SAMPLES.map((s, i) => `<button type="button" data-sample="${i}">${esc(s)}</button>`).join('');
  $('#samples').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sample]');
    if (!b || isLocked()) return;
    const text = SAMPLES[Number(b.dataset.sample)];
    setLive(text);
    runVoiceFill(text);
  });

  $('#form-root').addEventListener('change', (e) => {
    const id = e.target.dataset.cell;
    if (!id) return;
    setCell(id, e.target.value.trim(), { source: 'manual' });
    render();
  });
  $('#form-root').addEventListener('click', (e) => {
    const rowCell = e.target.closest('[data-row]');
    if (rowCell) {
      const n = Number(rowCell.dataset.row);
      activeRow = activeRow === n ? null : n;
      render();
    }
    if (e.target.id === 'clear-active') {
      e.preventDefault();
      activeRow = null;
      render();
    }
    if (e.target.id === 'add-row') {
      record.blocks[gridBlock().key].push({});
      activeRow = record.blocks[gridBlock().key].length;
      render();
    }
  });

  $('#review').addEventListener('change', (e) => {
    if (e.target.matches('input[type=checkbox]')) updateAcceptLabel();
  });
  $('#review').addEventListener('close', () => closeReview($('#review').returnValue === 'accept'));

  $('#save-btn').addEventListener('click', async () => {
    await save(false);
    toast('Draft saved.');
  });
  $('#submit-btn').addEventListener('click', async () => {
    if (!record.blocks.header?.date) return toast('Date is mandatory before submitting.');
    if (!confirm('Submit this record? It becomes read-only.')) return;
    await save(true);
    toast('Record submitted by the executive.');
  });
  $('#reset-btn').addEventListener('click', async () => {
    if (!confirm('Clear the record and the capture log?')) return;
    record = await api('/api/record/reset', {});
    activeRow = null;
    render();
    refreshAuditCount();
  });

  $('#audit-btn').addEventListener('click', openDrawer);
  $('#drawer-close').addEventListener('click', () => $('#drawer').classList.remove('open'));
  $('#explainer-close').addEventListener('click', () => {
    $('#explainer').hidden = true;
    try { localStorage.setItem('vf-explainer-hidden', '1'); } catch {}
  });
  try {
    if (localStorage.getItem('vf-explainer-hidden')) $('#explainer').hidden = true;
  } catch {}
}

async function init() {
  [config, record] = await Promise.all([api('/api/config'), api('/api/record')]);
  $('#user-name').textContent = config.user.name;
  $('#user-role').textContent = config.user.role;
  $('#user-avatar').textContent = config.user.name.replace(/[^A-Z]/g, '').slice(0, 2);
  const chip = $('#engine-chip');
  chip.textContent = config.engine.kind === 'claude' ? `AI: Claude · ${config.engine.model}` : 'Offline demo parser';
  chip.classList.toggle('local', config.engine.kind !== 'claude');
  chip.title =
    config.engine.kind === 'claude'
      ? 'Claude maps the transcript onto this form'
      : 'No ANTHROPIC_API_KEY set: a keyword parser stands in for the AI';
  wire();
  render();
  refreshAuditCount();
}

init();
