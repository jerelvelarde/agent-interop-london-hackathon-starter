# `agent/` — Python LangGraph agent

The agent process. Boots via `pnpm dev:agent` (which uses `uv` under the
hood and watches for hot reloads).

## Layout

| Path | Purpose |
|---|---|
| `main.py` | Entry point. Wires `ChatGoogleGenerativeAI` (Gemini 3.5 Flash by default) + tools + middleware + system prompt. |
| `src/` | All tool source. See `src/README.md`. |
| `pyproject.toml` | Pinned Python deps (see `../FROZEN.md`). |
| `uv.lock` | Committed lockfile — authoritative for Python deps. |
| `langgraph.json` | LangGraph CLI configuration. |
| `.python-version` | Python toolchain pin. |

## Develop

```bash
# From the repo root
pnpm dev:agent

# Or directly
cd agent
uv run --reload langgraph dev
```

## Customization seams in this directory

- `main.py` system prompt — first line of "make it about my domain"
- `src/domains/<active>/tools.py` — register new widget tools here
- `src/query.py` — Seam #3 (swap demo data)
- `src/tools/risk_register.py` — Seam #4 canonical example (add a widget)

## What you probably should NOT touch

- The `ChatGoogleGenerativeAI(...)` block in `main.py` — the model ID is
  FROZEN. See `../FROZEN.md` § LLM provider and the inline anchor comment
  for the full story (including why the native Google Gen AI SDK is
  required for Gemini 3.x instead of `langchain-openai`'s OpenAI-compat
  path).
- `pyproject.toml` versions — pinned. Pre-commit hook will reject drift.

See `../AGENTS.md` and `../HACKATHON.md` for recipes.
