"use client";
import Link from "next/link";
import { copy } from "./copy";

export default function Hero() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
            {copy.hero.title}
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-neutral-600 dark:text-neutral-300">
            {copy.hero.subtitle}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex rounded-xl px-5 py-3 bg-black text-white dark:bg-white dark:text-black"
            >
              {copy.hero.ctaPrimary}
            </Link>
            <Link
              href="/docs"
              className="inline-flex rounded-xl px-5 py-3 border"
            >
              {copy.hero.ctaSecondary}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

