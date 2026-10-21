import { useEffect, useRef, useState } from 'react';

/** Shows a proposal; nothing is applied until the executive accepts. */
export function ReviewDialog({ proposal, onClose }) {
  const ref = useRef(null);
  const [checked, setChecked] = useState(new Set());

  useEffect(() => {
    if (!proposal) return;
    setChecked(new Set(proposal.changes.filter((c) => c.errors.length === 0).map((c) => c.id)));
    if (!ref.current.open) ref.current.showModal();
  }, [proposal]);

  if (!proposal) return <dialog ref={ref} />;

  const finish = (accept) => {
    ref.current.close();
    onClose(accept ? [...checked] : []);
  };
  const toggle = (id) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const n = checked.size;

  return (
    <dialog ref={ref} onCancel={(e) => (e.preventDefault(), finish(false))}>
      <div className="review">
        <header>
          <div>
            <h3>Review what was heard</h3>
            <p className="transcript">{proposal.transcript}</p>
          </div>
          <span className={`engine${proposal.engine === 'claude' ? '' : ' local'}`}>
            {proposal.engine === 'claude' ? `Claude · ${proposal.model}` : 'Offline parser'} · {(proposal.latencyMs / 1000).toFixed(1)}s
          </span>
        </header>
        {proposal.notice && <div className="notice">{proposal.notice}</div>}
        <div className="review-table-wrap">
          <table className="review-table">
            <thead>
              <tr>
                <th />
                <th>Field</th>
                <th>Row</th>
                <th>Value</th>
                <th>Heard as</th>
                <th>Checks</th>
              </tr>
            </thead>
            <tbody>
              {proposal.changes.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No form values recognised in that. Try naming the field, e.g. "pH 6.8".
                  </td>
                </tr>
              )}
              {proposal.changes.map((c) => {
                const ok = c.errors.length === 0;
                return (
                  <tr key={c.id} className={ok ? undefined : 'err'}>
                    <td>
                      <input type="checkbox" checked={checked.has(c.id)} disabled={!ok} onChange={() => toggle(c.id)} aria-label={`Accept ${c.label}`} />
                    </td>
                    <td>
                      <b>{c.label}</b>
                      <br />
                      <small style={{ color: 'var(--muted)' }}>{c.blockTitle}</small>
                    </td>
                    <td>{c.rowIndex ? `Round ${c.rowIndex}` : '—'}</td>
                    <td className="val">
                      {c.previous && c.previous !== c.value && <span className="prev">{c.previous}</span>}
                      {c.value ?? '—'}
                    </td>
                    <td className="heard">{c.heard}</td>
                    <td>
                      {c.errors.map((e) => (
                        <span key={e} className="tag bad">{e}</span>
                      ))}
                      {c.warnings.map((w) => (
                        <span key={w} className={`tag ${/spec/i.test(w) ? 'bad' : 'warn'}`}>{w}</span>
                      ))}
                      {ok && c.warnings.length === 0 && <span className="tag ok">Within spec</span>}
                      {c.confidence !== 'high' && <span className="tag conf">{c.confidence} confidence</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {proposal.unrecognized?.length > 0 && (
          <div className="unrecognized">
            Heard but not placed (not filled):{' '}
            {proposal.unrecognized.map((u, i) => (
              <b key={i}>{i ? ', ' : ''}{u}</b>
            ))}
          </div>
        )}
        <footer>
          <small>Nothing is saved until you accept. Accepted values go into the draft; submitting stays manual.</small>
          <div>
            <button className="btn btn-ghost" type="button" onClick={() => finish(false)}>
              Discard
            </button>
            <button className="btn btn-primary" type="button" disabled={n === 0} onClick={() => finish(true)}>
              {n ? `Accept ${n} value${n === 1 ? '' : 's'}` : 'Accept selected'}
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  );
}
