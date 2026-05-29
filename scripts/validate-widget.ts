#!/usr/bin/env node
/**
 * pnpm validate-widget <path> — A2UI v0.9 envelope/schema shape validator.
 *
 * The starter uses ONE canonical fixture shape (issue #16 — three incompatible
 * fixture shapes used to coexist; we picked the validator's `{components, data}`
 * shape because the validator is the authority). The two non-fixture shapes
 * (bare catalog schemas and the `pnpm new-widget`-style wrapper widget) are
 * still recognized, because they describe DIFFERENT files (the catalog
 * registration), not fixtures.
 *
 * Three recognized JSON shapes:
 *
 *   (a) Bare catalog schema — array of v0.9 components. Lives at
 *       `agent/src/a2ui/schemas/<name>_schema.json`. Canonical example:
 *       `agent/src/a2ui/schemas/risk_register_schema.json`.
 *
 *         [
 *           { "id": "root", "component": "Column", "children": [...] },
 *           { "id": "risk-flag", "component": "RiskFlag", ... }
 *         ]
 *
 *   (b) Wrapper widget JSON — what `pnpm new-widget` scaffolds. The schema
 *       array is nested under a `schema` key. Canonical example:
 *       `agent/src/widgets/risk_register.json`.
 *
 *         {
 *           "id": "risk-register",
 *           "name": "RiskRegister",
 *           "description": "...",
 *           "catalogId": "copilotkit://...",
 *           "pythonTool": "agent/src/tools/risk_register.py:show_risk_register",
 *           "schema": [ ...catalog-schema components... ]
 *         }
 *
 *   (c) CANONICAL FIXTURE — every *.fixture.json under agent/src/widgets/
 *       MUST use this shape. One flat object with the createSurface fields at
 *       the top level, the component tree under `components`, and the data
 *       model under `data`. Canonical example:
 *       `agent/src/widgets/risk_register.fixture.json`.
 *
 *         {
 *           "name": "risk_register_default",
 *           "description": "...",
 *           "surfaceId": "risk-register",
 *           "catalogId": "copilotkit://app-dashboard-catalog",
 *           "components": [ ...catalog components... ],
 *           "data": { "risks": [ ... ] }
 *         }
 *
 *       Why this shape: the validator is the authority (issue #16). Tests,
 *       offline mode, and the prompt skeleton all point here. If you see a
 *       `*.fixture.json` with `envelopes: [...]` it's a stale pre-#16 file
 *       and should be migrated.
 *
 * The validator picks one shape per file by inspecting the top-level keys
 * (see pickShape() below). Error messages then teach against the chosen
 * shape, not the others — the failure mode "I added 'envelopes' and now it
 * yells about a missing 'components'" is the exact thing issue #16 logged.
 *
 * EXAMPLE mode (`pnpm validate-widget --examples`):
 *   Validates every other-examples/<id>/EXAMPLE.json against the §3.2 catalog
 *   entry schema (id, name, route starting with `/other-examples/`, etc.).
 *
 * Error format follows the "validators that teach" pattern.
 */
import { existsSync, readFileSync, statSync, readdirSync } from "node:fs";
import { join, resolve, basename } from "node:path";

// Canonical references — these are real JSON files in the repo a hacker can
// open and copy-paste. Issue #17: the validator used to point at a Python
// file which is not a template you can mirror — these are JSON.
const CANONICAL_CATALOG_SCHEMA_JSON = "agent/src/a2ui/schemas/risk_register_schema.json";
const CANONICAL_WIDGET_JSON = "agent/src/widgets/risk_register.json";
const CANONICAL_FIXTURE_JSON = "agent/src/widgets/risk_register.fixture.json";
const CANONICAL_EXAMPLE_JSON = "other-examples/legal-contract-review/EXAMPLE.json";
const SCHEMA_REF = "https://a2ui.org/specification/v0.9-a2ui/";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

type ValidationError = {
  message: string;
  fix: string;
};

