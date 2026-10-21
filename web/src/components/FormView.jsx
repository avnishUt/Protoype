import { specWarning } from '../lib/validate.js';

export const cellId = (blockKey, rowNo, fieldKey) => (rowNo ? `${blockKey}:${rowNo}:${fieldKey}` : `${blockKey}::${fieldKey}`);

function MicBadge() {
  return (
    <svg className="vbadge" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" fill="currentColor" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
    </svg>
  );
}

function Cell({ field, value, id, flash, locked, onChange }) {
  const raw = value?.raw ?? '';
  const warn =
    field.type === 'decimal' && raw !== '' && Number.isNaN(Number(raw)) ? 'Not a number' : raw !== '' ? specWarning(field, raw) : null;
  const voice = value?.source === 'voice';
  const title = voice
    ? `Voice · confirmed by ${value.by} at ${new Date(value.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : undefined;
  return (
    <div className={`cell${voice ? ' voice' : ''}${warn ? ' oos' : ''}${flash ? ' flash' : ''}`} title={title}>
      <input
        type={field.type === 'decimal' ? 'text' : field.type}
        inputMode={field.type === 'decimal' ? 'decimal' : undefined}
        value={raw}
        disabled={locked}
        onChange={(e) => onChange(id, e.target.value)}
        aria-label={field.label}
      />
      {voice && <MicBadge />}
      {warn && <div className="caption">{warn}</div>}
    </div>
  );
}

export function FormView({ form, record, activeRow, flash, locked, onCellChange, onToggleRow, onAddRow }) {
  return (
    <div className="form-root">
      {form.blocks.map((block) => {
        const data = record.blocks[block.key];
        if (block.kind === 'flat') {
          return (
            <section className="card" key={block.key}>
              {block.title && (
                <header>
                  <h3>{block.title}</h3>
                  <small>Once per day</small>
                </header>
              )}
              <div className="card-body">
                <div className="flat-grid">
                  {block.fields.map((f) => {
                    const id = cellId(block.key, null, f.key);
                    return (
                      <div className="field" key={f.key}>
                        <label>
                          {f.label}
                          {f.mandatory && <span className="req"> *</span>}
                        </label>
                        <Cell field={f} value={data[f.key]} id={id} flash={flash.has(id)} locked={locked} onChange={onCellChange} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        }
        return (
          <section className="card" key={block.key}>
            <header>
              <h3>{block.title}</h3>
              <small>Every 4 hours · up to {block.maxRows} rounds</small>
            </header>
            <div className="card-body">
              <div className="grid-wrap">
                <table className="grid">
                  <thead>
                    <tr>
                      <th />
                      {block.fields.map((f) => (
                        <th key={f.key}>{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => {
                      const n = i + 1;
                      return (
                        <tr key={n} className={activeRow === n ? 'active' : undefined}>
                          <td className="rowno" title="Click to make this the row voice fills by default" onClick={() => onToggleRow(n)}>
                            Round <b>{n}</b>
                          </td>
                          {block.fields.map((f) => {
                            const id = cellId(block.key, n, f.key);
                            return (
                              <td key={f.key}>
                                <Cell field={f} value={row[f.key]} id={id} flash={flash.has(id)} locked={locked} onChange={onCellChange} />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="grid-foot">
                <span>
                  {activeRow ? (
                    <>
                      Voice goes to <b>Round {activeRow}</b> unless you say a round.{' '}
                      <a href="#" onClick={(e) => (e.preventDefault(), onToggleRow(activeRow))}>
                        Auto-pick
                      </a>
                    </>
                  ) : (
                    'Say "round 2…" to target a row, or click a round number.'
                  )}
                </span>
                <button className="secondary" type="button" disabled={data.length >= block.maxRows || locked} onClick={() => onAddRow(block.key)}>
                  + Add round
                </button>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
