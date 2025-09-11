import type { Metadata } from "next";
import Hero from "@/components/marketing/Hero";
import Logos from "@/components/marketing/Logos";
import Highlights from "@/components/marketing/Highlights";
import HowItWorks from "@/components/marketing/HowItWorks";
import ReportPreview from "@/components/marketing/ReportPreview";
import Pricing from "@/components/marketing/Pricing";
import Roadmap from "@/components/marketing/Roadmap";
import FAQ from "@/components/marketing/FAQ";

export const metadata: Metadata = {
  title: "Gesalps — Clinical-grade synthetic data",
  description:
    "Generate trial-grade synthetic datasets with measurable privacy and utility. Agent-assisted, compliance-ready.",
  openGraph: {
    title: "Gesalps — Clinical-grade synthetic data",
    description:
      "Generate trial-grade synthetic datasets with measurable privacy and utility.",
    url: "https://gealpsai",
    siteName: "Gesalps",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gesalps — Clinical-grade synthetic data",
    description:
      "Agent-assisted synthetic data with measurable privacy and utility.",
    images: ["/og.png"],
  },
};

export default function Page() {
  return (
    <main>
      <Hero />
      <Logos />
      <Highlights />
      <HowItWorks />
      <ReportPreview />
      <Pricing />
      <Roadmap />
      <FAQ />
    </main>
  );
}
