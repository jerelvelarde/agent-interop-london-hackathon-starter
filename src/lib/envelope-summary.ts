/**
 * envelope-summary — turn a captured A2UI envelope into a one-line,
 * human-readable sentence (plus optional sub-detail).
 *
 * The EnvelopeInspector renders this line above the raw JSON so each card
 * reads as a sentence first ("Rendered Row → 3 cards") and the wire payload
 * second. Keep it skimmable at a glance.
 *
 * This module is PURE and dependency-free: no React, no DOM, no I/O, no
 * mutation of the input. It only imports types. Every nested field access is
 * guarded — odd or partial envelopes (deltas, hand-rolled fixtures, future
 * envelope kinds) must degrade to a sane label, never throw.
 */
import type { A2UIEnvelope, A2UIEnvelopeKey, CapturedEnvelope } from "@/types/a2ui";

/** The shape returned per envelope: a headline `line` and optional `detail`. */
export interface EnvelopeSummary {
  /** One-line human-readable headline (always present). */
  line: string;
  /** Optional second line with supporting detail (catalog, bound paths, …). */
  detail?: string;
}

/** Narrow an unknown to a plain object we can index by string key. */
function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Read a string field off an unknown, or null if absent/non-string. */
function str(obj: Record<string, unknown> | null, key: string): string | null {
  const v = obj?.[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** Pull the payload object for a given envelope key (e.g. `createSurface`). */
function payloadFor(env: A2UIEnvelope, key: A2UIEnvelopeKey): Record<string, unknown> | null {
  return asRecord(env?.[key]);
}

/**
 * Map a component type ("Row", "ProjectCard", "RiskFlag") to a friendly,
 * pluralized child noun. Falls back to a generic label so unknown component
 * types still read cleanly.
 */
function childLabel(componentType: string | null, count: number): string {
  const plural = count === 1 ? "" : "s";
  if (!componentType) return `child${count === 1 ? "" : "ren"}`;
  const t = componentType.toLowerCase();
  if (t.endsWith("card")) return `card${plural}`;
  if (t.endsWith("flag")) return `flag${plural}`;
  if (t.endsWith("metric")) return `metric${plural}`;
  if (t.endsWith("row")) return `row${plural}`;
  if (t.endsWith("column")) return `column${plural}`;
  return `node${plural}`;
}

/**
 * Inspect a component root and summarize its direct children.
 *
 * Handles both observed shapes defensively:
 *  - Wire shape: `{ type, properties: { children: [...] } }` where children is
 *    an array of `{ id, basePath? }` or nested nodes.
 *  - Template-binding shape: `children: { componentId, path }` (one component
 *    repeated over a bound array) — count is runtime-dependent, so we report
 *    the bound component + path instead of a number.
 */
function summarizeComponentRoot(
  root: Record<string, unknown> | null,
  verb: string,
): EnvelopeSummary {
  if (!root) return { line: `${verb} components` };

  // Root type: wire uses `type`, fixtures use `component`.
  const rootType = str(root, "type") ?? str(root, "component");
  const props = asRecord(root["properties"]);
  // Children: wire nests under `properties.children`; fixtures put it flat.
  const children = props?.["children"] ?? root["children"];

  // Template binding: one component repeated over a data array.
  const binding = asRecord(children);
  if (binding && ("componentId" in binding || "path" in binding)) {
    const boundComponent = str(binding, "componentId");
    const boundPath = str(binding, "path");
    const noun = boundComponent ? childLabel(boundComponent, 2) : "items";
    const head = rootType ? `${verb} ${rootType} → ${noun}` : `${verb} ${noun}`;
    const detailBits: string[] = [];
    if (boundComponent) detailBits.push(`each ${boundComponent}`);
    if (boundPath) detailBits.push(`bound to ${boundPath}`);
    return {
      line: `${head} (bound)`,
      detail: detailBits.length ? detailBits.join(" · ") : undefined,
    };
  }

  // Explicit child array.
  if (Array.isArray(children)) {
    const count = children.length;
    const label = childLabel(rootType, count);
    const line = rootType
      ? `${verb} ${rootType} → ${count} ${label}`
      : `${verb} components (${count} ${label})`;
    // Surface any bound child paths as detail (basePath on the wire shape).
    const boundPaths = children
      .map((c) => str(asRecord(c), "basePath"))
      .filter((p): p is string => !!p);
    const detail = boundPaths.length
      ? `bound: ${boundPaths.join(", ")}`
      : undefined;
    return { line, detail };
  }

  // Root present but no recognizable children.
  return { line: rootType ? `${verb} ${rootType}` : `${verb} components` };
}

/**
 * Summarize a data-model payload: list top-level keys, annotating array
 * lengths. e.g. `{ kpi: {...}, projects: [a,b,c] }` → "kpi, projects (3)".
 */
function summarizeData(
  payload: Record<string, unknown> | null,
  verb: string,
): EnvelopeSummary {
  const data = asRecord(payload?.["data"]);
  const keys = data ? Object.keys(data) : [];
  if (keys.length === 0) return { line: `${verb} data` };

  const parts = keys.map((key) => {
    const value = data?.[key];
    return Array.isArray(value) ? `${key} (${value.length})` : key;
  });
  return { line: `${verb} ${parts.join(", ")}` };
}

/**
 * Turn a captured envelope into a one-line summary (+ optional detail).
 *
 * Pure and total: returns a best-effort sentence for every input, including
 * malformed or unknown-kind envelopes. Never throws.
 */
export function summarizeEnvelope(env: CapturedEnvelope): EnvelopeSummary {
  const body: A2UIEnvelope | undefined = env?.body;
  const kind = env?.kind;

  switch (kind) {
    case "createSurface": {
      const p = body ? payloadFor(body, "createSurface") : null;
      const surfaceId = str(p, "surfaceId") ?? env?.surfaceId ?? null;
      const catalogId = str(p, "catalogId");
      return {
        line: surfaceId ? `New surface "${surfaceId}"` : "New surface",
        detail: catalogId ? `catalog: ${catalogId}` : undefined,
      };
    }

    case "deleteSurface": {
      const p = body ? payloadFor(body, "deleteSurface") : null;
      const surfaceId = str(p, "surfaceId") ?? env?.surfaceId ?? null;
      return {
        line: surfaceId ? `Deleted surface "${surfaceId}"` : "Deleted surface",
      };
    }

    case "updateComponents": {
      const p = body ? payloadFor(body, "updateComponents") : null;
      return summarizeComponentRoot(asRecord(p?.["root"]), "Rendered");
    }

    case "appendComponents": {
      const p = body ? payloadFor(body, "appendComponents") : null;
      return summarizeComponentRoot(asRecord(p?.["root"]), "Appended");
    }

    case "updateDataModel": {
      const p = body ? payloadFor(body, "updateDataModel") : null;
      return summarizeData(p, "Bound");
    }

    case "appendDataModel": {
      const p = body ? payloadFor(body, "appendDataModel") : null;
      return summarizeData(p, "Appended");
    }

    default: {
      // Unknown kind: prefer the literal kind string, then any surfaceId hint.
      const label = typeof kind === "string" && kind !== "unknown" ? kind : "Envelope";
      const surfaceId = env?.surfaceId ?? null;
      return {
        line: surfaceId ? `${label} "${surfaceId}"` : label,
      };
    }
  }
}