function teach(filePath: string, errors: ValidationError[], canonical: string): void {
  for (const err of errors) {
    console.error(`${RED}✗${RESET} Widget JSON failed validation at ${BOLD}${filePath}${RESET}`);
    console.error(`  ${err.message}`);
    console.error(`  ${DIM}Canonical example (JSON to copy-paste):${RESET} ${canonical}`);
    console.error(`  ${DIM}Fix:${RESET} ${err.fix}`);
    console.error(`  ${DIM}Schema reference:${RESET} ${SCHEMA_REF}`);
    console.error();
  }
}

function passMsg(filePath: string, shape: string): void {
  console.log(`${GREEN}✓${RESET} ${filePath} ${DIM}(${shape})${RESET}`);
}

/**
 * Validate a single component object inside a catalog schema array.
 * v0.9 requires:
 *   - `id` string (root component must be "root")
 *   - `component` string (the catalog component name)
 *   - everything else is component-specific
 */
function validateComponent(
  comp: unknown,
  index: number,
  errors: ValidationError[],
): void {
  if (typeof comp !== "object" || comp === null || Array.isArray(comp)) {
    errors.push({
      message: `Component at index ${index} is not an object.`,
      fix: `Wrap the component in an object: { "id": "...", "component": "...", ... }`,
    });
    return;
  }
  const c = comp as Record<string, unknown>;

  if (typeof c.id !== "string" || c.id.length === 0) {
    errors.push({
      message: `Component at index ${index} is missing required field 'id' (must be a non-empty string).`,
      fix: `Add an "id" field. The root component must have id "root".`,
    });
  }
  if (typeof c.component !== "string" || c.component.length === 0) {
    errors.push({
      message: `Component at index ${index} (id="${c.id ?? "?"}") is missing required field 'component'.`,
      fix: `Add a "component" field naming the catalog component (e.g. "Row", "Card", "RiskFlag").`,
    });
  }
}

/**
 * Validate a catalog-schema-shaped array of components.
 */
function validateCatalogSchema(
  data: unknown,
  errors: ValidationError[],
): void {
  if (!Array.isArray(data)) {
    errors.push({
      message: "Expected an array of components.",
      fix: `Make it an array of catalog components, each shaped like { "id": "root", "component": "Row", ... }. See ${CANONICAL_CATALOG_SCHEMA_JSON}.`,
    });
    return;
  }
  if (data.length === 0) {
    errors.push({
      message: "Empty components array — v0.9 requires at least a root component.",
      fix: `Add a root component: { "id": "root", "component": "Row", ... }. See ${CANONICAL_CATALOG_SCHEMA_JSON}.`,
    });
    return;
  }
  data.forEach((c, i) => validateComponent(c, i, errors));

  const hasRoot = data.some(
    (c) => typeof c === "object" && c !== null && (c as Record<string, unknown>).id === "root",
  );
  if (!hasRoot) {
    errors.push({
      message: "Missing required component with id 'root'. v0.9 schemas must have a root component.",
      fix: `Add a component with id "root" — typically a layout component like Row, Column, or Stack. See ${CANONICAL_CATALOG_SCHEMA_JSON}.`,
    });
  }
}

/**
 * Soft-check that a catalogId looks like a URI (`scheme://...`). The starter
 * ships two valid catalogIds: `copilotkit://app-dashboard-catalog` and
 * `https://a2ui.org/specification/v0_9/basic_catalog.json`.
 */
function validateCatalogId(value: unknown, errors: ValidationError[]): void {
  if (typeof value !== "string" || value.length === 0) {
    errors.push({
      message: "Missing or invalid 'catalogId'.",
      fix: `Add a catalogId string, e.g. "copilotkit://app-dashboard-catalog". See ${CANONICAL_FIXTURE_JSON}.`,
    });
    return;
  }
  if (!/^[a-z]+:\/\//.test(value)) {
    errors.push({
      message: `'catalogId' ("${value}") doesn't look like a URI (expected scheme://...).`,
      fix: `Use a URI-shaped catalogId. The starter uses "copilotkit://app-dashboard-catalog".`,
    });
  }
}

