"use client";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from "next-intl";

export default function Pricing() {
  const t = useTranslations('pricing');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  return (
    <section className="py-12" id="pricing">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold mb-6">{t('header')}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <PricingCard
            title={t('research.title')}
            price={t('research.price')}
            features={["1 project", "≤5k rows", "CTGAN", "Basic report"]}
            cta={<Button asChild className="btn-primary rounded-2xl"><Link href={`/${locale}/signup`}>{tNav('getStarted')}</Link></Button>}
          />
          <PricingCard
            title={t('starter.title')}
            price={t('starter.price')}
            features={["5 projects", "CTGAN/TVAE", "Full utility metrics", "Email support"]}
            cta={<Button variant="outline" className="btn-secondary rounded-2xl">Choose Plan</Button>}
          />
          <PricingCard
            title={t('pharma.title')}
            price={t('pharma.price')}
            features={["Unlimited", "Diffusion + DP", "Full privacy suite + audit PDF", "SSO", "On‑prem option"]}
            cta={<Button variant="outline" className="btn-secondary rounded-2xl" asChild><Link href={`/${locale}/contact`}>Choose Plan</Link></Button>}
          />
        </div>
      </div>
    </section>
  );
}

function PricingCard({ title, price, features, cta }: { title: string; price: string; features: string[]; cta: React.ReactNode }) {
  return (
    <Card className="bg-white" style={{ borderColor: "var(--ges-border)" }}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{price}</div>
        <ul className="mt-4 space-y-2 token-muted">
          {features.map((f) => (
            <li key={f}>• {f}</li>
          ))}
        </ul>
        <div className="mt-6">{cta}</div>
      </CardContent>
    </Card>
  );
}
