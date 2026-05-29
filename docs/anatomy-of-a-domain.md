# Anatomy of a domain — the 5-ingredient recipe

A domain example under `other-examples/<name>/` is a self-contained
content unit with five ingredients. Skip one, the demo won't run. Get all
five right, the renderer and the agent do the rest. The worked example
at [`other-examples/legal-contract-review/`](../other-examples/legal-contract-review/)
instantiates every ingredient — read this doc with that folder open.

## The 5 ingredients of a domain example

### 1. Catalog

**Lives at:** `other-examples/<your-name>/catalog/`

Four files:

- **`definitions.ts`** — the catalog API. One entry per component, each
  with a Zod schema and a `description` string the agent uses to decide
  when to render that component. Path-bindable props must use the
  `DynString` union (`z.string() | { path: string }`); declaring a
  bindable prop as plain `z.string()` will freeze the data-model
  round-trip.
- **`renderers.tsx`** — the React functions, one per definition. Their
  prop types come from `CatalogRenderers<typeof <name>Definitions>` so
  the type system enforces parity with the definitions file.
- **`theme.css`** — CSS variables scoped to `[data-catalog-style="<your-name>"]`.
  Don't bleed styles outside the scope; the dashboard catalog and your
  catalog co-exist on the same page tree.
- **`index.ts`** — exports + the `createCatalog(...)` call that wires
  definitions to renderers under a `catalogId` like
  `copilotkit://<your-name>-catalog`.

### 2. Schema fixture

**Lives at:** `other-examples/<your-name>/schemas/<example>.json`

The canonical fixture shape is defined in
[`scripts/validate-widget.ts`](../scripts/validate-widget.ts) JSDoc —
that file is the authority on which shapes are accepted (it lists three
recognized JSON shapes; fixtures use shape (c), the flat `{components,
data}` form). One fixture per representative demo state. The validator
will tell you which shape it picked and what's missing if the file is
malformed.

Fixtures double as offline-mode envelopes and as test inputs for
`pnpm test:widgets`. If a fixture renders cleanly, your demo renders
cleanly.

### 3. Sub-repo agent

**Lives at:** `other-examples/<your-name>/agent/`

Flat layout — no `src/` subdir, in contrast to the top-level starter's
`agent/src/`. Files:

- **`langgraph.json`** — the loader manifest. References `./graph.py:graph`
  under `graphs`, sets `python_version: "3.12"`, points `env` at the
  shared root `.env` (typically `../../../.env`).
- **`pyproject.toml`** — pinned Python deps. Must include
  `langchain-google-genai==4.2.4` for the canonical LLM path
  (see [`FROZEN.md`](../FROZEN.md) §"LLM provider").
- **`graph.py`** — the `create_agent(model=..., tools=[...])` call. Uses
  `sys.path` injection (see [HACKATHON.md §5 callout](../HACKATHON.md))
  because langgraph's path-based loader bypasses Python's package
  machinery, breaking relative imports.
- **Domain DB module + tools** — e.g. `legal_db.py` + `tools.py` in the
  legal example. Tools return `a2ui.render(operations=[...])`.

### 4. Next.js route group

**Lives at:** `src/app/(<your-name>)/`

The parens around the directory name are a Next App Router route-group
convention — they create a routing scope without adding a URL segment.
The route group owns its own `<CopilotKit>` provider scope, so mounting
your catalog there does not double-mount the dashboard catalog onto the
default routes.

The route group's `layout.tsx` mounts the catalog via the renderer's
mount API. Inside the route group, your `page.tsx` lives at
`src/app/(<your-name>)/other-examples/<your-name>/page.tsx` — a thin
shim that imports from the `other-examples/<your-name>/` content folder.

### 5. EXAMPLE.json

**Lives at:** `other-examples/<your-name>/EXAMPLE.json`

Advertises your example to the starter's index. Required fields:

| Field | Constraint |
|---|---|
| `id` | kebab-case unique |
| `name` | human display name |
| `description` | one line judges read at a glance |
| `route` | MUST start with `/other-examples/` |
| `catalogId` | MUST start with `copilotkit://` |
| `tags` | array of kebab-case strings |
| `status` | `"wip"` or `"ready"` |

Optional: `graphId`, `agentName`, `screenshot`.

## File tree of the worked example

```
other-examples/legal-contract-review/
├── EXAMPLE.json                     # manifest — pure copy-paste then edit
├── README.md                        # human-facing description
├── catalog/
│   ├── definitions.ts               # 9 components, domain-specific
│   ├── renderers.tsx                # React for each definition
│   ├── theme.css                    # paper aesthetic, scoped CSS
│   └── index.ts                     # createCatalog(...) — copy-paste then rename
├── schemas/
│   ├── contract_review.json         # catalog schema (component tree)
│   └── contract_review.fixture.json # canonical {components, data} fixture
└── agent/                           # FLAT layout — no src/ subdir
    ├── langgraph.json               # graph manifest — copy-paste then edit graphs.<id>
    ├── pyproject.toml               # pinned deps — copy-paste verbatim
    ├── graph.py                     # create_agent(...) call + sys.path injection
    ├── legal_db.py                  # domain DB module
    ├── queries.py                   # query helpers
    ├── tools.py                     # A2UI-emitting tools
    └── data/                        # seed files (NDA + SaaS sample contracts)
```

The Next.js mount point for this example lives outside the sub-repo at
`src/app/(legal)/other-examples/legal-contract-review/page.tsx`. The
sub-repo is a *content* unit; the Next App Router route mount is a
separate but related concern.

## What runs where

| Process | Where | What it does |
|---|---|---|
| Browser | `:3000` | Next.js renders the route group, mounts your catalog via the A2UI renderer |
| Top-level langgraph | `:8123` | Runs the dashboard agent (`agent/main.py` in the root) — driven by `pnpm dev` |
| Sub-repo langgraph | `:8124+` | Runs your example's agent — must be booted separately |

The sub-repo langgraph does NOT boot via `pnpm dev`. That script's
`scripts/run-agent.sh` boots only the top-level agent on `:8123`. Start
your sub-repo agent in a separate terminal:

```bash
npx @langchain/langgraph-cli dev \
  --port 8124 \
  --config other-examples/<your-name>/agent/langgraph.json
```

If you forget this and the chat appears dead, see
[`troubleshooting.md`](./troubleshooting.md) §"`pnpm dev` only boots one
langgraph".
