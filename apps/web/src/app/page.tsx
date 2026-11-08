import { Hero, TopBar } from "@/components/landing/hero";
import { Pillars } from "@/components/landing/pillars";
import { IssuerCta, LookupCta } from "@/components/landing/light-sections";
import { LandingFooter } from "@/components/landing/footer";

export default function Home() {
  return (
    <main id="main" className="min-h-screen overflow-x-clip bg-ink text-white">
      <div className="mx-auto max-w-[1360px] px-5 pb-12 pt-6 sm:px-10">
        <TopBar />
        <Hero />
        <Pillars />
        <LookupCta />
        <IssuerCta />
        <LandingFooter />
      </div>
    </main>
  );
}
