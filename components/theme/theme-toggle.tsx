"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.classList.contains("dark");
    const next = isDark ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
    window.localStorage.setItem("aso-theme", next);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-slate-600 hover:bg-lime-100/80 hover:text-lime-700 dark:text-lime-300/80 dark:hover:bg-lime-500/15 dark:hover:text-lime-200"
      onClick={toggleTheme}
      title="Toggle dark mode"
      aria-label="Toggle dark mode"
    >
      <Moon className="h-4 w-4 dark:hidden" />
      <Sun className="hidden h-4 w-4 dark:block" />
    </Button>
  );
}
