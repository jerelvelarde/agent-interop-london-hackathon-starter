#!/usr/bin/env bash
# scripts/new-widget.sh — Scaffold a new A2UI widget from the risk_register template.
#
# Bare-bones equivalent of the .claude/skills/create-a2ui-widget skill (which
# walks an AI assistant + the hacker through the full five-surface dance). This
# script seeds the two JSON files (catalog schema + fixture) so the hacker has
# a stable starting point.
#
# Usage:  pnpm new-widget <name>
# Example:  pnpm new-widget product_card
#
# Creates:
#   agent/src/widgets/<name>.json          (catalog schema)
#   agent/src/widgets/<name>.fixture.json  (fixture for pnpm test:widgets)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WIDGETS_DIR="$ROOT/agent/src/widgets"

if [[ $# -lt 1 ]]; then
  echo "Usage: pnpm new-widget <name>" >&2
  echo "Example: pnpm new-widget product_card" >&2
  exit 2
fi

NAME="$1"

# Validate name: lowercase + digits + underscore/hyphen only (file-friendly)
if ! [[ "$NAME" =~ ^[a-z][a-z0-9_-]*$ ]]; then
  echo "ERROR: widget name must match ^[a-z][a-z0-9_-]*\$ (got: $NAME)" >&2
  echo "Use lowercase letters, digits, underscores, or hyphens; start with a letter." >&2
  exit 1
fi

# PascalCase the name for the component identifier (product_card → ProductCard)
PASCAL_NAME=$(echo "$NAME" | python3 -c "
import sys
s = sys.stdin.read().strip()
parts = s.replace('-', '_').split('_')
print(''.join(p[:1].upper() + p[1:] for p in parts if p))
")

mkdir -p "$WIDGETS_DIR"

CATALOG_PATH="$WIDGETS_DIR/${NAME}.json"
FIXTURE_PATH="$WIDGETS_DIR/${NAME}.fixture.json"

if [[ -e "$CATALOG_PATH" ]]; then
  echo "ERROR: $CATALOG_PATH already exists. Pick a different name or rm it first." >&2
  exit 1
fi
if [[ -e "$FIXTURE_PATH" ]]; then
  echo "ERROR: $FIXTURE_PATH already exists. Pick a different name or rm it first." >&2
  exit 1
fi

# Catalog schema — mirrors the shape of agent/src/widgets/risk_register.json
cat > "$CATALOG_PATH" <<JSON
[
  {
    "id": "root",
    "component": "Column",
    "children": {
      "componentId": "${NAME}-item",
      "path": "/items"
    },
    "gap": 12
  },
  {
    "id": "${NAME}-item",
    "component": "${PASCAL_NAME}",
    "title": { "path": "title" },
    "subtitle": { "path": "subtitle" }
  }
]
JSON

# Fixture — full envelope shape for pnpm test:widgets
cat > "$FIXTURE_PATH" <<JSON
{
  "surfaceId": "${NAME}-surface",
  "catalogId": "copilotkit://app-dashboard-catalog",
  "components": [
    {
      "id": "root",
      "component": "Column",
      "children": {
        "componentId": "${NAME}-item",
        "path": "/items"
      },
      "gap": 12
    },
    {
      "id": "${NAME}-item",
      "component": "${PASCAL_NAME}",
      "title": { "path": "title" },
      "subtitle": { "path": "subtitle" }
    }
  ],
  "data": {
    "items": [
      { "title": "Example ${PASCAL_NAME} 1", "subtitle": "Replace me with real data" },
      { "title": "Example ${PASCAL_NAME} 2", "subtitle": "From a Python tool in agent/src/tools/" }
    ]
  }
}
JSON

GREEN='\033[32m'
DIM='\033[2m'
RESET='\033[0m'
BOLD='\033[1m'

echo
echo -e "${GREEN}${BOLD}Created two widget files:${RESET}"
echo -e "  ${BOLD}${CATALOG_PATH}${RESET}"
echo -e "  ${BOLD}${FIXTURE_PATH}${RESET}"
echo
echo -e "${BOLD}Next steps (the five-surface widget dance):${RESET}"
echo -e "  ${DIM}1. (done) Catalog schema → ${NAME}.json${RESET}"
echo -e "  ${DIM}2. (done) Fixture       → ${NAME}.fixture.json${RESET}"
echo -e "  ${DIM}3. Add a Python tool that emits a createSurface for catalogId${RESET}"
echo -e "     ${DIM}\"copilotkit://app-dashboard-catalog\" + this schema.${RESET}"
echo -e "     ${DIM}Copy agent/src/tools/risk_register.py as the template (canonical minimal example).${RESET}"
echo -e "  ${DIM}4. Register the tool in agent/src/domains/default/tools.py default_tools=[...].${RESET}"
echo -e "  ${DIM}5. Add a prompt hint in agent/src/domains/default/prompts.py that teaches the agent WHEN to call it.${RESET}"
echo
echo -e "${BOLD}Verify with:${RESET}"
echo -e "  ${DIM}pnpm validate-widget agent/src/widgets/${NAME}.json${RESET}"
echo -e "  ${DIM}pnpm validate-widget agent/src/widgets/${NAME}.fixture.json${RESET}"
echo -e "  ${DIM}pnpm test:widgets${RESET}"
echo
echo -e "${DIM}For the full guided flow, ask Claude Code to run the create-a2ui-widget skill.${RESET}"
