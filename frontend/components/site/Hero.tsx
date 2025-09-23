"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useLocale } from "next-intl";

export function Hero() {
  const t = useTranslations('site.hero');
  const locale = useLocale();
  
  // Debug: Log translation values
  console.log('Hero - Locale:', locale);
  console.log('Hero - Title:', t('title'));
  console.log('Hero - Subtitle:', t('subtitle'));

  return (
        <section className="relative overflow-hidden">
      {/* Background gradient - subtle like Vercel */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#E0342C]/5 via-transparent to-transparent" />
      
      {/* Grid pattern - very subtle */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                {t('title')}
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
                {t('subtitle')}
              </p>
          
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button size="lg" asChild style={{ backgroundColor: '#E0342C', color: 'white' }}>
              <Link href={`/${locale}/signup`}>
                {t('cta.getStarted')}
              </Link>
            </Button>
                <Button variant="outline" size="lg" asChild className="border-gray-300 text-gray-700 hover:text-black hover:bg-gray-50">
                  <Link href="#pricing">
                    {t('cta.bookDemo')}
                  </Link>
                </Button>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            {t('meta')}
          </p>
        </div>
      </div>
    </section>
  );
}
