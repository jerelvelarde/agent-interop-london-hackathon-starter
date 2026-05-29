# Forking this starter — the 9am to 2pm recipe

You arrived at 9am with a domain in mind. By 2pm you want a working
agent-driven Generative-UI demo your judges remember. This document is the
time-budgeted walkthrough. Stick to the budget; the worked example at
[`other-examples/legal-contract-review/`](../other-examples/legal-contract-review/)
is the shape every step targets.

## Before you start (5 minutes)

```bash
pnpm doctor                                    # preflight: Node, pnpm, Python, uv, ports
cp .env.example .env                           # then edit
# Free Gemini key (no credit card):
#   https://aistudio.google.com/apikey
# Drop it in .env as GEMINI_API_KEY=...
```

If `pnpm doctor` complains, fix the red items before you boot anything
else. The most common red is "Python 3.12+ not found" — install it via
`uv python install 3.12`.

## Hour 0:00 – 0:30: get the starter running

```bash
pnpm install --frozen-lockfile                 # ~30s; also installs the Python agent via uv
pnpm dev                                       # boots Next.js + top-level langgraph on :8123
```

Open `http://localhost:3000`. Send `"Show me a flights dashboard"` in the
chat. You should see the agent emit `createSurface` → `updateComponents`
→ `updateDataModel` envelopes in the right-rail envelope inspector, and
a flight-card grid render in the main pane. If that works, your starter
is healthy. If not, jump to [`troubleshooting.md`](./troubleshooting.md).

## Hour 0:30 – 1:30: pick your domain and seed data

```bash
pnpm new-example <your-name>                   # scaffolds other-examples/<your-name>/
```

If `new-example` errors or you want full control, instead copy
[`other-examples/legal-contract-review/`](../other-examples/legal-contract-review/)
and rename. Strip the legal-specific files (`agent/legal_db.py`,
`agent/data/*.txt`, the catalog renderers) and keep the structure:
`catalog/`, `schemas/`, `agent/`, `EXAMPLE.json`, `README.md`.

Decide what your demo *shows*. Pick one headline visual the agent renders
on cue. Examples: a recipe card with steps, a flight-search result, a
risk-flagged contract clause. Don't pick three — pick one and polish it.

Stub a 1-table SQLite seed (or a Python literal) with 5–20 rows of fake
data the agent can query.

## Hour 1:30 – 3:00: build the catalog + one agent tool

Open `other-examples/<your-name>/catalog/definitions.ts`. Declare 3–5
components for your domain — start small. Each definition needs a Zod
schema and a `description` (the agent reads the description to know
when to use the component).

Open `other-examples/<your-name>/catalog/renderers.tsx`. Write a React
function for each definition. Use `[data-catalog-style="<your-name>"]`
to scope your CSS in `catalog/theme.css`.

Open `other-examples/<your-name>/agent/tools.py`. Wire one Python tool
that returns `a2ui.render(operations=[create_surface, update_components,
update_data_model])` for your headline visual. The canonical pattern lives
at `agent/src/a2ui_fixed_schema.py:search_flights` in the main repo — read
it top-to-bottom before writing yours.

## Hour 3:00 – 4:00: wire the route group

Create `src/app/(<your-name>)/layout.tsx` and `page.tsx`. The route group
parens are load-bearing — they prevent your catalog from double-mounting
on the dashboard route.

Update `other-examples/<your-name>/EXAMPLE.json`:

```json
{
  "id": "<your-name>",
  "name": "<Your Display Name>",
  "description": "<one-line judges read>",
  "route": "/other-examples/<your-name>",
  "graphId": "<your_graph_id>",
  "agentName": "<your-agent-name>",
  "catalogId": "copilotkit://<your-name>-catalog",
  "tags": ["<tag1>", "<tag2>"],
  "status": "wip"
}
```

Run `pnpm validate-widget --examples` to check the EXAMPLE.json shape and
your schema fixtures.

## Hour 4:00 – 4:45: smoke + screenshot

```bash
pnpm typecheck                                 # catches type drift in catalog/
pnpm validate-widget other-examples/<your-name>/schemas/<example>.json
```

Boot two terminals — `pnpm dev` (the dashboard agent on :8123) and a
second one for your sub-repo agent:

```bash
npx @langchain/langgraph-cli dev \
  --port 8124 \
  --config other-examples/<your-name>/agent/langgraph.json
```

Open your route in the browser. Send a chat that should trigger your
headline tool. Watch the inspector for the envelope. Screenshot the
rendered result and save it as `other-examples/<your-name>/screenshot.png`.

## Hour 4:45 – 5:00: README + demo notes

Write one paragraph in `other-examples/<your-name>/README.md` that
describes what the demo shows and what's interesting about it. Flip
`EXAMPLE.json`'s `status` from `"wip"` to `"ready"` only if every
canned prompt renders cleanly. Commit. Done.

## Escape hatches

If something breaks: skim [`troubleshooting.md`](./troubleshooting.md)
before you start guessing.

If you're stuck on rendering: drop back to a fixed-schema fixture instead
of dynamic generation. The `search_flights` pattern at
`agent/src/a2ui_fixed_schema.py` is the safest path to a working demo
because the envelope shape is hand-authored, not LLM-generated.

If the agent won't talk: check [`FROZEN.md`](../FROZEN.md) §"LLM provider".
You must be on `gemini-3.5-flash` via `langchain-google-genai==4.2.4`,
NOT the older `langchain-openai` + Gemini 3.x path. The latter throws
`thought_signature` 400s on multi-turn tool calls — see
[`troubleshooting.md`](./troubleshooting.md) for the exact error.

If you're behind at 3:30: drop the custom widget. Double down on data
+ branding. Use the dynamic-schema path (`generate_a2ui`) to produce
ad-hoc UI from the system prompt. A polished re-skin beats a half-built
widget.
