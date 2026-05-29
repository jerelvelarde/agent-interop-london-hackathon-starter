/**
 * A2UI v0.9 envelope-shape compliance checker.
 *
 * Usage:
 *     pnpm check-a2a <url>
 *
 * Hits the given A2A endpoint, exercises a basic agent-run, parses the
 * response (JSON-RPC or SSE), and reports whether the agent emitted
 * recognizable A2UI v0.9 envelopes. Output follows the "validators that
 * teach" pattern — point at the canonical example
 * (agent/src/a2ui_fixed_schema.py:search_flights) for fixes and link
 * to the v0.9 spec.
 *
 * Spec reference: https://a2ui.org/specification/v0.9-a2ui/
 * Canonical envelope-emitting example: agent/src/a2ui_fixed_schema.py
 */

const CANONICAL_EXAMPLE_PATH =
  "agent/src/a2ui_fixed_schema.py:search_flights";
const V09_SPEC_URL = "https://a2ui.org/specification/v0.9-a2ui/";

// Recognized A2UI v0.9 envelope kinds.
type EnvelopeKind = "createSurface" | "updateComponents" | "updateDataModel";
const KNOWN_KINDS: EnvelopeKind[] = [
  "createSurface",
  "updateComponents",
  "updateDataModel",
];

interface RawEnvelope {
  version?: unknown;
  kind?: unknown;
  surfaceId?: unknown;
  catalogId?: unknown;
  components?: unknown;
  data?: unknown;
  [key: string]: unknown;
}

interface ValidationIssue {
  envelopeIndex: number;
  kind: string;
  field: string;
  reason: string;
}

interface CheckResult {
  reachable: boolean;
  agentCardOk: boolean;
  rpcOk: boolean;
  envelopesFound: number;
  envelopesValid: number;
  issues: ValidationIssue[];
  reason?: string; // Top-level reason for failure (network / agent card / rpc).
}

// ─── Teaching output helpers ───────────────────────────────────

const c = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

function printSuccess(url: string, result: CheckResult) {
  console.log(c.green("\n  ✓ A2A endpoint is A2UI v0.9 compliant"));
  console.log(`    URL:               ${url}`);
  console.log(`    Envelopes found:   ${result.envelopesFound}`);
  console.log(`    Envelopes valid:   ${result.envelopesValid}`);
  console.log();
  console.log(c.dim("    Activate the bolt-on:"));
  console.log(c.dim(`      export A2A_AGENT_URL=${url}`));
  console.log(c.dim("      pnpm dev"));
  console.log();
}

function printFailure(url: string, result: CheckResult) {
  console.log(c.red("\n  ✗ A2A endpoint is NOT yet A2UI v0.9 compliant"));
  console.log(`    URL:               ${url}`);

  if (result.reason) {
    console.log(c.yellow(`    Reason:            ${result.reason}`));
  }
  if (result.envelopesFound > 0) {
    console.log(`    Envelopes found:   ${result.envelopesFound}`);
    console.log(`    Envelopes valid:   ${result.envelopesValid}`);
  }

  if (result.issues.length > 0) {
    console.log();
    console.log(c.bold("  Issues:"));
    for (const issue of result.issues) {
      console.log(
        c.yellow(
          `    • envelope[${issue.envelopeIndex}] (kind=${issue.kind}): ${issue.field} — ${issue.reason}`,
        ),
      );
    }
  }

  console.log();
  console.log(c.bold("  How to fix:"));
  console.log(`    Canonical example: ${c.cyan(CANONICAL_EXAMPLE_PATH)}`);
  console.log(`    Spec:              ${c.cyan(V09_SPEC_URL)}`);
  console.log();
  console.log(c.dim("    Every envelope must include:"));
  console.log(c.dim('      version:   "v0.9"'));
  console.log(c.dim("      kind:      createSurface | updateComponents | updateDataModel"));
  console.log(c.dim("      surfaceId: string identifying the rendered surface"));
  console.log();
  console.log(c.dim("    Per-kind additional requirements:"));
  console.log(c.dim("      createSurface:    catalogId (string)"));
  console.log(c.dim("      updateComponents: components (array)"));
  console.log(c.dim("      updateDataModel:  data (object)"));
  console.log();
}

function printUnreachable(url: string, errorMessage: string) {
  console.log(c.red("\n  ✗ Could not reach A2A endpoint"));
  console.log(`    URL:   ${url}`);
  console.log(`    Error: ${errorMessage}`);
  console.log();
  console.log(c.bold("  Quick triage:"));
  console.log(`    1. Boot the agent:   ${c.cyan("uv run python main.py")}`);
  console.log(`       (from the agent's directory, e.g. a2a/sample-subagent/)`);
  console.log();
  console.log(`    2. Probe by hand:    ${c.cyan(`curl ${url}/.well-known/agent.json`)}`);
  console.log(`       (should return a JSON AgentCard with a 'url' field)`);
  console.log();
  console.log(`    3. Try the toy:      ${c.cyan("pnpm check-a2a http://localhost:8124")}`);
  console.log(`       (after starting the bundled sample subagent)`);
  console.log();
}