/**
 * Shape (b): Wrapper widget JSON (what `pnpm new-widget` scaffolds).
 *
 * Required: id (string), name (string), catalogId (URI-ish), schema (array).
 * Optional: description, pythonTool.
 */
function validateWrapperWidget(
  obj: Record<string, unknown>,
  errors: ValidationError[],
): void {
  if (typeof obj.id !== "string" || obj.id.length === 0) {
    errors.push({
      message: "Wrapper widget JSON missing 'id' (must be a non-empty kebab-case string).",
      fix: `Add an "id" field — convention is kebab-case, e.g. "risk-register".`,
    });
  }
  if (typeof obj.name !== "string" || obj.name.length === 0) {
    errors.push({
      message: "Wrapper widget JSON missing 'name' (the catalog component name).",
      fix: `Add a "name" field — convention is PascalCase, e.g. "RiskRegister".`,
    });
  }
  validateCatalogId(obj.catalogId, errors);
  if (!Array.isArray(obj.schema)) {
    errors.push({
      message: "Wrapper widget JSON missing 'schema' array (the v0.9 component tree).",
      fix: `Add a "schema" field whose value is the catalog-schema array. See ${CANONICAL_CATALOG_SCHEMA_JSON}.`,
    });
  } else {
    validateCatalogSchema(obj.schema, errors);
  }
}

/**
 * Shape (c): CANONICAL FIXTURE (every `*.fixture.json` under agent/src/widgets/).
 *
 * Required: surfaceId, catalogId, components (non-empty array with a root),
 *           data (object).
 * Optional: name, description.
 *
 * Issue #16: this is the ONE canonical fixture shape. Files that still use
 * the legacy `envelopes: [...]` shape are migrated to this shape and the
 * legacy branch is rejected on purpose so a hacker reading the error message
 * gets pointed at the canonical fixture, not a stale shape.
 */
function validateCanonicalFixture(
  obj: Record<string, unknown>,
  errors: ValidationError[],
): void {
  if (typeof obj.surfaceId !== "string" || obj.surfaceId.length === 0) {
    errors.push({
      message: "Fixture missing 'surfaceId' (the unique surface identifier).",
      fix: `Add a top-level "surfaceId" string, e.g. "risk-register". See ${CANONICAL_FIXTURE_JSON}.`,
    });
  }
  validateCatalogId(obj.catalogId, errors);
  if (!("components" in obj)) {
    errors.push({
      message: "Fixture missing 'components' array (the v0.9 component tree).",
      fix: `Add a top-level "components" array of catalog components. See ${CANONICAL_FIXTURE_JSON}.`,
    });
  } else {
    validateCatalogSchema(obj.components, errors);
  }
  if (!("data" in obj)) {
    errors.push({
      message: "Fixture missing 'data' object (the data model components bind to via 'path').",
      fix: `Add a top-level "data" object whose keys match the paths your components reference, e.g. { "risks": [...] }. See ${CANONICAL_FIXTURE_JSON}.`,
    });
  } else if (typeof obj.data !== "object" || obj.data === null || Array.isArray(obj.data)) {
    errors.push({
      message: "'data' must be an object (the data model components bind to via 'path').",
      fix: `Make 'data' an object whose keys match the paths your components reference, e.g. { "risks": [...] }. See ${CANONICAL_FIXTURE_JSON}.`,
    });
  }
}

/**
 * Decide which of the three supported shapes a parsed JSON is. Inspects the
 * top-level keys — no validation here, just routing.
 *
 * Files ending in `.fixture.json` are always validated as the canonical
 * fixture shape (issue #16). Files with `envelopes: [...]` no longer have a
 * dedicated branch; they fall through to the canonical fixture validator,
 * which yells about the missing `components`/`data` keys and points at the
 * canonical example.
 */
