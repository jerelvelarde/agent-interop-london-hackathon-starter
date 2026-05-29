"use client";

/**
 * Six blurred radial gradients positioned across the viewport.
 * Renders as a fixed, full-viewport, pointer-events:none layer behind
 * everything else. Tints come from CSS vars defined in src/app/globals.css:
 *   --cpk-blur-lilac, --cpk-blur-orange, --cpk-blur-yellow
 *
 * No props by default. To re-tint, edit the CSS vars (Customization Seam #1).
 *
 * Visual reference: cpk-project-management/cpk-pm-adk-dashboard
 *   apps/app/src/components/theme-shell/background-blur.tsx
 * — coordinates and sizes scaled to viewport units so the effect works
 * across breakpoints. Six circles: 2 lilac, 2 orange, 2 yellow, spread
 * top / mid / bottom for an organic frosted-glass feel.
 */
export function BackgroundBlurCircles() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Circle 1 — top-left lilac */}
      <div
        className="absolute rounded-full"
        style={{
          top: "-10%",
          left: "-5%",
          width: "45vw",
          height: "45vw",
          background: "var(--cpk-blur-grey, rgba(201, 201, 218, 0.45))",
          filter: "blur(120px)",
        }}
      />
      {/* Circle 2 — top-right orange */}
      <div
        className="absolute rounded-full"
        style={{
          top: "-15%",
          right: "-8%",
          width: "35vw",
          height: "35vw",
          background: "var(--cpk-blur-orange, rgba(255, 172, 77, 0.2))",
          filter: "blur(110px)",
        }}
      />
      {/* Circle 3 — mid-left yellow */}
      <div
        className="absolute rounded-full"
        style={{
          top: "35%",
          left: "20%",
          width: "30vw",
          height: "30vw",
          background: "var(--cpk-blur-yellow, rgba(255, 243, 136, 0.3))",
          filter: "blur(100px)",
        }}
      />
      {/* Circle 4 — mid-right lilac */}
      <div
        className="absolute rounded-full"
        style={{
          top: "45%",
          right: "5%",
          width: "40vw",
          height: "40vw",
          background: "var(--cpk-blur-offwhite, rgba(243, 243, 252, 0.55))",
          filter: "blur(130px)",
        }}
      />
      {/* Circle 5 — bottom-left orange */}
      <div
        className="absolute rounded-full"
        style={{
          bottom: "-10%",
          left: "10%",
          width: "35vw",
          height: "35vw",
          background: "var(--cpk-blur-orange, rgba(255, 172, 77, 0.2))",
          filter: "blur(110px)",
        }}
      />
      {/* Circle 6 — bottom-right yellow */}
      <div
        className="absolute rounded-full"
        style={{
          bottom: "-15%",
          right: "25%",
          width: "30vw",
          height: "30vw",
          background: "var(--cpk-blur-yellow, rgba(255, 243, 136, 0.3))",
          filter: "blur(120px)",
        }}
      />
    </div>
  );
}
