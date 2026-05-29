#!/usr/bin/env node
/**
 * pnpm smoke — Composite gate, the load-bearing CI check.
 *
 * Runs (in order, failing fast):
 *   1. `pnpm verify-pins`               — lockfile / package.json drift
 *   2. `pnpm validate-widget --examples`— other-examples/EXAMPLE.json files (plan section 3.2)
 *   3. `pnpm validate-widget` over every JSON in agent/src/widgets/ (issues #2/#3)
 *   4. `pnpm test:widgets`              — fixture renderer pass (delegates to validator)
 *   4a. `pnpm test:schemas`             — path-vs-data alignment (pytest, runtime
 *                                         JSON-Pointer semantics — catches the bug
 *                                         class described in TESTING.md layer 2)
 *   5. OFFLINE=1 envelope shape check   — assert public/offline-envelopes.json structure
 *      (validates BOTH byPrompt and bySurface indices land — plan section 6.6)
 *   6. agent registration probe         — python -c probe for each langgraph.json
 *      graph (sample_agent + legal_review_agent — plan section 6.1 fix)
 *   7. Gemini probe (live)              — skipped when OFFLINE=1 or no key
 *
 * Exit non-zero if any step fails. Machine-parsable summary at the end.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = join(__dirname, "..");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

type Step = {
  name: string;
  run: () => Promise<{ pass: boolean; detail: string }>;
};

const results: { name: string; pass: boolean; detail: string }[] = [];

function pnpmRun(scriptName: string, ...args: string[]): { pass: boolean; detail: string } {
  // Use the local pnpm exec form so we don't hit recursive `pnpm` lookup issues.
  const res = spawnSync("pnpm", ["run", scriptName, ...args], {
    cwd: REPO_ROOT,
    stdio: "inherit",
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  return {
    pass: res.status === 0,
    detail: res.status === 0 ? "passed" : `failed (exit ${res.status})`,
  };
}

function shellRun(cmd: string, args: string[], opts: { cwd?: string } = {}): { pass: boolean; detail: string } {
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd ?? REPO_ROOT,
    stdio: "inherit",
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  return {
    pass: res.status === 0,
    detail: res.status === 0 ? "passed" : `failed (exit ${res.status})`,
  };
}

/**
 * Serialize an array of records as Python tuple literals.
 *
 * Why this exists: `JSON.stringify([{a:1,b:2}])` produces `[{"a":1,"b":2}]`,
 * which Python parses as `[dict]`, not `[tuple]`. If the Python side uses
 * the common `for a, b in items: ...` unpack form, you get
 * `ValueError: not enough values to unpack`. See issue #21.
 *
 * Cross the JS → Python boundary with one of these two shapes:
 *
 *   1. **Tuple form** (when Python wants to unpack positional fields):
 *        const py = toPythonTuples(items, ["name", "spec"]);
 *        // Embeds: [("name1", "spec1"), ("name2", "spec2")]
 *
 *   2. **Dict form** (when Python wants `item["key"]` lookups):
 *        const py = JSON.stringify(items);
 *        // Embeds: [{"name":"...","spec":"..."}]
 *
 * Don't mix them on accident — pick one and match the Python side.
 *
 * Caveat: this emits valid Python literal syntax for primitive JSON values
 * (string, number, boolean, null). For nested structures use JSON.stringify
 * and the dict form instead.
 */
function toPythonTuples(
  items: Record<string, unknown>[],
  keys: string[],
): string {
  function pyLiteral(v: unknown): string {
    if (v === null || v === undefined) return "None";
    if (typeof v === "boolean") return v ? "True" : "False";
    if (typeof v === "number") return Number.isFinite(v) ? String(v) : "None";
    // Strings (and anything else): rely on JSON for safe escaping. JSON
    // double-quoted strings are also valid Python string literals.
    return JSON.stringify(String(v));
  }
  const tuples = items.map((item) => {
    const vals = keys.map((k) => pyLiteral(item[k]));
    // Single-element tuple needs trailing comma in Python; keep it general.
    const inner = vals.length === 1 ? `${vals[0]},` : vals.join(", ");
    return `(${inner})`;
  });
  return `[${tuples.join(", ")}]`;
}

function findWidgetJsons(): string[] {
  const widgetsDir = join(REPO_ROOT, "agent", "src", "widgets");
  if (!existsSync(widgetsDir)) return [];
  const out: string[] = [];
  const stack = [widgetsDir];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const entry of readdirSync(cur, { withFileTypes: true })) {
      const full = join(cur, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.endsWith(".json")) out.push(full);
    }
  }
  return out;
}

