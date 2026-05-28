#!/usr/bin/env node
/**
 * pnpm new-example <name> — Scaffold a new sub-repo example under
 * `other-examples/<name>/`.
 *
 * Why this exists:
 *   Issue #7 — hackers (and AI agents) trying to add a second example beyond
 *   `legal-contract-review/` had no template or generator. They had to
 *   hand-author every file from the plan's prose layout. This script produces
 *   a thin scaffold that points at the canonical example as the pattern to copy.
 *
 * Usage:
 *   pnpm new-example my-example      # kebab-case name
 *
 * What it creates:
 *   other-examples/<name>/
 *     README.md         # Pointers to setup + the canonical legal-contract-review
 *     EXAMPLE.json      # Manifest read by the gallery (see other-examples/README.md §3.2)
 *     catalog/          # Stub for Zod schemas + React renderers (the "second catalog")
 *       index.ts
 *     agent/            # Stub for the LangGraph Python package
 *       README.md
 *
 * The intent is NOT a full working example out of the box. The hacker should
 * `cp -r other-examples/legal-contract-review/* other-examples/<name>/` to fill
 * in the real content. This scaffold is just enough structure to anchor the
 * next set of edits and avoid the "what files do I need" panic.
 *
 * The canonical example is `other-examples/legal-contract-review/` — read its
 * README.md, EXAMPLE.json, catalog/index.ts, and agent/graph.py before
 * customizing the scaffold.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "..");
const OTHER_EXAMPLES = join(REPO_ROOT, "other-examples");
const CANONICAL = "legal-contract-review";

const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function usage(extra?: string): never {
  if (extra) console.error(`${RED}${extra}${RESET}\n`);
  console.error(`${BOLD}Usage:${RESET} pnpm new-example <name>\n`);
  console.error(`  ${DIM}<name>${RESET} — kebab-case folder name, e.g. ${CYAN}recipe-card${RESET}, ${CYAN}terminal-kiosk${RESET}\n`);
  console.error(`${BOLD}Canonical example to copy after scaffolding:${RESET}`);
  console.error(`  ${CYAN}other-examples/${CANONICAL}/${RESET}\n`);
  process.exit(extra ? 1 : 0);
}

function readme(name: string): string {
  return `# ${name}

> **Heads up — read this first.**
>
> Most widget work belongs in the \`create-a2ui-widget\` skill (single catalog,
> pure-data widgets in the dashboard). This example goes one layer deeper —
> a *second* registered catalog with net-new visual primitives or a different
> reading experience. If you just want to add a widget to the dashboard, use
> the skill. If you want a new visual identity, this is the pattern.

This is a scaffold. Fill it in by reading the canonical example:

\`\`\`
other-examples/${CANONICAL}/
\`\`\`

That example is content-complete (paper-styled contract review with margin
notes + redlines). Copy its shape into this folder and swap the domain.

---

## Setup

\`\`\`bash
pnpm dev
\`\`\`

Then open http://localhost:3000/other-examples/${name} once you've added the
route shim under \`src/app/\`.

---

## What you'll see

Describe the demo here — the reading experience, the agent loop, the visual
identity, the wow moment.

---

## Files

| Path | Purpose |
|------|---------|
| \`EXAMPLE.json\` | Gallery manifest. See \`other-examples/README.md\` for the schema. |
| \`catalog/\` | Zod schemas + React renderers for this example's second catalog. |
| \`agent/\` | LangGraph Python package — graph, tools, sample data. |

---

## Next steps

1. Read \`other-examples/${CANONICAL}/README.md\` end-to-end.
2. \`cp -r other-examples/${CANONICAL}/catalog/* other-examples/${name}/catalog/\`
   and rename / re-theme.
3. \`cp -r other-examples/${CANONICAL}/agent/* other-examples/${name}/agent/\`
   and swap the tools + sample data.
4. Update \`EXAMPLE.json\` with this example's id, name, description,
   \`catalogId\`, \`graphId\`, and \`agentName\`.
5. Add a route shim under \`src/app/\` per \`other-examples/README.md\` §3.
6. Run \`pnpm validate-widget\` on every fixture you add, then \`pnpm smoke\`
   before declaring done.
`;
}

function exampleJson(name: string): string {
  const obj = {
    id: name,
    name: name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: `TODO: one-sentence summary of the ${name} example.`,
    route: `/other-examples/${name}`,
    graphId: `${name.replace(/-/g, "_")}_agent`,
    agentName: name.replace(/-/g, "_"),
    catalogId: `copilotkit://${name}-catalog`,
    screenshot: "screenshot.png",
    tags: ["TODO"],
    status: "scaffold",
  };
  return JSON.stringify(obj, null, 2) + "\n";
}

function catalogIndex(name: string): string {
  return `/**
 * ${name} catalog — public entry point. Scaffold.
 *
 * Fill this in by mirroring \`other-examples/${CANONICAL}/catalog/index.ts\`.
 * That file wires its catalog definitions (schemas) to its React renderers
 * via \`createCatalog\`. The string id below is what the agent references
 * when it emits an envelope that should render against this catalog.
 *
 * TODO:
 *   1. Add \`definitions.ts\` with the component schemas (Zod).
 *   2. Add \`renderers.tsx\` mapping each schema to a React component.
 *   3. Uncomment the export below and wire definitions + renderers.
 */

