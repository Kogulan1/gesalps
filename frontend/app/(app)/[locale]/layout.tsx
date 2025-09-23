import { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

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
    title: "Dashboard — Gesalp AI",
    description: "Manage your synthetic data projects and datasets.",
  };
}

export default async function AppLayout({
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
      <div className="min-h-screen bg-white">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
