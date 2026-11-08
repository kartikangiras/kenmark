import devnetAttestations from "../../../../../validation/devnet-attestations.json";
import realWorldAttestations from "../../../../../validation/real-world-attestations.json";

export type VerificationStatus = "Verified" | "Mismatch" | "Unknown";
export type RecordSource = "synthetic" | "real-world";

/** One published attestation, normalised across the two validation artifacts. */
export interface AttestationRecord {
  attestation: string;
  source: RecordSource;
  /** Validation test that published it, e.g. `test3-memcmp`, or `registry-cross-check`. */
  test: string;
  /** Human label for the subject: the program name when known, else the test name. */
  subject: string;
  /** Hex-encoded 32-byte programId as stored in the attestation. */
  programIdHex: string;
  /** Base58 programId when the subject is a real program. */
  programIdBase58: string | null;
  credential: string;
  schema: string;
  schemaVersion: number;
  status: VerificationStatus;
  binaryHash: string;
  sourceCommit: string;
  /** Unix seconds. 0 means the issuer had no verification date. */
  verificationTimestamp: number;
  publishSignature: string;
  /** Registry snapshot the record was built from, for real-world rows. */
  registry?: {
    isVerified: boolean;
    message: string;
    repoUrl: string;
    lastVerifiedAt: string | null;
  };
}

interface SyntheticRow {
  test: string;
  attestationAddress: string;
  credential: string;
  schema: string;
  schemaVersion: number;
  programId: string;
  publishSignature: string;
  fields: {
    programId: string;
    binaryHash: string;
    sourceCommit: string;
    verificationStatus: string;
    verificationTimestamp: string;
  };
}

interface RealWorldRow {
  subject: string;
  programId: string;
  attestationAddress: string;
  publishSignature: string;
  osecSnapshot: {
    is_verified: boolean;
    message: string;
    on_chain_hash: string;
    executable_hash: string;
    repo_url: string;
    commit: string;
    last_verified_at: string | null;
  };
  derivedStatus: string;
  decodedRoundTrip: boolean;
}

export const TEST_LABELS: Record<string, string> = {
  "test1-fidelity": "Data fidelity",
  "test2-multi-issuer": "Multi-issuer isolation",
  "test3-memcmp": "memcmp filter accuracy",
  "test4-roundtrip": "Binary round-trip",
  "test5-cross-validation": "Cross-validation vs mainnet",
  "test6-schema-version": "Schema version compatibility",
  "registry-cross-check": "Registry cross-check",
};

const KNOWN_PROGRAMS: Record<string, string> = {
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: "SPL Token",
};

function asStatus(value: string): VerificationStatus {
  return value === "Verified" || value === "Mismatch" ? value : "Unknown";
}

function base58ToHex(address: string): string {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let n = 0n;
  for (const ch of address) n = n * 58n + BigInt(ALPHABET.indexOf(ch));
  return n.toString(16).padStart(64, "0");
}

