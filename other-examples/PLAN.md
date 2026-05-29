# `other-examples/` overhaul — work-in-flight plan

> This file tracks the in-flight overhaul on `feat/examples-overhaul`.
> Remove before merging the umbrella PR.

## Why this PR exists

A blitz audit of the hackathon starter (Notion: [London A2A & A2UI
Hackathon](https://www.notion.so/copilotkit/London-A2A-A2UI-Hackathon-36e3aa381852806b9a15cac8e0c607f1))
found that:

1. The one shipped example (`legal-contract-review/`) is broken on
   `main` — `pnpm dev` only boots `sample_agent`; the
   `legal_review_agent` graph is commented out in
   `agent/langgraph.json`, `pyproject.toml` lists empty dependencies,
   and no `screenshot.png` ships.
2. The `other-examples/` template needs infrastructure work before
   adding more examples is sustainable (no `pnpm new-example`
   scaffold, no per-example smoke, no shared helpers, sys.path hacks
   in the agent dir layout).
3. Hackathon participants will benefit from more domain examples
   beyond legal — healthcare, travel, real estate, edtech — that they
   can fork and customise.

## Audit items to resolve (7-point checklist)

- [ ] **2.** Wire example LangGraph agents into `pnpm dev`. Currently
      only `sample_agent` boots; `legal_review_agent` is commented out
      in `agent/langgraph.json` with a `_note` field.
- [x] **3.** Add a smoke check that boots each example's graph (in
      `scripts/smoke.ts`) so we catch broken examples in CI.
- [x] **4.** Build `pnpm new-example <name>` as a real scaffolder from
      `legal-contract-review/` (mirrors the existing `pnpm new-widget`
      script). The README already advertises it.
- [ ] **5.** Lift shared helpers to `other-examples/_shared/` so a new
      example can `import` instead of copy-pasting the
      `update_data_model` wrap, the langgraph entry shim, etc.
- [x] **6.** Rename example agent dirs to match Python package names
      (e.g. `legal-contract-review/agent/` → contains a package whose
      `__init__.py` matches the dir name) and drop the `sys.path` hack
      in `langgraph.json`.
- [ ] **7.** Ship a real `screenshot.png` for `legal-contract-review/`
      and flip its status `wip` → `stable` in the index table.

## Dependencies

- `adoring-einstein-ed74e0` → `main` — load-bearing fix for
  legal-contract-review (the audit's #1 fix). Items **5** and **7**
  depend on this branch landing. Items **2, 3, 4, 6** are
  infrastructure-only and proceed independently.
- The 5 fix PRs (#49–#53) have already landed on
  `chore/public-release-cleanup` — this branch is based on that.

## New examples to add (post-infra)

Each new example follows the canonical `legal-contract-review/`
layout (sub-repo with `README.md`, `EXAMPLE.json`, `catalog/`,
`agent/`, `schemas/`). Branding/data borrowed from the four
`customize-*` assessment worktrees that proved the customization
seams work.

| Example     | Branding                        | Domain                | Source worktree (assessment branch)          |
| ----------- | ------------------------------- | --------------------- | -------------------------------------------- |
| healthcare  | RoundsAI (clinical teal)        | Ward rounds copilot   | `customize-healthcare` (`assess/healthcare`) |
| travel      | TripWeaver (sky + sunset coral) | Flight + hotel search | `customize-travel` (`assess/travel`)         |
| realestate  | Homestead (warm neutral)        | Brooklyn listings     | `customize-realestate` (`assess/realestate`) |
| edtech      | (TBD)                           | Students at risk      | `customize-edtech` (`assess/edtech`)         |

Each lands either as a commit on this PR or as a child PR targeting
this branch — TBD based on review preference.

## References

- README: [`other-examples/README.md`](./README.md)
- Canonical: [`other-examples/legal-contract-review/`](./legal-contract-review/)
- Notion KB: [London A2A & A2UI Hackathon](https://www.notion.so/copilotkit/London-A2A-A2UI-Hackathon-36e3aa381852806b9a15cac8e0c607f1)
- Pre-PR audit reports: `/tmp/london-a2ui-assessment/*.md` (off-repo)

## Out of scope for this PR

- Workstream-class doc drift outside `HACKATHON.md` (README.md,
  AGENTS.md, `.claude/skills/create-a2ui-widget/SKILL.md` all still
  carry `agent/main.py` + "5-surface dance" drift). Separate follow-up
  doc PR.
- Unit tests for the JSON envelope guards (no `agent/tests/` exists
  yet — separate test-harness PR).
