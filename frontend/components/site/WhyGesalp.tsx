"use client";

import { useTranslations } from "next-intl";

export function WhyGesalp() {
  const t = useTranslations('site.whyGesalp');

  const reasons = [
    {
      key: 'privacy',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#E0342C]">
          <path d="M12 22S8 18 8 12V5L12 3L16 5V12C16 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: t('privacy.title'),
      description: t('privacy.description'),
    },
    {
      key: 'utility',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#E0342C]">
          <path d="M3 3V21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 9L12 6L16 10L20 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: t('utility.title'),
      description: t('utility.description'),
    },
    {
      key: 'enterprise',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#E0342C]">
          <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: t('enterprise.title'),
      description: t('enterprise.description'),
    },
  ];

  return (
        <section id="why-gesalp" className="py-24 bg-white relative">
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

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {reasons.map((reason) => (
                <div key={reason.key} className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white border border-gray-300">
                    {reason.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-black mb-4">
                    {reason.title}
                  </h3>
                  <p className="text-black leading-relaxed">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
