/**
 * CopilotKit brand chart palette — Plus Jakarta Sans / brand color system.
 *
 * Colors are routed through CSS variables (defined in src/app/globals.css and
 * src/lib/a2ui-theme.css) so charts automatically retheme alongside the rest
 * of the surface. Order prioritises the lavender/mint/orange/yellow accents
 * favoured by the new lavender / frosted-glass design tokens.
 */
export const CHART_COLORS = [
  "var(--cpk-lilac-400)",
  "var(--cpk-mint-400)",
  "var(--cpk-orange-400)",
  "var(--cpk-yellow-400)",
  "var(--cpk-mint-800)",
  "var(--accent)",
  "var(--destructive)",
] as const;

export const CHART_CONFIG = {
  tooltipStyle: {
    backgroundColor: "var(--chart-tooltip-bg)",
    border: "1px solid var(--chart-tooltip-border)",
    borderRadius: "var(--radius-md, 12px)",
    padding: "10px 14px",
    color: "var(--text-primary, var(--foreground))",
    fontSize: "13px",
    fontFamily: "var(--font-body)",
    boxShadow: "var(--elevation-md, 0 4px 12px rgba(0,0,0,0.08))",
  },
};
