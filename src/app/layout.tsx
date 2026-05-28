"use client";

import "./globals.css";

import { ThemeProvider } from "@/hooks/use-theme";

/**
 * Root layout.
 *
 * Intentionally minimal: only `<html>`, `<body>`, and `<ThemeProvider>`. The
 * Copilot provider is mounted per route group (see
 * `src/app/(default)/layout.tsx` and `src/app/(legal)/layout.tsx`) so each
 * group can carry its own agent + A2UI catalog without double-mounting the
 * provider. See PLAN.md §5 ("multi-catalog wiring") for details.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
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
