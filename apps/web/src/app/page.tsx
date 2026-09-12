import { Navigation } from "@/components/landing/navigation";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { UseCasesSection } from "@/components/landing/use-cases-section";
import { EvidenceSection } from "@/components/landing/evidence-section";
import { PlaygroundSection } from "@/components/landing/playground-section";
import { FooterSection } from "@/components/landing/footer-section";

export default function Home() {
  return (
    <main id="main" className="relative min-h-screen overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <UseCasesSection />
      <EvidenceSection />
      <PlaygroundSection />
      <FooterSection />
    </main>
  );
}
