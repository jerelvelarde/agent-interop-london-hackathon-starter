/**
 * EnvelopeTimeline — a compact horizontal "timeline strip" of envelopes.
 *
 * Renders one small colored dot per envelope in global emission order
 * (oldest -> newest, left -> right), the newest dot emphasized with a ring.
 * Built for the inspector header: it makes a streaming run feel alive and
 * shows the run's shape at a glance.
 *
 * Self-contained + presentational: no hooks beyond `useMemo`, no data
 * fetching, no effects. Styling mirrors EnvelopeInspector's idiom —
 * inline `style={{...}}` with CSS variables and a local KIND_COLORS map.
 */
"use client";

import { useMemo } from "react";

import type { CapturedEnvelope } from "@/types/a2ui";

/**
 * Per-kind dot color. Inlined (not imported) to keep this component
 * self-contained — mirrors the KIND_COLORS map in EnvelopeInspector.tsx.
 */
const KIND_COLORS: Record<string, string> = {
  createSurface: "#bec2ff", // CopilotKit lilac
  updateComponents: "#85ecce", // mint
  updateDataModel: "#ffac4d", // orange
  deleteSurface: "#fa5f67", // destructive
  appendComponents: "#85ecce",
  appendDataModel: "#ffac4d",
  unknown: "#adadb2",
};

/**
 * A compact strip of dots, one per envelope in global order, newest
 * emphasized. Returns `null` when there are no envelopes.
 *
 * @param envelopes Captured envelopes, oldest-first.
 * @param max Cap on the most-recent dots to render (default 40). Older
 *   envelopes beyond the cap collapse into a leading "+N" label.
 */
export function EnvelopeTimeline({
  envelopes,
  max = 40,
}: {
  envelopes: CapturedEnvelope[];
  max?: number;
}): React.JSX.Element | null {
  const visible = useMemo(
    () => (envelopes.length > max ? envelopes.slice(-max) : envelopes),
    [envelopes, max],
  );

  if (envelopes.length === 0) return null;

  const hiddenCount = envelopes.length - visible.length;
  const lastIndex = visible.length - 1;

  return (
    <div
      role="img"
      aria-label={`${envelopes.length} A2UI envelopes in order`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        overflow: "hidden",
        whiteSpace: "nowrap",
        minWidth: 0,
      }}
    >
      {hiddenCount > 0 && (
        <span
          aria-hidden
          style={{
            fontFamily: "var(--font-code)",
            fontSize: "0.62rem",
            color: "var(--muted-foreground)",
            marginRight: 2,
            flexShrink: 0,
          }}
        >
          +{hiddenCount}
        </span>
      )}
      {visible.map((env, i) => {
        const color = KIND_COLORS[env.kind] ?? KIND_COLORS.unknown;
        const isNewest = i === lastIndex;
        const size = isNewest ? 9 : 7;
        return (
          <span
            key={env.id}
            title={`${env.kind} · ${env.surfaceId ?? "no surface"}`}
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              background: color,
              flexShrink: 0,
              display: "inline-block",
              boxShadow: isNewest
                ? `0 0 0 2px color-mix(in srgb, ${color} 40%, transparent)`
                : "none",
            }}
          />
        );
      })}
    </div>
  );
}

export default EnvelopeTimeline;
