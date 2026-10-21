export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">D</span>
        <span>DQMS</span>
      </div>
      <nav>
        <a>Quality Dashboard</a>
        <a className="active">My Forms</a>
        <a>Due Records</a>
        <a>Review Records</a>
        <a>Correction Requests</a>
        <a>Audit Log</a>
      </nav>
      <div className="sidebar-foot">Prototype · not connected to production</div>
    </aside>
  );
}

export function Topbar({ form, user, captureCount, onOpenLog }) {
  const initials = user.name.replace(/[^A-Z]/g, '').slice(0, 2);
  return (
    <header className="topbar">
      <div className="crumbs">
        My Forms <span>›</span> <b>{form.department}</b> <span>›</span> <span>{form.name}</span>
      </div>
      <div className="topbar-right">
        <button className="ghost" type="button" onClick={onOpenLog}>
          Voice capture log <span className="count">{captureCount}</span>
        </button>
        <div className="user">
          <span className="avatar">{initials}</span>
          <div>
            <b>{user.name}</b>
            <small>{user.role}</small>
          </div>
        </div>
      </div>
    </header>
  );
}

const STEPS = [
  ['Speak', '"Round 1, time 10:30, chlorine zero, turbidity 0.18, pH 6.8, TDS 410"'],
  ['Understand', "Speech-to-text, then Claude maps the words onto this form's own fields and rows"],
  ['Check', 'Values are type-checked, spec limits flagged, overwrites called out'],
  ['Confirm', "The executive ticks what's right; it's saved as a draft with a full audit trail"],
];

export function Explainer({ onClose }) {
  return (
    <section className="explainer">
      <div className="explainer-head">
        <div>
          <span className="pill pill-ai">Prototype</span>
          <h2>Hands-free form filling for the QA executive</h2>
          <p>
            Hold the mic and say the readings. The AI maps them onto this form. The executive confirms every value
            before it is saved, and the executive still submits the record.
          </p>
        </div>
        <button className="icon-btn" type="button" aria-label="Hide" onClick={onClose}>
          ✕
        </button>
      </div>
      <ol className="steps">
        {STEPS.map(([title, body]) => (
          <li key={title}>
            <b>{title}</b>
            <span>{body}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
