import { NextResponse } from "next/server";
import { allRecords } from "@/lib/dashboard/records";

/** The normalised attestation records behind the dashboard, as a download. */
export function GET() {
  const body = JSON.stringify(
    { cluster: "devnet", exportedAt: new Date().toISOString(), records: allRecords() },
    null,
    2,
  );
  return new NextResponse(body, {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="kenmark-devnet-attestations.json"',
    },
  });
}
