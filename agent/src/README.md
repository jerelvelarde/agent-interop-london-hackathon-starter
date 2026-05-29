# `agent/src/` — LangGraph agent source

The Python LangGraph agent that emits A2UI envelopes via CopilotKit. Run
via `pnpm dev:agent` (which delegates to `scripts/run-agent.sh`).

## What lives here

| File | Purpose |
|---|---|
| `tools/` | **Canonical fixed-schema A2UI examples** — one tool per surface. `risk_register.py` is the minimal Seam #4 anchor; `project_dashboard.py` is the showcase. |
| `a2ui_dynamic_schema.py` | **Canonical dynamic-schema A2UI example** (`generate_a2ui`). Secondary LLM designs the schema. |
| `query.py` | Demo data tool (reads `db.csv`). Seam #3 anchor. |
| `todos.py` | Todo CRUD tools + `AgentState` schema. |
| `db.csv` | Sample dashboards data. |
| `a2ui/schemas/` | JSON schemas loaded by tools in `tools/`. |
| `widgets/` | Catalog entries + fixtures per widget. |
| `domains/` | Domain bundles (data + prompt + widget subset). `DOMAIN=<name>` switches at boot. |

## What you probably want to edit

- **Swap demo data** → `query.py` (Seam #3)
- **Add a new widget** → copy `tools/risk_register.py` (Seam #4)
- **Switch domains** → `domains/<name>/` (Seam #5)

## What you probably should NOT edit

- The `ChatOpenAI(...)` call in `../main.py` — FROZEN (see `FROZEN.md`).

See `AGENTS.md` and `HACKATHON.md` for the full customization recipes.
