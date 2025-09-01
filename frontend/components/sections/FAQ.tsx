"use client";
import { Accordion } from "@/components/ui/accordion";
import { useTranslations } from "next-intl";

export default function FAQ() {
  const t = useTranslations('faq');
  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold mb-6">{t('header')}</h2>
        <Accordion
          items={[
            { id: "privacy", question: t('q1'), answer: t('a1') },
            { id: "hosting", question: t('q2'), answer: t('a2') },
            { id: "dp", question: t('q3'), answer: t('a3') },
            { id: "onprem", question: t('q4'), answer: t('a4') },
            { id: "support", question: t('q5'), answer: t('a5') },
          ]}
        />
      </div>
    </section>
  );
}
