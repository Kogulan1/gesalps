"use client";
import { useTranslations } from "next-intl";

export default function HowItWorks() {
  const t = useTranslations('how');
  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold mb-6">{t('header')}</h2>
        <div className="grid md:grid-cols-4 gap-4 text-sm">
          <Step n={1} title={t('step1')} />
          <Step n={2} title={t('step2')} />
          <Step n={3} title={t('step3')} />
          <Step n={4} title={t('step4')} />
        </div>
      </div>
    </section>
  );
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: "var(--ges-border)" }}>
      <div className="text-xs token-muted">Step {n}</div>
      <div className="font-medium mt-1">{title}</div>
    </div>
  );
}
