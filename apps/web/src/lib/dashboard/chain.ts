import "server-only";
import { address, getBase58Decoder, type Address } from "@solana/kit";
import { fetchAllMaybeCredential } from "sas-lib";
import {
  SAS_PROGRAM_ID,
  createRpcClient,
  loadConfig,
  queryAttestationsForProgram,
  resolveAndDecode,
  verifiedBuild,
  withRateLimitBackoff,
  withRetry,
} from "@kenmark/core";

function config() {
  return loadConfig();
}

/** Host of the RPC endpoint in use, without any query string. */
export function rpcHost(): string {
  try {
    return new URL(config().rpcUrl).host;
  } catch {
    return "unknown";
  }
}

export interface DecodedView {
  attestation: string;
  predicateType: string;
  schemaVersion: number;
  issuer: { credential: string; authority: string };
  fields: {
    programId: string;
    binaryHash: string;
    sourceCommit: string;
    verificationStatus: string;
    verificationTimestamp: number;
  };
}

export interface LookupResult {
  programId: string;
  cluster: "devnet";
  rpcHost: string;
  elapsedMs: number;
  /** Served from the short server-side cache rather than a fresh RPC read. */
  cached: boolean;
  fetchedAt: string;
  decoded: DecodedView[];
  excluded: { attestation: string; reason: string }[];
}

export class InvalidProgramId extends Error {}

// Repeated lookups of the same program within half a minute (demo clicks, a
// test run) are served from memory instead of spending another RPC quota hit.
const LOOKUP_TTL_MS = 30_000;
const lookupCache = new Map<string, LookupResult>();

/** Runs the aggregator for one program against devnet. */
export async function lookupProgram(programId: string): Promise<LookupResult> {
  let target: Address;
  try {
    target = address(programId.trim());
  } catch {
    throw new InvalidProgramId(`"${programId}" is not a valid base58 Solana address.`);
  }

  const hit = lookupCache.get(target);
  if (hit && Date.now() - Date.parse(hit.fetchedAt) < LOOKUP_TTL_MS) {
    return { ...hit, cached: true };
  }

  const { rpcUrl } = config();
  const rpc = createRpcClient(rpcUrl);
  const started = Date.now();
  const { decoded, excluded } = await withRateLimitBackoff(async () => {
    const records = await queryAttestationsForProgram(rpc, rpcUrl, target);
    return resolveAndDecode(rpc, rpcUrl, records);
  });
  const base58 = getBase58Decoder();

  const result: LookupResult = {
    programId: target,
    cluster: "devnet",
    rpcHost: rpcHost(),
    elapsedMs: Date.now() - started,
    cached: false,
    fetchedAt: new Date().toISOString(),
    decoded: decoded.map((d) => ({
      attestation: d.attestationAddress,
      predicateType: d.predicateType,
      schemaVersion: d.schemaVersion,
      issuer: { credential: d.issuer.credential, authority: d.issuer.authority },
      fields: {
        programId: base58.decode(d.fields.programId),
        binaryHash: Buffer.from(d.fields.binaryHash).toString("hex"),
        sourceCommit: d.fields.sourceCommit,
        verificationStatus: verifiedBuild.verificationStatusName(d.fields.verificationStatus),
        verificationTimestamp: Number(d.fields.verificationTimestamp),
      },
    })),
    excluded: excluded.map((e) => ({ attestation: e.attestationAddress, reason: e.reason })),
  };
  lookupCache.set(target, result);
  return result;
}

export interface OnChainCounts {
  byCredential: Record<string, number>;
  total: number;
  rpcHost: string;
  fetchedAt: string;
}

/**
 * Counts every live Attestation account under each credential: one
 * getProgramAccounts call per credential with a memcmp on the credential
 * field at offset 33, returning no account data. Null when the RPC is down,
 * so the page can render without the live number.
 */
export async function onChainCounts(credentials: string[]): Promise<OnChainCounts | null> {
  const { rpcUrl } = config();
  const rpc = createRpcClient(rpcUrl);
  const discriminator = getBase58Decoder().decode(new Uint8Array([2]));
  try {
    const byCredential: Record<string, number> = {};
    for (const credential of credentials) {
      const accounts = await withRateLimitBackoff(() =>
        withRetry(
          () =>
            rpc
              .getProgramAccounts(SAS_PROGRAM_ID, {
                encoding: "base64",
                commitment: "confirmed",
                dataSlice: { offset: 0, length: 0 },
                filters: [
                  { memcmp: { offset: 0n, bytes: discriminator as never, encoding: "base58" } },
                  { memcmp: { offset: 33n, bytes: credential as never, encoding: "base58" } },
                ],
              })
              .send(),
          { rpcUrl },
        ),
      );
      byCredential[credential] = accounts.length;
    }
    return {
      byCredential,
      total: Object.values(byCredential).reduce((a, b) => a + b, 0),
      rpcHost: rpcHost(),
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export interface CredentialView {
  credential: string;
  exists: boolean;
  authority: string | null;
  name: string | null;
  authorizedSigners: string[];
}

/** Reads the Credential accounts so the issuer page shows the real authority and name. */
export async function credentialDetails(credentials: string[]): Promise<CredentialView[] | null> {
  const { rpcUrl } = config();
  const rpc = createRpcClient(rpcUrl);
  try {
    const accounts = await withRetry(
      () =>
        fetchAllMaybeCredential(
          rpc,
          credentials.map((c) => address(c)),
        ),
      { rpcUrl },
    );
    return accounts.map((a) => ({
      credential: a.address,
      exists: a.exists,
      authority: a.exists ? a.data.authority : null,
      name: a.exists ? new TextDecoder().decode(new Uint8Array(a.data.name)) : null,
      authorizedSigners: a.exists ? [...a.data.authorizedSigners] : [],
    }));
  } catch {
    return null;
  }
}
