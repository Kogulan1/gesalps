"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const languages = [
  { code: "en", name: "EN" },
  { code: "de", name: "DE" },
  { code: "fr", name: "FR" },
  { code: "it", name: "IT" },
];

export function FloatingLanguageSelector() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const currentLanguage = languages.find((lang) => lang.code === locale) || languages[0];

  const handleLanguageChange = (newLocale: string) => {
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <div className="fixed bottom-16 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-lg"
          >
            <Globe className="h-4 w-4 mr-2" />
            {currentLanguage.name}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`flex items-center justify-between text-sm ${
                locale === language.code ? "bg-gray-100 dark:bg-gray-800" : ""
              }`}
            >
              <span>{language.name}</span>
              {locale === language.code && (
                <span className="text-[#E0342C]">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
