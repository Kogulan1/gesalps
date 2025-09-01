import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { ToasterProvider } from "@/components/toast/Toaster";
import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import VerifyEmailBanner from "@/components/VerifyEmailBanner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Gesalps – Synthetic clinical trial data", template: "%s – Gesalps" },
  description: "Generate trial-grade synthetic datasets with measurable privacy and utility.",
};

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "de" }, { locale: "fr" }, { locale: "it" }];
}

async function getMessages(locale: string) {
  try {
    const messages = (await import(`../../messages/${locale}.json`)).default;
    return messages;
  } catch {
    return null;
  }
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages(locale);
  if (!messages) notFound();

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Zurich">
          <ToasterProvider>
            <AuthProvider>
              <Navbar />
              <VerifyEmailBanner />
              <main>{children}</main>
              <Footer />
            </AuthProvider>
          </ToasterProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
