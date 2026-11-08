"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IssuerLookup, type IssuerPreset } from "./issuer-lookup";
import { LookupPanel } from "./lookup-panel";
import { Pills } from "./ui";

export type VerifyMode = "program" | "credential" | "authority";

export const VERIFY_MODES = [
  { value: "program", label: "Program" },
  { value: "credential", label: "Credential" },
  { value: "authority", label: "Wallet" },
] as const;

export function modeFromParams(params: URLSearchParams): VerifyMode {
  if (params.has("credential")) return "credential";
  if (params.has("authority")) return "authority";
  const mode = params.get("mode");
  return mode === "credential" || mode === "authority" ? mode : "program";
}

const PRESETS: IssuerPreset[] = [
  { label: "kenmark-v1-issuer-1", credential: "BndDAk14MhEvBqCYdJxBgTRvUSZguM2fVx2ouFz2Gm9" },
  { label: "kenmark-v1-issuer-2", credential: "5pkJuZmQy5uZnViX6tXQ5o5BEKkxiBsAU9RQ5DdrM7r8" },
];

function Inner() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = modeFromParams(params);

  const setMode = (next: VerifyMode) => {
    router.replace(next === "program" ? "/dashboard/verify" : `/dashboard/verify?mode=${next}`, {
      scroll: false,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-db-muted">What do you have?</span>
        <div className="rounded-full bg-db-black p-1">
          <Pills options={VERIFY_MODES} value={mode} onChange={setMode} label="What to verify" />
        </div>
      </div>
      {mode === "program" ? (
        <LookupPanel initialProgram={params.get("program") ?? ""} />
      ) : (
        <IssuerLookup
          key={mode}
          presets={PRESETS}
          basePath="/dashboard/verify"
          initialMode={mode}
          hideModeToggle
        />
      )}
    </div>
  );
}

export function VerifyPanel() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
