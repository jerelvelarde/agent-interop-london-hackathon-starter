#!/usr/bin/env node
/**
 * pnpm explain <topic> — Print the right HACKATHON.md section to the terminal.
 *
 * Topics map to HACKATHON.md headings:
 *   themes   → Seam #1 (Re-theme)
 *   branding → Seam #2 (Re-brand the shell)
 *   data     → Seam #3 (Swap demo data)
 *   widgets  → Seam #4 (Add an A2UI widget)
 *   domain   → Seam #5 (Switch domain)
 *   a2a      → Seam #6 (BYO A2A agent)
 *
 * If HACKATHON.md doesn't exist yet (Workstream C in flight), prints a friendly
 * message + the topic-to-section mapping so the hacker still gets a pointer.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(__dirname, "..");
const HACKATHON_MD = join(REPO_ROOT, "HACKATHON.md");

const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";

const TOPIC_TO_SEAM: Record<string, { seam: number; title: string; summary: string }> = {
  themes: {
    seam: 1,
    title: "Re-theme",
    summary:
      "Edit src/lib/a2ui-theme.css and any theme tokens. Tailwind tokens + CSS variables drive the look.",
  },
  branding: {
    seam: 2,
    title: "Re-brand the shell",
    summary:
      "Edit src/components/BrandFrame.tsx (header, logo, palette accents). Keeps the layout intact.",
  },
  data: {
    seam: 3,
    title: "Swap demo data",
    summary:
      "Edit agent/src/query.py — or agent/src/domains/<active>/data/ if you've switched domains.",
  },
  widgets: {
    seam: 4,
    title: "Add an A2UI widget",
    summary:
      "Copy agent/src/a2ui_fixed_schema.py:search_flights as the template. Five surfaces to touch — see HACKATHON.md §4 or `.claude/skills/create-a2ui-widget`.",
  },
  domain: {
    seam: 5,
    title: "Switch domain",
    summary:
      "Set DOMAIN=<name> in .env. Canonical stub at agent/src/domains/shopping/.",
  },
  a2a: {
    seam: 6,
    title: "BYO A2A agent",
    summary:
      "Run `pnpm check-a2a <url>` FIRST. Then set A2A_AGENT_URL in .env. The middleware activates only if the URL is set.",
  },
};

const TOPIC_ALIASES: Record<string, string> = {
  theme: "themes",
  styling: "themes",
  css: "themes",
  brand: "branding",
  header: "branding",
  logo: "branding",
  shell: "branding",
  "demo-data": "data",
  query: "data",
  widget: "widgets",
  "a2ui-widget": "widgets",
  card: "widgets",
  "fixed-schema": "widgets",
  "dynamic-schema": "widgets",
  domains: "domain",
  "switch-domain": "domain",
  shopping: "domain",
  "a2a-agent": "a2a",
  interop: "a2a",
};

function printMapping(): void {
  console.log(`${BOLD}Topics:${RESET}`);
  for (const [key, info] of Object.entries(TOPIC_TO_SEAM)) {
    console.log(`  ${CYAN}${key.padEnd(10)}${RESET} → Seam #${info.seam}: ${info.title}`);
    console.log(`    ${DIM}${info.summary}${RESET}`);
  }
}

/**
 * Extract a section from HACKATHON.md given a seam-number heading marker.
 * We grab from the matching heading through the next heading at the same or
 * higher level (or EOF).
 *
 * Matches BOTH heading conventions so the script keeps working regardless
 * of which convention any future edit lands on:
 *   - "## Seam #4 — Add a widget"   (legacy)
 *   - "## §4 — Add an A2UI widget"  (current HACKATHON.md format)
 */
function extractSeamSection(md: string, seamNumber: number): string | null {
  const lines = md.split("\n");
  // Match a heading line that contains either "Seam #N" or "§N" with the
  // matching seam number. Both forms appear in the wild (issue: F6).
  const startRegex = new RegExp(
    `^(#+)\\s+.*(?:Seam\\s*#?${seamNumber}\\b|§\\s*${seamNumber}\\b)`,
    "i",
  );
  let startIdx = -1;
  let startLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(startRegex);
    if (m) {
      startIdx = i;
      startLevel = m[1].length;
      break;
    }
  }
  if (startIdx === -1) return null;

  // Find end: next heading at <= startLevel
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = lines[i].match(/^(#+)\s/);
    if (m && m[1].length <= startLevel) {
      endIdx = i;
      break;
    }
  }

  return lines.slice(startIdx, endIdx).join("\n").trim();
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`${BOLD}pnpm explain <topic>${RESET}\n`);
    printMapping();
    process.exit(0);
  }

  let topicArg = args[0].toLowerCase();
  if (TOPIC_ALIASES[topicArg]) topicArg = TOPIC_ALIASES[topicArg];

  const info = TOPIC_TO_SEAM[topicArg];
  if (!info) {
    console.error(`${YELLOW}Unknown topic:${RESET} ${args[0]}\n`);
    printMapping();
    process.exit(1);
  }

  console.log(`${BOLD}${CYAN}Seam #${info.seam} — ${info.title}${RESET}\n`);
  console.log(`${info.summary}\n`);

  if (!existsSync(HACKATHON_MD)) {
    console.log(
      `${YELLOW}HACKATHON.md doesn't exist yet${RESET} (Workstream C is still in flight).`,
    );
    console.log(`${DIM}Once HACKATHON.md lands, this script will print the full Seam #${info.seam} section.${RESET}\n`);
    console.log(`${DIM}All seams:${RESET}\n`);
    printMapping();
    process.exit(0);
  }

  const md = readFileSync(HACKATHON_MD, "utf-8");
  const section = extractSeamSection(md, info.seam);
  if (!section) {
    // The summary blurb already printed above is useful on its own. A failed
    // heading lookup is a soft miss, not a hard failure — exit 0 so callers
    // (and `pnpm explain` users) see green.
    console.log(
      `${YELLOW}Note:${RESET} ${DIM}couldn't find a HACKATHON.md heading matching seam #${info.seam} (looked for "Seam #${info.seam}" and "§${info.seam}"). The summary above still applies.${RESET}`,
    );
    console.log(
      `${DIM}Run \`grep -ni "§\\|seam" HACKATHON.md\` to see the actual headings.${RESET}`,
    );
    process.exit(0);
  }

  console.log(section);
  process.exit(0);
}

main();
