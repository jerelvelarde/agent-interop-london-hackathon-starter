# Customization seams — six edit points

The starter is intentionally seam-bound: six places in the code marked
with a grep-friendly `CUSTOMIZATION SEAM` banner. Edit those, leave the
rest alone, and the starter does the rest. This doc is a restatement of
[`HACKATHON.md`](../HACKATHON.md) §1–6 with concrete file pointers, so
you can locate the right seam from a one-line description.

Find every seam in two seconds:

```bash
grep -r "CUSTOMIZATION SEAM" .
```

## §1 — Re-theme

Change the look without changing the components. The whole app and every
A2UI envelope inherit Tailwind 4 CSS variables, so editing the variables
re-skins everything in place. No rebuild needed.

```bash
grep -r "CUSTOMIZATION SEAM #1" .
```

**Files:** `src/lib/a2ui-theme.css` (the variables) and
`src/hooks/use-theme.tsx` (dark/light/system toggle).

If layout breaks: `pnpm theme:reset` reverts to defaults.

## §2 — Re-brand the shell

Swap the logo, product name, and accent colors in the header. This is the
component that frames the chat and the envelope inspector.

```bash
grep -r "CUSTOMIZATION SEAM #2" .
```

**File:** `src/components/BrandFrame.tsx`.

Do not touch `src/components/EnvelopeInspector.tsx` — it is the
hackathon's "show the wire" affordance and must stay visible.

## §3 — Swap demo data

Replace the canned dataset with your domain's data. The agent picks up
the new data through `query_data`; you also need to tell it (in the
system prompt) when to call the tool with your domain's language.

```bash
grep -r "CUSTOMIZATION SEAM #3" .
```

**File:** `agent/src/query.py` (canonical: reads `db.csv` and returns
rows). For sub-repo examples, the equivalent lives at
`other-examples/<your-name>/agent/queries.py` (or similar — the
legal example uses `queries.py` over a SQLite seed).

## §4 — Add an A2UI widget (fixed schema)

The most substantial seam. Budget at least an hour. Copy
`agent/src/a2ui_fixed_schema.py:search_flights` — that function is the
canonical fixed-schema widget pattern. It returns
`a2ui.render(operations=[create_surface, update_components,
update_data_model])`. Skip a step in the 5-surface dance and the widget
won't render.

```bash
grep -r "CUSTOMIZATION SEAM #4" .
```

**Files (the 5-surface dance):**

1. **Catalog entry** — `agent/src/widgets/<name>.json`
2. **Fixture** — `agent/src/widgets/<name>.fixture.json`
3. **Python tool** — `agent/src/a2ui_fixed_schema.py` + register in `agent/main.py`
4. **TS schema declaration** — `src/app/api/copilotkit/route.ts`
5. **Prompt hint** — line in the agent's system prompt teaching *when*
   to call the tool

Verify: `pnpm validate-widget agent/src/widgets/<name>.json`, then
`pnpm smoke`.

## §5 — Switch domain

When "swap data" alone isn't enough — when the whole agent personality
needs to change — switch domains. Set `DOMAIN=<name>` in `.env`; the
agent loads the matching data + prompt bundle at boot.

```bash
grep -r "CUSTOMIZATION SEAM #5" .
```

**Files:** `agent/src/domains/<name>/` (canonical stub at
`agent/src/domains/shopping/`). For a deeper version of this seam — a
fully separate sub-repo agent with its own catalog — see
[`anatomy-of-a-domain.md`](./anatomy-of-a-domain.md) and the legal
example.

## §6 — BYO A2A agent

Bring your own A2A agent for Track 1 multi-team interop. Run the
compliance checker first — if your partner agent doesn't emit
A2UI-v0.9-compliant envelopes, you'll spend the rest of the day
debugging the partner instead of building.

```bash
grep -r "CUSTOMIZATION SEAM #6" .
```

**Files:** `src/app/api/copilotkit/route.ts` (wiring; do not edit by
hand) and `a2a/` (toy subagent + compliance checker).

**Recipe (do not skip step 1):**

1. `pnpm check-a2a <partner-url>` — validates envelope compliance
2. Set `A2A_AGENT_URL=<partner-url>` in `.env`
3. Restart `pnpm dev`

A2A is dormant by default. Unset `A2A_AGENT_URL` and the codepath
disappears.

## Picking the right seam

If you're not sure which seam fits, ask your AI assistant —
[`CLAUDE.md`](../CLAUDE.md) establishes the slash-command vocabulary
("add a widget", "theme it for X", "re-brand it", "make it about Y",
"connect to another agent") that maps requests to seams. The mapping
is deliberately narrow: if your request doesn't fit a seam, the agent
should push back rather than invent new architecture.
