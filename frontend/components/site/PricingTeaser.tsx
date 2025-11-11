"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Check } from "lucide-react";

export function PricingTeaser() {
  const t = useTranslations('site.pricing');
  const locale = useLocale();

  const plans = [
    {
      key: 'research',
      name: t('research.name'),
      price: t('research.price'),
      description: t('research.description'),
      features: [
        'research.feature1',
        'research.feature2', 
        'research.feature3',
        'research.feature4'
      ],
      buttonText: t('research.button'),
      buttonVariant: 'outline' as const,
      buttonHref: `/${locale}/signup`,
    },
    {
      key: 'starter',
      name: t('starter.name'),
      price: t('starter.price'),
      description: t('starter.description'),
      features: [
        'starter.feature1',
        'starter.feature2',
        'starter.feature3', 
        'starter.feature4'
      ],
      buttonText: t('starter.button'),
      buttonVariant: 'default' as const,
      buttonHref: `/${locale}/pricing`,
    },
    {
      key: 'pharma',
      name: t('pharma.name'),
      price: t('pharma.price'),
      description: t('pharma.description'),
      features: [
        'pharma.feature1',
        'pharma.feature2',
        'pharma.feature3',
        'pharma.feature4'
      ],
      buttonText: t('pharma.button'),
      buttonVariant: 'outline' as const,
      buttonHref: `/${locale}/contact`,
    },
  ];

  return (
        <section id="pricing" className="py-24 bg-white relative pt-32">
          {/* Background gradient - subtle like hero */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#E0342C]/5 via-transparent to-transparent" />
          
          {/* Grid pattern - subtle like hero */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-black mb-4">
            {t('title')}
          </h2>
              <p className="text-lg text-black">
            GESALP AI supports teams of all sizes, with pricing that scales.
          </p>
        </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {plans.map((plan, index) => (
                <div key={plan.key} className={`relative ${index === 1 ? 'md:-mt-4' : ''}`}>
                  {index === 1 && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <span className="inline-flex items-center rounded-full bg-[#E0342C] px-3 py-1 text-xs font-medium text-white shadow-lg">
                        Popular
                      </span>
                    </div>
                  )}
                  <Card className={`relative h-full ${index === 1 ? 'border-[#E0342C] shadow-lg' : 'border-gray-300'} bg-white`}>
                <CardHeader className="pb-6">
                      <CardTitle className="text-2xl font-bold text-black mb-2">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold text-[#E0342C] mb-2">{plan.price}</div>
                      <CardDescription className="text-black text-base">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <Check className="h-5 w-5 text-[#E0342C] mr-3 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-black leading-relaxed">
                          {t(feature)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant={plan.buttonVariant} 
                        className={`pricing-button w-full h-12 text-base font-medium ${
                          plan.buttonVariant === 'default'
                            ? 'bg-[#E0342C] hover:bg-[#E0342C]/90 text-white !text-white'
                            : 'border-gray-300 text-black hover:!text-white hover:bg-[#E0342C]'
                        }`}
                    asChild
                  >
                    <Link href={plan.buttonHref}>
                      {plan.buttonText}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
