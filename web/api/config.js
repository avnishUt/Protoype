import { claudeEnabled, MODEL } from '../src/lib/extractClaude.js';

export default function handler(req, res) {
  res.status(200).json({
    engine: claudeEnabled() ? { kind: 'claude', model: MODEL } : { kind: 'local' },
    passwordRequired: Boolean(process.env.DEMO_PASSWORD),
  });
}
