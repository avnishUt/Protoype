# DQMS Voice Fill: Presentation Content

Order: Opening → Problem → Why it matters → What we suggest (the prototype) → Business impact → Cost → Close.
Each slide lists **On the slide** (what to show) and **Say** (what to speak).

---

## Part 1: Opening

### Slide 1: Title
**On the slide**
- Title: **DQMS Voice Fill**
- Tagline: *Speak the reading at the machine. Skip the paper.*
- Subtitle: Prototype walkthrough and pilot proposal

**Say**
"Thank you for your time. Today we'll show you a small prototype we built for your QA team, what it changes for the business, and what it would cost to run."

### Slide 2: Your quality data today
**On the slide**
- Big number: **132 quality forms across 7 departments**
- Bar chart: Microbiology 32 · Kinley 28 · Juice 22 · RGB 20 · ETP 14 · WTP 12 · BIB 4

**Say**
"Your team keeps 132 quality forms across 7 departments. Almost every value in them is a reading taken at a machine or a test point. We asked one question: what if that reading went into DQMS at the moment it is taken, in the executive's own voice?"

---

## Part 2: The problem

### Slide 3: Every reading is written twice
**On the slide**
- Flow: **Read** at the machine → **Write** on paper → **Walk** to the desk → **Type** into DQMS
- Example box: Treated Water Analysis Record = **35 values a day** (6 rounds × 5 values + 4 daily values + date), each written twice

**Say**
"Today a reading takes four steps to reach the system, and it is written twice: once on paper and once in DQMS. One form, the Treated Water Analysis Record, has 35 values a day. Now multiply that across 132 forms."

---

## Part 3: Why it matters to the business

### Slide 4: The cost of writing twice
**On the slide**, four cards:
- **Time lost:** shift time spent copying, not testing
- **Errors creep in:** handwriting misread, wrong row, missed decimal, found late or never
- **Late data:** values reach DQMS hours later, so trends are seen late
- **Audit risk:** ALCOA+ expects records to be contemporaneous and original, and paper has to be stored and retrieved

Footer line: *The problem is not the people. The process asks them to do the same work twice.*

**Say**
"This costs time, it lets errors in, it delays the data, and it weakens the audit trail. The people are not the problem. The process asks them to do the same work twice."

---

## Part 4: What we suggest (the prototype)

### Slide 5: Section divider
**On the slide:** **Speak the reading where it is taken**

### Slide 6: The form the prototype fills
**On the slide**: the Treated Water Analysis Record (WA-FRM-1105)

| Part | Fields | Spec checked |
|---|---|---|
| Header | Date | Mandatory |
| 4-Hourly Readings (Round 1 to Round 6) | Time, Cl2, Turbidity, pH, TDS | Cl2 max 0 · Turbidity max 0.3 · pH min 4.9 · TDS max 500 |
| Daily Readings | Total Hardness, Calcium Hardness, Chlorides, Iron | <100 · <100 · 250 · 0.1 ppm |

**Say**
"We built the prototype on a real form of yours. It has a header, six rounds of 4-hourly readings, and daily readings, each with its own spec limits."

### Slide 7: How it works: 7 steps
**On the slide**
1. **Speak:** tap the mic and say *"Round 1, time 10:30, chlorine zero, turbidity 0.18, pH 6.8, TDS 410"*
2. **Speech to text:** the spoken words become text
3. **AI maps the values:** each value goes to the right field and round of this form
4. **Validation:** format and spec limits are checked
5. **Review:** the executive accepts, rejects or corrects each value
6. **Fill the draft:** accepted values go into the form, marked as voice-filled
7. **Log:** the capture is recorded with who spoke, when, and what was said

**Say**
"The executive uses the parameter names they already use. The system only proposes values. Nothing goes into the form until a person accepts it."

### Slide 8: How rounds are handled
**On the slide**

