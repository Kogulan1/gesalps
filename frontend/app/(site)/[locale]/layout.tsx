import { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { GlobalHeader } from "@/components/site/GlobalHeader";
import { MarketingFooter } from "@/components/site/MarketingFooter";
import { ConditionalFloatingControls } from "@/components/site/ConditionalFloatingControls";

const locales = ["en", "de", "fr", "it"] as const;

type Locale = (typeof locales)[number];

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  
  return {
    title: "Gesalp AI — Clinical-grade synthetic data",
    description: "Privacy-safe synthetic clinical datasets with audit proof. Built for sponsors, CROs, and AI teams.",
    openGraph: {
      title: "Gesalp AI — Clinical-grade synthetic data",
      description: "Privacy-safe synthetic clinical datasets with audit proof",
      type: "website",
      locale: locale,
    },
    twitter: {
      card: "summary_large_image",
      title: "Gesalp AI — Clinical-grade synthetic data",
      description: "Privacy-safe synthetic clinical datasets with audit proof",
    },
  };
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Force the locale for i18n
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="min-h-screen">
        <GlobalHeader />
        <main>{children}</main>
        <MarketingFooter />
        {/* <ConditionalFloatingControls /> - DISABLED FOR NOW */}
      </div>
    </NextIntlClientProvider>
  );
}
