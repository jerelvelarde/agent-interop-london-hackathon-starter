# Widget catalog + fixtures

Each widget here is a pair of files:

| File | Role |
|---|---|
| `<name>.json` | Catalog entry. The v0.9 component array (the schema). Includes the `pythonTool` pointer back to the tool that emits it. |
| `<name>.fixture.json` | Named test scenario. One **canonical fixture** object (`{surfaceId, catalogId, components, data}`) the renderer can hydrate without an LLM. |

Fixtures are what `pnpm test:widgets` and `OFFLINE=1` mode consume.

## Canonical fixture shape (one shape — issue #16)

The starter ships exactly **one** fixture shape. The validator is the authority. Every `*.fixture.json` under this folder is a flat object with these top-level keys:

| Key | Required | Type | Note |
|---|---|---|---|
| `surfaceId` | yes | string | Unique surface identifier the renderer mounts under. |
| `catalogId` | yes | string | URI-ish, e.g. `copilotkit://app-dashboard-catalog`. |
| `components` | yes | array | The v0.9 component tree (same shape as the catalog `.json`). |
| `data` | yes | object | The data model the components bind to via `path`. |
| `name` | no | string | Conventional fixture identifier, e.g. `risk_register_three_risks`. |
| `description` | no | string | One sentence describing what the fixture demonstrates. |

The canonical example to mirror is `agent/src/widgets/risk_register.fixture.json` (the simplest of the PortKit pair — one header label + one template-bound list). The legacy `envelopes: [...]` shape was retired in issue #16 — fixtures that still use it will fail validation with a teach-against-the-canonical hint.

## Add a new widget

1. Copy the closest existing pair (`risk_register.*` for the minimal branded catalog reference, `project_dashboard.*` for a heavier showcase, `product_card.*` for the base v0.9 catalog path).
2. Edit the `schema` array — that's the A2UI component tree.
3. Build a matching fixture by replacing only the `data` payload (keep `surfaceId`, `catalogId`, and the `components` array consistent with the catalog).
4. Wire a Python tool that returns the same envelopes (template: `agent/src/tools/risk_register.py:show_risk_register`).
5. Run `pnpm validate-widget agent/src/widgets/<name>.json` and `pnpm validate-widget agent/src/widgets/<name>.fixture.json`.

## Canonical pairs

- **`risk_register.*`** — branded `RiskFlag` items from `copilotkit://app-dashboard-catalog`. **The minimal fixed-schema canonical example** — one header label and one template-bound list. Backed by `show_risk_register` in `agent/src/tools/risk_register.py`. Read this first.
- **`project_dashboard.*`** — KPIs + sprint timeline + a row of `ProjectCard`s from `copilotkit://app-dashboard-catalog`. Heavier example showing nested data shapes and multiple top-level sections. Backed by `show_project_dashboard`.
- **`product_card.*`** — composed from the base v0.9 catalog (`Card`, `Column`, `Row`, `Image`, `Text`, `Button`). Shopping domain. Backed by `search_products`.
- **`legal/contract_review.*`** — domain-specific Paper catalog (`LegalDocumentShell`, `Clause`, `Redline`, etc.) for the contract-review demo.

## Sub-repo examples: mirror widget JSON here

Sub-repo examples (under `other-examples/<name>/`) may duplicate their widget
JSON files into `agent/src/widgets/<example-name>/` for `pnpm validate-widget`
and `pnpm test:widgets` discovery. **Keep duplicate copies byte-identical at
commit time.**

Why duplicate instead of symlink: symlinks behave inconsistently across
Windows / WSL / Linux / macOS file modes and zip-based downloads, and the
hackathon starter ships to hackers on every platform. Duplication is the
boring, portable choice. `agent/src/widgets/legal/contract_review*.json` is
the canonical mirror — same bytes as `other-examples/legal-contract-review/
schemas/contract_review*.json`.

If you edit one copy, edit both in the same commit. `pnpm smoke` validates
every JSON under `agent/src/widgets/` regardless of origin.

## Probing an agent module from a health-check / smoke script

`ChatOpenAI()` (and friends) raise at construction time when
`OPENAI_API_KEY` is missing. Because the starter's agent modules construct
the client at import time, any health-check / smoke / static-analysis
script that imports an agent module needs an env-var workaround — even if
it never makes a real call.

The convention: set a placeholder when importing for probe purposes only.

```bash
# For OpenAI-shaped probes:
OPENAI_API_KEY=sk-placeholder python -c "import agent.main"

# For Gemini via OpenAI compat (the FROZEN default for this starter):
GEMINI_API_KEY=sk-placeholder python -c "import agent.main"
```

`scripts/smoke.ts` does this today in the "agent registration probe" step —
see the `GEMINI_API_KEY: process.env.GEMINI_API_KEY || "smoke-probe-placeholder"`
line in that file. Copy that pattern for any new probe that needs to import
an agent module without making live API calls.
