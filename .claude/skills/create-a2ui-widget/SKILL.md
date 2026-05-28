---
name: create-a2ui-widget
description: Scaffolds a new A2UI widget end-to-end inside the CopilotKit A2UI hackathon starter. Coordinates the 5-surface widget dance (catalog entry, fixture, Python tool, TS schema declaration, prompt hint) so widgets actually render instead of ending up half-finished. Use when the hacker says "add a widget", "scaffold a card", "build me a [domain] visual", "build me a metrics card", "add an A2UI widget", "make a new component", or asks for a new generative-UI surface in this repo. Defaults to the fixed-schema path (predictable for demos) and documents the dynamic-schema fallback. Anchors against the canonical `search_flights` example. Enforces the AGENTS.md hard rules — never bump @copilotkit/* versions, always run `pnpm validate-widget` after editing widget JSON, always run `pnpm smoke` before declaring done. Don't use for re-theming the app (edit `src/app/theme.ts` directly), swapping demo data (Seam #3 — edit `agent/src/query.py` directly), switching domains (Seam #5 — set `DOMAIN=` in `.env`), or wiring an A2A partner agent (Seam #6 — `pnpm check-a2a <url>`).
version: 1.0.0
---

# Create A2UI Widget

## When To Use

Trigger this skill whenever the hacker wants to add a new A2UI widget — a new declarative UI surface the agent can render. Trigger phrases include:

- "add a widget"
- "scaffold a card"
- "build me a [domain] visual" (e.g. "build me a portfolio card", "build me a recipe card")
- "build me a metrics card"
- "add an A2UI widget"
- "make a new A2UI component"
- "scaffold an a2ui surface"
- "I want a widget that shows [X]"

Do NOT trigger this skill for:

- Re-theming colors / fonts (edit `src/app/theme.ts` and `src/app/a2ui-theme.css` directly — that's Seam #1).
- Swapping demo data (edit `agent/src/query.py` or `agent/src/domains/<active>/data/` — Seam #3).
- Switching the active domain (set `DOMAIN=` in `.env` — Seam #5).
- Wiring an external A2A agent (run `pnpm check-a2a <url>` then set `A2A_AGENT_URL` — Seam #6).
- Re-branding the shell (edit `src/components/BrandFrame.tsx` — Seam #2).

## What This Skill Coordinates: The 5-Surface Widget Dance

The #1 reason widgets ship half-finished in this starter is that hackers (and their AI assistants) edit one or two of the five files and call it done. A widget needs ALL FIVE surfaces touched. This skill walks you through every one of them and refuses to declare done until they are all present.

The five surfaces, in order:

1. **Catalog entry** — `agent/src/widgets/<name>.json`. Registers the widget shape in the v0.9 catalog.
2. **Fixture** — `agent/src/widgets/<name>.fixture.json`. Named test scenario so `pnpm test:widgets` can render it offline.
3. **Python tool** — append to `agent/src/a2ui_fixed_schema.py`, then add the tool name to `tools=[...]` in `agent/main.py`.
4. **TS schema declaration** — `src/app/api/copilotkit/[[...slug]]/route.ts` `a2ui.schema` array (only required when using fixed schema with `injectA2UITool: true`; this starter defaults to `injectA2UITool: false`, so the schema declaration is implicit via the catalog JSON — see "Schema declaration mode" below).
5. **Prompt hint** — append a line to the active domain's `system_prompt` in `agent/main.py` (or the domain-specific prompt file) so the agent knows *when* to call the new tool.

## Hard Rules (from AGENTS.md — do not violate)

- **Never run `pnpm install` for a new `@copilotkit/*` version.** Versions are pinned in `FROZEN.md`. The pre-commit hook will reject any drift.
- **Always run `pnpm validate-widget agent/src/widgets/<name>.json`** after editing any widget JSON. Catches envelope shape errors before runtime.
- **Always run `pnpm smoke`** before declaring the work done. Composite gate (validator + pins + offline + canned prompt).
- **Don't edit the renderer or middleware.** Widgets are pure data — declare them, don't code them.
- **Don't touch `src/components/EnvelopeInspector.tsx`** unless explicitly asked. It's the hackathon's "show the wire" affordance.

## Fixed vs Dynamic Schema

- **Default to fixed schema** (this skill's main path). Predictable, snapshot-renderable, demo-safe. Use for anything you'd show a judge.
- **Dynamic schema** (fallback) — when the hacker explicitly says "I want the AI to design the widget on the fly" or asks for "open-ended" UI. The agent uses `generate_a2ui` (already wired) and you only need to update the system prompt to teach it when. No catalog or fixture file is required for dynamic-only widgets; however, judges remember the demo where the dashboard rendered the same way every time.

## Procedure: Add a Fixed-Schema Widget

Follow every step. Do not skip. The order matters — catalog before fixture, fixture before Python tool, Python tool before registration, registration before prompt hint.

### Step 1 — Pick a name and read the canonical example

Pick `<name>` (snake_case, e.g. `recipe_card`, `metrics_dashboard`, `portfolio_card`).

Read `agent/src/a2ui_fixed_schema.py` end-to-end. The `search_flights` function is THE reference implementation for fixed schema. Note the four moving parts: `CATALOG_ID`, `SURFACE_ID`, the loaded schema, and the typed input dict.

Also read `agent/src/widgets/<existing>.json` for an example catalog entry shape (or check `agent/src/a2ui/schemas/flight_schema.json` — same v0.9 shape, just lives in the older path until widgets/ is populated).

### Step 2 — Write the catalog entry

Create `agent/src/widgets/<name>.json`. This is a v0.9 A2UI component array. Minimum shape:

```json
[
  {
    "id": "root",
    "component": "Row",
    "children": {
      "componentId": "<name>-card",
      "path": "/<plural>"
    },
    "gap": 16
  },
  {
    "id": "<name>-card",
    "component": "Card",
    "title": { "path": "title" },
    "subtitle": { "path": "subtitle" }
  }
]
```

Then run:

```bash
pnpm validate-widget agent/src/widgets/<name>.json
```

If it fails, the validator points at the failing field with a fix hint. Fix and re-run until green.

### Step 3 — Write the fixture

Create `agent/src/widgets/<name>.fixture.json`. This is a named test scenario — the data the widget will render against in tests and offline mode. Use the **canonical fixture shape** (`{surfaceId, catalogId, components, data}` — see issue #16 — one shape, validator is the authority). The canonical example to mirror is `agent/src/widgets/flight_card.fixture.json`:

```json
{
  "name": "<name>-default",
  "description": "One-sentence test scenario description.",
  "surfaceId": "<name>-surface",
  "catalogId": "copilotkit://app-dashboard-catalog",
  "components": [
    {
      "id": "root",
      "component": "Row",
      "children": { "componentId": "<name>-card", "path": "/<plural>" },
      "gap": 16
    },
    {
      "id": "<name>-card",
      "component": "Card",
      "title": { "path": "title" },
      "subtitle": { "path": "subtitle" }
    }
  ],
  "data": {
    "<plural>": [
      { "title": "Sample 1", "subtitle": "Demo data" },
      { "title": "Sample 2", "subtitle": "Demo data" }
    ]
  }
}
```

Note: the `components` array is the same shape as the catalog entry in Step 2 — fixtures inline the schema so the renderer (and `pnpm test:widgets`) can hydrate them without loading any other file. If your catalog entry changes, copy it into the fixture's `components` array.

Run `pnpm test:widgets` to confirm the fixture renders against the catalog entry.

### Step 4 — Write the Python tool

Append to `agent/src/a2ui_fixed_schema.py`. Copy the `search_flights` shape verbatim, then rename. Skeleton:

```python
from typing import TypedDict
from copilotkit import a2ui
from langchain.tools import tool

CATALOG_ID = "copilotkit://app-dashboard-catalog"  # Same catalog as search_flights — do not invent a new one
NAME_SURFACE_ID = "<name>-surface"
NAME_SCHEMA = a2ui.load_schema(
    Path(__file__).parent / "widgets" / "<name>.json"
)

class NameItem(TypedDict):
    title: str
    subtitle: str

@tool
def show_<name>(items: list[NameItem]) -> str:
    """One-sentence description of what this widget shows.

    Each item must have: title (str), subtitle (str), ... (list every field).
    """
    return a2ui.render(
        operations=[
            a2ui.create_surface(NAME_SURFACE_ID, catalog_id=CATALOG_ID),
            a2ui.update_components(NAME_SURFACE_ID, NAME_SCHEMA),
            a2ui.update_data_model(NAME_SURFACE_ID, {"<plural>": items}),
        ],
    )
```

Key invariants — common failure mode if you miss any:

- The `SURFACE_ID` used in `create_surface` MUST match the one in `update_components` and `update_data_model`. If they differ, the renderer drops the update silently.
- The `catalog_id` MUST be a real registered catalog. `"copilotkit://app-dashboard-catalog"` is the default in this starter — do not invent a new ID unless you also register the catalog.
- The data key under `update_data_model` (`<plural>` above) MUST match the `path` referenced in the catalog JSON's root `children`.

### Step 5 — Register the tool in `agent/main.py`

Open `agent/main.py`. Find the line:

```python
from src.a2ui_fixed_schema import search_flights
```

Append your tool:

```python
from src.a2ui_fixed_schema import search_flights, show_<name>
```

Then find the `tools=[...]` list in `create_agent(...)`:

```python
tools=[query_data, *todo_tools, generate_a2ui, search_flights]
```

Append your tool to that list:

```python
tools=[query_data, *todo_tools, generate_a2ui, search_flights, show_<name>]
```

This is the easiest step to skip. If the tool is not in `tools=[...]`, the agent literally cannot call it.

### Step 6 — Add the schema declaration (TS, only if `injectA2UITool` is true)

Open `src/app/api/copilotkit/[[...slug]]/route.ts`. Check the runtime config:

```ts
a2ui: {
  injectA2UITool: false,
},
```

- **If `injectA2UITool: false`** (the starter default) — no TS schema declaration is required. The catalog JSON you wrote in Step 2 is the source of truth. Skip to Step 7.
- **If `injectA2UITool: true`** — you must also declare the widget in a `schema` array on the runtime config. Append your catalog JSON content (or a reference to it) to `a2ui.schema`. If `a2ui.schema` doesn't exist yet, create it as an array. See `@copilotkit/runtime` docs for the exact shape; common pattern:

  ```ts
  a2ui: {
    injectA2UITool: true,
    schema: [
      // ... existing schemas
      { id: "<name>-surface", catalogId: "copilotkit://app-dashboard-catalog", components: [...] },
    ],
  },
  ```

### Step 7 — Add the prompt hint

Open `agent/main.py` and find the `system_prompt` block (in `create_agent(...)`). Find the section that lists tool guidance:

```
Tool guidance:
- Flights: call search_flights to show flight cards with a pre-built schema.
- Dashboards & rich UI: call generate_a2ui to create dashboard UIs ...
```

Append a line that teaches the agent WHEN to call your new tool:

```
- <Concept>: call show_<name> when the hacker asks about <trigger phrases>.
```

Be concrete. The agent decides whether to call your tool based on this line. Vague hints produce vague routing.

### Step 8 — Validate and smoke

Run, in order:

```bash
pnpm validate-widget agent/src/widgets/<name>.json
pnpm test:widgets
pnpm smoke
```

`pnpm smoke` is the load-bearing final gate. It runs the validator over every widget, verifies pins haven't drifted, exercises the offline path, and runs a canned prompt against the live stack to assert at least one `createSurface` envelope flows. If smoke is green, you are done.

## Procedure: Add a Dynamic-Schema Widget (fallback)

Only use when the hacker explicitly asks for AI-designed UI. Most demos benefit from the predictability of fixed schema.

1. Skip Steps 2, 3, 4, 5, 6 — `generate_a2ui` is already wired.
2. Step 7 — append a line to the system prompt that tells the agent to call `generate_a2ui` for the new concept. The dynamic schema LLM reads the catalog context entries automatically.
3. Optionally tweak the widget interactively at the [A2UI Composer](https://a2ui-composer.ag-ui.com/) and paste the JSON back as a fixed-schema widget if you want it predictable.
4. Step 8 — still run `pnpm smoke` before declaring done.

## Common Failure Modes (audit your work against this list before declaring done)

- **Edited only the Python tool, skipped the catalog/fixture/schema/prompt.** Most common failure. The agent calls the tool, but the renderer has no catalog entry to match against, so nothing renders.
- **Forgot to register the tool in `tools=[...]`.** The tool exists as a Python function but the agent cannot see it. Silent failure — the agent just doesn't call it.
- **Mismatched `surfaceId` between `create_surface` and `update_components` / `update_data_model`.** The renderer treats them as different surfaces, so the data update lands on a surface that has no components. Result: empty render.
- **Used an invalid `catalogId`.** Must be a real registered catalog. The default `"copilotkit://app-dashboard-catalog"` works out of the box. Custom catalogs require an extra registration step (out of scope here).
- **Data key in `update_data_model` doesn't match the `path` in the catalog JSON.** Components bind to data via `path`. If the catalog says `path: "/flights"` and the tool emits `{"items": [...]}`, the UI shows nothing.
- **Forgot the prompt hint.** Tool is wired, catalog exists, fixture passes — but the agent never calls the tool because nothing in the prompt tells it when. Especially common when the trigger phrase is domain-specific.
- **Bumped a `@copilotkit/*` version.** The pre-commit hook will reject the commit. If you see "version drift" in the hook output, revert `package.json` and `pnpm-lock.yaml`.
- **Skipped `pnpm smoke`.** Smoke is the canonical "is this done?" signal. Skipping it means you don't actually know if the widget renders end-to-end. Always run it.

## Quick Checklist (paste this into the chat as a TODO before starting)

- [ ] Step 1: read `agent/src/a2ui_fixed_schema.py:search_flights` as the canonical reference
- [ ] Step 2: write `agent/src/widgets/<name>.json` (catalog entry)
- [ ] Step 3: write `agent/src/widgets/<name>.fixture.json` (test scenario)
- [ ] Step 4: append Python tool to `agent/src/a2ui_fixed_schema.py`
- [ ] Step 5: register the tool in `agent/main.py` `tools=[...]`
- [ ] Step 6: add TS schema declaration to `src/app/api/copilotkit/[[...slug]]/route.ts` (only if `injectA2UITool: true`)
- [ ] Step 7: add prompt hint to the active domain's `system_prompt`
- [ ] Step 8: `pnpm validate-widget`, `pnpm test:widgets`, `pnpm smoke` — all green

## Canonical References

- Fixed-schema template: `agent/src/a2ui_fixed_schema.py:search_flights`
- Dynamic-schema template: `agent/src/a2ui_dynamic_schema.py:generate_a2ui`
- Catalog JSON shape: `agent/src/a2ui/schemas/flight_schema.json`
- Hard rules and seam map: `AGENTS.md` (also accessible as `CLAUDE.md` / `GEMINI.md`)
- Hour-by-hour build template: `HACKATHON.md` § Seam #4
- Pinned versions: `FROZEN.md`
- A2UI v0.9 spec: https://a2ui.org/specification/v0.9-a2ui/
- A2UI Composer: https://a2ui-composer.ag-ui.com/