| The executive says or does | Values go to |
|---|---|
| "Round 2, pH 6.5…" / "dusra round…" | Round 2 |
| A time that matches a round ("time 2:30…") | That round |
| Clicks a round on the form first | That round |
| No round mentioned | The current round if it isn't full, otherwise the next one (max 6) |
| "pH 7.2, no sorry 7.4" | Only 7.4 is kept |
| "Total hardness 85, iron 0.05" | Daily Readings (no round) |

**Say**
"People don't speak in a fixed format, so the system follows natural speech: round numbers, times, Hindi words like 'dusra round', and self-corrections."

### Slide 9: Checks before anything is saved
**On the slide**
- **Invalid value** (text where a number is expected): blocked, can't be accepted
- **Out of spec** (e.g. TDS 520 against a max of 500): flagged in red
- **Overwrites a value:** shows "Replaces 6.5"
- **Low confidence:** tagged "check the value"
- **Not understood:** listed as "Heard but not placed", never guessed
- Screenshot: the review screen

**Say**
"Before anything is saved, every value is checked. The system never guesses. If it is not sure where a word belongs, it says so."

### Slide 10: Human in the loop
**On the slide**
- **AI proposes → the executive decides**
- Accept · Reject · Correct manually · Submit (only by the executive)
- The capture log keeps time, speaker, spoken text, proposed values, accepted count and the AI model used
- Screenshot: the filled form

**Say**
"Control stays with your QA team. The AI is a helper that fills in the draft. The executive confirms every value and submits the form, and every capture is logged for audit."

---

## Part 5: How it affects your business

### Slide 11: Before and after
**On the slide**

| Area | Today | With Voice Fill |
|---|---|---|
| Effort | Every value written twice | Spoken once, confirmed once |
| Accuracy | Copy and handwriting errors | Checked at entry, confirmed by a person |
| Speed | Data reaches DQMS hours later | At the time of reading |
| Audit | Paper original, typed copy | Spoken text, speaker, time and decisions logged |
| Paper | Printed, filled, stored | Removed from the daily flow |
| Training | n/a | Same parameter names they already use |

**Say**
"One write instead of two, cleaner data, faster visibility, and a stronger audit trail, with no new vocabulary for your team to learn."

### Slide 12: Running cost
**On the slide**
- Big number: **≈ ₹1 per capture** (Claude Sonnet 5.5, recommended)

| Scale | Captures a month | Cost a month |
|---|---|---|
| Pilot | ~1,200 | ~₹1,200 |
| One plant | ~9,600 | ~₹9,900 |
| Five plants | ~48,000 | ~₹49,400 |

- Lighter option: Haiku 5.5 at ≈ ₹0.40 per capture, if accuracy holds in the pilot
- *Estimates for AI and speech services only; ₹88 = $1.*

**Say**
"Running cost is about one rupee per capture. A full plant comes to under ten thousand rupees a month."

---

## Part 6: Close

### Slide 13: Proposed pilot and next steps
**On the slide**
- **Pilot:** one form, one line, 2 to 4 weeks
- **We measure:** time per form before and after, the number of corrections and errors, and user feedback
- **We need from you:** feedback on the flow, the pilot form and line, QA sign-off on the review step, and the device to use at the machine

### Slide 14: Thank you
**On the slide**
- *One write instead of two. Cleaner data. A person still in control of every value.*
- Demo: https://protoype-b7i8ckokl-avnish12.vercel.app
- Questions

---
---

# Prompt to generate the presentation

Copy everything below the line into an AI presentation tool (Gamma, Copilot in PowerPoint, Claude, etc.).

---

Create a professional 14-slide client presentation titled **"DQMS Voice Fill"**, tagline *"Speak the reading at the machine. Skip the paper."*

**Audience:** the management and QA heads of a beverage manufacturing client (water, juice, soft drinks) that uses our DQMS (Digital Quality Management System). It is a live meeting, so keep slides visual with few words and put the talking points in speaker notes.

