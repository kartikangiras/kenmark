import { describe, expect, it } from "vitest";
import { getBase58Encoder } from "@solana/kit";
import devnetAttestations from "../../../../validation/devnet-attestations.json";
import realWorldAttestations from "../../../../validation/real-world-attestations.json";
import { allRecords, bySource, issuers, summary } from "../../src/lib/dashboard/records";

const uniqueSynthetic = new Set(devnetAttestations.map((r) => r.attestationAddress)).size;

describe("dashboard records", () => {
  it("normalises both artifacts into one list, deduplicating republished PDAs", () => {
    const records = allRecords();
    expect(records).toHaveLength(uniqueSynthetic + realWorldAttestations.length);
    expect(new Set(records.map((r) => r.attestation)).size).toBe(records.length);
  });

  it("stores real-world program IDs as the same 32-byte hex the chain holds", () => {
    const encoder = getBase58Encoder();
    for (const row of realWorldAttestations) {
      const record = allRecords().find((r) => r.attestation === row.attestationAddress);
      expect(record).toBeDefined();
      const expectedHex = Buffer.from(encoder.encode(row.programId)).toString("hex");
      expect(record!.programIdHex).toBe(expectedHex);
      expect(record!.programIdBase58).toBe(row.programId);
    }
  });

  it("recognises the SPL Token program in the synthetic cross-validation test", () => {
    const spl = allRecords().find((r) => r.test === "test5-cross-validation");
    expect(spl?.subject).toBe("SPL Token");
    expect(spl?.programIdBase58).toBe("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  });

  it("keeps the final state of the republished data-fidelity attestation", () => {
    const fidelity = allRecords().filter((r) => r.test === "test1-fidelity");
    expect(fidelity).toHaveLength(1);
    expect(fidelity[0].sourceCommit).toBe("test1-republished");
  });

  it("sums status, source, and schema-version splits to the total", () => {
    const s = summary();
    const records = allRecords();
    expect(s.attestations).toBe(records.length);
    expect(s.byStatus.Verified + s.byStatus.Mismatch + s.byStatus.Unknown).toBe(s.attestations);
    expect(s.bySource.synthetic + s.bySource["real-world"]).toBe(s.attestations);
    expect(Object.values(s.bySchemaVersion).reduce((a, b) => a + b, 0)).toBe(s.attestations);
    expect(s.cumulative.at(-1)).toBe(s.attestations);
    expect(s.cumulativeVerified.at(-1)).toBe(s.byStatus.Verified);
    expect(s.programs).toBe(new Set(records.map((r) => r.programIdHex)).size);
  });

  it("groups issuers by credential with their schema versions", () => {
    const list = issuers();
    expect(list).toHaveLength(summary().issuers);
    expect(list.reduce((n, i) => n + i.attestations, 0)).toBe(allRecords().length);
    const first = list[0];
    expect(first.schemas.map((s) => s.version)).toEqual([1, 2]);
  });

  it("produces one source row per test plus the registry cross-check", () => {
    const rows = bySource();
    const tests = new Set(allRecords().map((r) => r.test));
    expect(rows).toHaveLength(tests.size);
    expect(rows.find((r) => r.test === "registry-cross-check")?.statuses.sort()).toEqual([
      "Mismatch",
      "Unknown",
      "Verified",
    ]);
    expect(rows.reduce((n, r) => n + r.attestations, 0)).toBe(allRecords().length);
  });
});
