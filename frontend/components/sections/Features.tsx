"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export default function Features() {
  const t = useTranslations('features');
  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-6">
        <Feature title={t('title1')} desc={t('body1')} />
        <Feature title={t('title2')} desc={t('body2')} />
        <Feature title={t('title3')} desc={t('body3')} />
      </div>
    </section>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <Card className="bg-white" style={{ borderColor: "var(--ges-border)" }}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="token-muted">{desc}</CardContent>
    </Card>
  );
}
