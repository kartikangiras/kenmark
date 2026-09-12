"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useReveal } from "@/hooks/use-reveal";

/**
 * Waitlist capture. No backend exists yet: set WAITLIST_ENDPOINT to a form
 * provider URL (Formspree etc.) to collect submissions; until then the form
 * falls back to a prefilled mailto so no submission is silently dropped.
 */
const WAITLIST_ENDPOINT = "";
const CONTACT_EMAIL = "angiraskartik@gmail.com";

export function PlaygroundSection() {
  const { ref, isVisible } = useReveal<HTMLDivElement>(0.2);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;

    if (!WAITLIST_ENDPOINT) {
      // No collection backend yet — hand off to the user's mail client instead
      // of pretending the address was stored somewhere.
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
        "Kenmark Playground waitlist",
      )}&body=${encodeURIComponent(`Add me to the Kenmark Playground waitlist: ${email}`)}`;
      setStatus("done");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch(WAITLIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section id="playground" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div
          ref={ref}
          className={`relative border border-foreground transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          onMouseMove={handleMouseMove}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-10 pointer-events-none transition-opacity duration-300"
            style={{
              background: `radial-gradient(600px circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,0.15), transparent 40%)`,
            }}
          />

          <div className="relative z-10 px-8 lg:px-16 py-16 lg:py-24">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-12">
              <div className="flex-1">
                <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-8">
                  <span aria-hidden="true" className="w-12 h-px bg-foreground/30" />
                  Coming soon — in development
                </span>

                <h2 className="text-6xl md:text-7xl lg:text-[72px] font-display tracking-tight mb-8 leading-[0.95]">
                  The Kenmark
                  <br />
                  Playground
                  <br />
                  <span className="text-muted-foreground">try before you trust.</span>
                </h2>

                <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-xl">
                  Paste a program ID, see its full security profile, and test your policy file
                  against it — right in the browser. Join the waitlist and we&apos;ll tell you
                  when it&apos;s live.
                </p>

                {status === "done" ? (
                  <p role="status" className="text-lg text-foreground">
                    You&apos;re on the list — thanks.
                  </p>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 max-w-xl"
                  >
                    <div className="flex-1">
                      <label htmlFor="waitlist-email" className="block text-sm text-muted-foreground mb-2">
                        Email address
                      </label>
                      <input
                        id="waitlist-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@protocol.xyz"
                        className="w-full h-14 px-5 bg-input border border-foreground/20 rounded-full text-base text-foreground placeholder:text-muted-foreground/60 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring transition-all"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={status === "submitting"}
                      className="bg-foreground hover:bg-foreground/90 text-background px-8 h-14 text-base rounded-full group"
                    >
                      {status === "submitting" ? "Joining…" : "Join waitlist"}
                      <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </form>
                )}

                {status === "error" && (
                  <p role="alert" className="mt-4 text-sm text-destructive">
                    That didn&apos;t go through — try again, or email {CONTACT_EMAIL} directly.
                  </p>
                )}

                <p className="text-sm text-muted-foreground mt-8 font-mono">
                  Shipped today: the schema, the aggregator, and the validation suite — on GitHub.
                </p>
              </div>

              {/* Mock playground panel */}
              <div className="hidden lg:block w-[420px] shrink-0" aria-hidden="true">
                <div className="border border-foreground/10 bg-black p-6 font-mono text-xs leading-relaxed">
                  <div className="flex items-center gap-2 pb-4 mb-4 border-b border-foreground/10">
                    <span className="w-2 h-2 rounded-full bg-foreground/20" />
                    <span className="w-2 h-2 rounded-full bg-foreground/20" />
                    <span className="w-2 h-2 rounded-full bg-foreground/20" />
                    <span className="ml-2 text-muted-foreground">playground — preview</span>
                  </div>
                  <p className="text-muted-foreground mb-1">$ program id</p>
                  <p className="text-foreground mb-4">PhoeNiXZ8ByJ…FHGqdXY</p>
                  <p className="text-muted-foreground mb-1">$ policy</p>
                  <p className="text-foreground mb-1">verified_build: required</p>
                  <p className="text-foreground mb-4">upgrade_authority: [Immutable]</p>
                  <p className="text-muted-foreground mb-1">$ verdict</p>
                  <p>
                    <span className="text-status-verified">PASS</span>
                    <span className="text-muted-foreground"> — 2/2 checks satisfied</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div aria-hidden="true" className="absolute top-0 right-0 w-32 h-32 border-b border-l border-foreground/10" />
          <div aria-hidden="true" className="absolute bottom-0 left-0 w-32 h-32 border-t border-r border-foreground/10" />
        </div>
      </div>
    </section>
  );
}
