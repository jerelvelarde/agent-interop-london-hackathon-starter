# FROZEN.md

**Frozen on:** 2026-05-28
**Forked from:** `CopilotKit/CopilotKit@upstream/main` (commit `23af69041`), path `examples/integrations/langgraph-python`
**Verifier:** `pnpm verify-pins`

This is the canonical source of truth for what version of every load-bearing
dependency this starter runs against. CI re-runs the model-ID probe nightly so
a Google or upstream change is caught before event day.

> **Do not bump these.** AI assistants are explicitly forbidden from changing
> `@copilotkit/*` versions in `AGENTS.md`. The pre-commit hook rejects drift.

## LLM provider

| Field | Value |
|---|---|
| Provider | Google Gemini |
| SDK | `langchain-google-genai==4.2.4` (native Google Gen AI) |
| Model ID | **`gemini-3.5-flash`** |
| Env var | `GEMINI_API_KEY` |
| Free-tier key | https://aistudio.google.com/apikey |
| Verified | 2026-05-28 — UI→agent→Gemini with flat-shape frontend tools, `search_flights` fired, `createSurface` envelope returned |
| Multi-turn | Yes — native SDK handles `thought_signature` replay correctly across tool turns |

### Why this default

`gemini-3.5-flash` is the current Google Flash model (released 2026-05-19) —
beats 3.1 Pro on agentic benchmarks at Flash pricing, 1M context, 4× speed.

1. **Agentic-tuned.** Google positions Gemini Flash as the agentic flagship.
2. **Sponsor alignment.** Google is the venue + platform sponsor.
3. **Free tier.** No credit card required.
4. **Multi-turn safe** with `langchain-google-genai`'s native SDK (handles
   `thought_signature` replay; see history below).
5. **Tool shape clean.** Native SDK converts frontend-tool flat-shape entries
   correctly, no shim required (though `NormalizeToolShapeMiddleware`
   stays in place as belt-and-suspenders for future client swaps).

### History: how we landed on the native SDK

The base starter used `langchain-openai` against Gemini's OpenAI-compatibility
endpoint. Two issues surfaced through running the actual UI:

