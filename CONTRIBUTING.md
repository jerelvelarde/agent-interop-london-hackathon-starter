# Contributing

This is a **hackathon starter**. The primary audience is hackers customizing
the repo inside a 5-hour build window — not contributors. If you're here for
that: ignore this doc, open [HACKATHON.md](HACKATHON.md), and start hacking.

If you're here because you want to send a real improvement back upstream
*after* the event, this is the right doc. Read on.

## What we'll merge

- Bug fixes that survive `pnpm smoke` and don't change behavior the docs promise.
- Doc fixes (typos, broken links, clearer recipes in `HACKATHON.md`).
- New customization seams *only if* they replace existing ad-hoc edits that
  hackers have been doing repeatedly — file an issue first so we can talk about
  the anchor comment + the AGENTS.md slash-command vocabulary entry.
- New domain stubs alongside `agent/src/domains/shopping/` — must be fully
  finished (data, prompt, fixtures, anchor comments). Half-finished stubs rot.
- New canonical examples for fixed-schema A2UI widgets, provided they pass
  `pnpm validate-widget` and ship with a fixture.

## What we won't merge

- **`@copilotkit/*`, `langchain*`, `langgraph*` version bumps.** Versions are
  frozen on the fork date. The pre-commit hook rejects drift. See
  [FROZEN.md](FROZEN.md) for the why — Gemini 3.x has a thought-signature trap
  that breaks multi-turn tool-calling on `langchain-openai`. Don't reopen this.
- New top-level dependencies that duplicate something the base starter
  already provides (e.g. `framer-motion` when CSS transitions suffice).
- Changes to `src/components/EnvelopeInspector.tsx` that make it toggleable
  or hide it. The inspector is the hackathon's "show the wire" affordance —
  judges need to see A2UI is actually firing.
- Hand-rolled React renderers for A2UI primitives. Use the catalog + theme
  system; `@copilotkit/a2ui-renderer` owns rendering.

## Before opening a PR

Run **all** of these and confirm they're green:

```bash
pnpm doctor          # preflight env check
pnpm verify-pins     # lockfile drift check
pnpm smoke           # composite gate: validators + pins + offline + canned prompt
```

If you touched widgets or fixtures, also run `pnpm test:widgets`.

CI re-runs `pnpm smoke` + the Gemini model-ID probe + the vendored-fallback
build. If CI is red, your PR will be auto-blocked until it's green.

## AI-assisted contributions

PRs co-authored with Claude Code, Gemini CLI, Cursor, Windsurf, Codex, or
similar are fine — this starter is explicitly designed to be vibe-code-friendly.
Two expectations:

1. The PR still passes `pnpm smoke`. The AI assistant should run the gate
   before opening the PR; if they didn't, you should before you push.
2. The commit message names the assistant. Trailer like
   `Co-Authored-By: <Assistant Name> <noreply@<vendor>.com>` is the standard.

The AGENTS.md hard rules (no `@copilotkit/*` bumps, run `pnpm validate-widget`
after editing widget JSON, run `pnpm smoke` before declaring done) apply
identically whether the typist is a human or an AI assistant.

## Commit + PR style

- Plain-English imperative subjects ("Add shopping domain stub", not
  "feat(domains): add shopping stub").
- Keep PRs scoped — one seam or one fix per PR.
- Reference the seam number (e.g. "Seam #4") in the description if it
  applies. Link out to the HACKATHON.md section you're touching.

## Reporting bugs

Open an issue with:
- What you ran (`pnpm dev`? `pnpm smoke`? specific seam?)
- What you expected
- What you saw (paste the envelope from the inspector if it's a render bug)
- Output of `pnpm doctor`

Bugs that reproduce on a fresh `pnpm install` get top priority.
