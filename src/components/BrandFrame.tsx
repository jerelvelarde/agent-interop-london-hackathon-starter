"use client";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CUSTOMIZATION SEAM #2 — Re-brand the shell
// See HACKATHON.md §2 for the full recipe.
//
// Pattern: this is a thin backdrop wrapper, NOT a header chrome.
// The chat-column header lives in src/components/example-layout/
// (canonical product-name + logo placement). BrandFrame's job is
// to paint the lavender frosted-glass backdrop and provide the
// relative-positioned container the rest of the app sits inside.
//
// Don't touch:
//   - src/components/EnvelopeInspector.tsx (judging chrome)
//   - chat affordances in src/app/(default)/page.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { ReactNode } from "react";
import { BackgroundBlurCircles } from "./BackgroundBlurCircles";

export interface BrandFrameProps {
  /** Reserved for callers that pass a productName; unused by the
   *  default backdrop-only rendering. Kept for API stability. */
  productName?: string;
  /** Reserved for callers that pass a logoSrc; unused by default. */
  logoSrc?: string;
  /** Reserved; unused by default. */
  accentColor?: string;
  /** The app content rendered above the backdrop. */
  children?: ReactNode;
}

/**
 * BrandFrame — frosted-glass shell wrapper.
 *
 * Paints `--surface-main` as the base, overlays six blurred radial
 * gradients via `<BackgroundBlurCircles />`, and renders children
 * above the backdrop at `zIndex: 1`. Mirrors the source repo's
 * `ThemeShell` pattern — no header chrome; the chat column owns
 * its own product header inside `<ExampleLayout>`.
 */
export function BrandFrame({ children }: BrandFrameProps) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: "var(--surface-main, #dedee9)",
        minHeight: "100svh",
        height: "100dvh",
        width: "100%",
      }}
    >
      <BackgroundBlurCircles />
      <div
        className="relative"
        style={{ zIndex: 1, height: "100%", width: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}
