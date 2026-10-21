# DQMS Voice Fill: prototype

A standalone demo of hands-free form filling for the QA executive. The executive holds a mic button and says the readings. The AI maps them onto the form, every value is checked, and the executive confirms what goes into the draft. Submitting stays manual.

It uses a real DQMS form: **Treated Water Analysis Record (WA-FRM-1105-1.0.0.8, Kinley Line)**. The fields, field keys, the 6-round grid and the daily block are copied from `dqms_be/scripts/kinley_forms/treated-water-analysis-record.ts`. The prototype is fully separate and touches neither `dqms_be` nor `dqms_fe`.

## Run it

```bash
cd voice-fill-prototype
npm install
npm start            # → http://localhost:4400
```

Open it in **Chrome or Edge**, which have built-in speech recognition. Allow the microphone.

| Mode | How | What it shows |
|---|---|---|
| **AI mode** (recommended for the pitch) | `cp .env.example .env` and set `ANTHROPIC_API_KEY` | Claude understands messy, natural speech: Hinglish, "no sorry, 7.4" corrections, "second round", speech-to-text mistakes |
| **Offline mode** (no key needed) | Leave the key unset | A keyword parser stands in for the AI. It handles clean "field value" phrasing. |

If the AI call fails during a demo (no network, bad key), the app automatically falls back to the offline parser and says so in the review dialog. The demo never dead-ends.

## Five-minute demo script

1. **Set the scene.** Paper-to-digital is done. The executive still types every reading on a tablet, with gloves on, next to a filler.
2. **Hold the mic** (or hold <kbd>Space</kbd>) and say:
   *"Date today. Round 1, time 10:30, chlorine zero, turbidity 0.18, M alk 72, pH 6.8, TDS 410."*
   The review dialog lists each value, the words it was heard from, and its spec check. Click **Accept**. The cells fill and get a mic badge.
3. **Show the safety net.** Say: *"Round 2, time 2:30 pm, turbidity point four, pH six point five, TDS four hundred twenty."*
   Turbidity 0.4 is flagged **Above spec (max 0.3)** before it's accepted.
4. **Show a correction.** Say: *"Round 1 pH 7.2, no sorry 7.4."*
   Only 7.4 is proposed, marked as replacing 6.8.
5. **Daily block:** *"Total hardness 85, calcium hardness 60, chlorides 120, iron 0.05."*
6. **Open the "Voice capture log"** (top right). Every capture records who spoke, the exact transcript, the model and prompt version, what was proposed, and what was accepted or rejected. That's the GMP / ALCOA+ data-integrity story.
7. **Click Submit.** The executive submits; the AI never does.

The **Try** chips in the dock replay these phrases if the room is noisy or the mic misbehaves. You can also type into the box.

## How it works

```
Browser                         server.mjs                         
───────                         ──────────                         
Hold mic → Web Speech API  ──►  POST /api/voice-fill                
(live transcript)                 1. Claude (structured JSON output,
                                     form schema + current record state)
                                     └─ fallback: offline parser
                                  2. validate.mjs: key/row/type checks,
                                     spec limits, overwrite detection
                                  3. append to data/voice_captures.jsonl
Review dialog  ◄────────────────  proposal (+ heard-as, confidence)
Accept ticked  ──────────────►  POST /api/record (draft)
                                 POST /api/voice-fill/decision (audit)
```

| File | What's in it |
|---|---|
| `lib/form.mjs` | The form definition, plus prototype-only `aliases` (shop-floor names) and numeric `spec` limits |
| `lib/extract-claude.mjs` | The Claude call: system prompt, JSON schema built from the form, `claude-opus-5-5` at low effort |
| `lib/extract-local.mjs` | Offline keyword parser: number words, "round N", self-corrections |
| `lib/validate.mjs` | The gate every proposal passes through, whichever engine produced it |
| `server.mjs` | A dependency-free Node HTTP server. Data lives in `data/`. |
| `public/` | The UI: the fill page, voice dock, review dialog and audit drawer |

## Production path: what changes when this goes into DQMS

| Prototype | Production |
|---|---|
| Browser Web Speech API (Chrome only, audio goes to Google) | **Azure AI Speech** (en-IN / hi-IN) behind a `SpeechToTextPort` in `dqms_be/src/infrastructure/speech/`. Audio stays in the client's Azure tenant. |
| Claude via the Anthropic API key | Same call behind an `LlmPort` in `infrastructure/llm/`. Can run on Claude in **Microsoft Foundry** to stay in Azure. |
| Hard-coded form and aliases | Built from the real `FormVersion`. `voice: { enabled, aliases }` becomes an optional field in the seed files. |
| `validate.mjs` | The same checks `RecordsService.save()` already runs, pulled out into a shared function |
| `data/voice_captures.jsonl` | A `voice_captures` Mongo collection plus an `AuditEntity: 'voiceCapture'` audit-log entry |
| Draft saved to JSON | The existing `saveRecordAction` with `submit: false`. `RecordValue` gains `source: 'voice'` and `voiceCaptureId`. |
| One user | Real JWT user, plus a `record.voiceFill` permission |

Phased rollout: flat fields on one form, then grids, then continuous hands-free capture with spoken read-back.