1. **`gemini-3.5-flash` 400s on multi-turn tool calls via OpenAI-compat:**

   ```
   Function call is missing a thought_signature in functionCall parts.
   This is required for tools to work correctly … Please refer to
   https://ai.google.dev/gemini-api/docs/thought-signatures
   ```

   `langchain-openai 1.1.9` strips Gemini's thought-metadata. `reasoning_effort:
   "none"` does not disable the requirement. We confirmed this twice (initial
   probe + re-probe on 2026-05-28).

2. **Frontend tool shape mismatch:** CopilotKit V2's `useFrontendTool()`
   registers tools with a flat `{name, description, parameters}` shape that
   Gemini's OpenAI-compat parser strict-rejects. OpenAI tolerates it; Gemini
   does not. We fixed this with `agent/src/middleware/normalize_tools.py`
   (see commit `7c58287`).

Switching the primary and secondary LLM to `langchain-google-genai` (the native
Google Gen AI SDK, `ChatGoogleGenerativeAI`) resolves (1) entirely and gives
us cleaner handling of (2) as a side-effect.

### Alternative — fall back to OpenAI-compat + `gemini-2.5-flash`

The OpenAI-compat code path stayed working with `gemini-2.5-flash`. If
`langchain-google-genai` ever breaks in a way that's worse than the OpenAI-
compat trap, swap back to:

```python
from langchain_openai import ChatOpenAI
model = ChatOpenAI(
    model="gemini-2.5-flash",
    api_key=os.getenv("GEMINI_API_KEY"),
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    model_kwargs={"parallel_tool_calls": False},
)
```

This was the default from 2026-05-28 morning through ~22:50 UTC. The
`NormalizeToolShapeMiddleware` is required on this path; keep it.

### Models that 404'd in the probe (do not use)

- `gemini-3.0-flash`
- `gemini-2.5-flash-latest`
- `gemini-2.0-flash`, `gemini-2.0-flash-001`
- `gemini-1.5-flash`, `gemini-1.5-flash-latest`

### Free-tier rate-limit behavior

Measured 2026-05-28 against `gemini-2.5-flash` via the OpenAI-compat endpoint
with a single API key. Tool see `scripts/load-test-gemini.py`.

| Concurrency | Successes | Failures | p50 (ms) | p95 (ms) | p99 (ms) | Wall (ms) | Retry-After |
|---|---|---|---|---|---|---|---|
| 30 | 30 / 30 | 0 | 1707 | 2027 | 2104 | 2315 | none |
| 100 | 100 / 100 | 0 | 1883 | 2314 | 2817 | 2973 | none |

Single-key cliff is well above 100 concurrent agentic tool-calling requests.
At London-hackathon scale (~30 teams × per-team API keys + a small mentor
fallback pool), this is comfortable headroom. Three rate-limit mitigations
(per-team keys via prereq email, mentor fallback pool, `OFFLINE=1` insurance)
are sufficient; we do NOT need to ship a shared key.

> **HACKATHON.md "if you get rate-limited" runbook:** if a `429` ever appears
> in chat, fall back to `OFFLINE=1` for the demo. The envelope inspector still
> shows real A2UI surfaces from `public/offline-envelopes.json`.

## Pinned versions (JavaScript)

| Package | Pin | Notes |
|---|---|---|
| `@copilotkit/react-core` | `1.57.4` (exact) | No caret |
| `@copilotkit/runtime` | `1.57.4` (exact) | No caret |
| `@copilotkit/a2ui-renderer` | `1.57.4` (exact) | No caret |
| `@copilotkit/react-ui` | `1.57.4` (exact) | No caret; added to host the a2ui-pdf-analyst example |
| `@ag-ui/client` | `^0.0.53` | Added for the a2ui-pdf-analyst example (AG-UI client transport) |
| `pdfjs-dist` | `^4.10.38` | Added for the a2ui-pdf-analyst example (client-side PDF parse) |
| `next` | `16.1.6` (exact) | — |
| `react` / `react-dom` | `19.2.4` (exact) | Tightened from caret in A5 |
| `@ag-ui/a2a-middleware` | (added in Workstream B) | — |

> **2026-05-29: bumped to 1.57.4 to host the a2ui-pdf-analyst example (owner
> sign-off; Notion plan).** The three `@copilotkit/*` pins moved `1.56.5 →
> 1.57.4` and `@copilotkit/react-ui`, `@ag-ui/client`, and `pdfjs-dist` were
> added. A Phase-0 spike confirmed forced `tool_choice` still works on Gemini's
> native SDK at this version, so the Gemini default (below) is unchanged.

## Pinned versions (Python)

| Package | Pin | Notes |
|---|---|---|
| `langchain` | `1.2.15` | — |
| `langgraph` | `1.1.6` | — |
| `langgraph-cli[inmem]` | `0.4.21` | — |
| `langchain-openai` | `1.1.9` | Drives the OpenAI swap path and the documented Gemini OpenAI-compat fallback |
| `langchain-anthropic` | `1.4.1` | For the Anthropic swap matrix |
| `copilotkit` | `>=0.1.90` | Python SDK; floor raised 2026-05-29 for the a2ui-pdf-analyst example |
| `ag-ui-langgraph` | `>=0.0.36` | Added 2026-05-29 for the a2ui-pdf-analyst example (AG-UI ↔ LangGraph bridge) |
| `openai` | `1.109.1` | Transitive (used by langchain-openai) |

`uv.lock` is committed and authoritative.

## Package manager

| Layer | Manager | Lockfile |
|---|---|---|
| JavaScript | pnpm | `pnpm-lock.yaml` (committed) |
| Python | uv | `agent/uv.lock` (committed) |

## Vendoring (Workstream F)

`vendor/` will mirror `@copilotkit/a2ui-renderer` and `copilotkit` (Python) as a
fallback if upstream cuts a breaking release before event day. CI proves the
vendored mirror builds and renders the smoke envelope. Swap procedure documented
in `vendor/README.md`.

_Not yet populated — added in Workstream F._
