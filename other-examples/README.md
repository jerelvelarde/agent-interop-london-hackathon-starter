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

## How to add another

1. **`pnpm new-example <name>`.** Copies the canonical `legal-contract-review/` sub-repo to `other-examples/<name>/` and rewrites every identifying string (id, display name, `catalogId`, `graphId`, Python package name) for the new example. The scaffolded `catalog/`, `agent/`, and `schemas/` content is still legal-domain content (clauses, redlines, margin notes) — rewrite `agent/tools.py`, `agent/graph.py`'s system prompt, and the Zod schemas in `catalog/definitions.ts` for your own domain before the example demonstrates anything new. The script enforces a kebab/snake name regex and refuses to overwrite an existing folder; run `pnpm validate-widget --examples` and `pnpm smoke` after rewriting.
2. **Honesty about portability.** The folder is content, not a complete repo. Document the host requirements (pinned deps, route shim, route-group layout, langgraph entry) in your example's README so a hacker who forks isn't surprised.
3. **Add an entry to the index table above** and to the gallery — the gallery enumerates `other-examples/*/EXAMPLE.json`.

> If you don't actually need a second catalog (you just want new widgets in the dashboard), use the `create-a2ui-widget` skill — much shorter path. The §0.5 callout in every example README spells out the distinction.