**Design:** clean and modern with a white background, and dark title and closing slides. Primary colour deep red (#D7263D), secondary blue (#3B5BDB), green (#2B8A3E) for positive and "after" items, and orange (#E8590C) for warnings. Font Calibri. Use icons, flow arrows, cards, a bar chart and tables. No paragraphs of text.

**Story order:** Opening → Problem → Why it matters to the business → Our solution (working prototype) → Business impact → Cost → Pilot proposal.

**Slides:**

1. **Title:** "DQMS Voice Fill", tagline, subtitle "Prototype walkthrough and pilot proposal".
2. **132 quality forms across 7 departments:** big stat plus a bar chart: Microbiology 32, Kinley 28, Juice 22, RGB 20, ETP 14, WTP 12, BIB 4.
3. **Every reading is written twice:** a 4-step flow: Read at machine → Write on paper → Walk to desk → Type into DQMS. Callout: the Treated Water Analysis Record has 35 values a day (6 rounds × 5 values + 4 daily values + date), each written twice.
4. **Why it matters:** 4 cards: Time lost (copying instead of testing); Errors creep in (misread handwriting, wrong row, missed decimal); Late data (reaches DQMS hours later); Audit risk (ALCOA+ needs contemporaneous, original records; paper storage). Footer: "The problem is not the people. The process asks them to do the same work twice."
5. **Section divider:** "Speak the reading where it is taken".
6. **The form we built on:** Treated Water Analysis Record (WA-FRM-1105). Table: Header = Date; 4-Hourly Readings, Round 1 to 6 = Time, Cl2 (max 0), Turbidity (max 0.3 NTU), pH (min 4.9), TDS (max 500); Daily Readings = Total Hardness <100, Calcium Hardness <100, Chlorides 250, Iron 0.1 ppm.
7. **How the prototype works:** 7 numbered steps: Speak (example: "Round 1, time 10:30, chlorine zero, turbidity 0.18, pH 6.8, TDS 410") → Speech to text → AI maps values to the right field and round → Validation against format and spec → Review: accept / reject / correct → Accepted values fill the draft → Capture logged.
8. **How rounds are handled:** table: "Round 2…" or "dusra round" → Round 2; matching time → that round; clicked round → that round; no round said → current round if not full, else next (max 6); "pH 7.2, no sorry 7.4" → only 7.4 kept; daily parameters → Daily block.
9. **Checks before anything is saved:** invalid value is blocked; out of spec is flagged red (e.g. TDS 520 against max 500); overwrite shows "Replaces 6.5"; low confidence is tagged; words not understood are listed as "Heard but not placed", never guessed. Leave space for a review-screen screenshot.
10. **Human in the loop:** "AI proposes → the executive decides". Accept, Reject, Correct manually, Submit only by the executive. The capture log records time, speaker, spoken text, proposed values, accepted count and the AI model. Leave space for a filled-form screenshot.
11. **Before and after:** comparison table: Effort (written twice → spoken once, confirmed once), Accuracy (copy errors → checked at entry, confirmed by a person), Speed (hours later → at time of reading), Audit (paper original → spoken text, speaker, time and decisions logged), Paper (printed and stored → removed from daily flow), Training (same parameter names).
12. **Running cost:** big stat "≈ ₹1 per capture" (Claude Sonnet 5.5, recommended). Table: Pilot ~1,200 captures = ~₹1,200 a month; One plant ~9,600 = ~₹9,900 a month; Five plants ~48,000 = ~₹49,400 a month. Note: lighter Haiku 5.5 option ≈ ₹0.40 per capture; estimates cover AI and speech services only at ₹88 = $1.
13. **Pilot and next steps:** pilot of one form on one line for 2 to 4 weeks. Measure time per form, corrections and errors, and user feedback. Needed from the client: flow feedback, pilot form and line, QA sign-off, device at the machine.
14. **Thank you:** "One write instead of two. Cleaner data. A person still in control of every value." Demo link: https://protoype-b7i8ckokl-avnish12.vercel.app. Questions.

**Important:** present only what the prototype does today. Do not mention audio recording, review-later queues or future changes. Do not invent time-saving percentages; those will be measured in the pilot.
