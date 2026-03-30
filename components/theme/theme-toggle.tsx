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
      className="text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
      onClick={toggleTheme}
      title="Toggle dark mode"
      aria-label="Toggle dark mode"
    >
      <Moon className="h-4 w-4 dark:hidden" />
      <Sun className="hidden h-4 w-4 dark:block" />
    </Button>
  );
}
