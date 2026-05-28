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
| `name` | no | string | Conventional fixture identifier, e.g. `flight_card_two_results`. |
| `description` | no | string | One sentence describing what the fixture demonstrates. |

The canonical example to mirror is `agent/src/widgets/flight_card.fixture.json`. The legacy `envelopes: [...]` shape was retired in issue #16 — fixtures that still use it will fail validation with a teach-against-the-canonical hint.

## Add a new widget

1. Copy the closest existing pair (`flight_card.*` for branded catalog, `product_card.*` for base v0.9 catalog).
2. Edit the `schema` array — that's the A2UI component tree.
3. Build a matching fixture by replacing only the `data` payload (keep `surfaceId`, `catalogId`, and the `components` array consistent with the catalog).
4. Wire a Python tool that returns the same envelopes (template: `agent/src/a2ui_fixed_schema.py:search_flights`).
5. Run `pnpm validate-widget agent/src/widgets/<name>.json` and `pnpm validate-widget agent/src/widgets/<name>.fixture.json`.

## Canonical pairs

- **`flight_card.*`** — branded `FlightCard` from `copilotkit://app-dashboard-catalog`. Fixed-schema canonical example. Backed by `search_flights`.
- **`product_card.*`** — composed from the base v0.9 catalog (`Card`, `Column`, `Row`, `Image`, `Text`, `Button`). Shopping domain. Backed by `search_products`.
- **`legal/contract_review.*`** — domain-specific Paper catalog (`LegalDocumentShell`, `Clause`, `Redline`, etc.) for the contract-review demo.
