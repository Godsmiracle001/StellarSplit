import { useTheme } from "./ThemeContex";

interface Props {
  className?: string;
}

export function ThemeToggle({ className = "" }: Props) {
  const { resolvedTheme, toggleTheme, theme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Simple icon toggle */}
      <button
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        className="
          relative w-14 h-7 rounded-full border-2 border-theme
          focus:outline-none focus:ring-2 focus:ring-offset-2 ring-theme
          transition-colors duration-300
          bg-theme
        "
        style={{
          backgroundColor: isDark
            ? "var(--color-primary)"
            : "var(--color-border)",
        }}
      >
        <span
          className="
            absolute top-0.5 left-0.5
            w-5 h-5 rounded-full
            flex items-center justify-center
            text-xs
            transition-transform duration-300 ease-in-out
            shadow-md
          "
          style={{
            transform: isDark ? "translateX(28px)" : "translateX(0)",
            backgroundColor: "var(--color-surface)",
          }}
        >
          {isDark ? "🌙" : "☀️"}
        </span>
      </button>

      {/* System preference option */}
      <select
        value={theme}
        onChange={(e) =>
          setTheme(e.target.value as "light" | "dark" | "system")
        }
        className="
          text-sm rounded-md px-2 py-1
          border border-theme
          bg-card-theme text-theme
          focus:outline-none focus:ring-2 ring-theme
          cursor-pointer
        "
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
