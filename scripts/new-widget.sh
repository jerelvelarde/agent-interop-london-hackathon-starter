#!/usr/bin/env bash
# scripts/new-widget.sh — Scaffold a new A2UI widget from the canonical
# flight_card template that actually exists in this branch.
#
# Bare-bones equivalent of the .claude/skills/create-a2ui-widget skill (which
# walks an AI assistant + the hacker through the full five-surface dance). This
# script copies the two canonical JSON files (catalog widget schema + fixture)
# from the flight_card example, then rewrites id/name/description fields so
# the new pair is a stable starting point for editing.
#
# Why flight_card and not risk_register: the latter doesn't exist on this
# branch. flight_card is the live canonical (see AGENTS.md anti-pattern about
# fabricating seams). product_card is an alternative built from pure v0.9
# primitives, but its schema is larger and uses a URL-form catalogId (F18
# pitfall), so flight_card stays the default.
#
# Usage:  pnpm new-widget <name>
# Example:  pnpm new-widget recipe_card
#
# Creates:
#   agent/src/widgets/<name>.json          (wrapper widget JSON)
#   agent/src/widgets/<name>.fixture.json  (canonical fixture)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WIDGETS_DIR="$ROOT/agent/src/widgets"
TEMPLATE_CATALOG="$WIDGETS_DIR/flight_card.json"
TEMPLATE_FIXTURE="$WIDGETS_DIR/flight_card.fixture.json"

if [[ $# -lt 1 ]]; then
  echo "Usage: pnpm new-widget <name>" >&2
  echo "Example: pnpm new-widget recipe_card" >&2
  exit 2
fi

NAME="$1"

# Validate name: lowercase + digits + underscore/hyphen only (file-friendly)
if ! [[ "$NAME" =~ ^[a-z][a-z0-9_-]*$ ]]; then
  echo "ERROR: widget name must match ^[a-z][a-z0-9_-]*\$ (got: $NAME)" >&2
  echo "Use lowercase letters, digits, underscores, or hyphens; start with a letter." >&2
  exit 1
fi

if [[ ! -e "$TEMPLATE_CATALOG" ]]; then
  echo "ERROR: template catalog file missing at $TEMPLATE_CATALOG" >&2
  echo "Expected agent/src/widgets/flight_card.json to exist on this branch." >&2
  exit 1
fi
if [[ ! -e "$TEMPLATE_FIXTURE" ]]; then
  echo "ERROR: template fixture file missing at $TEMPLATE_FIXTURE" >&2
  echo "Expected agent/src/widgets/flight_card.fixture.json to exist on this branch." >&2
  exit 1
fi

# PascalCase the name for the component identifier (recipe_card → RecipeCard)
PASCAL_NAME=$(echo "$NAME" | python3 -c "
import sys
s = sys.stdin.read().strip()
parts = s.replace('-', '_').split('_')
print(''.join(p[:1].upper() + p[1:] for p in parts if p))
")

# kebab-case for the id field (recipe_card → recipe-card)
KEBAB_NAME=$(echo "$NAME" | tr '_' '-')

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

# Copy the canonical files, then rewrite identifying fields. We do the
# rewriting in Python so we can safely manipulate JSON without text-substitution
# pitfalls (e.g. accidentally rewriting a substring that appears in data).
python3 - "$TEMPLATE_CATALOG" "$CATALOG_PATH" "$TEMPLATE_FIXTURE" "$FIXTURE_PATH" "$NAME" "$KEBAB_NAME" "$PASCAL_NAME" <<'PYEOF'
import json
import sys

(_, catalog_src, catalog_dst, fixture_src, fixture_dst,
 name, kebab, pascal) = sys.argv

# --- Catalog (wrapper widget) ---
with open(catalog_src, "r", encoding="utf-8") as f:
    catalog = json.load(f)

catalog["id"] = kebab
catalog["name"] = pascal
catalog["description"] = (
    f"TODO: describe the {pascal} widget. Scaffolded from flight_card; "
    "rewrite this with what your widget actually shows."
)
# Repoint the pythonTool to a still-non-existent symbol so the validator's
# pythonTool resolver fires a clear warning (steering the hacker to
# write the tool).
catalog["pythonTool"] = f"agent/src/a2ui_fixed_schema.py:show_{name}"

with open(catalog_dst, "w", encoding="utf-8") as f:
    json.dump(catalog, f, indent=2)
    f.write("\n")

# --- Fixture ---
with open(fixture_src, "r", encoding="utf-8") as f:
    fixture = json.load(f)

fixture["name"] = f"{name}_example"
fixture["description"] = (
    f"TODO: describe what this fixture exercises. Scaffolded from "
    "flight_card.fixture.json."
)
fixture["surfaceId"] = f"{kebab}-results"

with open(fixture_dst, "w", encoding="utf-8") as f:
    json.dump(fixture, f, indent=2)
    f.write("\n")
PYEOF

GREEN='\033[32m'
DIM='\033[2m'
RESET='\033[0m'
BOLD='\033[1m'
YELLOW='\033[33m'

echo
echo -e "${GREEN}${BOLD}Created two widget files (copied from flight_card):${RESET}"
echo -e "  ${BOLD}${CATALOG_PATH}${RESET}"
echo -e "  ${BOLD}${FIXTURE_PATH}${RESET}"
echo
echo -e "${YELLOW}${BOLD}Heads up:${RESET} ${DIM}the catalog schema is still the FlightCard component tree (path bindings like /flights, airline, departureTime). Replace it with your widget's tree before wiring up the agent.${RESET}"
echo
echo -e "${BOLD}Next steps (the five-surface widget dance):${RESET}"
echo -e "  ${DIM}1. (done) Catalog schema → ${NAME}.json${RESET}"
echo -e "  ${DIM}2. (done) Fixture       → ${NAME}.fixture.json${RESET}"
echo -e "  ${DIM}3. Replace the schema components and data inside both files${RESET}"
echo -e "     ${DIM}with whatever your widget shows.${RESET}"
echo -e "  ${DIM}4. Add a Python tool — e.g. show_${NAME}() — that returns${RESET}"
echo -e "     ${DIM}a2ui.render(operations=[create_surface, update_components,${RESET}"
echo -e "     ${DIM}update_data_model]). Copy agent/src/a2ui_fixed_schema.py:search_flights${RESET}"
echo -e "     ${DIM}as the template.${RESET}"
echo -e "  ${DIM}5. Register the tool in agent/src/domains/default/tools.py${RESET}"
echo -e "     ${DIM}and add a prompt hint in agent/src/domains/default/prompts.py's${RESET}"
echo -e "     ${DIM}TOOL_RULES that teaches the agent WHEN to call it.${RESET}"
echo
echo -e "${BOLD}Verify with:${RESET}"
echo -e "  ${DIM}pnpm validate-widget agent/src/widgets/${NAME}.json${RESET}"
echo -e "  ${DIM}pnpm validate-widget agent/src/widgets/${NAME}.fixture.json${RESET}"
echo -e "  ${DIM}pnpm test:widgets${RESET}"
echo
echo -e "${DIM}For the full guided flow, ask Claude Code to run the create-a2ui-widget skill.${RESET}"