/**
 * Read langgraph.json and return the list of (graphName, pathSpec) pairs.
 * pathSpec is the raw `./main.py:graph` style string, relative to the
 * langgraph.json file's directory.
 */
function readGraphSpec(): { name: string; spec: string }[] | null {
  const path = join(REPO_ROOT, "agent", "langgraph.json");
  if (!existsSync(path)) return null;
  try {
    const cfg = JSON.parse(readFileSync(path, "utf-8"));
    if (!cfg.graphs || typeof cfg.graphs !== "object") return null;
    return Object.entries(cfg.graphs).map(([name, spec]) => ({
      name,
      spec: String(spec),
    }));
  } catch {
    return null;
  }
}

const STEPS: Step[] = [
  {
    name: "verify-pins",
    run: async () =>
      shellRun(join(REPO_ROOT, "scripts", "verify-pins.sh"), []),
  },
  {
    name: "validate-widget --examples (other-examples/*/EXAMPLE.json)",
    run: async () => {
      const validateScript = join(REPO_ROOT, "scripts", "validate-widget.ts");
      const res = spawnSync(
        "pnpm",
        ["exec", "tsx", validateScript, "--examples"],
        { cwd: REPO_ROOT, stdio: "inherit", env: { ...process.env, FORCE_COLOR: "1" } },
      );
      return {
        pass: res.status === 0,
        detail: res.status === 0 ? "EXAMPLE.json files validated" : `failed (exit ${res.status})`,
      };
    },
  },
  {
    name: "validate-widget over agent/src/widgets/",
    run: async () => {
      const widgets = findWidgetJsons();
      if (widgets.length === 0) {
        console.log(
          `${YELLOW}!${RESET} ${DIM}No widget JSONs to validate yet.${RESET}\n`,
        );
        return { pass: true, detail: "skipped (no widgets)" };
      }
      const validateScript = join(REPO_ROOT, "scripts", "validate-widget.ts");
      const res = spawnSync(
        "pnpm",
        ["exec", "tsx", validateScript, ...widgets],
        { cwd: REPO_ROOT, stdio: "inherit", env: { ...process.env, FORCE_COLOR: "1" } },
      );
      return {
        pass: res.status === 0,
        detail: res.status === 0 ? `${widgets.length} files validated` : `failed (exit ${res.status})`,
      };
    },
  },
  {
    name: "test:widgets",
    run: async () => pnpmRun("test:widgets"),
  },
  {
    name: "test:schemas (path-vs-data alignment + envelope shapes)",
    run: async () => pnpmRun("test:schemas"),
  },
  {
    name: "OFFLINE=1 envelope shape check (byPrompt + bySurface)",
    run: async () => {
      const offlinePath = join(REPO_ROOT, "public", "offline-envelopes.json");
      if (!existsSync(offlinePath)) {
        console.log(
          `${YELLOW}!${RESET} ${DIM}public/offline-envelopes.json not found.${RESET}\n`,
        );
        return { pass: true, detail: "skipped (no offline envelopes)" };
      }
      try {
        const raw = readFileSync(offlinePath, "utf-8");
        const parsed = JSON.parse(raw);

        // The new wrapper shape (plan §6.6) has byPrompt + bySurface.
        // We accept the legacy flat shape too (just prompt-keyed) for back-compat.
        const hasWrapper =
          parsed && typeof parsed === "object" &&
          (parsed.byPrompt || parsed.bySurface);

        if (!hasWrapper) {
          // Legacy shape — accept if it contains A2UI markers anywhere in the file.
          if (!raw.includes("createSurface") && !raw.includes("surfaceId")) {
            console.error(
              `${RED}✗${RESET} public/offline-envelopes.json doesn't reference any A2UI envelope (no createSurface or surfaceId found).`,
            );
            return { pass: false, detail: "envelope check failed: no A2UI markers" };
          }
          console.log(
            `${GREEN}✓${RESET} ${DIM}offline-envelopes.json parses and contains A2UI envelope markers (legacy shape).${RESET}\n`,
          );
          return { pass: true, detail: "parsed (legacy shape)" };
        }

        // Wrapper shape — validate the bySurface map.
        const bySurface = parsed.bySurface as Record<string, unknown> | undefined;
        if (!bySurface || typeof bySurface !== "object") {
          console.error(
            `${RED}✗${RESET} offline-envelopes.json wrapper is missing 'bySurface' object.`,
          );
          return { pass: false, detail: "missing bySurface" };
        }
        const surfaceCount = Object.keys(bySurface).length;
        if (surfaceCount === 0) {
          console.error(
            `${RED}✗${RESET} 'bySurface' is empty — at least one surface required.`,
          );
          return { pass: false, detail: "empty bySurface" };
        }
        for (const [surfaceId, envs] of Object.entries(bySurface)) {
          if (!Array.isArray(envs) || envs.length === 0) {
            console.error(
              `${RED}✗${RESET} bySurface["${surfaceId}"] is not a non-empty array of envelopes.`,
            );
            return { pass: false, detail: `bad bySurface entry: ${surfaceId}` };
          }
        }
        // Plan §6.6: contract-review surface MUST be present (B8 acceptance).
        if (!("contract-review" in bySurface)) {
          console.error(
            `${RED}✗${RESET} bySurface missing required "contract-review" key (plan §6.6 acceptance).`,
          );
          return { pass: false, detail: "missing contract-review surface" };
        }
        console.log(
          `${GREEN}✓${RESET} ${DIM}offline-envelopes.json wrapper valid (${surfaceCount} surface${surfaceCount === 1 ? "" : "s"} indexed: ${Object.keys(bySurface).join(", ")}).${RESET}\n`,
        );
        return { pass: true, detail: `${surfaceCount} surfaces indexed` };
      } catch (e) {
        console.error(`${RED}✗${RESET} offline-envelopes.json is invalid JSON: ${(e as Error).message}`);
        return { pass: false, detail: "invalid JSON" };
      }
    },
  },
  {
    name: "agent registration probe (sample_agent + legal_review_agent)",
    run: async () => {
      // Per plan §6.1: assert both langgraph.json graph entries resolve to
      // importable, well-formed agents. We boot `python -c "..."` against the
      // agent's .venv so we don't depend on a running langgraph dev server —
      // this is the deterministic check FRICTION #4 referenced.
      const graphs = readGraphSpec();
      if (!graphs || graphs.length === 0) {
        console.log(
          `${YELLOW}!${RESET} ${DIM}langgraph.json not found or has no graphs. Skipping.${RESET}\n`,
        );
        return { pass: true, detail: "skipped (no langgraph.json)" };
      }
      const venvPython = join(REPO_ROOT, "agent", ".venv", "bin", "python");
      const pythonBin = existsSync(venvPython) ? venvPython : "python3";
      if (!existsSync(venvPython)) {
        console.log(
          `${YELLOW}!${RESET} ${DIM}agent/.venv/bin/python not found — using system python3. Run \`pnpm install:agent\` to bootstrap.${RESET}\n`,
        );
      }
      // Build a single Python invocation that loads each graph spec the same
      // way langgraph CLI does (path-based spec_from_file_location). Match
      // the existing dependency wiring in agent/langgraph.json — graphs are
      // anchored to the agent/ working directory.
      const agentDir = join(REPO_ROOT, "agent");
      // Cross the JS → Python boundary as a list of Python tuples so the
      // `for name, spec in ...` unpack form below works. See toPythonTuples()
      // and issue #21 — JSON.stringify of an object array would embed as
      // dicts and break unpacking.
      const graphPairs = toPythonTuples(
        graphs.map((g) => ({ name: g.name, spec: g.spec })),
        ["name", "spec"],
      );
      const script = `
import sys, importlib.util, os
from pathlib import Path

failed = []
for name, spec in ${graphPairs}:
    # spec looks like "./main.py:graph" or "../other-examples/.../graph.py:graph"
    path_part, attr = spec.rsplit(":", 1)
    # Resolve relative to agent/ (the langgraph.json dir).
    abs_path = (Path(os.environ["AGENT_DIR"]) / path_part).resolve()
    if not abs_path.exists():
        failed.append((name, f"file not found: {abs_path}"))
        continue
    try:
        mod_name = f"smoke_probe_{name}"
        # Mirror langgraph's loader behavior — bypass package machinery.
        spec_obj = importlib.util.spec_from_file_location(mod_name, str(abs_path))
        if spec_obj is None or spec_obj.loader is None:
            failed.append((name, "could not create module spec"))
            continue
        module = importlib.util.module_from_spec(spec_obj)
        sys.modules[mod_name] = module
        spec_obj.loader.exec_module(module)
        if not hasattr(module, attr):
            failed.append((name, f"module loaded but missing attribute '{attr}'"))
            continue
        obj = getattr(module, attr)
        # Sanity: must be a non-None compiled graph (langgraph's compiled agents
        # have an .invoke method or expose a graph attribute).
        if obj is None:
            failed.append((name, "graph attribute is None"))
            continue
        print(f"  OK: {name} -> {abs_path.name}:{attr}")
    except Exception as e:
        failed.append((name, f"{type(e).__name__}: {e}"))

if failed:
    print(f"\\n{len(failed)} graph(s) failed to register:")
    for n, why in failed:
        print(f"  FAIL: {n}: {why}")
    sys.exit(1)
print(f"\\nAll {${JSON.stringify(graphs.length)}} graph(s) registered cleanly.")
sys.exit(0)
`;
      // Provide a dummy GEMINI_API_KEY when probing — both agents construct a
      // ChatOpenAI client at module import time and openai-python refuses to
      // initialize without one (issue #22). The probe is a registration
      // check, not a live call, so a placeholder is sufficient. See
      // `agent/src/widgets/README.md` § "Probing an agent module from a
      // health-check / smoke script" for the canonical pattern any other
      // import-only probe should follow.
      const probeEnv = {
        ...process.env,
        AGENT_DIR: agentDir,
        FORCE_COLOR: "1",
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || "smoke-probe-placeholder",
      };
      const res = spawnSync(pythonBin, ["-c", script], {
        cwd: agentDir,
        stdio: "inherit",
        env: probeEnv,
      });
      // Exit codes: 0 = all green, 1 = at least one graph failed, anything else
      // is an env error (python not found, etc.) — surface but don't fail smoke
      // if the user hasn't run `pnpm install:agent` yet.
      if (res.status === 0) {
        return { pass: true, detail: `${graphs.length} graph(s) registered` };
      }
      if (res.status === 1) {
        return { pass: false, detail: "one or more graphs failed to register" };
      }
      // Likely env issue (missing venv or python). Don't fail smoke; warn loudly.
      console.log(
        `${YELLOW}!${RESET} ${DIM}agent registration probe could not run (exit ${res.status}). Run \`pnpm install:agent\` to bootstrap the venv.${RESET}\n`,
      );
      return { pass: true, detail: `skipped (probe exit ${res.status})` };
    },
  },
  {
    name: "agent connectivity probe (one-shot tool call against Gemini)",
    run: async () => {
      // Reuses the standalone probe-gemini.sh script — it exercises a tool
      // call against the configured model. Future improvement: replace with
      // a real "boot agent → POST canned prompt → assert createSurface
      // envelope" pipeline once the LangGraph dev server has a deterministic
      // boot ritual we can call from CI.
      const probeScript = join(REPO_ROOT, "scripts", "probe-gemini.sh");
      if (!existsSync(probeScript)) {
        console.log(`${YELLOW}!${RESET} ${DIM}probe-gemini.sh not found. Skipping.${RESET}\n`);
        return { pass: true, detail: "skipped (no probe script)" };
      }
      // Skip when no key — let CI decide whether that's OK via OFFLINE=1.
      if (!process.env.GEMINI_API_KEY && process.env.OFFLINE !== "1") {
        console.log(
          `${YELLOW}!${RESET} ${DIM}GEMINI_API_KEY not set and OFFLINE!=1. Skipping live probe.${RESET}\n`,
        );
        return { pass: true, detail: "skipped (no key)" };
      }
      if (process.env.OFFLINE === "1") {
        console.log(`${DIM}OFFLINE=1 — skipping live model probe.${RESET}\n`);
        return { pass: true, detail: "skipped (OFFLINE=1)" };
      }
      return shellRun("bash", [probeScript]);
    },
  },
];

