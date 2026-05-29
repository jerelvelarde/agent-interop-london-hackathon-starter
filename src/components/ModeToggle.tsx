"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

/**
 * Small button that cycles dark → light → system. Renders icon for current mode.
 */
export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  const label = `Theme: ${theme}. Click to change.`;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center w-9 h-9 rounded-[var(--radius-sm,8px)] hover:bg-[var(--accent)] transition-colors text-[var(--text-secondary,currentColor)]"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
