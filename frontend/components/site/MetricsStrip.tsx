"use client";

import { useTranslations } from "next-intl";

interface MetricsStripProps {
  auroc?: number;
  cIndex?: number;
  miaAuc?: number;
  dpEpsilonLabel?: string;
}

export function MetricsStrip({
  auroc = 0.87,
  cIndex = 0.74,
  miaAuc = 0.56,
  dpEpsilonLabel = "configurable"
}: MetricsStripProps) {
  const t = useTranslations('site.metrics');

  const metrics = [
    { label: t('auroc'), value: auroc },
    { label: t('cindex'), value: cIndex },
    { label: t('mia'), value: miaAuc },
    { label: t('dp'), value: dpEpsilonLabel },
  ];

  return (
        <section className="py-12 relative">
      {/* Background gradient - subtle like hero */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#E0342C]/5 via-transparent to-transparent" />
      
      {/* Grid pattern - subtle like hero */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm">
              {metrics.map((metric, index) => (
                <div key={metric.label} className="flex items-center">
                  <span className="font-medium">
                    {metric.label}
                  </span>
              <span className="ml-1 text-[#E0342C] font-semibold">
                {typeof metric.value === 'number' ? metric.value.toFixed(2) : metric.value}
              </span>
              {index < metrics.length - 1 && (
                <span className="mx-4 text-gray-500 dark:text-gray-500">·</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
