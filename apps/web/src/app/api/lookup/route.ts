import { NextResponse } from "next/server";
import { isRateLimitError } from "@kenmark/core";
import { InvalidProgramId, lookupProgram } from "@/lib/dashboard/chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const program = new URL(request.url).searchParams.get("program") ?? "";
  if (!program.trim()) {
    return NextResponse.json({ error: "Pass ?program=<base58 program id>." }, { status: 400 });
  }
  try {
    const result = await lookupProgram(program);
    return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof InvalidProgramId) {
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