function pickShape(
  parsed: unknown,
  filePath: string,
): {
  kind: "catalog-schema" | "wrapper-widget" | "canonical-fixture" | "unknown";
  canonical: string;
} {
  // Fixture files always validated as the canonical fixture shape — no
  // matter what top-level keys they happen to have. This is what issue #16
  // calls "the authoritative shape."
  if (filePath.endsWith(".fixture.json")) {
    return { kind: "canonical-fixture", canonical: CANONICAL_FIXTURE_JSON };
  }
  if (Array.isArray(parsed)) {
    return { kind: "catalog-schema", canonical: CANONICAL_CATALOG_SCHEMA_JSON };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { kind: "unknown", canonical: CANONICAL_CATALOG_SCHEMA_JSON };
  }
  const obj = parsed as Record<string, unknown>;
  if (Array.isArray(obj.schema)) {
    return { kind: "wrapper-widget", canonical: CANONICAL_WIDGET_JSON };
  }
  // Any non-fixture top-level object with surfaceId/components is treated
  // as if a hacker dropped a fixture in the wrong place — validate it as
  // the canonical fixture shape and let the error messages teach.
  if (Array.isArray(obj.components) || "surfaceId" in obj || Array.isArray(obj.envelopes)) {
    return { kind: "canonical-fixture", canonical: CANONICAL_FIXTURE_JSON };
  }
  return { kind: "unknown", canonical: CANONICAL_CATALOG_SCHEMA_JSON };
}

function validateFile(filePath: string): boolean {
  if (!existsSync(filePath)) {
    console.error(`${RED}✗${RESET} File not found: ${filePath}`);
    return false;
  }
  const raw = readFileSync(filePath, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const msg = (e as Error).message;
    teach(
      filePath,
      [
        {
          message: `Invalid JSON: ${msg}`,
          fix: "Fix the JSON syntax. `python3 -m json.tool < file` will point at the bad character.",
        },
      ],
      CANONICAL_CATALOG_SCHEMA_JSON,
    );
    return false;
  }

  const { kind, canonical } = pickShape(parsed, filePath);
  const errors: ValidationError[] = [];
  let shapeLabel: string;

  switch (kind) {
    case "catalog-schema":
      shapeLabel = "catalog schema (bare array)";
      validateCatalogSchema(parsed, errors);
      break;
    case "wrapper-widget":
      shapeLabel = "wrapper widget (schema-under-key)";
      validateWrapperWidget(parsed as Record<string, unknown>, errors);
      break;
    case "canonical-fixture":
      shapeLabel = "canonical fixture";
      // Pre-flight: a stale envelopes-array fixture will fail the canonical
      // checks; teach against the canonical shape directly so the hacker
      // doesn't have to guess.
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed) &&
        Array.isArray((parsed as Record<string, unknown>).envelopes)
      ) {
        teach(
          filePath,
          [
            {
              message:
                "Fixture uses the legacy `envelopes: [...]` shape. The canonical fixture shape is `{ surfaceId, catalogId, components, data }` (issue #16 — one canonical shape, validator is the authority).",
              fix: `Flatten the envelopes array: lift createSurface's surfaceId+catalogId to the top level, put updateComponents.components under "components", put updateDataModel.value under "data". See ${CANONICAL_FIXTURE_JSON}.`,
            },
          ],
          canonical,
        );
        return false;
      }
      validateCanonicalFixture(parsed as Record<string, unknown>, errors);
      break;
    default:
      teach(
        filePath,
        [
          {
            message:
              "Top-level value isn't one of the three supported shapes (bare catalog array, wrapper widget object with `schema`, or canonical fixture object with `surfaceId`+`components`+`data`).",
            fix: `Pick a shape and restructure. See ${CANONICAL_CATALOG_SCHEMA_JSON} (catalog) or ${CANONICAL_FIXTURE_JSON} (fixture).`,
          },
        ],
        canonical,
      );
      return false;
  }

  if (errors.length > 0) {
    teach(filePath, errors, canonical);
    return false;
  }
  passMsg(filePath, shapeLabel);
  return true;
}

/**
 * EXAMPLE.json validator (--examples mode). Validates every
 * other-examples/<id>/EXAMPLE.json against plan §3.2:
 *   - id: required non-empty string (kebab-case convention)
 *   - name: required non-empty string (human-readable)
 *   - description: required non-empty string
 *   - route: required string starting with "/other-examples/"
 *   - catalogId: required URI-ish string starting with "copilotkit://"
 *   - tags: required string array (may be empty)
 *   - status: required string (free-form, conventional values: "wip", "ready")
 *   - graphId: optional string (set when the example ships a LangGraph)
 *   - agentName: optional string
 *   - screenshot: optional string (relative path)
 */
