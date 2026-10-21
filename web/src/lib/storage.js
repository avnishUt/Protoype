// Per-browser persistence: each visitor gets their own record and capture log.
// Wrapped in try/catch: storage can be blocked (private mode, policies).
export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore: the demo still works for this page view */
  }
}
