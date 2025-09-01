import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from "@/components/toast/Toaster";
import { AuthProvider } from "@/components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Gesalps – Synthetic clinical trial data",
    template: "%s – Gesalps",
  },
  description:
    "Generate trial-grade synthetic datasets with measurable privacy and utility.",
  metadataBase: new URL("https://gesalps.example"),
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Gesalps",
    description:
      "Synthetic clinical trial data with measurable privacy and utility.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100`}>
        <ToasterProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ToasterProvider>
      </body>
    </html>
  );
}
