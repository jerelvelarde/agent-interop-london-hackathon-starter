/**
 * Envelope kind metadata — single source of truth.
 *
 * Maps each A2UI v0.9 envelope kind to display metadata (label, tooltip,
 * color, glyph) so the inspector's `KindBadge` and a header lifecycle legend
 * can share one definition. Colors mirror the legacy `KIND_COLORS` map in
 * `EnvelopeInspector.tsx` exactly, so this drops in with zero visual change.
 *
 * Tooltips teach the create -> components -> bind lifecycle:
 *   createSurface     spins up a surface,
 *   updateComponents  declares its component tree,
 *   updateDataModel   binds data into those components.
 *
 * Pure data module — no React, no side effects.
 */
import type { A2UIEnvelopeKey } from "@/types/a2ui";

/** Display metadata for a single envelope kind. */
export interface KindMeta {
  /** Human, short label — e.g. "Create surface". */
  label: string;
  /** Concise lifecycle-teaching tooltip. */
  tooltip: string;
  /** Hex accent color (mirrors the inspector's legacy KIND_COLORS). */
  color: string;
  /** Single emoji/char glyph. */
  glyph: string;
}

/**
 * Metadata keyed by envelope kind. Includes an `unknown` fallback entry.
 * Colors are the exact hexes from the inspector's prior `KIND_COLORS` map.
 */
export const KIND_META: Record<string, KindMeta> = {
  createSurface: {
    label: "Create surface",
    tooltip: "Spins up a new UI region (a surface) the agent can fill.",
    color: "#bec2ff", // CopilotKit lilac
    glyph: "➕",
  },
  updateComponents: {
    label: "Update components",
    tooltip: "Declares the component tree that lays out a surface.",
    color: "#85ecce", // mint
    glyph: "🧱",
  },
  updateDataModel: {
    label: "Update data",
    tooltip: "Binds data into the surface's components.",
    color: "#ffac4d", // orange
    glyph: "🔗",
  },
  deleteSurface: {
    label: "Delete surface",
    tooltip: "Removes a surface.",
    color: "#fa5f67", // destructive
    glyph: "🗑️",
  },
  appendComponents: {
    label: "Append components",
    tooltip: "Adds more components to an existing surface.",
    color: "#85ecce",
    glyph: "➕",
  },
  appendDataModel: {
    label: "Append data",
    tooltip: "Adds more data to an existing surface.",
    color: "#ffac4d",
    glyph: "➕",
  },
  unknown: {
    label: "Unknown",
    tooltip: "Unrecognized envelope kind.",
    color: "#adadb2",
    glyph: "•",
  },
};

/** Look up metadata for a kind, falling back to the `unknown` entry. */
export function kindMeta(kind: string): KindMeta {
  return KIND_META[kind] ?? KIND_META.unknown;
}

/** One ordered step in the lifecycle legend. */
export interface LegendStep {
  glyph: string;
  label: string;
  kind: A2UIEnvelopeKey;
}

/**
 * The three core lifecycle steps, in order, for the inspector header legend:
 * create -> components -> bind data.
 */
export const LIFECYCLE_LEGEND: LegendStep[] = [
  {
    glyph: KIND_META.createSurface.glyph,
    label: "Create",
    kind: "createSurface",
  },
  {
    glyph: KIND_META.updateComponents.glyph,
    label: "Components",
    kind: "updateComponents",
  },
  {
    glyph: KIND_META.updateDataModel.glyph,
    label: "Bind data",
    kind: "updateDataModel",
  },
];