function hexToBase58(hex: string): string {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let n = BigInt(`0x${hex}`);
  let out = "";
  while (n > 0n) {
    out = ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (let i = 0; i < hex.length && hex.slice(i, i + 2) === "00"; i += 2) out = `1${out}`;
  return out;
}

function syntheticRecords(): AttestationRecord[] {
  const rows = devnetAttestations as SyntheticRow[];
  const byAddress = new Map<string, AttestationRecord>();
  for (const row of rows) {
    const base58 = hexToBase58(row.programId);
    const known = KNOWN_PROGRAMS[base58];
    // Test 1 republishes to the same PDA after closing it; keep the final state.
    byAddress.set(row.attestationAddress, {
      attestation: row.attestationAddress,
      source: "synthetic",
      test: row.test,
      subject: known ?? TEST_LABELS[row.test] ?? row.test,
      programIdHex: row.programId,
      programIdBase58: known ? base58 : null,
      credential: row.credential,
      schema: row.schema,
      schemaVersion: row.schemaVersion,
      status: asStatus(row.fields.verificationStatus),
      binaryHash: row.fields.binaryHash,
      sourceCommit: row.fields.sourceCommit,
      verificationTimestamp: Number(row.fields.verificationTimestamp),
      publishSignature: row.publishSignature,
    });
  }
  return [...byAddress.values()];
}

function realWorldRecords(issuerCredential: string, issuerSchema: string): AttestationRecord[] {
  return (realWorldAttestations as RealWorldRow[]).map((row) => ({
    attestation: row.attestationAddress,
    source: "real-world",
    test: "registry-cross-check",
    subject: row.subject,
    programIdHex: base58ToHex(row.programId),
    programIdBase58: row.programId,
    credential: issuerCredential,
    schema: issuerSchema,
    schemaVersion: 1,
    status: asStatus(row.derivedStatus),
    binaryHash: row.osecSnapshot.on_chain_hash || "0".repeat(64),
    sourceCommit: row.osecSnapshot.commit,
    verificationTimestamp: row.osecSnapshot.last_verified_at
      ? Math.floor(Date.parse(row.osecSnapshot.last_verified_at) / 1000)
      : 0,
    publishSignature: row.publishSignature,
    registry: {
      isVerified: row.osecSnapshot.is_verified,
      message: row.osecSnapshot.message,
      repoUrl: row.osecSnapshot.repo_url,
      lastVerifiedAt: row.osecSnapshot.last_verified_at,
    },
  }));
}

let cached: AttestationRecord[] | null = null;

/** Every attestation the validation suite and cross-check published, newest last. */
export function allRecords(): AttestationRecord[] {
  if (cached) return cached;
  const synthetic = syntheticRecords();
  // The cross-check publishes under the first issuer's v1 schema, the same one
  // test 1 uses.
  const anchor = synthetic.find((r) => r.test === "test1-fidelity") ?? synthetic[0];
  cached = [...synthetic, ...realWorldRecords(anchor.credential, anchor.schema)];
  return cached;
}

export interface Issuer {
  credential: string;
  label: string;
  schemas: { address: string; version: number }[];
  attestations: number;
}

export function issuers(): Issuer[] {
  const records = allRecords();
  const order: string[] = [];
  const byCredential = new Map<string, Issuer>();
  for (const r of records) {
    if (!byCredential.has(r.credential)) {
      order.push(r.credential);
      byCredential.set(r.credential, {
        credential: r.credential,
        label: `issuer-${order.length}`,
        schemas: [],
        attestations: 0,
      });
    }
    const issuer = byCredential.get(r.credential)!;
    issuer.attestations++;
    if (!issuer.schemas.some((s) => s.address === r.schema)) {
      issuer.schemas.push({ address: r.schema, version: r.schemaVersion });
    }
  }
  return order.map((c) => byCredential.get(c)!);
}

export interface Summary {
  attestations: number;
  programs: number;
  issuers: number;
  byStatus: Record<VerificationStatus, number>;
  bySource: Record<RecordSource, number>;
  bySchemaVersion: Record<number, number>;
  /** Cumulative attestation count in verification-timestamp order. */
  cumulative: number[];
  cumulativeVerified: number[];
  latestTimestamp: number;
}

export function summary(): Summary {
  const records = allRecords();
  const byStatus: Record<VerificationStatus, number> = { Verified: 0, Mismatch: 0, Unknown: 0 };
  const bySource: Record<RecordSource, number> = { synthetic: 0, "real-world": 0 };
  const bySchemaVersion: Record<number, number> = {};
  for (const r of records) {
    byStatus[r.status]++;
    bySource[r.source]++;
    bySchemaVersion[r.schemaVersion] = (bySchemaVersion[r.schemaVersion] ?? 0) + 1;
  }
  const ordered = [...records].sort((a, b) => a.verificationTimestamp - b.verificationTimestamp);
  const cumulative: number[] = [];
  const cumulativeVerified: number[] = [];
  let total = 0;
  let verified = 0;
  for (const r of ordered) {
    total++;
    if (r.status === "Verified") verified++;
    cumulative.push(total);
    cumulativeVerified.push(verified);
  }
  return {
    attestations: records.length,
    programs: new Set(records.map((r) => r.programIdHex)).size,
    issuers: new Set(records.map((r) => r.credential)).size,
    byStatus,
    bySource,
    bySchemaVersion,
    cumulative,
    cumulativeVerified,
    latestTimestamp: Math.max(...records.map((r) => r.verificationTimestamp)),
  };
}

export interface SourceRow {
  test: string;
  label: string;
  source: RecordSource;
  attestations: number;
  programs: number;
  statuses: VerificationStatus[];
  latestTimestamp: number;
  schemaVersions: number[];
}

/** One row per validation test or cross-check, for the overview table. */
export function bySource(): SourceRow[] {
  const groups = new Map<string, AttestationRecord[]>();
  for (const r of allRecords()) {
    const list = groups.get(r.test) ?? [];
    list.push(r);
    groups.set(r.test, list);
  }
  return [...groups.entries()].map(([test, list]) => ({
    test,
    label: TEST_LABELS[test] ?? test,
    source: list[0].source,
    attestations: list.length,
    programs: new Set(list.map((r) => r.programIdHex)).size,
    statuses: [...new Set(list.map((r) => r.status))],
    latestTimestamp: Math.max(...list.map((r) => r.verificationTimestamp)),
    schemaVersions: [...new Set(list.map((r) => r.schemaVersion))].sort(),
  }));
}
