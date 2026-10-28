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
