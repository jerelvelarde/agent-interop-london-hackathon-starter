interface ModeToggleProps {
  mode: "chat" | "app";
  onModeChange: (mode: "chat" | "app") => void;
}

/**
 * Chat / app mode toggle (separate from the theme ModeToggle in BrandFrame).
 *
 * Positioned `top-20` so it sits below the BrandFrame header band
 * (CUSTOMIZATION SEAM #2) — both elements anchor to `right-4`, so without
 * this offset the chat/app toggle would overlap the theme toggle in the
 * page header.
 */
export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="fixed top-20 right-4 z-50 flex rounded-full border border-[var(--border)] bg-[var(--secondary)] p-0.5 max-lg:top-16 max-lg:right-2 max-lg:scale-90">
      <button
        onClick={() => onModeChange("chat")}
        className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
          mode === "chat"
            ? "bg-[var(--card)] text-[var(--card-foreground)] shadow-sm"
            : "text-[var(--muted-foreground)]"
        }`}
      >
        Chat
      </button>
      <button
        onClick={() => onModeChange("app")}
        className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all cursor-pointer ${
          mode === "app"
            ? "bg-[var(--card)] text-[var(--card-foreground)] shadow-sm"
            : "text-[var(--muted-foreground)]"
        }`}
      >
        App
      </button>
    </div>
  );
}
