#!/usr/bin/env bash
# scripts/new-example.sh — Scaffold a new sub-repo example under
# other-examples/<name>/ by copying the canonical legal-contract-review/
# example and rewriting all identifying strings (name, title, ids,
# catalog id, package name) to <name>.
#
# Audit item #4: the other-examples/README.md already advertises
# `pnpm new-example <name>` but no such scaffolder existed. Hackers had to
# hand-copy from legal-contract-review/. This script gives them a working
# skeleton on the same shape as `pnpm new-widget`.
#
# Why a *real copy* (vs. an empty stub): the canonical example is
# content-complete (paper styling, redline round-trip, sample data). A new
# hacker forking it gets a runnable starting point — change the prompts,
# swap the sample data, retheme the catalog, and they have their own
# example. An empty stub leaves the same "what files do I need" panic that
# this script is meant to solve.
#
# Usage:  pnpm new-example <name>
# Example:  pnpm new-example recipe-finder
#
# Creates:
#   other-examples/<name>/
#     README.md           (legal-content-shaped — hacker rewrites)
#     EXAMPLE.json        (manifest; rewritten with <name>)
#     Dockerfile          (build recipe; rewritten with <name>)
#     catalog/            (Zod schemas + React renderers; legal-content-shaped)
#     agent/              (LangGraph Python package; rewritten name)
#     schemas/            (A2UI component trees + fixtures; rewritten catalogId)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXAMPLES_DIR="$ROOT/other-examples"
TEMPLATE_DIR="$EXAMPLES_DIR/legal-contract-review"