// ─── A2A wire helpers ──────────────────────────────────────────

interface AgentCard {
  name?: string;
  url?: string;
  capabilities?: { streaming?: boolean };
}

async function fetchAgentCard(
  baseUrl: string,
): Promise<{ ok: true; card: AgentCard } | { ok: false; reason: string }> {
  // Try both .well-known paths — older a2a-sdk versions use agent.json,
  // newer ones use agent-card.json.
  const candidatePaths = [".well-known/agent.json", ".well-known/agent-card.json"];
  const errors: string[] = [];
  for (const path of candidatePaths) {
    const url = `${baseUrl.replace(/\/$/, "")}/${path}`;
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const card = (await res.json()) as AgentCard;
        return { ok: true, card };
      }
      errors.push(`${path} → HTTP ${res.status}`);
    } catch (err) {
      errors.push(`${path} → ${(err as Error).message}`);
    }
  }
  return {
    ok: false,
    reason: `agent card not found at any well-known path (${errors.join("; ")})`,
  };
}

interface RpcResult {
  ok: boolean;
  reason?: string;
  // Concatenated text content extracted from the response, JSON-RPC or SSE.
  text: string;
}

async function postRpcSend(endpoint: string): Promise<RpcResult> {
  const requestBody = {
    jsonrpc: "2.0",
    method: "message/send",
    id: 1,
    params: {
      message: {
        kind: "message",
        messageId: `check-a2a-${Date.now()}`,
        role: "user",
        parts: [
          {
            kind: "text",
            text:
              "Compliance probe: emit an A2UI v0.9 envelope sequence.",
          },
        ],
      },
    },
  };

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    return { ok: false, text: "", reason: (err as Error).message };
  }

  if (!res.ok) {
    return {
      ok: false,
      text: "",
      reason: `HTTP ${res.status} ${res.statusText}`,
    };
  }

  const contentType = res.headers.get("content-type") || "";

  // SSE branch
  if (contentType.includes("text/event-stream")) {
    const body = await res.text();
    const text = parseSseText(body);
    return { ok: true, text };
  }

  // JSON-RPC branch
  try {
    const json = (await res.json()) as {
      result?: unknown;
      error?: { message?: string };
    };
    if (json.error) {
      return {
        ok: false,
        text: "",
        reason: `RPC error: ${json.error.message || JSON.stringify(json.error)}`,
      };
    }
    const text = extractTextFromRpcResult(json.result);
    return { ok: true, text };
  } catch (err) {
    return {
      ok: false,
      text: "",
      reason: `failed to parse response body: ${(err as Error).message}`,
    };
  }
}

function parseSseText(body: string): string {
  // SSE: lines of `event: ...` and `data: ...`. We want concatenated data
  // payloads from any message/text/artifact event. Each data line is JSON.
  const chunks: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const parsed = JSON.parse(payload);
      const extracted = extractTextFromRpcResult(
        // SSE frames are typically the `result` value of the JSON-RPC
        // response, with an outer envelope around it.
        parsed.result ?? parsed,
      );
      if (extracted) chunks.push(extracted);
    } catch {
      // Non-JSON data line — append raw, the envelope extractor will skip non-matches.
      chunks.push(payload);
    }
  }
  return chunks.join("\n");
}

function extractTextFromRpcResult(result: unknown): string {
  if (result === null || result === undefined) return "";
  if (typeof result === "string") return result;
  if (typeof result !== "object") return "";

  const chunks: string[] = [];

  // Direct Message with parts array
  const r = result as Record<string, unknown>;
  if (Array.isArray(r.parts)) {
    for (const part of r.parts) {
      if (part && typeof part === "object") {
        const p = part as Record<string, unknown>;
        if (typeof p.text === "string") chunks.push(p.text);
      }
    }
  }

  // Task with status.message.parts or artifacts
  if (r.status && typeof r.status === "object") {
    const status = r.status as Record<string, unknown>;
    if (status.message && typeof status.message === "object") {
      chunks.push(extractTextFromRpcResult(status.message));
    }
  }

  if (Array.isArray(r.artifacts)) {
    for (const artifact of r.artifacts) {
      chunks.push(extractTextFromRpcResult(artifact));
    }
  }

  // Artifact update event
  if (r.artifact && typeof r.artifact === "object") {
    chunks.push(extractTextFromRpcResult(r.artifact));
  }

  // Message update event
  if (r.message && typeof r.message === "object") {
    chunks.push(extractTextFromRpcResult(r.message));
  }

  return chunks.filter(Boolean).join("\n");
}

// ─── A2UI v0.9 envelope extraction + validation ────────────────

