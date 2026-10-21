# DQMS Voice Fill (React + Vercel)

Prototype of hands-free quality records: the QA executive holds a mic and says the readings, Claude maps them onto the DQMS form, and the executive confirms each value. Submitting stays manual.

The demo form is the real Kinley **Treated Water Analysis Record (WA-FRM-1105-1.0.0.8)**.

- **Front end:** React + Vite. It's a static site.
- **AI:** one Vercel serverless function, `api/voice-fill.js`, calls Claude. The API key stays on the server and never reaches the browser.
- **Data:** each visitor's record and voice capture log live in their own browser (localStorage). Everyone gets a private sandbox, and there's no database to host.

## Run locally

```bash
npm install
cp .env.example .env      # optional: add ANTHROPIC_API_KEY for AI mode
npm run dev               # → http://localhost:5173
```

`npm run dev` also serves the `/api` functions, so it behaves like production. Use Chrome or Edge for the microphone.

## Deploy to Vercel

### Option A: from GitHub (recommended)
1. Push this folder to a GitHub repo, either on its own or inside a larger repo.
2. On vercel.com, choose **Add New → Project** and import the repo.
3. If the repo contains more than this app, set **Root Directory** to `voice-fill-react`.
   Vercel detects **Vite** automatically: build command `vite build`, output folder `dist`.
4. Under **Settings → Environment Variables**, add:

   | Name | Value | |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | your key | Turns on AI mode. Without it, the app uses the offline parser. |
   | `DEMO_PASSWORD` | an access code you share | **Set this for any public link.** Visitors are asked for it before the AI runs, so strangers can't use up your API credit. |
   | `ANTHROPIC_MODEL` | `claude-opus-5-5` | Optional. |

5. Click **Deploy**. You get an `https://….vercel.app` URL to share.

### Option B: from the terminal
```bash
npx vercel            # first time: log in and link the project
npx vercel env add ANTHROPIC_API_KEY
npx vercel env add DEMO_PASSWORD
npx vercel --prod
```

### Notes
- **The microphone needs HTTPS.** Vercel URLs are HTTPS by default, so the mic works on phones and tablets too, in Chrome or Edge.
- **Changing env vars needs a redeploy** before they take effect.
- **The rate limit is best-effort.** It is 20 AI captures per minute per IP, kept in memory per serverless instance. `DEMO_PASSWORD` is the real protection.
- **Vercel's free Hobby plan is for non-commercial use.** A company or client demo may need a Pro team plan.

## Project layout

```
api/
  voice-fill.js     POST: transcript → Claude → validated proposal (server-side)
  config.js         GET: which engine is active, whether an access code is needed
  _shared.js        access-code check + rate limit (not deployed as an endpoint)
src/
  App.jsx           page state: record, captures, review flow (saved in localStorage)
  components/       Layout, FormView, VoiceDock, ReviewDialog, AuditDrawer
  lib/form.js       the form definition (+ shop-floor aliases, spec limits)
  lib/validate.js   checks every proposal: keys, rows, types, spec limits, overwrites
  lib/extractClaude.js  Claude call (server-only)
  lib/extractLocal.js   offline keyword parser (also runs in the browser as a fallback)
  lib/useSpeech.js  push-to-talk with the browser Web Speech API
```

If the API is unreachable, the page falls back to the in-browser parser and says so in the review dialog. The demo never dead-ends.
