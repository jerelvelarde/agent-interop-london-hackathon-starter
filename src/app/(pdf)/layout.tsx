import { Plus_Jakarta_Sans, Spline_Sans_Mono } from "next/font/google";
// CopilotChat v2 styles (scoped in effect — the .copilot-* classes only
// appear inside the pdf-analyst chat panels).
import "@copilotkit/react-ui/v2/styles.css";
// A2UI surface tokens, scoped to .a2ui-surface — safe, additive.
import "@/a2ui/theme.css";
// pdf-analyst brand tokens + chrome, scoped to .pdf-analyst-root (this
// segment's wrapper) so host :root tokens are never clobbered.
import "./pdf-analyst.css";
import { Providers } from "@/components/pdf-analyst/Providers";

/* pdf-analyst was authored against --font-plus-jakarta / --font-spline-mono.
 * The host root layout exposes Plus Jakarta / Spline Mono under different
 * variable names (--font-body-loader / --font-code-loader), so we load them
 * again here under the names the pdf-analyst CSS + components expect and set
 * them on the segment wrapper. */
const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const splineMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
  display: "swap",
});

/* Segment layout for /pdf-analyst/*. Deliberately NOT a root layout — the
 * host `src/app/layout.tsx` owns <html>/<body>. This only mounts the
 * pdf-analyst CopilotKit provider and scopes the pdf-analyst design tokens
 * to a wrapper element. */
export default function PdfAnalystLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Providers>
      <div
        className={`pdf-analyst-root ${plusJakarta.variable} ${splineMono.variable} antialiased min-h-screen flex flex-col`}
      >
        {children}
      </div>
    </Providers>
  );
}
