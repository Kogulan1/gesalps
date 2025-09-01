"use client";
import { useTranslations } from "next-intl";

export default function LogosStrip() {
  const t = useTranslations('logos');
  return (
    <section className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 rounded-2xl border token-border token-panel shadow-sm">
        <div className="flex items-center gap-6 p-6 text-sm token-muted">
          <div className="mr-2">{t('trusted')}</div>
          <img src="/brands/brand1.svg" alt="Brand 1" className="h-6 opacity-70" />
          <img src="/brands/brand2.svg" alt="Brand 2" className="h-6 opacity-70" />
          <img src="/brands/brand3.svg" alt="Brand 3" className="h-6 opacity-70" />
          <img src="/brands/brand4.svg" alt="Brand 4" className="h-6 opacity-70" />
        </div>
      </div>
    </section>
  );
}
