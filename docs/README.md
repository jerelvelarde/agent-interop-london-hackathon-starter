# /docs — the forker's recipe

This `/docs` directory is the recipe for forking the CopilotKit A2UI
Hackathon Starter into your own domain. The starter ships with a worked
example at [`other-examples/legal-contract-review/`](../other-examples/legal-contract-review/);
everything here is the abstract pattern that example instantiates. If you
landed at 9am at Google CSG and you need to ship a custom-domain
Generative-UI demo by 2pm, start here.

## Where to start

| If you want to … | Read |
|---|---|
| Ship a custom domain by 2pm | [`forking-this-starter.md`](./forking-this-starter.md) |
| Understand the 5-ingredient recipe | [`anatomy-of-a-domain.md`](./anatomy-of-a-domain.md) |
| Find the right customization point | [`customization-seams.md`](./customization-seams.md) |
| See a worked example | [`cookbook/legal-contract-review.md`](./cookbook/legal-contract-review.md) |
| Debug something weird | [`troubleshooting.md`](./troubleshooting.md) |

## What this is NOT

These docs do not duplicate the AI agent guides; they complement them.
If you find yourself rewriting one of the following, stop and link instead:

- [`CLAUDE.md`](../CLAUDE.md) / [`AGENTS.md`](../AGENTS.md) /
  [`GEMINI.md`](../GEMINI.md) — for AI assistants. These set constraints
  (FROZEN versions, anti-patterns, slash-command vocabulary) that AI
  assistants must obey. They are not human-tutorial material — they are
  AI-tutorial material.
- [`HACKATHON.md`](../HACKATHON.md) — the original 5-hour recipe and the
  source of truth for the six customization seams. This `/docs` directory
  expands HACKATHON.md §4 (Add an A2UI widget) and §5 (Switch domain) into
  a forker-friendly worked example, but the seams themselves are defined
  there.
- [`FROZEN.md`](../FROZEN.md) — version pins. If a version is mentioned in
  this directory, the canonical pin lives in FROZEN.md.

## Reading order if you have 15 minutes

1. Skim [`forking-this-starter.md`](./forking-this-starter.md) end-to-end.
2. Then read [`anatomy-of-a-domain.md`](./anatomy-of-a-domain.md) §"The 5
   ingredients" to build the mental model.
3. Open [`cookbook/legal-contract-review.md`](./cookbook/legal-contract-review.md)
   in one tab and the actual files (under `other-examples/legal-contract-review/`)
   in another. Cross-reference.
4. Bookmark [`troubleshooting.md`](./troubleshooting.md) — you will need it.
