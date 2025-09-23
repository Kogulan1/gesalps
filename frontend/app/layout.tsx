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
    default: "GESALP AI – Synthetic clinical trial data",
    template: "%s – GESALP AI",
  },
  description:
    "Generate trial-grade synthetic datasets with measurable privacy and utility.",
  metadataBase: new URL("https://gesalps.example"),
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "GESALP AI",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Force avatar gradient on page load
              function forceAvatarGradient() {
                // Target all possible avatar selectors
                const selectors = [
                  '[data-radix-avatar-fallback]',
                  'div[class*="avatar-fallback"]',
                  'button[class*="radix"] div[class*="avatar-fallback"]',
                  'header [data-radix-avatar-fallback]',
                  '.relative.h-8.w-8 [data-radix-avatar-fallback]'
                ];
                
                selectors.forEach(selector => {
                  const elements = document.querySelectorAll(selector);
                  elements.forEach((element) => {
                    element.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                    element.style.color = 'white';
                    element.style.border = 'none';
                    element.style.boxShadow = 'none';
                  });
                });
              }
              
              // Run immediately
              forceAvatarGradient();
              
              // Run after DOM is ready
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', forceAvatarGradient);
              }
              
              // Run after a delay to catch dynamically loaded elements
              setTimeout(forceAvatarGradient, 100);
              setTimeout(forceAvatarGradient, 500);
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <ToasterProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ToasterProvider>
      </body>
    </html>
  );
}
