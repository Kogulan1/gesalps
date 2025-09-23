"use client";

import { useTranslations } from "next-intl";

export function UseCaseChips() {
  const t = useTranslations('site.chips');

  const useCases = [
    'trialPlanning',
    'cohortExploration', 
    'realWorldEvidence',
    'modelDevelopment',
    'vendorDataSharing'
  ];

  return (
        <section className="py-16 relative">
          {/* Background gradient - subtle like hero */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#E0342C]/5 via-transparent to-transparent" />
          
          {/* Grid pattern - subtle like hero */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {useCases.map((useCase) => (
                <div
                  key={useCase}
                  className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:border-[#E0342C] hover:text-[#E0342C] transition-colors"
                >
              {t(useCase)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
