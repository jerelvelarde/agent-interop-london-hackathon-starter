# Cookbook: legal-contract-review

A pointer-and-map page for the worked example at
[`other-examples/legal-contract-review/`](../../other-examples/legal-contract-review/).
Open the folder in your editor while you read this — every section
below maps the abstract recipe to a concrete file in that folder.

## What it demonstrates

- **A custom catalog** (`copilotkit://legal-paper-catalog`) that is *not*
  the dashboard catalog. This is the pattern when you need a fresh
  visual identity (paper, terminal, kiosk) rather than just new widgets
  on the existing dashboard.
- **Dual-graph wiring** — the top-level dashboard agent on `:8123`
  continues to run; the legal sub-repo agent runs separately on `:8124`.
  Each has its own `langgraph.json`, its own `pyproject.toml`, its own
  tool surface.
- **A document-review workflow** — risk flags, margin notes, inline
  redlines with accept/reject actions that round-trip via
  `update_data_model`.

## The 9 catalog components

Defined in
[`other-examples/legal-contract-review/catalog/definitions.ts`](../../other-examples/legal-contract-review/catalog/definitions.ts):

| Component | What it is |
|---|---|
| `LegalDocumentShell` | Root paper container; warm off-white, "Demo only" disclaimer strip |
| `Verdict` | Top-line outcome banner (positive / neutral / negative tone) |
| `Clause` | Numbered clause body with optional risk badge, margin note, redlines |
| `Redline` | Inline diff (original → suggested) with status path-binding |
| `MarginNote` | Right-margin annotation with severity bullet (info / warning / critical) |
| `Citation` | Authority reference — case / statute / pinpoint |
| `RiskBadge` | Severity tag (low / medium / high / critical) with aria-label |
| `AcceptRejectBar` | Pair of buttons dispatching `apply_redline` / `reject_redline` |
| `LegalDivider` | Hairline divider in the paper palette |

## File map

| Recipe ingredient | This example's file |
|---|---|
| Plan + execution history | [Notion: Plan v5 — Legal Contract Review](https://www.notion.so/copilotkit/Plan-v5-Legal-Contract-Review-blitz-Execution-Plan-36f3aa38185281679f9bc7ec127a3588) |
| Catalog (definitions) | [`other-examples/legal-contract-review/catalog/definitions.ts`](../../other-examples/legal-contract-review/catalog/definitions.ts) |
| Catalog (renderers) | [`other-examples/legal-contract-review/catalog/renderers.tsx`](../../other-examples/legal-contract-review/catalog/renderers.tsx) |
| Catalog (theme) | [`other-examples/legal-contract-review/catalog/theme.css`](../../other-examples/legal-contract-review/catalog/theme.css) |
| Catalog (index + createCatalog) | [`other-examples/legal-contract-review/catalog/index.ts`](../../other-examples/legal-contract-review/catalog/index.ts) |
| Schema (component tree) | [`other-examples/legal-contract-review/schemas/contract_review.json`](../../other-examples/legal-contract-review/schemas/contract_review.json) |
| Fixture (canonical shape) | [`other-examples/legal-contract-review/schemas/contract_review.fixture.json`](../../other-examples/legal-contract-review/schemas/contract_review.fixture.json) |
| Agent (graph + sys.path injection) | [`other-examples/legal-contract-review/agent/graph.py`](../../other-examples/legal-contract-review/agent/graph.py) |
| Agent (langgraph manifest) | [`other-examples/legal-contract-review/agent/langgraph.json`](../../other-examples/legal-contract-review/agent/langgraph.json) |
| Agent (pinned deps) | [`other-examples/legal-contract-review/agent/pyproject.toml`](../../other-examples/legal-contract-review/agent/pyproject.toml) |
| Agent (tools) | [`other-examples/legal-contract-review/agent/tools.py`](../../other-examples/legal-contract-review/agent/tools.py) |
| Agent (DB module) | [`other-examples/legal-contract-review/agent/legal_db.py`](../../other-examples/legal-contract-review/agent/legal_db.py) |
| Manifest | [`other-examples/legal-contract-review/EXAMPLE.json`](../../other-examples/legal-contract-review/EXAMPLE.json) |
| Next.js mount point | `src/app/(legal)/other-examples/legal-contract-review/page.tsx` |

## The recipe applied

Mapping the 5-ingredient recipe (see
[`anatomy-of-a-domain.md`](../anatomy-of-a-domain.md)) to this example:

1. **Catalog** — `catalog/definitions.ts` declares 9 components with
   `DynString` for all bindable props. `catalog/renderers.tsx` provides
   one React function per definition. `catalog/theme.css` scopes the
   paper aesthetic under `[data-catalog-style="legal-paper"]`.
   `catalog/index.ts` calls `createCatalog(..., { catalogId:
   "copilotkit://legal-paper-catalog" })`.
2. **Schema fixture** — `schemas/contract_review.fixture.json` uses the
   canonical flat `{components, data}` shape (see
   [`scripts/validate-widget.ts`](../../scripts/validate-widget.ts)
   JSDoc — shape (c)).
3. **Sub-repo agent** — `agent/` has the flat layout (no `src/` subdir),
   pins `langchain-google-genai==4.2.4`, and uses `sys.path` injection
   in `graph.py` to make absolute imports of `legal_db`, `queries`, and
   `tools` work under langgraph's path-based loader.
4. **Next.js route group** — `src/app/(legal)/` mounts the legal-paper
   catalog. The route group prevents double-mounting the dashboard
   catalog. `page.tsx` imports from the sub-repo `catalog/` folder.
5. **EXAMPLE.json** — declares `catalogId: "copilotkit://legal-paper-catalog"`,
   `route: "/other-examples/legal-contract-review"`, `graphId:
   "legal_review_agent"`, `agentName: "legal"`, `status: "wip"`.

## Status caveats

Read [`EXAMPLE.json`](../../other-examples/legal-contract-review/EXAMPLE.json)
for the source of truth on `status`. As of 2026-05-28 the legal example
is `"wip"` — some demo flows render cleanly, others are tracked under
the Plan v5 doc above. If you fork this example as your starting point,
plan to flip `status` to `"ready"` only after every canned prompt in
your demo script lands an envelope.

## When NOT to copy this example

This example is the right starting point when you want a new visual
identity (paper / terminal / kiosk) with net-new component primitives.
If you only want to add a widget to the existing dashboard catalog, the
shorter path is the `create-a2ui-widget` skill — see
[`HACKATHON.md` §4](../../HACKATHON.md). Re-read the callout at the top
of [`other-examples/legal-contract-review/README.md`](../../other-examples/legal-contract-review/README.md)
before you commit to the sub-repo path.