if [[ $# -lt 1 ]]; then
  echo "Usage: pnpm new-example <name>" >&2
  echo "Example: pnpm new-example recipe-finder" >&2
  exit 2
fi

NAME="$1"

# Validate name: lowercase + digits + underscore/hyphen only (file-friendly).
# Mirrors scripts/new-widget.sh — start with a letter; lowercase digits,
# hyphens, underscores allowed. Keeps the name safe for Python package
# generation (after `_` → `-` swap), URL slugs, and catalog ids.
if ! [[ "$NAME" =~ ^[a-z][a-z0-9_-]*$ ]]; then
  echo "ERROR: example name must match ^[a-z][a-z0-9_-]*\$ (got: $NAME)" >&2
  echo "Use lowercase letters, digits, underscores, or hyphens; start with a letter." >&2
  exit 1
fi

if [[ ! -d "$TEMPLATE_DIR" ]]; then
  echo "ERROR: template example missing at $TEMPLATE_DIR" >&2
  echo "Expected other-examples/legal-contract-review/ to exist on this branch." >&2
  exit 1
fi

TARGET_DIR="$EXAMPLES_DIR/$NAME"
if [[ -e "$TARGET_DIR" ]]; then
  echo "ERROR: $TARGET_DIR already exists. Pick a different name or rm -rf it first." >&2
  exit 2
fi

# Copy the canonical example as-is (including hidden files like .gitignore,
# but NOT the .git dir — the template doesn't have one). The trailing /.
# copies contents rather than the dir itself.
mkdir -p "$TARGET_DIR"
cp -R "$TEMPLATE_DIR/." "$TARGET_DIR/"

# Now rewrite identifying fields. We do this in Python so JSON edits go
# through json.load (no risk of string-substitution corruption), and
# textual rewrites in README/.py/.toml/.ts/.tsx go through regex with
# explicit anchors so we don't accidentally rewrite the word "legal" inside
# unrelated prose (e.g. the disclaimer line about "not legal advice"
# should NOT be touched).
python3 - "$TARGET_DIR" "$NAME" <<'PYEOF'
import json
import re
import sys
from pathlib import Path

target_dir = Path(sys.argv[1])
name = sys.argv[2]

# Derived identifiers
name_snake = name.replace("-", "_")          # recipe-finder → recipe_finder
name_kebab = name.replace("_", "-")          # recipe_finder → recipe-finder
display_name = " ".join(
    part[:1].upper() + part[1:] for part in re.split(r"[-_]", name) if part
)                                            # recipe-finder → Recipe Finder
pascal_name = display_name.replace(" ", "")  # → RecipeFinder

graph_id = f"{name_snake}_agent"             # recipe_finder_agent
python_pkg_dist = f"{name_kebab}-agent"      # recipe-finder-agent (pyproject)
python_pkg_module = f"{name_snake}_agent"    # recipe_finder_agent (setuptools)
catalog_id = f"copilotkit://{name_kebab}-catalog"


def rewrite_file(path: Path, replacements: list[tuple[str, str]]) -> None:
    """Apply a list of (pattern, replacement) regex substitutions to a file."""
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    for pattern, replacement in replacements:
        text = re.sub(pattern, replacement, text)
    path.write_text(text, encoding="utf-8")


# ─── EXAMPLE.json ───────────────────────────────────────────────
# JSON edit (load + dump) — never string-substitute JSON.
example_json_path = target_dir / "EXAMPLE.json"
if example_json_path.exists():
    obj = json.loads(example_json_path.read_text(encoding="utf-8"))
    obj["id"] = name_kebab
    obj["name"] = display_name
    obj["description"] = f"TODO: one-sentence summary of the {display_name} example."
    obj["route"] = f"/other-examples/{name_kebab}"
    obj["graphId"] = graph_id
    obj["agentName"] = name_snake
    obj["catalogId"] = catalog_id
    obj["tags"] = ["TODO"]
    obj["status"] = "scaffold"
    example_json_path.write_text(
        json.dumps(obj, indent=2) + "\n", encoding="utf-8"
    )

# ─── README.md ───────────────────────────────────────────────────
# Replace just enough so the file makes sense as a starting point but
# steers the hacker to rewrite the prose. We deliberately do NOT do a
# bulk find/replace on "legal" — the disclaimer about "not legal advice"
# should stay scoped to the legal example, and shallow substitution would
# leave half-rewritten sentences.
readme_path = target_dir / "README.md"
if readme_path.exists():
    readme_path.write_text(
        f"""# {display_name}

> **Heads up — this is a scaffold.**
>
> Scaffolded from `other-examples/legal-contract-review/` (the canonical
> content-complete example). The catalog, renderers, schemas, sample data,
> and agent prompts are all still LEGAL-DOMAIN content. Before this example
> is meaningful you need to:
>
> 1. Rewrite `catalog/definitions.ts` and `catalog/renderers.tsx` with the
>    components your domain actually needs.
> 2. Rewrite `agent/tools.py` and `agent/graph.py`'s system prompt for
>    your domain.
> 3. Replace `agent/data/` sample documents with your own.
> 4. Update `schemas/*.json` so the component IDs match your new catalog.
> 5. Replace this README with what the example actually demonstrates.
>
> If you only need a new widget (not a new visual identity), use the
> `create-a2ui-widget` skill instead — much shorter path.

A scaffold for the {display_name} example. Built as a sub-repo under
`/other-examples/` to demonstrate registering a *second* A2UI catalog
(`{catalog_id}`) alongside the main dashboard catalog.

---

## Setup

```bash
pnpm dev
```

Then open [`/other-examples/{name_kebab}`](http://localhost:3000/other-examples/{name_kebab})
in the browser once the starter is running.

Requires `GEMINI_API_KEY` in your `.env` (same one the dashboard demo uses).

If the starter isn't running yet, follow the root `README.md` first — this
example shares the parent's `pnpm dev` entry point, agent runtime, and
CopilotKit route.

---

## What you'll see

TODO: describe the demo here — the reading experience, the agent loop,
the visual identity, the wow moment.

---

## Layout

```
{name_kebab}/
├── README.md         (you are here)
├── EXAMPLE.json      (manifest read by the example gallery)
├── catalog/          (Zod schemas + React renderers for the {display_name} catalog)
├── agent/            (LangGraph Python package — graph, tools, sample data)
└── schemas/          (component-tree adjacency lists + test fixtures)
```

The Next.js route lives at `src/app/(<group>)/{name_kebab}/page.tsx` as a
thin shim that imports from this folder.

---

## Next steps

1. Read `other-examples/legal-contract-review/README.md` end-to-end.
2. Rewrite `catalog/definitions.ts` + `catalog/renderers.tsx` for your
   domain (the legal-paper shapes won't fit a `{display_name}` surface).
3. Rewrite `agent/tools.py` system prompt and tool implementations.
4. Replace `agent/data/` sample documents.
5. Update `schemas/*.json` so component IDs match your new catalog.
6. Add the route shim under `src/app/` (see `other-examples/README.md` §3).
7. Update `other-examples/README.md`'s index table to list this example.
8. Run `pnpm validate-widget --examples`, then `pnpm smoke` before
   declaring done.
""",
        encoding="utf-8",
    )

# ─── agent/pyproject.toml ────────────────────────────────────────
# Rewrite the package name + the documented setuptools mapping.
pyproject_path = target_dir / "agent" / "pyproject.toml"
rewrite_file(
    pyproject_path,
    [
        (r'^name = "legal-review-agent"', f'name = "{python_pkg_dist}"'),
        (
            r'description = "LangGraph agent for the Contract Review Copilot example\."',
            f'description = "LangGraph agent for the {display_name} example."',
        ),
        # `packages = ["legal_review_agent"]` → `packages = ["<name>_agent"]`
        (
            r'packages = \["legal_review_agent"\]',
            f'packages = ["{python_pkg_module}"]',
        ),
        # `legal_review_agent = "."` → `<name>_agent = "."`
        (
            r'^legal_review_agent = "\."',
            f'{python_pkg_module} = "."',
        ),
        # Comments referencing the old name — keep accurate for future readers.
        (r"legal_review_agent", python_pkg_module),
        (r"legal-review-agent", python_pkg_dist),
    ],
)

# ─── agent/__init__.py ───────────────────────────────────────────
init_path = target_dir / "agent" / "__init__.py"
if init_path.exists():
    init_path.write_text(
        f"""# Package marker for the {python_pkg_dist} package.
#
# Setuptools exposes this directory as the `{python_pkg_module}` package
# (see pyproject.toml — explicit non-colliding name vs. project-root `agent/`).
# In practice langgraph loads graph.py via a path-based loader (see
# graph.py's sys.path injection workaround).
""",
        encoding="utf-8",
    )

# ─── agent/graph.py ──────────────────────────────────────────────
# Replace the docstring header that names "Contract Review Copilot".
# Leave the rest of the file alone — the hacker will want to rewrite the
# system_prompt with their domain anyway. Don't touch tool imports here;
# we copy tools.py wholesale and let the hacker rename/restructure it.
rewrite_file(
    target_dir / "agent" / "graph.py",
    [
        (
            r"LangGraph entry point for the Contract Review Copilot example\.",
            f"LangGraph entry point for the {display_name} example.",
        ),
    ],
)

# ─── agent/tools.py ──────────────────────────────────────────────
# Rewrite the catalog id + the docstring header. Leave the body alone —
# the hacker is rewriting it anyway, but doing a wholesale substitution
# on the word "contract" or "legal" would corrupt the working code.
rewrite_file(
    target_dir / "agent" / "tools.py",
    [
        (
            r"Tools for the Contract Review Copilot example\.",
            f"Tools for the {display_name} example.",
        ),
        (
            r'CATALOG_ID = "copilotkit://legal-paper-catalog"',
            f'CATALOG_ID = "{catalog_id}"',
        ),
    ],
)

# ─── catalog/index.ts ────────────────────────────────────────────
# Rewrite the catalog id string + the exported binding name. We rename
# legalPaperCatalog → <pascalName>Catalog so the surface compiles with a
# coherent name.
camel_name = pascal_name[:1].lower() + pascal_name[1:]  # RecipeFinder → recipeFinder
catalog_export_name = f"{camel_name}Catalog"
catalog_definitions_name = f"{camel_name}CatalogDefinitions"
catalog_renderers_name = f"{camel_name}CatalogRenderers"
catalog_definitions_type = f"{pascal_name}CatalogDefinitions"

rewrite_file(
    target_dir / "catalog" / "index.ts",
    [
        (r"Legal Paper Catalog", f"{display_name} Catalog"),
        (
            r"Custom A2UI catalog for the legal-contract-review example\.",
            f"Custom A2UI catalog for the {name_kebab} example.",
        ),
        (r"legalPaperCatalogDefinitions", catalog_definitions_name),
        (r"legalPaperCatalogRenderers", catalog_renderers_name),
        (r"legalPaperCatalog", catalog_export_name),
        (r"LegalPaperCatalogDefinitions", catalog_definitions_type),
        (
            r'catalogId: "copilotkit://legal-paper-catalog"',
            f'catalogId: "{catalog_id}"',
        ),
        # `legal-paper-catalog` appears in a comment — rewrite for accuracy.
        (r"copilotkit://legal-paper-catalog", catalog_id),
    ],
)

# ─── catalog/definitions.ts ──────────────────────────────────────
# Same identifier swap. Do NOT touch the component schema bodies — they're
# legal-content-shaped but the hacker rewrites them next.
rewrite_file(
    target_dir / "catalog" / "definitions.ts",
    [
        (r"Legal Paper Catalog", f"{display_name} Catalog"),
        (r"legalPaperCatalogDefinitions", catalog_definitions_name),
        (r"LegalPaperCatalogDefinitions", catalog_definitions_type),
    ],
)

# ─── catalog/renderers.tsx ───────────────────────────────────────
rewrite_file(
    target_dir / "catalog" / "renderers.tsx",
    [
        (r"Legal Paper Catalog", f"{display_name} Catalog"),
        (r"legalPaperCatalogRenderers", catalog_renderers_name),
        (r"LegalPaperCatalogDefinitions", catalog_definitions_type),
    ],
)

# ─── schemas/contract_review.fixture.json ────────────────────────
# Rewrite the catalog id reference inside the fixture. Leave the component
# tree alone — the hacker rewrites it after rewriting the catalog.
fixture_path = target_dir / "schemas" / "contract_review.fixture.json"
if fixture_path.exists():
    fx = json.loads(fixture_path.read_text(encoding="utf-8"))
    if isinstance(fx, dict) and fx.get("catalogId") == "copilotkit://legal-paper-catalog":
        fx["catalogId"] = catalog_id
        fixture_path.write_text(
            json.dumps(fx, indent=2) + "\n", encoding="utf-8"
        )

# ─── Dockerfile ──────────────────────────────────────────────────
# Rewrite path + package name references in the Dockerfile. The host
# repo still owns the canonical Dockerfile; this one is documentation
# that the example is buildable standalone.
rewrite_file(
    target_dir / "Dockerfile",
    [
        (r"legal-contract-review", name_kebab),
        (r"legal_review_agent", python_pkg_module),
        (r"Contract Review Copilot", display_name),
    ],
)
PYEOF

# Helpful colored output, mirroring new-widget.sh.
GREEN='\033[32m'
DIM='\033[2m'
RESET='\033[0m'
BOLD='\033[1m'
YELLOW='\033[33m'
CYAN='\033[36m'

# Derive display-name and snake-case for the shell-side output.
DISPLAY_NAME=$(python3 -c "
import re, sys
parts = re.split(r'[-_]', sys.argv[1])
print(' '.join(p[:1].upper() + p[1:] for p in parts if p))
" "$NAME")
NAME_SNAKE=$(echo "$NAME" | tr '-' '_')
GRAPH_ID="${NAME_SNAKE}_agent"
NAME_KEBAB=$(echo "$NAME" | tr '_' '-')

echo
echo -e "${GREEN}${BOLD}Created other-examples/${NAME_KEBAB}/${RESET} ${DIM}(copied from legal-contract-review/)${RESET}"
echo -e "  ${BOLD}README.md${RESET}              ${DIM}scaffold-shaped — rewrite the prose${RESET}"
echo -e "  ${BOLD}EXAMPLE.json${RESET}           ${DIM}rewritten with id=${NAME_KEBAB}, graphId=${GRAPH_ID}${RESET}"
echo -e "  ${BOLD}Dockerfile${RESET}             ${DIM}path + package references rewritten${RESET}"
echo -e "  ${BOLD}catalog/${RESET}               ${DIM}identifiers renamed; component bodies still legal-shaped${RESET}"
echo -e "  ${BOLD}agent/${RESET}                 ${DIM}package renamed; tool bodies still legal-shaped${RESET}"
echo -e "  ${BOLD}schemas/${RESET}               ${DIM}catalogId rewritten; component tree still legal-shaped${RESET}"
echo
echo -e "${YELLOW}${BOLD}Heads up:${RESET} the scaffolded ${BOLD}catalog/${RESET}, ${BOLD}agent/${RESET}, and ${BOLD}schemas/${RESET}"
echo -e "          content is still LEGAL-DOMAIN content (clauses, redlines, margin notes)."
echo -e "          You MUST rewrite ${BOLD}agent/tools.py${RESET}, ${BOLD}agent/graph.py${RESET}'s system prompt,"
echo -e "          and the Zod schemas in ${BOLD}catalog/definitions.ts${RESET} with your own domain"
echo -e "          before this example demonstrates anything but legal review."
echo
echo -e "${BOLD}Next steps:${RESET}"
echo -e "  ${DIM}1.${RESET} ${CYAN}cd other-examples/${NAME_KEBAB}${RESET}"
echo -e "  ${DIM}2.${RESET} Read ${CYAN}other-examples/legal-contract-review/README.md${RESET} for the canonical pattern"
echo -e "  ${DIM}3.${RESET} Rewrite ${CYAN}catalog/definitions.ts${RESET} + ${CYAN}catalog/renderers.tsx${RESET} for your domain"
echo -e "  ${DIM}4.${RESET} Rewrite ${CYAN}agent/tools.py${RESET} system prompt + tool bodies"
echo -e "  ${DIM}5.${RESET} Replace ${CYAN}agent/data/${RESET} sample documents with your own"
echo -e "  ${DIM}6.${RESET} Update ${CYAN}schemas/*.json${RESET} so component IDs match your new catalog"
echo -e "  ${DIM}7.${RESET} Add the route shim under ${CYAN}src/app/${RESET} (see ${CYAN}other-examples/README.md${RESET} §3)"
echo -e "  ${DIM}8.${RESET} Add an entry to ${CYAN}agent/langgraph.json${RESET} pointing at ${CYAN}other-examples/${NAME_KEBAB}/agent/graph.py:graph${RESET}"
echo -e "  ${DIM}9.${RESET} Update ${CYAN}other-examples/README.md${RESET}'s index table"
echo
echo -e "${BOLD}Verify with:${RESET}"
echo -e "  ${DIM}pnpm validate-widget --examples${RESET}"
echo -e "  ${DIM}pnpm smoke${RESET}"
