"use client";

/**
 * Six large, heavily-blurred colored ellipses — the signature CopilotKit
 * background effect. Coordinates and colors copied verbatim from the
 * canonical implementation in cpk-project-management:
 *   /Users/jerel-cpk/Projects/cpk-project-management/
 *     cpk-pm-adk-dashboard/apps/app/src/components/theme-shell/background-blur.tsx
 *
 * Designed for a ~1920px viewport. Render inside a container with
 * position:relative + overflow:hidden (see <BrandFrame>). All content
 * must paint at zIndex >= 1 to sit above the backdrop.
 */
export function BackgroundBlurCircles() {
  return (
    <>
      <div
        aria-hidden
        style={{
          position: "absolute",
          width: 446,
          height: 446,
          left: 1040,
          top: 11,
          borderRadius: "50%",
          background: "rgba(255, 172, 77, 0.2)",
          filter: "blur(103px)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          width: 609,
          height: 609,
          left: 1339,
          top: 625,
          borderRadius: "50%",
          background: "#C9C9DA",
          filter: "blur(103px)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          width: 609,
          height: 609,
          left: 670,
          top: -365,
          borderRadius: "50%",
          background: "#C9C9DA",
          filter: "blur(103px)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          width: 609,
          height: 609,
          left: 508,
          top: 702,
          borderRadius: "50%",
          background: "#F3F3FC",
          filter: "blur(103px)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          width: 446,
          height: 446,
          left: 128,
          top: 331,
          borderRadius: "50%",
          background: "rgba(255, 243, 136, 0.3)",
          filter: "blur(103px)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          width: 446,
          height: 446,
          left: -205,
          top: 803,
          borderRadius: "50%",
          background: "rgba(255, 172, 77, 0.2)",
          filter: "blur(103px)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
    </>
  );
}
