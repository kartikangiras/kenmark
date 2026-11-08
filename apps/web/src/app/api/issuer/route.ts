import { NextResponse } from "next/server";
import { isRateLimitError } from "@kenmark/core";
import { InvalidAddress, lookupAuthority, lookupCredential } from "@/lib/dashboard/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `?credential=<addr>` returns the credential and its attestations; `?authority=<addr>` lists a wallet's credentials. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const credential = params.get("credential")?.trim();
  const authority = params.get("authority")?.trim();
  if (!credential && !authority) {
    return NextResponse.json(
      { error: "Pass ?credential=<address> or ?authority=<address>." },
      { status: 400 },
    );
  }
  try {
    const result = credential
      ? await lookupCredential(credential)
      : await lookupAuthority(authority!);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof InvalidAddress) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (isRateLimitError(err)) {
      return NextResponse.json(
        {
          error:
            "The devnet RPC endpoint is rate-limiting getProgramAccounts. Try again in a few seconds.",
          retryable: true,
        },
        { status: 503, headers: { "retry-after": "3" } },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Devnet RPC failed: ${message}` }, { status: 502 });
  }
}
