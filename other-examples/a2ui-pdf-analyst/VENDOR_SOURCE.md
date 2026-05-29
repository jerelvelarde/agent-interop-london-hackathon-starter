# Vendor source provenance

This directory is a **raw vendored copy** of an upstream CopilotKit showcase.
It is reference source only — later fleet slots restructure and wire it into
this starter's `other-examples/` sub-repo convention. Do not treat the files
here as already-integrated app code.

## Source

| Field | Value |
|---|---|
| Source repo | https://github.com/Anmol-Baranwal/CopilotKit.git |
| Branch | `showcase-a2ui-pdf-analyst` |
| Commit SHA | `2c652990d8f442aa08c7e23abd7338293232413e` |
| Upstream path | `examples/showcases/a2ui-pdf-analyst/` |
| Vendored on | 2026-05-29 |

## What was copied

The entire `examples/showcases/a2ui-pdf-analyst/` subtree was copied verbatim:
`src/`, `agent/`, `package.json`, `README.md`, and all config files
(`next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `.gitignore`),
plus the upstream's committed lockfiles (`pnpm-lock.yaml`, `agent/uv.lock`).

**Excluded:** no `node_modules/`, `.venv/`, `.next/`, `dist/`, `__pycache__/`,
or other build output was present in the upstream branch, and none was added.

## Acquisition method

The task-prescribed `git clone --filter=blob:none --sparse-checkout` flow was
blocked by this environment's command policy (`git clone` is denied). The
showcase subtree was instead fetched via the GitHub tarball API at the exact
same branch tip and extracted to only the showcase path:

```
gh api repos/Anmol-Baranwal/CopilotKit/tarball/showcase-a2ui-pdf-analyst > repo.tar.gz
tar xzf repo.tar.gz "<prefix>/examples/showcases/a2ui-pdf-analyst"
```

The commit SHA above was confirmed two ways: the branch tip reported by
`gh api repos/.../branches/showcase-a2ui-pdf-analyst` (`.commit.sha`), and the
tarball's top-level directory prefix (`Anmol-Baranwal-CopilotKit-2c65299`,
the abbreviated form of the same SHA).

## Notes for downstream integration

- The upstream `agent/pyproject.toml` here uses `langchain-openai`. This
  starter's OWNER DECISION is to **keep Gemini** (`langchain-google-genai`);
  the root `agent/pyproject.toml` is unchanged in that respect. When wiring
  this example, do not adopt the OpenAI model line from the vendored copy.
- The vendored `tsconfig.json` is the showcase's own config and is not part of
  this repo's root TypeScript compilation. The root `tsconfig.json` excludes
  `other-examples/**` so this raw source is not type-checked by `pnpm typecheck`.
