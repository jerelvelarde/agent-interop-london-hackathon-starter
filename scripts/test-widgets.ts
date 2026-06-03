#!/usr/bin/env node
/**
 * pnpm test:widgets — Run the validator (a proxy for the renderer at this
 * stage of the starter) against every *.fixture.json in the repo's widget /
 * schema directories.
 *
 * pdf-analyst default swap: the former root PortKit fixtures at
 * `agent/src/widgets/` were archived to other-examples/portkit/. The
 * pdf-analyst default ships its catalog in TypeScript (src/a2ui/catalog/)
 * and keeps its in-repo example fixtures under the example's own schemas
 * dir. This script scans every WIDGET_DIR below and validates whatever
 * `*.fixture.json` it finds. If a dir is absent, it's silently skipped.
 *
 * If no fixtures exist anywhere, exit 0 with a friendly message. CI calls
 * this from `pnpm smoke`, so it must be non-destructive in the
 * no-fixtures state.
 *
 * Note: a "real" renderer test would mount each fixture in the @copilotkit/
 * a2ui-renderer and assert no React errors. That requires a JSDOM/Playwright
 * harness that's bigger than the script-suite scope. We ship the validator
 * pass here and leave the harness as a follow-up.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = join(__dirname, "..");

// Directories that may hold canonical *.fixture.json files in the
// pdf-analyst layout. Order is informational only. Missing dirs are skipped.
const WIDGET_DIRS = [
  // Root agent schemas (pdf-analyst). Bare catalog schemas live here today;
  // any *.fixture.json a hacker drops alongside them gets picked up too.
  join(REPO_ROOT, "agent", "src", "a2ui", "schemas"),
  // In-repo legal-contract-review example fixtures (canonical fixture shape).
  join(REPO_ROOT, "other-examples", "legal-contract-review", "schemas"),
];
const VALIDATE_SCRIPT = join(__dirname, "validate-widget.ts");

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

function findFixtures(dir: string): string[] {
  if (!existsSync(dir)) return [];
  if (!statSync(dir).isDirectory()) return [];
  const out: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const entry of readdirSync(cur, { withFileTypes: true })) {
      const full = join(cur, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.endsWith(".fixture.json")) out.push(full);
    }
  }
  return out;
}

function main(): void {
  console.log(`${BOLD}pnpm test:widgets${RESET} — fixture validation pass\n`);

  const presentDirs = WIDGET_DIRS.filter(
    (d) => existsSync(d) && statSync(d).isDirectory(),
  );
  if (presentDirs.length === 0) {
    console.log(
      `${YELLOW}!${RESET} ${DIM}None of the known widget/schema dirs exist:${RESET}`,
    );
    for (const d of WIDGET_DIRS) console.log(`  ${DIM}${d}${RESET}`);
    console.log(`${DIM}Exiting 0; no root widget fixtures to validate.${RESET}`);
    process.exit(0);
  }

  const fixtures = presentDirs.flatMap((d) => findFixtures(d));
  if (fixtures.length === 0) {
    console.log(
      `${YELLOW}!${RESET} ${DIM}No *.fixture.json files found under:${RESET}`,
    );
    for (const d of presentDirs) console.log(`  ${DIM}${d}${RESET}`);
    console.log(`${DIM}Run \`pnpm new-widget <name>\` to scaffold one, then re-run.${RESET}`);
    process.exit(0);
  }

  console.log(`${DIM}Found ${fixtures.length} fixture(s):${RESET}`);
  for (const f of fixtures) console.log(`  ${DIM}${f}${RESET}`);
  console.log();

  // Delegate to validate-widget — it's the closest thing to a renderer pass
  // we have until the full Playwright harness lands. We exec tsx via pnpm so
  // we pick up the locally-installed tsx (or the dlx cache if not yet linked).
  const result = spawnSync(
    "pnpm",
    ["exec", "tsx", VALIDATE_SCRIPT, ...fixtures],
    { stdio: "inherit", cwd: REPO_ROOT },
  );

  if (result.status === 0) {
    console.log(`\n${GREEN}${BOLD}All fixtures validated.${RESET}`);
    process.exit(0);
  } else {
    console.error(`\n${RED}${BOLD}One or more fixtures failed.${RESET}`);
    process.exit(result.status ?? 1);
  }
}

main();