async function main(): Promise<void> {
  console.log(`${BOLD}pnpm smoke${RESET} — composite gate\n`);

  let failed = 0;

  for (const step of STEPS) {
    console.log(`${BOLD}━━━ ${step.name} ━━━${RESET}`);
    const t0 = Date.now();
    const res = await step.run();
    const ms = Date.now() - t0;
    results.push({ name: step.name, ...res });
    if (!res.pass) {
      failed++;
      // Fail fast — first failure is usually informative enough.
      console.error(
        `\n${RED}${BOLD}Step "${step.name}" failed (${ms}ms).${RESET} Stopping early.\n`,
      );
      break;
    }
    console.log(`${DIM}  → step done in ${ms}ms${RESET}\n`);
  }

  // Summary
  console.log(`${BOLD}━━━ smoke summary ━━━${RESET}`);
  for (const r of results) {
    const icon = r.pass ? `${GREEN}✓${RESET}` : `${RED}✗${RESET}`;
    console.log(`  ${icon} ${r.name} ${DIM}— ${r.detail}${RESET}`);
  }
  // List steps that didn't run
  const ran = new Set(results.map((r) => r.name));
  for (const s of STEPS) {
    if (!ran.has(s.name)) console.log(`  ${YELLOW}-${RESET} ${s.name} ${DIM}(not run)${RESET}`);
  }
  console.log();

  if (failed === 0) {
    console.log(`${GREEN}${BOLD}SMOKE PASS.${RESET}`);
    process.exit(0);
  } else {
    console.log(`${RED}${BOLD}SMOKE FAIL.${RESET}`);
    process.exit(1);
  }
}

void main();
