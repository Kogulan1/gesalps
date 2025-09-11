"use client";
import Link from "next/link";
import { copy } from "./copy";

export default function Hero() {
  return (
    <section className="py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h1 className="text-3xl md:text-5xl tracking-tight">
            {copy.hero.title}
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-[17px] text-neutral-700 dark:text-neutral-300">
            {copy.hero.subtitle}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex rounded-xl px-5 py-3 bg-black text-white dark:bg-white dark:text-black"
            >
              {copy.hero.ctaPrimary}
            </Link>
            <Link
              href="/docs"
              className="inline-flex rounded-xl px-5 py-3 border bg-transparent"
            >
              {copy.hero.ctaSecondary}
            </Link>
          </div>
          <div className="mt-4 text-sm text-neutral-600 dark:text-neutral-300">
            <span className="mx-2">•</span> AUROC <strong>0.87</strong>
            <span className="mx-2">•</span> C‑Index <strong>0.74</strong>
            <span className="mx-2">•</span> MIA AUC <strong>0.56</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