// import { createCatalog } from "@copilotkit/a2ui-renderer";
// import { ${camel(name)}CatalogDefinitions } from "./definitions";
// import { ${camel(name)}CatalogRenderers } from "./renderers";

// export const ${camel(name)}Catalog = createCatalog(
//   ${camel(name)}CatalogDefinitions,
//   ${camel(name)}CatalogRenderers,
//   { catalogId: "copilotkit://${name}-catalog" },
// );

export {};
`;
}

function camel(name: string): string {
  return name.replace(/-(\w)/g, (_, c) => c.toUpperCase());
}

function agentReadme(name: string): string {
  return `# ${name} — agent

LangGraph Python package for the ${name} example. Scaffold.

To fill in, mirror \`other-examples/${CANONICAL}/agent/\`:

- \`pyproject.toml\` — Python package metadata (required by \`langgraph build\`)
- \`__init__.py\` — package marker
- \`graph.py\` — LangGraph state graph + entry node
- \`tools.py\` — agent tools that emit A2UI envelopes
- \`data/\` — sample data the agent reads from

Wire the agent into the runtime by adding an entry to \`langgraph.json\`
(under the repo root) pointing at this package's graph object.
`;
}

function write(path: string, content: string): void {
  writeFileSync(path, content);
  console.log(`  ${GREEN}+${RESET} ${DIM}${path.replace(REPO_ROOT + "/", "")}${RESET}`);
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) usage();

  const name = args[0];
  if (!KEBAB.test(name)) {
    usage(`Name must be kebab-case (lowercase, hyphens). Got: ${name}`);
  }

  const target = join(OTHER_EXAMPLES, name);
  if (existsSync(target)) {
    console.error(`${RED}Target already exists:${RESET} ${target}`);
    console.error(`${DIM}Pick a different name, or rm -rf the existing folder first.${RESET}`);
    process.exit(1);
  }

  if (!existsSync(OTHER_EXAMPLES)) {
    console.error(`${RED}other-examples/ not found at${RESET} ${OTHER_EXAMPLES}`);
    console.error(`${DIM}This script must be run from the repo root via pnpm.${RESET}`);
    process.exit(1);
  }

  console.log(`${BOLD}Scaffolding${RESET} ${CYAN}other-examples/${name}/${RESET}\n`);

  mkdirSync(target);
  mkdirSync(join(target, "catalog"));
  mkdirSync(join(target, "agent"));

  write(join(target, "README.md"), readme(name));
  write(join(target, "EXAMPLE.json"), exampleJson(name));
  write(join(target, "catalog", "index.ts"), catalogIndex(name));
  write(join(target, "agent", "README.md"), agentReadme(name));

  console.log(`\n${BOLD}${GREEN}Done.${RESET}`);
  console.log();
  console.log(`${BOLD}Next steps:${RESET}`);
  console.log(`  1. ${CYAN}cd other-examples/${name}${RESET}`);
  console.log(`  2. Read ${CYAN}other-examples/${CANONICAL}/README.md${RESET} for the canonical pattern.`);
  console.log(`  3. Copy the catalog and agent files from ${CYAN}${CANONICAL}/${RESET} and swap the content.`);
  console.log(`  4. Add the route shim under ${CYAN}src/app/${RESET} (see other-examples/README.md §3).`);
  console.log(`  5. Update ${CYAN}other-examples/README.md${RESET} index table with the new entry.`);
  console.log(`  6. ${YELLOW}pnpm validate-widget${RESET} any fixtures, then ${YELLOW}pnpm smoke${RESET}.`);
}

main();
