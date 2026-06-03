# Other Examples

Self-contained example modules. Each one demonstrates a layer of A2UI customization beyond the default **pdf-analyst** demo (chat-with-your-PDF, at the repo root).

## What goes here

This directory is the home for **content-complete examples and archived demos**. The default pdf-analyst demo (and the `create-a2ui-widget` skill that adds to its catalog) covers the 95% case — a single shared catalog the agent composes from. Folders under `other-examples/` cover the rest: a *second catalog or a different reading experience* (legal paper), or a *full prior demo kept for reference* (PortKit — the original project-dashboard starter, archived here when pdf-analyst became the default).

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

> **Archived demos are the exception.** `portkit/` is not built from this
> scaffold — it's a full snapshot of the previous default demo, so it carries
> its own `src/` (the `(default)` route group + components/hooks), `agent/`
> (a langgraph-cli package with `langgraph.json`), `public/`, and `DEMO.md`.
> See its README for what it takes to run standalone.

## Index

| Example                                              | Status   | Catalog                              | What it shows                                                                          |
| ---------------------------------------------------- | -------- | ------------------------------------ | -------------------------------------------------------------------------------------- |
| [legal-contract-review/](./legal-contract-review/)   | wip      | `copilotkit://legal-paper-catalog`   | Paper-styled contract review with margin notes + redlines on a second registered catalog. |
| [portkit/](./portkit/)                               | archived | catalog of 9 dashboard primitives    | The original starter demo: an agent that generates a project dashboard (KPI cards, sprint progress, per-project drill-downs) plus flight-search + to-do surfaces, served by a LangGraph-cli agent. Archived snapshot of the previous `/` route, not mounted in the host. |

## How to add another

1. **`pnpm new-example <name>`.** Scaffolds the sub-repo layout above (README, EXAMPLE.json, catalog/, agent/) under `other-examples/<name>/` so you don't hand-author the skeleton. The scaffold is intentionally thin — fill it in by copying from `legal-contract-review/` (the canonical content-complete example).
2. **Honesty about portability.** The folder is content, not a complete repo. Document the host requirements (pinned deps, route shim, route-group layout, langgraph entry) in your example's README so a hacker who forks isn't surprised.
3. **Add an entry to the index table above** and to the gallery — the gallery enumerates `other-examples/*/EXAMPLE.json`.

> If you don't actually need a second catalog (you just want new widgets in the dashboard), use the `create-a2ui-widget` skill — much shorter path. The §0.5 callout in every example README spells out the distinction.
