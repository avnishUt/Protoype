// Mirrors dqms_fe's `components/layout/header.tsx` + `nav-links.tsx`:
// a two-row sticky header (logo · "Digital QMS" + plant · actions, then the
// centred tab row), so the prototype reads as part of the real app.

const NAV_ITEMS = [
  'My Forms',
  'Dashboard',
  'Review Records',
  'Due / Overdue Records',
  'Correction Requests',
  'Line Breakdowns',
  'Audit Log',
];

function ChevronDown() {
  return (
    <svg className="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Bell() {
  return (
    <svg className="icon-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
      <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </svg>
  );
}

export function Header({ user, plantName, onComingSoon }) {
  const initials = user.name
    .split(/\s+/)
    .map((p) => p.replace(/[^A-Za-z]/g, '')[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <header className="app-header">
      <div className="header-top">
        <a className="header-logo" href="#" onClick={(e) => e.preventDefault()}>
          <img src="/brand/moon-logo.svg" alt="Moon Beverages" />
        </a>
        <div className="header-title">
          <span>Digital QMS</span>
          <small>{plantName}</small>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary btn-sm" type="button" onClick={() => onComingSoon('Line Holds')}>
            Line Holds
          </button>
          <button className="icon-btn bell" type="button" aria-label="Notifications" onClick={() => onComingSoon('Notifications')}>
            <Bell />
          </button>
          <button className="role-switch" type="button" onClick={() => onComingSoon('Role switching')}>
            {user.role} <ChevronDown />
          </button>
          <button className="profile" type="button" aria-label={user.name} title={`Signed in as ${user.name}`} onClick={() => onComingSoon('Profile menu')}>
            <span className="avatar">{initials}</span>
            <ChevronDown />
          </button>
        </div>
      </div>
      <nav className="header-nav" aria-label="Main">
        {NAV_ITEMS.map((label) => (
          <a
            key={label}
            href="#"
            className={label === 'My Forms' ? 'active' : undefined}
            aria-current={label === 'My Forms' ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              if (label !== 'My Forms') onComingSoon(label);
            }}
          >
            {label}
          </a>
        ))}
      </nav>
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
