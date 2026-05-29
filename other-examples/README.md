# Other Examples

Self-contained example modules. Each one demonstrates the next layer of A2UI customization beyond the dashboard demo.

## What goes here

This directory is the home for **content-complete examples that go one layer deeper than the dashboard demo**. The dashboard demo (and the `create-a2ui-widget` skill that adds to it) covers the 95% case — single catalog, pure-data widgets. Examples under `other-examples/` cover the 5% case where you need *new visual primitives, a second catalog, a different reading experience,* or a domain story that needs its own setting (legal paper, terminal kiosk, retail receipt, etc.).

Each example folder follows the same sub-repo layout:

```
other-examples/<example-id>/
├── README.md         # Standalone setup, screenshots, fork notes
├── EXAMPLE.json      # Manifest read by the gallery
├── catalog/          # Zod schemas + React renderers (this is the "second catalog")
├── agent/            # LangGraph Python package — graph, tools, sample data
└── schemas/          # Component-tree adjacency lists + fixtures
```

**Sub-repo conventions:**

- Each example owns its `catalog/`, `agent/`, `schemas/`, and `EXAMPLE.json`
- Each `agent/` is a real Python package (`pyproject.toml` + `__init__.py`) — required by `langgraph build`
- No cross-imports between examples — a hacker can `cp -r <example>/ ~/my-new-repo/` and have the content (with documented host surgery)
- Shared deps come from the parent `package.json` and `agent/pyproject.toml`
- The Next.js route lives at `src/app/(<group>)/<example-id>/page.tsx` as a thin shim — the *content* lives here, the *mount point* lives under `src/app/`

## Index

| Example                                              | Status | Catalog                              | What it shows                                                                          |
| ---------------------------------------------------- | ------ | ------------------------------------ | -------------------------------------------------------------------------------------- |
| [legal-contract-review/](./legal-contract-review/)   | wip    | `copilotkit://legal-paper-catalog`   | Paper-styled contract review with margin notes + redlines on a second registered catalog. |
| [a2ui-pdf-analyst/](./a2ui-pdf-analyst/)             | wip    | self-contained mini-app (Gemini)     | Chat-with-your-PDF; the agent builds the answer UI (fixed + dynamic schema, Recharts). Runs as its own app (web :3000 + agent :8123), not mounted into the host. |

## How to add another

1. **`pnpm new-example <name>`.** Scaffolds the sub-repo layout above (README, EXAMPLE.json, catalog/, agent/) under `other-examples/<name>/` so you don't hand-author the skeleton. The scaffold is intentionally thin — fill it in by copying from `legal-contract-review/` (the canonical content-complete example).
2. **Honesty about portability.** The folder is content, not a complete repo. Document the host requirements (pinned deps, route shim, route-group layout, langgraph entry) in your example's README so a hacker who forks isn't surprised.
3. **Add an entry to the index table above** and to the gallery — the gallery enumerates `other-examples/*/EXAMPLE.json`.

> If you don't actually need a second catalog (you just want new widgets in the dashboard), use the `create-a2ui-widget` skill — much shorter path. The §0.5 callout in every example README spells out the distinction.
