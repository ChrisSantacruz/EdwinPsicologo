# Council Transcript — Edwin Citas

**Timestamp:** 2026-09-16 03:59  
**Original question:** Habla con council en parte de diseño y funciones… ¿producto bueno? Recomendaciones (minimalista, sencillo).

## Framed question

PRODUCT: Edwin Citas — appointment system for psychologist Edwin Mideros (Pasto). Admin, WhatsApp invites, patient confirm (cash/Nequi), Google Calendar, alerts. Next.js + Baileys bot + Mongo + Vercel. Constraint: minimalist, simple, non-developer user, warm tone, iPhone-friendly.

QUESTION: Looking at design AND functions — is this a good product? Recommendations while staying minimal and simple? Does complexity help or hurt?

## Anonymization map (peer review)

| Letter | Advisor |
|--------|---------|
| A | The Executor |
| B | The Expansionist |
| C | The Contrarian |
| D | The Outsider |
| E | The First Principles Thinker |

## Advisor responses

### The Contrarian
Over-engineered for its job. Fatal flaw: Baileys/Render/QR operational fragility. Calendar OAuth silent failures. Dual payment = state machine. Prefer wa.me until non-bot path is reliable. Cut to warm confirmation loop, not clinic OS.

### The First Principles Thinker
Wrong question — not “appointment system” but fill week, know who shows, know payment, stop chasing. WhatsApp + payment clarity + one calendar of truth. Overbuilt: portal, dual alerts. Measure no-shows/unpaid. Loop: book → confirm → pay clear → show up → done.

### The Expansionist
Good as OS for one clinician. Upside: referral flywheel, waitlist/no-show recovery, payment-as-commitment, boring one-screen design, later multi-therapist Pasto. Bot+confirm+pay IS the product; Calendar is plumbing.

### The Outsider
Core loop good. Connect screens + CRM wall confuse Edwin. Patients need face/time/done. Hide integrations. First screen = Nueva cita / Próximas. Don’t require full setup for first send.

### The Executor
Good enough for daily use if send is reliable. Cron /health, WhatsApp green/red, freeze features, collapse nav to Agenda + Nueva. Monday E2E + recovery doc.

## Peer reviews (summary)

- Strongest often **A** (actionable reliability) or **E** (right frame + metrics).
- Biggest blind spot often **B** (growth before pipe works).
- All missed: clinical privacy/consent, Nequi fraud, anxious patients ignoring WA, usage evidence, bot kill-criteria, monetization.

## Chairman synthesis

### Where the Council Agrees
Core loop is the product. Too much UI/setup surface. WhatsApp bot reliability is the weak link. Minimalism = fewer decisions + one status language.

### Where the Council Clashes
Kill bot now vs harden then. Growth features now vs freeze.

### Blind Spots Caught
Privacy, Nequi proof risk, patient avoidance, metrics, real daily usage.

### The Recommendation
Good product *seed*, slightly overbuilt. Freeze features. Daily nav: Agenda + Nueva cita. Hide integrations. Semáforo WhatsApp. Patient: 3 beats + Listo. Measure confirms/no-shows one week. Then waitlist/referrals.

### The One Thing to Do First
Production E2E (create → send → confirm → alert + Calendar) + cron ping Render `/health` every 10 minutes. If send fails tomorrow: 2-step recovery for Edwin, or fall back to wa.me only.
