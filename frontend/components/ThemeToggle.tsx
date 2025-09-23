"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if dark class exists on html element
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);
  }, []);

  if (!mounted) {
    return null;
  }

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-lg">
      <Button
        variant={!isDark ? "default" : "ghost"}
        size="sm"
        onClick={toggleTheme}
        className="h-8 w-8 p-0"
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        variant={isDark ? "default" : "ghost"}
        size="sm"
        onClick={toggleTheme}
        className="h-8 w-8 p-0"
      >
        <Moon className="h-4 w-4" />
      </Button>
    </div>
  );
}