function validateExampleEntry(
  filePath: string,
  obj: Record<string, unknown>,
  errors: ValidationError[],
): void {
  if (typeof obj.id !== "string" || obj.id.length === 0) {
    errors.push({
      message: "EXAMPLE.json missing 'id' (kebab-case string, must match directory name).",
      fix: `Add an "id" field matching the directory name, e.g. "legal-contract-review".`,
    });
  }
  if (typeof obj.name !== "string" || obj.name.length === 0) {
    errors.push({
      message: "EXAMPLE.json missing 'name' (human-readable string).",
      fix: `Add a "name" field, e.g. "Contract Review Copilot".`,
    });
  }
  if (typeof obj.description !== "string" || obj.description.length === 0) {
    errors.push({
      message: "EXAMPLE.json missing 'description'.",
      fix: `Add a one-sentence "description" field.`,
    });
  }
  if (typeof obj.route !== "string" || obj.route.length === 0) {
    errors.push({
      message: "EXAMPLE.json missing 'route'.",
      fix: `Add a "route" field starting with "/other-examples/", e.g. "/other-examples/${typeof obj.id === "string" ? obj.id : "<id>"}".`,
    });
  } else if (!obj.route.startsWith("/other-examples/")) {
    errors.push({
      message: `'route' ("${obj.route}") must start with "/other-examples/".`,
      fix: `Change the route prefix to "/other-examples/${typeof obj.id === "string" ? obj.id : "<id>"}".`,
    });
  }
  if (typeof obj.catalogId !== "string" || obj.catalogId.length === 0) {
    errors.push({
      message: "EXAMPLE.json missing 'catalogId'.",
      fix: `Add a "catalogId" field starting with "copilotkit://", e.g. "copilotkit://legal-paper-catalog".`,
    });
  } else if (!obj.catalogId.startsWith("copilotkit://")) {
    errors.push({
      message: `'catalogId' ("${obj.catalogId}") must start with "copilotkit://" for in-repo examples.`,
      fix: `Use a "copilotkit://" scheme so the renderer routes to the in-repo catalog.`,
    });
  }
  if (!Array.isArray(obj.tags)) {
    errors.push({
      message: "EXAMPLE.json missing 'tags' (array of strings).",
      fix: `Add a "tags" array, e.g. ["legal", "document-review"]. May be empty.`,
    });
  } else {
    for (const [i, t] of obj.tags.entries()) {
      if (typeof t !== "string") {
        errors.push({
          message: `'tags[${i}]' is not a string.`,
          fix: `Make every tag a string.`,
        });
        break;
      }
    }
  }
  if (typeof obj.status !== "string" || obj.status.length === 0) {
    errors.push({
      message: "EXAMPLE.json missing 'status'.",
      fix: `Add a "status" field — conventional values: "wip", "ready".`,
    });
  }
  // Optional fields — only type-check when present.
  if ("graphId" in obj && typeof obj.graphId !== "string") {
    errors.push({
      message: "'graphId' must be a string when present.",
      fix: `Either remove the field or set it to a string matching the langgraph.json key.`,
    });
  }
  if ("agentName" in obj && typeof obj.agentName !== "string") {
    errors.push({
      message: "'agentName' must be a string when present.",
      fix: `Either remove the field or set it to a string.`,
    });
  }
  if ("screenshot" in obj && typeof obj.screenshot !== "string") {
    errors.push({
      message: "'screenshot' must be a string when present.",
      fix: `Either remove the field or set it to a relative path string.`,
    });
  }
}

