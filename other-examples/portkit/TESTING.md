# End-to-End Testing Plan

> **Archived — PortKit demo.** This is the PortKit-era test plan, kept with
> the archived demo under `other-examples/portkit/`. For the pdf-analyst
> default, the manual demo-day checklist lives in `HACKATHON.md`.

This document is the manual + automated test contract for the PortKit
demo. Two classes of bug have escaped earlier reviews — they share a
root cause: **typecheck + JSON validation prove the wire is well-formed,
but say nothing about whether the rendered React tree shows real data.**

The bugs we want to catch before they reach the demo:

- **Schema/data mismatch.** Agent emits `data: {kpi: {activeProjects: 3}}`
  but schema binds `{path: "kpi.activeProjects"}`. The `.` is wrong —
  the binder splits on `/` — so the prop resolves to `undefined`,
  rendering as a blank or `NaN`.
- **Catalog/binder mismatch.** A prop typed `z.number()` or `z.array(...)`
  is bound with `{path: "..."}`. The Zod schema doesn't classify the
  field as DYNAMIC, so the raw `{path: "..."}` object reaches the
  renderer. `Number(obj)` → `NaN`; `obj.map` → crash.

Both bugs render the surface but with broken values, which a UI screen
shows in seconds and a typecheck never sees.

## Three layers of gate

| Layer | Tool | What it checks | What it MISSES |
|---|---|---|---|
| 1. Wire validity | `pnpm validate-widget`, `pnpm typecheck` | JSON shape, Zod ↔ renderer types | dotted paths, `z.number()` + path, `z.array(...)` + path |
| 2. Schema-vs-data alignment | `pnpm test:schemas` (Python) | Every `{path: "..."}` in every fixture resolves against its `data` block (split on `/`) | renderer crashes when a path resolves but the value type clashes with the renderer |
| 3. Rendered output | Browser walkthrough below | What the user actually sees | nothing — this is the ground truth |

Run all three before declaring a demo-ready state.

## Layer 1 — `pnpm validate-widget` + `pnpm typecheck`

Already wired. Catches JSON syntax errors and TS errors in renderers.

```
pnpm validate-widget agent/src/widgets/project_dashboard.fixture.json
pnpm typecheck
```

## Layer 2 — schema-vs-data alignment (Python pytest)

Lives in `agent/tests/test_schema_data_alignment.py`. The resolver
splits on `/` (matching `@a2ui/web_core`'s `DataModel.parsePath`). For
each `*.fixture.json` it walks the component tree carrying a data
scope: bare `{path: "..."}` resolves against the current scope; a
template `{componentId, path}` mounts an array and switches scope to
its first element for descendants of the named template component.

```
cd agent && uv run python -m pytest tests/test_schema_data_alignment.py -v
```

Run after editing any schema, fixture, or `_build_data()` in a tool.

**Adding a new widget?** The test auto-discovers `*.fixture.json` files
under `agent/src/widgets/`. Drop a fixture in and the gate covers it.

## Layer 3 — browser walkthrough

Two-tab setup:

1. Tab A: `pnpm dev` (boots Next.js on 3000 + langgraph on 8123).
2. Tab B: `open http://localhost:3000`.

Walk the prompts below in order; tick the boxes. Every "shows real
numbers" item is what would have caught the `kpi.activeProjects` bug
before it shipped.

### Turn 1 — Project dashboard (`show_project_dashboard`)

Prompt: **What's going on this week?**

- [ ] Title reads `Project Operations · Week of <month> <day>` (NOT
      blank, NOT "Project Operations").
- [ ] All four KPI cards show a real number/value: "3" (Active),
      "1" (At Risk), "8" (Open Tasks), "23 / 31" (Velocity).
- [ ] Sprint progress bar shows a sprint name (NOT "—"), `N% complete`
      (NOT `NaN%`), and `N days left` text.
- [ ] Each project card shows: name, status pill, owner, sprint label,
      `N% complete` (NOT `NaN%`), and four task counts that are real
      integers (NOT `NaN`).
- [ ] No red console error in DevTools.

### Turn 2 — Project detail (`show_project_detail`)

Prompt: **Open Orion.**

- [ ] Title reads the project name.
- [ ] Status + Owner metric cards show real strings.
- [ ] Sprint timeline bar renders correctly.
- [ ] Milestone list shows multiple rows each with title, due label,
      and a done/pending icon.
- [ ] Kanban shows 4 columns each with a numeric count and any tasks
      rendered as TaskCards (NOT `NaN`, NOT empty if count > 0).
- [ ] Risks section shows at least one RiskFlag row.

### Turn 3 — Sprint board (`show_sprint_board`)

Prompt: **Show the sprint board.**

- [ ] Sprint title renders.
- [ ] Each of the 4 columns shows a real count.
- [ ] TaskCards inside each column show real assignee initials,
      points label, due label, project label.

### Turn 4 — Status report draft (`draft_status_report`)

Prompt: **Draft this week's status report for Orion.**

- [ ] TL;DR paragraph renders real text (not the literal token
      `{path: "tldr"}`).
- [ ] Progress bullets — multiple Paragraph children, each with text.
- [ ] Risks card — at least one RiskFlag row.
- [ ] Asks card — multiple Paragraph children.
- [ ] Two buttons: ✎ Edit draft (secondary), ✓ Send to #orion-pm
      (primary). Click "Send" — verify the action event fires
      (envelope inspector should show a `send_status_report` action,
      and the chat should reflect the send).

### Turn 5 — Team load (`show_team_load`)

Prompt: **Who's overloaded this sprint?**

- [ ] Bar chart renders with multiple bars labelled by person name and
      heights driven by point totals.
- [ ] Overloaded header reads e.g. "Overloaded: 2 people" (NOT a
      `{path}` literal).
- [ ] Data table shows real rows (NOT empty, NOT a placeholder).

### Bonus — Risk register + update feed

- Prompt: **Open the risk register.** → expects `show_risk_register`
  surface with header and a list of risks.
- Prompt: **Catch me up on this week's updates.** → expects
  `show_update_feed` surface with a feed of `UpdateFeedItem`s.

## Smoke wiring

`pnpm smoke` is the composite gate. After this hotfix it runs:

1. `pnpm validate-widget` (layer 1, JS side)
2. `pnpm typecheck` (layer 1, types)
3. `pnpm verify-pins` (FROZEN.md sanity)
4. `cd agent && uv run python -m pytest tests/` (layer 2, alignment + envelope shapes)

Each new widget you add should ship with: a `*.json` schema, a
`*.fixture.json` with realistic data, an envelope-shape test entry in
`agent/tests/test_envelope_shapes.py`, and a manual browser screenshot.

## What the layers can't catch (and what to do)

- **Action handlers that throw inside the agent.** Browser walkthrough
  step "click Send" is the only catch.
- **Race conditions in subscribeDynamicValue.** Out of scope here —
  upstream binder concern.
- **Visual regressions (broken layout, wrong colors).** Eyeball it
  during the walkthrough; rely on `BrandFrame` + theme tokens for
  consistency.

## When a bug slips through

1. Capture the failing surface (screenshot + console error).
2. Identify which layer should have caught it. If none, add a test at
   the layer closest to the bug.
3. Fix the bug. Re-run layer 2 + walkthrough.
4. Document the new gate in this file.
