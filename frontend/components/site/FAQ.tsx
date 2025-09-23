"use client";

import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FAQ() {
  const t = useTranslations('site.faq');

  const faqs = [
    'privacy',
    'differentialPrivacy',
    'onPrem',
    'dataTypes',
    'mlLabels'
  ];

  return (
        <section id="faq" className="py-24 bg-white relative">
          {/* Background gradient - subtle like hero */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#E0342C]/5 via-transparent to-transparent" />
          
          {/* Grid pattern - subtle like hero */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-black sm:text-4xl">
            {t('title')}
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq) => (
                <AccordionItem key={faq} value={faq} className="border border-gray-200 rounded-lg px-6 py-4 bg-white mb-4">
                  <AccordionTrigger className="text-left text-black">
                {t(`${faq}.question`)}
              </AccordionTrigger>
                  <AccordionContent className="text-black pt-2">
                {t(`${faq}.answer`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
