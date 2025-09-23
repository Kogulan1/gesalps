import { Hero } from "@/components/site/Hero";
import { MetricsStrip } from "@/components/site/MetricsStrip";
import { UseCaseChips } from "@/components/site/UseCaseChips";
import { FeatureBento } from "@/components/site/FeatureBento";
import { Steps } from "@/components/site/Steps";
import { WhyGesalp } from "@/components/site/WhyGesalp";
import { PricingTeaser } from "@/components/site/PricingTeaser";
import { FAQ } from "@/components/site/FAQ";

export default function HomePage() {
  return (
    <>
      <Hero />
      <MetricsStrip />
      <UseCaseChips />
      <FeatureBento />
      <Steps />
      <WhyGesalp />
      <PricingTeaser />
      <FAQ />
    </>
  );
}
