# ScholarAI — students-at-risk advisor copilot

> **Heads up — read this first.**
>
> Most widget work belongs in the `create-a2ui-widget` skill (single catalog,
> pure-data widgets on the dashboard). This example deliberately goes one
> layer deeper — it demonstrates a *custom catalog registration* paired with
> a *dashboard-classic* shell (sidebar + center + docked chat) and a
> distinct academic visual identity. If you want to add a widget to the
> dashboard, use the skill. If you want a new visual identity with net-new
> primitives, this is the pattern.

ScholarAI is a teacher / advisor copilot that surfaces a roster of at-risk
students, drills into a single student's grade history + assignments, and
drafts parent outreach. Built as a sub-repo under `/other-examples/` to
demonstrate registering a *second* A2UI catalog
(`copilotkit://edtech-catalog`) alongside the main dashboard catalog.

---

## Setup

Open [`/other-examples/edtech`](http://localhost:3000/other-examples/edtech)
in the browser once the starter is running.

Requires `GEMINI_API_KEY` in your `.env` (same one the dashboard demo uses).

If the starter isn't running yet, follow the root `README.md` first — this
example shares the parent's `pnpm dev` entry point, agent runtime, and
CopilotKit route.

---

## What you'll see

- A navy / gold / cream academic dashboard with Spectral headlines + Inter
  body copy and tabular figures for grades
- Left sidebar with filters (risk band, grade level) + course list +
  advisor list — wired to placeholders, not to the agent yet
- Top bar with the ScholarAI navy/gold `SA` logo mark and a term pill
- Center canvas where the A2UI surface renders:
  - `StudentCard` grid (up to 5 at-risk students worst-first by GPA)
  - `StudentProfile` deep dive with an inline SVG grade-history chart
  - `AssignmentStatusTable` — sortable per-student status table
  - `OutreachBatchDraft` — pre-drafted parent emails with Send / Edit / Skip per row
- Docked chat panel bottom-right, resizable (CSS `resize: both`) and collapsible

---

## Canned demo (3 prompts)

1. "Students at risk this term" → `StudentCard` ×5 in a `StudentGrid`
2. "Drill into Maria Chen" → `StudentProfile` with grade-history chart
3. "Draft outreach emails to parents of those students" → `OutreachBatchDraft`

The roster auto-loads on first mount so the demo is wow-on-load.

---

## Fork notes — what's actually portable

This folder is a **content unit**, not a build-system unit. The sub-repo
layout under `/other-examples/<name>/` is a folder-structure convention so
hackers know where to find each piece — but copy-pasting it into a fresh
repo also requires surgery on the host.

If you fork this folder into a new repo you also need:

1. The parent's exact `@copilotkit/*` pins (`package.json`)
2. A working `src/app/api/copilotkit/[[...slug]]/route.ts` shell that
   registers an `edtech` agent pointing at the `edtech_agent` graph
3. The route-group `(edtech)/layout.tsx` that mounts `<CopilotKit>` with
   `edtechCatalog`
4. Tailwind 4 + `globals.css` + the Spectral / Inter font loaders
5. A `langgraph.json` entry referencing `other-examples/edtech/agent/edtech_agent/graph.py:graph`
6. Pinned Python deps from `agent/pyproject.toml`

Portable inside this starter; portable across repos with documented
surgery.

**Also:** if you don't actually need a second catalog (you just want new
widgets), the `create-a2ui-widget` skill is a much shorter path. Re-read
the callout at the top of this README.

---

## Disclaimer

**Demo only — synthetic data, FERPA-safe.** Every student, advisor,
parent, and assignment in this demo is fabricated. Do not use the output
of this example to make decisions about real students.

The footer of the dashboard repeats this disclaimer:
*"Synthetic student records · FERPA-safe demo."*

---

## Layout

```
edtech/
├── README.md          (you are here)
├── EXAMPLE.json       (manifest read by the example gallery)
├── catalog/           (Zod schemas + React renderers for the edtech catalog)
├── agent/             (LangGraph Python package — graph, tools, synthetic data)
└── schemas/           (A2UI component-tree adjacency lists + canonical fixture)
```

The Next.js route lives at `src/app/(edtech)/other-examples/edtech/page.tsx`
as a thin shim that imports from this folder. The route-group layout at
`src/app/(edtech)/layout.tsx` mounts the `edtech` agent + edtech catalog.
**No `<EnvelopeInspector />`** in either — ScholarAI is a polished
single-purpose product, not the dashboard-w/-inspector affordance.

---

## Adapted from the adk-dashboard showcase

The dashboard-classic shell (sidebar + center + docked chat), KPI pill
styling, and tabular-data zebra rows were ported from the
[adk-dashboard showcase](https://github.com/CopilotKit/CopilotKit/tree/main/examples/showcases/adk-dashboard)
under `examples/showcases/adk-dashboard` in the CopilotKit monorepo. The
*patterns* port; the *wiring* doesn't — that showcase uses CopilotKit
chat hooks directly while this example is built around A2UI widget
renderers.
