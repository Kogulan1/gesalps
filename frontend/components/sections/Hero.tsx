"use client";
"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Metric } from "@/components/ui/Metric";
import { useLocale, useTranslations } from "next-intl";

export default function Hero() {
  const tHero = useTranslations('hero');
  const tReport = useTranslations('report');
  const tMetrics = useTranslations('metrics');
  const locale = useLocale();
  return (
    <section className="pt-12 md:pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight token-heading">{tHero('title')}</h1>
          <p className="mt-4 token-muted max-w-xl">{tHero('subtitle')}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="btn-primary rounded-2xl">
              <Link href={`/${locale}/signup`}>{tHero('ctaPrimary')}</Link>
            </Button>
            <Button variant="outline" asChild className="btn-secondary rounded-2xl">
              <a href="#docs">{tHero('ctaSecondary')}</a>
            </Button>
          </div>
        </div>
        <Card className="md:ml-auto bg-white/80" style={{ borderColor: "var(--ges-border)" }}>
          <CardHeader>
            <CardTitle>{tReport('caption')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Metric label={tMetrics('auroc')} value={new Intl.NumberFormat(locale).format(0.87)} tone="good" />
              <Metric label={tMetrics('cindex')} value={new Intl.NumberFormat(locale).format(0.74)} tone="neutral" />
              <Metric label={tMetrics('mia')} value={new Intl.NumberFormat(locale).format(0.56)} tone="risk" />
            </div>
            <div className="text-xs token-muted mt-3">{tReport('caption')}</div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
