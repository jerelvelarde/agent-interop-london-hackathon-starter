# vendor/ — defensive fallback mirror

This directory holds **frozen mirrors** of the two load-bearing CopilotKit
packages this starter pins:

| Package | Vendored as | Pinned version |
|---|---|---|
| `@copilotkit/a2ui-renderer` | `vendor/copilotkit-a2ui-renderer/` (extracted) | `1.57.4` |
| `copilotkit` (Python SDK) | `vendor/copilotkit-python/copilotkit-0.1.93-py3-none-any.whl` | `0.1.93` |

**Re-snapshotted:** 2026-06-03 — refreshed to match the 2026-05-29 pin bump
(`@copilotkit/a2ui-renderer 1.56.5 → 1.57.4`; `copilotkit 0.1.87 → 0.1.93`).
Matches `FROZEN.md`.
**Forked from:** `CopilotKit/CopilotKit@upstream/main`, commit `23af69041`.

> **The Python wheel matters more than it looks.** The `copilotkit` `0.1.4x–0.1.9x`
> line is **yanked from public PyPI** — a plain `pip download copilotkit==0.1.93`
> fails (public PyPI tops out at `0.1.39`). Install still works because
> `agent/uv.lock` pins the exact version + hash, but if PyPI ever deletes the
> yanked files, **this vendored wheel is the only retained copy.** The wheel here
> was reconstructed from uv's local archive cache — the same bits `uv sync`
> installed (verified `unzip -t` clean, RECORD/METADATA/WHEEL intact).

## Why we vendor

The hackathon is a single 5-hour build slot. Between fork date and event day,
upstream could:

- Cut a breaking `1.57.x` patch that breaks the renderer for a subset of envelope
  shapes the demo relies on.
- Yank `1.57.4` from npm (unlikely but not zero).
- Have an npm / PyPI registry outage on the morning of the event.

Any of those would brick the starter for the day. The vendored mirror is
**break-glass insurance** — if any of the above happens, every team can flip a
single line in `package.json` (and one entry in `agent/pyproject.toml`) and keep
shipping with the exact bits we tested against.

CI proves the vendored swap actually builds, so the day we need it we don't
discover the mirror is itself broken.

## How to flip from npm to vendor

### JavaScript (`@copilotkit/a2ui-renderer`)

In `package.json`, change:

```jsonc
"dependencies": {
  "@copilotkit/a2ui-renderer": "1.57.4",
  // ...
}
```

to:

```jsonc
"dependencies": {
  "@copilotkit/a2ui-renderer": "file:vendor/copilotkit-a2ui-renderer",
  // ...
}
```

Then:

```bash
pnpm install
pnpm build
```

The renderer resolves from the local vendored directory; the rest of the app is
unchanged. Same import path, same exported API — pnpm just resolves the
specifier to a local directory instead of the npm registry.

### Python (`copilotkit`)

In `agent/pyproject.toml`, the dependency is pinned as `"copilotkit>=0.1.90"`.
Add an explicit `[tool.uv.sources]` entry pointing at the vendored wheel:

```toml
[tool.uv.sources]
copilotkit = { path = "../vendor/copilotkit-python/copilotkit-0.1.93-py3-none-any.whl" }
```

(The path is relative to `agent/pyproject.toml`.) Then:

```bash
cd agent
uv sync
```

## How CI verifies the vendored build

`.github/workflows/ci.yml` includes a **Verify vendor build** step that:

1. Backs up the current `package.json`.
2. Rewrites `@copilotkit/a2ui-renderer` to `file:vendor/copilotkit-a2ui-renderer`.
3. Runs `pnpm install --no-frozen-lockfile` (lockfile drift is expected with
   the file: swap).
4. Runs `pnpm build` to prove the renderer compiles against the rest of the app.
5. Restores the original `package.json` and `pnpm-lock.yaml` from the backup.

If that step ever fails on `main`, the vendored mirror has drifted from what
the app needs — re-vendor before shipping.

## How to refresh the vendor mirror

After a deliberate `FROZEN.md` pin bump, re-snapshot both mirrors.

```bash
# JavaScript — extract the installed (lockfile-verified) package bits
rm -rf vendor/copilotkit-a2ui-renderer
mkdir vendor/copilotkit-a2ui-renderer
cp -RL node_modules/@copilotkit/a2ui-renderer/. vendor/copilotkit-a2ui-renderer/
```

For the Python wheel, **`pip download` will not work** while the target version
is yanked from public PyPI. Reconstruct it from uv's local archive cache (the
bits `uv sync` already installed):

```bash
VER=0.1.93
DI=$(find "$HOME/.cache/uv/archive-v0" -maxdepth 2 -name "copilotkit-$VER.dist-info" -type d | head -1)
SRC=$(dirname "$DI")
rm -f vendor/copilotkit-python/*.whl
( cd "$SRC" && zip -rqX "/tmp/copilotkit-$VER-py3-none-any.whl" copilotkit "copilotkit-$VER.dist-info" )
mv "/tmp/copilotkit-$VER-py3-none-any.whl" vendor/copilotkit-python/
unzip -tq vendor/copilotkit-python/copilotkit-$VER-py3-none-any.whl   # integrity check
```

Update `FROZEN.md` (and the table above) with the new version + date in the same
commit.

## What is NOT vendored

We deliberately do **not** vendor the full dependency tree (no
`@copilotkit/react-core`, no `@copilotkit/runtime`, no `langchain*`, no `next`,
no `react`). Those are pinned to exact versions in `package.json` /
`pyproject.toml` and the lockfile (`pnpm-lock.yaml` / `uv.lock`) is committed.
That gives us reproducibility for the rest of the surface without bloating the
repo with hundreds of MB of tarballs.

The two vendored packages are the ones where a breaking upstream change would
silently break envelope rendering — those are the ones we want byte-identical
insurance for.
