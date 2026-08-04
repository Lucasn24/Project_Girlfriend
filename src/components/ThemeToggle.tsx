import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setIsDark(prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={() => setIsDark((prev) => !prev)}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-muted transition-colors duration-200 hover:bg-surface-alt hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
    </button>
  );
}
