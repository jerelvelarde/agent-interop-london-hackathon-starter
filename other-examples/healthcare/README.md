# RoundsAI — Ward Rounds Copilot

> **Heads up — read this first.**
>
> Most widget work belongs in the `create-a2ui-widget` skill (single catalog, pure-data widgets). This example deliberately goes one layer deeper — it demonstrates a custom A2UI catalog (`copilotkit://healthcare-catalog`) with bespoke clinical primitives (PatientRoster, PatientDetail, HandoffNoteDraft). If you want to add a widget to the dashboard, use the skill. If you want a new visual identity (clinical, paper, terminal, kiosk) with net-new component primitives, this is the pattern.

A clinical-feeling ward-rounds copilot where a charge nurse chats with an AI to triage today's roster, drill into a single patient's vitals trend, and draft a shift-handoff note.

---

## Setup

Open [`/other-examples/healthcare`](http://localhost:3000/other-examples/healthcare) in the browser once the starter is running.

Requires `GEMINI_API_KEY` in your `.env` (same one the dashboard demo uses).

If the starter isn't running yet, follow the root `README.md` first — this example shares the parent's `pnpm dev` entry point, agent runtime, and CopilotKit route.

---

## What you'll see

- A clinical teal split-pane layout (40% chat / 60% surface canvas)
- A vitals strip across the top header (current census, alerts count)
- A roster of patient cards with status pills (Stable / Watch / Critical)
- A patient detail view with a 24h vitals time-series, meds list, risk flags
- An editable handoff-note draft with Send / Edit / Discard actions
- Inter for prose, JetBrains Mono for vital readings, hairline borders, no animation

Sample data lives under `agent/healthcare_agent/data/` (8 synthetic patients, 24h vitals window).

---

## Canned demo (60 seconds, 3 prompts)

1. "Show me today's roster" → PatientRoster renders
2. "Patient A is spiking a fever — drill in" → PatientDetail with red vitals trend
3. "Draft a handoff note focusing on Patient A's fever" → HandoffNoteDraft

---

## Disclaimer

**Synthetic data — not for clinical use.** Fictional patients (Patient A, Patient B, ...), fictional vitals, fictional risk flags. Do not use the output of this example to make clinical decisions.

---

## Layout

```
healthcare/
├── README.md         (you are here)
├── EXAMPLE.json      (manifest read by the example gallery)
├── catalog/          (Zod schemas + React renderers for the Healthcare catalog)
├── agent/            (LangGraph Python package — graph, tools, synthetic data)
└── schemas/          (component-tree adjacency lists + test fixtures)
```

The Next.js route lives at `src/app/(healthcare)/other-examples/healthcare/page.tsx` as a thin shim that imports from this folder — Next App Router requires routes under `src/app/`, so the *content* lives here and the *mount point* lives there.
