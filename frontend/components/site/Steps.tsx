"use client";

import { useTranslations } from "next-intl";

export function Steps() {
  const t = useTranslations('site.steps');

  const steps = [
    {
      number: 1,
      title: t('upload.title'),
      description: t('upload.description'),
    },
    {
      number: 2,
      title: t('start.title'),
      description: t('start.description'),
    },
    {
      number: 3,
      title: t('evaluate.title'),
      description: t('evaluate.description'),
    },
    {
      number: 4,
      title: t('deliver.title'),
      description: t('deliver.description'),
    },
  ];

  return (
        <section id="enterprise" className="py-24 bg-white relative">
          {/* Background gradient - subtle like hero */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#E0342C]/5 via-transparent to-transparent" />
          
          {/* Grid pattern - subtle like hero */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-black sm:text-4xl">
            {t('title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#E0342C] bg-white text-[#E0342C] font-bold text-lg">
                {step.number}
              </div>
                  <h3 className="text-lg font-semibold text-black mb-2">
                {step.title}
              </h3>
                  <p className="text-black">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