function validateExampleFile(filePath: string): boolean {
  if (!existsSync(filePath)) {
    console.error(`${RED}✗${RESET} EXAMPLE.json not found: ${filePath}`);
    return false;
  }
  const raw = readFileSync(filePath, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    teach(
      filePath,
      [
        {
          message: `Invalid JSON: ${(e as Error).message}`,
          fix: "Fix the JSON syntax.",
        },
      ],
      CANONICAL_EXAMPLE_JSON,
    );
    return false;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    teach(
      filePath,
      [
        {
          message: "Top-level value must be an object.",
          fix: `Restructure as a single object. See ${CANONICAL_EXAMPLE_JSON}.`,
        },
      ],
      CANONICAL_EXAMPLE_JSON,
    );
    return false;
  }
  const errors: ValidationError[] = [];
  validateExampleEntry(filePath, parsed as Record<string, unknown>, errors);
  if (errors.length > 0) {
    teach(filePath, errors, CANONICAL_EXAMPLE_JSON);
    return false;
  }
  passMsg(filePath, "EXAMPLE.json (catalog entry)");
  return true;
}

function findExampleFiles(repoRoot: string): string[] {
  const examplesDir = join(repoRoot, "other-examples");
  if (!existsSync(examplesDir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(examplesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = join(examplesDir, entry.name, "EXAMPLE.json");
    if (existsSync(candidate)) out.push(candidate);
  }
  return out;
}

function runExamplesMode(): never {
  // Locate repo root from this script's __dirname.
  const repoRoot = resolve(__dirname, "..");
  const examples = findExampleFiles(repoRoot);
  if (examples.length === 0) {
    console.log(`${YELLOW}!${RESET} ${DIM}No other-examples/*/EXAMPLE.json files found.${RESET}`);
    process.exit(0);
  }
  console.log(`${BOLD}validate-widget --examples${RESET} — found ${examples.length} EXAMPLE.json file${examples.length === 1 ? "" : "s"}\n`);
  let failed = 0;
  for (const f of examples) {
    if (!validateExampleFile(f)) failed++;
  }
  console.log();
  if (failed === 0) {
    console.log(`${GREEN}${BOLD}All ${examples.length} EXAMPLE.json file${examples.length === 1 ? "" : "s"} validated.${RESET}`);
    process.exit(0);
  } else {
    console.error(`${RED}${BOLD}${failed} of ${examples.length} EXAMPLE.json file${examples.length === 1 ? "" : "s"} failed validation.${RESET}`);
    process.exit(1);
  }
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: pnpm validate-widget <path> [<path> ...]");
    console.error("       pnpm validate-widget <directory>");
    console.error("       pnpm validate-widget --examples");
    process.exit(2);
  }

  // --examples mode (validates other-examples/*/EXAMPLE.json catalog entries).
  if (args.includes("--examples")) {
    runExamplesMode();
  }

  // Expand directories to all *.json under them.
  const filesToCheck: string[] = [];
  for (const arg of args) {
    const abs = resolve(arg);
    if (!existsSync(abs)) {
      console.error(`${YELLOW}!${RESET} Skipping missing path: ${arg}`);
      continue;
    }
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      const stack = [abs];
      while (stack.length > 0) {
        const dir = stack.pop()!;
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = join(dir, entry.name);
          if (entry.isDirectory()) stack.push(full);
          else if (entry.isFile() && entry.name.endsWith(".json")) filesToCheck.push(full);
        }
      }
    } else if (abs.endsWith(".json")) {
      filesToCheck.push(abs);
    } else {
      console.error(`${YELLOW}!${RESET} Skipping non-JSON file: ${basename(arg)}`);
    }
  }

  if (filesToCheck.length === 0) {
    console.error(`${YELLOW}!${RESET} No JSON files to validate.`);
    process.exit(0);
  }

  let failed = 0;
  for (const f of filesToCheck) {
    if (!validateFile(f)) failed++;
  }

  console.log();
  if (failed === 0) {
    console.log(`${GREEN}${BOLD}All ${filesToCheck.length} widget file${filesToCheck.length === 1 ? "" : "s"} validated.${RESET}`);
    process.exit(0);
  } else {
    console.error(
      `${RED}${BOLD}${failed} of ${filesToCheck.length} file${filesToCheck.length === 1 ? "" : "s"} failed validation.${RESET}`,
    );
    process.exit(1);
  }
}

main();
