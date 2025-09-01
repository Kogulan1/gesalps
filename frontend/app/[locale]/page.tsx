import Hero from "@/components/sections/Hero";
import LogosStrip from "@/components/sections/LogosStrip";
import Features from "@/components/sections/Features";
import HowItWorks from "@/components/sections/HowItWorks";
import Pricing from "@/components/sections/Pricing";
import FAQ from "@/components/sections/FAQ";

export default function Home() {
  return (
    <div>
      <Hero />
      <LogosStrip />
      <Features />
      <HowItWorks />
      <Pricing />
      <FAQ />
    </div>
  );
}

