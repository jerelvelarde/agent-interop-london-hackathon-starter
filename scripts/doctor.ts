#!/usr/bin/env node
/**
 * pnpm doctor — Preflight environment check.
 *
 * Verifies a hacker's machine has everything needed to boot the starter, with
 * ONE actionable hint per failure. Catches ~80% of "doesn't boot on my machine"
 * issues before they reach a mentor.
 *
 * Each check exits with status code, but we run them all so the hacker sees
 * the full picture in one pass.
 *
 * Exit 0 on all pass, 1 if any check failed.
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import net from "node:net";

type CheckResult = {
  name: string;
  pass: boolean;
  detail: string;
  hint?: string;
};

const REPO_ROOT = join(__dirname, "..");
const checks: CheckResult[] = [];

function add(result: CheckResult) {
  checks.push(result);
}

function tryExec(cmd: string): string | null {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function parseSemverMajor(v: string): number | null {
  const m = v.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function parseSemverMinor(v: string): { major: number; minor: number } | null {
  const m = v.match(/(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: parseInt(m[1], 10), minor: parseInt(m[2], 10) };
}

// ----------------------- pnpm ≥ 9 -----------------------
{
  const out = tryExec("pnpm -v");
  if (!out) {
    add({
      name: "pnpm installed",
      pass: false,
      detail: "pnpm not found on PATH",
      hint: "Install pnpm: https://pnpm.io/installation",
    });
  } else {
    const major = parseSemverMajor(out);
    const ok = major !== null && major >= 9;
    add({
      name: "pnpm ≥ 9",
      pass: ok,
      detail: `pnpm ${out}`,
      hint: ok ? undefined : "Upgrade pnpm: corepack prepare pnpm@latest --activate",
    });
  }
}

// ----------------------- Node ≥ 20 -----------------------
{
  const out = tryExec("node -v");
  if (!out) {
    add({
      name: "Node installed",
      pass: false,
      detail: "node not found on PATH",
      hint: "Install Node 20+: https://nodejs.org",
    });
  } else {
    const major = parseSemverMajor(out.replace(/^v/, ""));
    const ok = major !== null && major >= 20;
    add({
      name: "Node ≥ 20",
      pass: ok,
      detail: `node ${out}`,
      hint: ok ? undefined : "Upgrade Node to 20+: https://nodejs.org",
    });
  }
}

// ----------------------- Python ≥ 3.12 (via uv) -----------------------
// `uv` manages the agent's Python; system python3 may be older than 3.12. We
// check uv first; if uv can find a 3.12+ interpreter, we're good. Fall back
// to plain `python3` if uv missing (will fail one of the next checks).
{
  let pyVer: string | null = null;
  let source = "uv";

  const uvOut = tryExec("uv python find 3.12 2>/dev/null");
  if (uvOut) {
    // Got an interpreter path. Get its version.
    const ver = tryExec(`${uvOut} --version`);
    if (ver) pyVer = ver;
  } else {
    pyVer = tryExec("python3 --version");
    source = "python3";
  }

  if (!pyVer) {
    add({
      name: "Python ≥ 3.12",
      pass: false,
      detail: "No suitable Python found",
      hint: "Install Python 3.12+: `uv python install 3.12` or https://python.org",
    });
  } else {
    const semver = parseSemverMinor(pyVer);
    const ok =
      semver !== null &&
      (semver.major > 3 || (semver.major === 3 && semver.minor >= 12));
    add({
      name: "Python ≥ 3.12",
      pass: ok,
      detail: `${pyVer.trim()} (via ${source})`,
      hint: ok ? undefined : "Install Python 3.12+: `uv python install 3.12`",
    });
  }
}

// ----------------------- uv installed -----------------------
{
  const out = tryExec("uv --version");
  add({
    name: "uv installed",
    pass: !!out,
    detail: out ?? "uv not found on PATH",
    hint: out ? undefined : "Install uv: `curl -LsSf https://astral.sh/uv/install.sh | sh`",
  });
}

// ----------------------- GEMINI_API_KEY set (or OFFLINE=1) -----------------------
{
  const offline = process.env.OFFLINE === "1";
  let gemini = process.env.GEMINI_API_KEY;

  // Also check agent/.env and .env files
  if (!gemini && !offline) {
    for (const envPath of [join(REPO_ROOT, "agent", ".env"), join(REPO_ROOT, ".env")]) {
      if (existsSync(envPath)) {
        const contents = readFileSync(envPath, "utf-8");
        const match = contents.match(/^\s*GEMINI_API_KEY\s*=\s*(.+)\s*$/m);
        if (match && match[1].trim() && match[1].trim() !== '""' && match[1].trim() !== "''") {
          gemini = match[1].trim().replace(/^["']|["']$/g, "");
          break;
        }
      }
    }
  }

  const ok = offline || !!gemini;
  add({
    name: "GEMINI_API_KEY set",
    pass: ok,
    detail: offline
      ? "OFFLINE=1 (key not required)"
      : gemini
        ? "found in env or agent/.env"
        : "not set",
    hint: ok
      ? undefined
      : "Get a free-tier key: https://aistudio.google.com/apikey — set in agent/.env, or run with OFFLINE=1 for the built-in /fixed sample dashboard",
  });
}

// ----------------------- Network: Gemini reachable -----------------------
{
  // curl --head returns quickly even if it doesn't accept GETs; we just want
  // a TCP/TLS handshake. Time out fast — venue Wi-Fi can flake.
  const result = spawnSync(
    "curl",
    [
      "-sS",
      "--head",
      "--max-time",
      "5",
      "-o",
      "/dev/null",
      "-w",
      "%{http_code}",
      "https://generativelanguage.googleapis.com",
    ],
    { encoding: "utf-8" },
  );
  const code = result.stdout?.trim() || "0";
  // Any HTTP response means we reached the host. 0 means no connection.
  const ok = code !== "0" && code !== "";
  add({
    name: "Network → Gemini",
    pass: ok,
    detail: ok ? `reachable (HTTP ${code})` : "unreachable",
    hint: ok
      ? undefined
      : "Check internet connectivity. If on flaky venue Wi-Fi, run with OFFLINE=1 for the built-in /fixed sample dashboard",
  });
}

// ----------------------- Port 3000 free (UI) -----------------------
// ----------------------- Port 8123 free (agent) -----------------------
async function portFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, "127.0.0.1");
  });
}

async function main(): Promise<void> {
  // Port checks (async)
  const port3000 = await portFree(3000);
  add({
    name: "Port 3000 free",
    pass: port3000,
    detail: port3000 ? "free" : "in use",
    hint: port3000
      ? undefined
      : "Another process holds port 3000. Find it: `lsof -i :3000` — kill it or run on another port",
  });

  const port8123 = await portFree(8123);
  add({
    name: "Port 8123 free",
    pass: port8123,
    detail: port8123 ? "free" : "in use",
    hint: port8123
      ? undefined
      : "Another process holds port 8123. Find it: `lsof -i :8123` — kill it",
  });

  // Print results
  let failed = 0;
  const RED = "\x1b[31m";
  const GREEN = "\x1b[32m";
  const DIM = "\x1b[2m";
  const RESET = "\x1b[0m";
  const BOLD = "\x1b[1m";

  console.log(`${BOLD}pnpm doctor${RESET} — preflight environment check\n`);

  for (const check of checks) {
    const icon = check.pass ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    const name = check.pass ? check.name : `${BOLD}${check.name}${RESET}`;
    console.log(`  ${icon} ${name} ${DIM}— ${check.detail}${RESET}`);
    if (!check.pass) {
      failed++;
      if (check.hint) console.log(`    ${DIM}→${RESET} ${check.hint}`);
    }
  }

  console.log();
  if (failed === 0) {
    console.log(`${GREEN}${BOLD}All checks passed.${RESET} Run \`pnpm dev\` to boot the stack.`);
    process.exit(0);
  } else {
    console.log(
      `${RED}${BOLD}${failed} check${failed === 1 ? "" : "s"} failed.${RESET} See hints above.`,
    );
    process.exit(1);
  }
}

void main();
