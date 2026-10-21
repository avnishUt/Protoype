export function AuditDrawer({ open, captures, onClose }) {
  return (
    <aside className={`drawer${open ? ' open' : ''}`} aria-hidden={!open}>
      <header>
        <div>
          <h3>Voice capture log</h3>
          <small>
            Every capture is logged: who spoke, the transcript, model and prompt version, what was proposed, and what was
            accepted.
          </small>
        </div>
        <button className="icon-btn" type="button" aria-label="Close" onClick={onClose}>
          ✕
        </button>
      </header>
      <div className="drawer-list">
        {captures.length === 0 && <div className="empty">No voice captures yet.</div>}
        {captures.map((c) => (
          <div className="cap" key={c.id}>
            <div className="top">
              <span>{new Date(c.createdAt).toLocaleString()}</span>
              <span>{c.decidedAt ? `${c.acceptedIds.length} of ${c.proposed.length} accepted` : 'Awaiting decision'}</span>
            </div>
            <q>{c.transcript}</q>
            <div className="kv">
              <span>Spoken by</span>
              <b>{c.userName}</b>
              <span>Engine</span>
              <b>{c.model}</b>
              <span>Prompt</span>
              <b>{c.promptVersion}</b>
              <span>Latency</span>
              <b>{(c.latencyMs / 1000).toFixed(2)}s</b>
              <span>Proposed</span>
              <b>
                {c.proposed
                  .map((p) => `${p.label.split(' (')[0]}${p.rowIndex ? ` R${p.rowIndex}` : ''} = ${p.value ?? '✕'}`)
                  .join(', ') || '—'}
              </b>
              {c.unrecognized?.length > 0 && (
                <>
                  <span>Not placed</span>
                  <b>{c.unrecognized.join(', ')}</b>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
