# Troubleshooting

Gotchas that have actually bitten people, with the fix in one place.
Most of these are cross-referenced from
[`CLAUDE.md`](../CLAUDE.md) §"Working from a worktree" — if you're an AI
assistant, the original notes are there with line refs.

## `sh: tsx: command not found` in a worktree

Worktrees inherit git history but not `node_modules`. The fix is one
command, run once after `git worktree add`:

```bash
pnpm install --frozen-lockfile
```

Takes ~12 seconds. After that, `pnpm validate-widget`, `pnpm typecheck`,
and the other scripts work normally. See
[`CLAUDE.md`](../CLAUDE.md) §"Fresh-worktree setup" (lines 162–173).

## `langgraph dev` from a worktree doesn't see `.env`

`langgraph dev` only looks at the worktree root for environment files.
Two workarounds, in order of preference:

```bash
# from inside the worktree:
cp ../../.env .env                              # do not commit; .env is gitignored

# or, inline:
GEMINI_API_KEY=... langgraph dev
```

`pnpm dev` from the **main** checkout is unaffected. See
[`CLAUDE.md`](../CLAUDE.md) §"Worktree-aware env loading" (lines
175–186).

## `Can't find lefthook in PATH` on commit

Benign. The commit still succeeds. Do not retry, do not pass
`--no-verify`, do not investigate further. Tracked at GitHub #5. See
[`CLAUDE.md`](../CLAUDE.md) §"Benign lefthook warning on commit"
(lines 202–206).

## JSDoc `*/` terminates the comment early

A path or glob example written inside `/** ... */` will eat the comment
the moment a `*` lands next to a `/`. esbuild then chokes. Three safe
fixes:

- Use angle-bracket placeholders (`<dir>/`) instead of literal wildcards
  (`*/`) in JSDoc.
- Move the path example out of the JSDoc into a `//` line comment.
- Escape the slash between `*` and `/` (rarely worth it; rephrase
  instead).

See [`CLAUDE.md`](../CLAUDE.md) §"JSDoc `*/` comment-terminator gotcha"
(lines 252–270).

## Naïve `grep` on brand text matches imports

If you write an acceptance criterion like "no CopilotKit in `layout.tsx`",
a literal substring grep matches both `<title>CopilotKit</title>` (the
intentional page brand text) and `import { CopilotKit } from
"@copilotkit/react-core"`. Anchor on the JSX open-tag (`<CopilotKit`)
or the package import path (`@copilotkit/react-core`), not the bare
word:

```bash
grep -E '<CopilotKit|@copilotkit/react-core' src/app/layout.tsx
```

See [`CLAUDE.md`](../CLAUDE.md) §"Acceptance-criteria grep patterns"
(lines 272–286).

## AG-UI "Message not found" on sub-repo agents

Known issue with `@ag-ui/client@0.0.53` checkpoint lookup against the
sub-repo agent path. When the user sends a chat against the legal
example's agent on `:8124`, the AG-UI client may emit `Message not
found` before any envelope arrives. Mitigations are tracked in the
legal example's [Plan v5 §8](https://www.notion.so/copilotkit/Plan-v5-Legal-Contract-Review-blitz-Execution-Plan-36f3aa38185281679f9bc7ec127a3588).

## `pnpm dev` only boots one langgraph

`scripts/run-agent.sh` boots only the top-level langgraph on port 8123.
Sub-repo agents (like the legal example) need a second langgraph in a
separate terminal:

```bash
npx @langchain/langgraph-cli dev \
  --port 8124 \
  --config other-examples/<your-name>/agent/langgraph.json
```

If your sub-repo agent's chat appears dead and you see no envelopes,
check that you actually started the second langgraph.

## Gemini 400 error mentioning `thought_signature`

You're on the wrong SDK. The error reads:

```
Function call is missing a thought_signature in functionCall parts.
This is required for tools to work correctly …
```

This happens when you use `langchain-openai` against Gemini 3.x via the
OpenAI-compatibility endpoint. `langchain-openai 1.1.9` strips Gemini's
thought-metadata and the API rejects the next multi-turn tool call.

The fix is the canonical LLM path from [`FROZEN.md`](../FROZEN.md)
§"LLM provider" (lines 14–25): `gemini-3.5-flash` via
`langchain-google-genai==4.2.4`. Check `pyproject.toml` includes that
exact dep, then check `graph.py` uses `ChatGoogleGenerativeAI`, not
`ChatOpenAI`.

## When all else fails

- `pnpm doctor` — preflight env still green?
- `pnpm verify-pins` — lockfiles still match `FROZEN.md`?
- `pnpm validate-widget <path>` — fixture shape correct? The error
  message names the missing field.
- Check the right-rail envelope inspector — did the agent emit
  `createSurface` / `updateComponents` / `updateDataModel`? All three
  are required; missing one means the agent never finished the
  handshake.
- Paste the failing envelope JSON into your AI assistant alongside the
  canonical `search_flights` envelope and ask "what's different about
  the shape." It's almost always a missing required field.
