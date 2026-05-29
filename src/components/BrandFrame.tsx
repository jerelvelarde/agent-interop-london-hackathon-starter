"use client";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CUSTOMIZATION SEAM #2 — Re-brand the shell
// See HACKATHON.md §2 for the full recipe.
// Pattern to copy: this file — swap the logo, product name, and
// accent colors. Use it as a thin header wrapper around the app
// shell. The default props mirror the inherited demo so you can
// drop it in without breaking anything.
//
// Don't touch:
//   - src/components/EnvelopeInspector.tsx (judging chrome)
//   - chat affordances in src/app/page.tsx
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import type { ReactNode } from "react";
import { BackgroundBlurCircles } from "./BackgroundBlurCircles";
import { ModeToggle } from "./ModeToggle";

export interface BrandFrameProps {
  /** Product name shown in the header. Default: "CopilotKit". */
  productName?: string;
  /** Path (in /public) or absolute URL of the logo mark. */
  logoSrc?: string;
  /** Optional accent color (CSS color). Falls back to var(--border-default). */
  accentColor?: string;
  /** The app content beneath the header. */
  children?: ReactNode;
}

/**
 * BrandFrame — minimal header wrapper for the hackathon shell.
 *
 * Wraps the app in the signature CopilotKit frosted-glass backdrop
 * (BackgroundBlurCircles) and renders a lightweight header with the
 * product name, logo, and a ModeToggle in the trailing slot.
 *
 * Real hackathon teams can replace the contents while keeping the
 * shape — swap the logo, product name, or accent color via props.
 * Keep it shallow: the page layout (src/components/example-layout)
 * handles the chat / app split below this header.
 */
export function BrandFrame({
  productName = "CopilotKit",
  logoSrc = "/copilotkit-logo-mark.svg",
  accentColor,
  children,
}: BrandFrameProps) {
  return (
    <div className="relative flex flex-col h-full">
      <BackgroundBlurCircles />
      <header
        className="relative z-10 flex items-center gap-2 px-6 py-4 border-b"
        style={{
          borderColor:
            accentColor ?? "var(--border-default, var(--border, #dbdbe5))",
        }}
      >
        {logoSrc ? (
          <img src={logoSrc} alt={productName} className="h-7" />
        ) : null}
        <span className="font-extrabold text-2xl">{productName}</span>
        <div className="ml-auto">
          <ModeToggle />
        </div>
      </header>
      <div className="relative z-10 flex-1 min-h-0">{children}</div>
    </div>
  );
}
