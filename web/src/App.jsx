import { useCallback, useEffect, useRef, useState } from 'react';
import { FORM, emptyState } from './lib/form.js';
import { load, save } from './lib/storage.js';
import { getConfig, voiceFill } from './lib/api.js';
import { Sidebar, Topbar, Explainer } from './components/Layout.jsx';
import { FormView, cellId } from './components/FormView.jsx';
import { VoiceDock } from './components/VoiceDock.jsx';
import { ReviewDialog } from './components/ReviewDialog.jsx';
import { AuditDrawer } from './components/AuditDrawer.jsx';

// The demo user. In DQMS this is the logged-in executive from the JWT.
const USER = { id: 'u-1042', name: 'R. Sharma', role: 'QA Executive' };
const PROMPT_VERSION = 'vf-2026-10-19';
const newRecord = () => ({ id: 'REC-2026-0147', ...emptyState() });

/** Immutable cell write. `id` is "block::field" (flat) or "block:row:field" (grid). */
function withCell(record, id, raw, meta) {
  const next = structuredClone(record);
  const [blockKey, rowNo, fieldKey] = id.split(':');
  const value = raw === '' ? undefined : { raw, at: new Date().toISOString(), by: USER.name, ...meta };
  let target;
  if (rowNo === '') {
    target = next.blocks[blockKey];
  } else {
    const rows = next.blocks[blockKey];
    while (rows.length < Number(rowNo)) rows.push({});
    target = rows[Number(rowNo) - 1];
  }
  if (value) target[fieldKey] = value;
  else delete target[fieldKey];
  return next;
}

export default function App() {
  const [config, setConfig] = useState({ engine: null });
  const [record, setRecord] = useState(() => load('vf-record', newRecord()));
  const [captures, setCaptures] = useState(() => load('vf-captures', []));
  const [activeRow, setActiveRow] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [flash, setFlash] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [explainerHidden, setExplainerHidden] = useState(() => load('vf-explainer-hidden', false));
  const [toast, setToast] = useState(null);
  const toastTimer = useRef();

  const locked = record.status === 'submitted';

  useEffect(() => {
    getConfig().then(setConfig);
  }, []);
  useEffect(() => save('vf-record', record), [record]);
  useEffect(() => save('vf-captures', captures), [captures]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const handleTranscript = useCallback(
    async (transcript) => {
      if (locked) return;
      setBusy(true);
      try {
        const result = await voiceFill(
          { transcript, blocks: record.blocks, activeRow },
          { askCode: async () => window.prompt('Enter the demo access code to use the AI:') },
        );
        const capture = {
          id: crypto.randomUUID(),
          recordId: record.id,
          formCode: FORM.formCode,
          userId: USER.id,
          userName: USER.name,
          transcript,
          engine: result.engine,
          model: result.model,
          promptVersion: PROMPT_VERSION,
          proposed: result.changes,
          unrecognized: result.unrecognized,
          latencyMs: result.latencyMs,
          createdAt: new Date().toISOString(),
        };
        setCaptures((prev) => [capture, ...prev]);
        setProposal({ ...result, transcript, captureId: capture.id });
      } catch (err) {
        showToast(err.message);
      } finally {
        setBusy(false);
      }
    },
    [record, activeRow, locked, showToast],
  );

  const handleReviewClose = (acceptedIds) => {
    const p = proposal;
    setProposal(null);
    const accepted = p.changes.filter((c) => acceptedIds.includes(c.id));
    if (accepted.length) {
      let next = record;
      const ids = new Set();
      for (const c of accepted) {
        const id = cellId(c.blockKey, c.rowIndex, c.fieldKey);
        next = withCell(next, id, c.value, { source: 'voice', captureId: p.captureId });
        ids.add(id);
      }
      setRecord({ ...next, updatedAt: new Date().toISOString() });
      setFlash(ids);
      setTimeout(() => setFlash(new Set()), 1700);
      showToast(`${accepted.length} value${accepted.length === 1 ? '' : 's'} added to the draft. Submitting is still up to you.`);
    } else {
      showToast('Discarded. Nothing was changed.');
    }
    setCaptures((prev) =>
      prev.map((c) =>
        c.id === p.captureId
          ? {
              ...c,
              acceptedIds,
              rejectedIds: p.changes.map((x) => x.id).filter((id) => !acceptedIds.includes(id)),
              decidedBy: USER.name,
              decidedAt: new Date().toISOString(),
            }
          : c,
      ),
    );
  };

  const submit = () => {
    if (!record.blocks.header?.date) return showToast('Date is mandatory before submitting.');
    if (!window.confirm('Submit this record? It becomes read-only.')) return;
    const now = new Date().toISOString();
    setRecord({ ...record, status: 'submitted', submittedBy: USER.name, submittedAt: now, updatedAt: now });
    showToast('Record submitted by the executive.');
  };

  const reset = () => {
    if (!window.confirm('Clear the record and the capture log?')) return;
    setRecord(newRecord());
    setCaptures([]);
    setActiveRow(null);
  };

  return (
    <>
      <div className="app">
        <Sidebar />
        <main>
          <Topbar form={FORM} user={USER} captureCount={captures.length} onOpenLog={() => setDrawerOpen(true)} />
          {!explainerHidden && (
            <Explainer
              onClose={() => {
                setExplainerHidden(true);
                save('vf-explainer-hidden', true);
              }}
            />
          )}
          <section className="record-head">
            <div>
              <h1>{FORM.name}</h1>
              <div className="meta">
                <span>{FORM.formCode}</span>
                <span className="dot">•</span>
                <span>{FORM.line}</span>
                <span className="dot">•</span>
                <span>{record.id}</span>
              </div>
            </div>
            <div className="record-actions">
              <span className={`badge${locked ? ' submitted' : ''}`}>{locked ? `Submitted by ${record.submittedBy}` : 'Draft'}</span>
              <button className="ghost" type="button" onClick={reset}>
                Reset demo
              </button>
              <button
                className="secondary"
                type="button"
                disabled={locked}
                onClick={() => {
                  setRecord({ ...record, updatedAt: new Date().toISOString() });
                  showToast('Draft saved.');
                }}
              >
                Save draft
              </button>
              <button className="primary" type="button" disabled={locked} onClick={submit}>
                Submit
              </button>
            </div>
          </section>
          <FormView
            form={FORM}
            record={record}
            activeRow={activeRow}
            flash={flash}
            locked={locked}
            onCellChange={(id, raw) => setRecord((r) => withCell(r, id, raw.trim() === '' ? '' : raw, { source: 'manual' }))}
            onToggleRow={(n) => setActiveRow((cur) => (cur === n ? null : n))}
            onAddRow={(blockKey) => {
              setRecord((r) => ({ ...r, blocks: { ...r.blocks, [blockKey]: [...r.blocks[blockKey], {}] } }));
              setActiveRow(record.blocks[blockKey].length + 1);
            }}
          />
          <div className="dock-spacer" />
        </main>
      </div>

      <VoiceDock engine={config.engine} disabled={locked || busy} onTranscript={handleTranscript} onToast={showToast} />
      <ReviewDialog proposal={proposal} onClose={handleReviewClose} />
      <AuditDrawer open={drawerOpen} captures={captures} onClose={() => setDrawerOpen(false)} />

      <div className={`toast${toast ? ' show' : ''}`} role="status">
        {toast}
      </div>
      {busy && (
        <div className="busy">
          <div className="spinner" />
          <span>Understanding…</span>
        </div>
      )}
    </>
  );
}
