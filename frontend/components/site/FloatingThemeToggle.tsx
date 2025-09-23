"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function FloatingThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-1 shadow-lg">
        <Button
          variant={theme === "light" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTheme("light")}
          className="h-8 w-8 p-0"
        >
          <Sun className="h-4 w-4" />
        </Button>
        <Button
          variant={theme === "dark" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTheme("dark")}
          className="h-8 w-8 p-0"
        >
          <Moon className="h-4 w-4" />
        </Button>
        <Button
          variant={theme === "system" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTheme("system")}
          className="h-8 w-8 p-0"
        >
          <Monitor className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
