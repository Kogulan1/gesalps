"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const languages = [
  { code: "en", name: "EN" },
  { code: "de", name: "DE" },
  { code: "fr", name: "FR" },
  { code: "it", name: "IT" },
];

export function FloatingControls() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Check if dark mode is already set
    const hasDarkClass = document.documentElement.classList.contains('dark');
    setIsDark(hasDarkClass);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    
    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!mounted) {
    return null;
  }

  // Extract current locale from pathname
  const pathSegments = pathname.split('/').filter(Boolean);
  const currentLocale = pathSegments[0] || 'en';
  const currentLanguage = languages.find((lang) => lang.code === currentLocale) || languages[0];

  const handleLanguageChange = (newLocale: string) => {
    console.log('Language change requested:', { newLocale, currentLocale, pathname });
    const newPath = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    console.log('New path:', newPath);
    
    // Use window.location for more reliable navigation
    if (typeof window !== 'undefined') {
      window.location.href = newPath;
    } else {
      router.push(newPath);
    }
  };


  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col sm:flex-row items-center gap-3">
      {/* Language Selector - DISABLED FOR NOW */}
      {/* <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-white border-gray-300 text-gray-900 hover:bg-gray-50 shadow-lg px-3 py-2"
          >
            <Globe className="h-4 w-4 mr-2 text-gray-700" />
            <span className="hidden sm:inline">{currentLanguage.name}</span>
            <span className="sm:hidden">{currentLanguage.name}</span>
          </Button>
        </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 bg-white border-gray-200 shadow-lg">
              {languages.map((language) => (
                <DropdownMenuItem
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`flex items-center justify-between text-sm px-3 py-2 hover:bg-gray-100 ${
                    currentLocale === language.code ? "bg-gray-100" : ""
                  }`}
                >
                  <span className="text-gray-900 hover:text-gray-900">{language.name}</span>
                  {currentLocale === language.code && (
                    <span className="text-[#E0342C] font-bold">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
        </DropdownMenuContent>
      </DropdownMenu> */}

      {/* Theme Toggle - DISABLED FOR NOW */}
      {/* <ThemeToggle /> */}
    </div>
  );
}