function extractEnvelopes(rawText: string): RawEnvelope[] {
  // The text may contain envelopes in three shapes:
  //   1. A single JSON object that is an envelope
  //   2. A JSON array of envelopes
  //   3. JSON embedded inside arbitrary text (regex-extract braces/brackets)
  const candidates: RawEnvelope[] = [];

  const tryParse = (s: string): void => {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        for (const e of parsed) {
          if (e && typeof e === "object") candidates.push(e as RawEnvelope);
        }
      } else if (parsed && typeof parsed === "object") {
        candidates.push(parsed as RawEnvelope);
      }
    } catch {
      // ignore
    }
  };

  // Direct full-text parse
  tryParse(rawText.trim());

  // Find JSON arrays embedded in the text
  for (const match of rawText.matchAll(/\[[\s\S]*?\]/g)) {
    tryParse(match[0]);
  }
  // Find JSON objects embedded in the text. Note: balanced brace match
  // is approximate — we accept false candidates and filter later.
  for (const match of rawText.matchAll(/\{[\s\S]*?\}/g)) {
    tryParse(match[0]);
  }

  // Filter to objects that look like envelopes (have a recognized `kind`).
  const envelopes = candidates.filter(
    (e) =>
      typeof e.kind === "string" &&
      (KNOWN_KINDS as string[]).includes(e.kind),
  );

  // Deduplicate (same kind + surfaceId + JSON shape).
  const seen = new Set<string>();
  const deduped: RawEnvelope[] = [];
  for (const e of envelopes) {
    const key = JSON.stringify(e);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(e);
  }

  return deduped;
}

function validateEnvelope(
  envelope: RawEnvelope,
  index: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const kind = String(envelope.kind);

  // Common requirements
  if (envelope.version !== "v0.9") {
    issues.push({
      envelopeIndex: index,
      kind,
      field: "version",
      reason: `expected "v0.9", got ${JSON.stringify(envelope.version)}`,
    });
  }
  if (typeof envelope.surfaceId !== "string" || !envelope.surfaceId) {
    issues.push({
      envelopeIndex: index,
      kind,
      field: "surfaceId",
      reason: "must be a non-empty string",
    });
  }

  // Per-kind requirements
  if (kind === "createSurface") {
    if (typeof envelope.catalogId !== "string" || !envelope.catalogId) {
      issues.push({
        envelopeIndex: index,
        kind,
        field: "catalogId",
        reason: "createSurface requires a catalogId (string)",
      });
    }
  } else if (kind === "updateComponents") {
    if (!Array.isArray(envelope.components)) {
      issues.push({
        envelopeIndex: index,
        kind,
        field: "components",
        reason: "updateComponents requires a components array",
      });
    }
  } else if (kind === "updateDataModel") {
    if (
      envelope.data === null ||
      envelope.data === undefined ||
      typeof envelope.data !== "object" ||
      Array.isArray(envelope.data)
    ) {
      issues.push({
        envelopeIndex: index,
        kind,
        field: "data",
        reason: "updateDataModel requires a data object",
      });
    }
  }

  return issues;
}

// ─── Orchestrator ──────────────────────────────────────────────

async function check(url: string): Promise<CheckResult> {
  const result: CheckResult = {
    reachable: false,
    agentCardOk: false,
    rpcOk: false,
    envelopesFound: 0,
    envelopesValid: 0,
    issues: [],
  };

  // STEP 1: agent card
  const cardRes = await fetchAgentCard(url);
  if (!cardRes.ok) {
    result.reason = cardRes.reason;
    return result;
  }
  result.reachable = true;
  result.agentCardOk = true;

  // STEP 2: RPC service endpoint — prefer the agent card's url field,
  // fall back to the supplied base url.
  const rpcEndpoint = cardRes.card.url || url;

  // STEP 3: send a message and gather text
  const rpc = await postRpcSend(rpcEndpoint);
  if (!rpc.ok) {
    result.reason = `agent card fetched OK but RPC failed: ${rpc.reason}`;
    return result;
  }
  result.rpcOk = true;

  // STEP 4: extract + validate envelopes
  const envelopes = extractEnvelopes(rpc.text);
  result.envelopesFound = envelopes.length;

  if (envelopes.length === 0) {
    result.reason =
      "agent responded but no A2UI v0.9 envelopes were found in the response";
    return result;
  }

  let valid = 0;
  for (let i = 0; i < envelopes.length; i++) {
    const issues = validateEnvelope(envelopes[i], i);
    if (issues.length === 0) {
      valid += 1;
    } else {
      result.issues.push(...issues);
    }
  }
  result.envelopesValid = valid;

  return result;
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error(c.red("usage: pnpm check-a2a <url>"));
    console.error(c.dim("       e.g. pnpm check-a2a http://localhost:8124"));
    process.exit(2);
  }

  console.log(c.bold(`Checking A2A endpoint: ${url}`));

  let result: CheckResult;
  try {
    result = await check(url);
  } catch (err) {
    printUnreachable(url, (err as Error).message);
    process.exit(1);
  }

  if (!result.reachable) {
    printUnreachable(url, result.reason || "unreachable");
    process.exit(1);
  }

  // Success = at least one envelope, and every envelope passed validation.
  const success =
    result.envelopesValid > 0 &&
    result.envelopesValid === result.envelopesFound &&
    result.issues.length === 0;

  if (success) {
    printSuccess(url, result);
    process.exit(0);
  }

  printFailure(url, result);
  process.exit(1);
}

main().catch((err) => {
  console.error(c.red("\nUnexpected error:"), err);
  process.exit(1);
});
