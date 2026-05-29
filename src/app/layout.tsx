"use client";

import "./globals.css";

import { Plus_Jakarta_Sans, Spline_Sans_Mono } from "next/font/google";
import { ThemeProvider } from "@/hooks/use-theme";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-body-loader",
  display: "swap",
});

const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-code-loader",
  display: "swap",
});

/**
 * Root layout.
 *
 * Intentionally minimal: only `<html>`, `<body>`, and `<ThemeProvider>`. The
 * Copilot provider is mounted per route group (see
 * `src/app/(default)/layout.tsx` and `src/app/(legal)/layout.tsx`) so each
 * group can carry its own agent + A2UI catalog without double-mounting the
 * provider. See PLAN.md §5 ("multi-catalog wiring") for details.
 *
 * Fonts: Plus Jakarta Sans (body) + Spline Sans Mono (code) are loaded via
 * next/font/google and exposed as CSS variables (--font-body-loader,
 * --font-code-loader) on `<html>`. The existing --font-body / --font-code
 * vars in globals.css remain authoritative; the *-loader vars are the
 * preloaded Next.js font handles for future composition.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${splineMono.variable}`}>
      <head>
        <title>CopilotKit</title>
        <link
          rel="icon"
          type="image/svg+xml"
          href="/copilotkit-logo-mark.svg"
        />
      </head>
      <body className={`antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
