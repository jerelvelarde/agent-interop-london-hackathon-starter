#!/usr/bin/env bash
# scripts/verify-pins.sh — Fail if package.json, pnpm-lock.yaml, or agent/uv.lock
# has drifted from FROZEN.md.
#
# Verifies:
#   - @copilotkit/react-core    == 1.57.4
#   - @copilotkit/runtime       == 1.57.4
#   - @copilotkit/a2ui-renderer == 1.57.4
#   - @copilotkit/react-ui      == 1.57.4
#   - react / react-dom         == 19.2.4
#   - next                      == 16.1.6
#
# 2026-05-29: @copilotkit/* bumped 1.56.5 -> 1.57.4 (+ @copilotkit/react-ui
# added) to host the a2ui-pdf-analyst example. See FROZEN.md.
#
# Exit 0 on clean pins, 1 on drift. Machine-parsable: one line per violation
# prefixed with "DRIFT:".

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG_JSON="$ROOT/package.json"
LOCK="$ROOT/pnpm-lock.yaml"

if [[ ! -f "$PKG_JSON" ]]; then
  echo "FAIL: package.json not found at $PKG_JSON" >&2
  exit 1
fi

RED='\033[31m'
GREEN='\033[32m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

# Pin manifest:  package_name|expected_version
PINS=(
  "@copilotkit/react-core|1.57.4"
  "@copilotkit/runtime|1.57.4"
  "@copilotkit/a2ui-renderer|1.57.4"
  "@copilotkit/react-ui|1.57.4"
  "next|16.1.6"
  "react|19.2.4"
  "react-dom|19.2.4"
)

drift_count=0

check_pin() {
  local pkg="$1" expected="$2"
  # Use python3 instead of node so this runs even before pnpm install.
  local actual
  actual=$(python3 -c "
import json, sys
try:
    pkg = json.load(open(sys.argv[1]))
except Exception as e:
    sys.exit(2)
deps = pkg.get('dependencies', {})
dev = pkg.get('devDependencies', {})
val = deps.get(sys.argv[2]) or dev.get(sys.argv[2]) or ''
print(val)
" "$PKG_JSON" "$pkg" 2>/dev/null || echo "")

  if [[ -z "$actual" ]]; then
    echo -e "${RED}DRIFT:${RESET} $pkg ${DIM}not declared in package.json${RESET} (expected $expected)"
    drift_count=$((drift_count + 1))
    return
  fi

  if [[ "$actual" != "$expected" ]]; then
    echo -e "${RED}DRIFT:${RESET} $pkg ${DIM}is${RESET} $actual ${DIM}but FROZEN.md pins${RESET} $expected"
    drift_count=$((drift_count + 1))
    return
  fi

  echo -e "${GREEN}OK:${RESET} $pkg @ $actual"
}

echo -e "${BOLD}pnpm verify-pins${RESET} — comparing package.json against FROZEN.md\n"

for entry in "${PINS[@]}"; do
  pkg="${entry%%|*}"
  ver="${entry##*|}"
  check_pin "$pkg" "$ver"
done

echo

# pnpm-lock.yaml drift sanity-check: ensure lockfile exists. (A full lockfile
# diff is delegated to `pnpm install --frozen-lockfile` in CI.)
if [[ ! -f "$LOCK" ]]; then
  echo -e "${RED}DRIFT:${RESET} pnpm-lock.yaml missing — run \`pnpm install\` to regenerate."
  drift_count=$((drift_count + 1))
fi

# agent/uv.lock sanity-check: ensure it exists.
if [[ ! -f "$ROOT/agent/uv.lock" ]]; then
  echo -e "${RED}DRIFT:${RESET} agent/uv.lock missing — run \`cd agent && uv sync\` to regenerate."
  drift_count=$((drift_count + 1))
fi

echo

if [[ "$drift_count" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}All pins match FROZEN.md.${RESET}"
  exit 0
else
  echo -e "${RED}${BOLD}${drift_count} pin drift detected.${RESET} Fix package.json to match FROZEN.md."
  echo -e "${DIM}AGENTS.md explicitly forbids changing @copilotkit/* versions.${RESET}"
  exit 1
fi
