import "server-only";
import { address, getBase58Decoder, type Address } from "@solana/kit";
import { fetchAllMaybeCredential } from "sas-lib";
import {
  SAS_PROGRAM_ID,
  createRpcClient,
  loadConfig,
  queryAttestationsForCredential,
  queryAttestationsForProgram,
  queryCredentialsForAuthority,
  resolveAndDecode,
  verifiedBuild,
  isRateLimitError,
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
export class InvalidAddress extends Error {}

function parseAddress(raw: string, what: string): Address {
  try {
    return address(raw.trim());
  } catch {
    throw new InvalidAddress(`"${raw}" is not a valid base58 ${what}.`);
  }
}

function toDecodedView(
  d: Awaited<ReturnType<typeof resolveAndDecode>>["decoded"][number],
): DecodedView {
  const base58 = getBase58Decoder();
  return {
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
  };
}

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
  const result: LookupResult = {
    programId: target,
    cluster: "devnet",
    rpcHost: rpcHost(),
    elapsedMs: Date.now() - started,
    cached: false,
    fetchedAt: new Date().toISOString(),
    decoded: decoded.map(toDecodedView),
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

/**
 * Reads one Credential account. An address that holds some other kind of
 * account (a program, a token account) makes sas-lib's decoder throw; that is
 * reported as "no credential here", not as an RPC failure.
 */
async function readCredentialAccount(
  rpc: ReturnType<typeof createRpcClient>,
  rpcUrl: string,
  target: Address,
): Promise<CredentialView> {
  try {
    const [account] = await withRetry(() => fetchAllMaybeCredential(rpc, [target]), { rpcUrl });
    return {
      credential: target,
      exists: account.exists,
      authority: account.exists ? account.data.authority : null,
      name: account.exists ? new TextDecoder().decode(new Uint8Array(account.data.name)) : null,
      authorizedSigners: account.exists ? [...account.data.authorizedSigners] : [],
    };
  } catch (err) {
    if (isRateLimitError(err)) throw err;
    return {
      credential: target,
      exists: false,
      authority: null,
      name: null,
      authorizedSigners: [],
    };
  }
}

export interface CredentialLookup {
  credential: CredentialView;
  cluster: "devnet";
  rpcHost: string;
  elapsedMs: number;
  cached: boolean;
  fetchedAt: string;
  decoded: DecodedView[];
  excluded: { attestation: string; reason: string }[];
}

const credentialCache = new Map<string, CredentialLookup>();

/**
 * Everything the chain holds for one issuer credential: the account itself and
 * every attestation published under it, decoded where the schema is one Kenmark
 * knows and listed with a reason where it is not. Works for any SAS credential,
 * not only Kenmark's own.
 */
export async function lookupCredential(raw: string): Promise<CredentialLookup> {
  const target = parseAddress(raw, "credential address");
  const hit = credentialCache.get(target);
  if (hit && Date.now() - Date.parse(hit.fetchedAt) < LOOKUP_TTL_MS)
    return { ...hit, cached: true };

  const { rpcUrl } = config();
  const rpc = createRpcClient(rpcUrl);
  const started = Date.now();
  const { account, decoded, excluded } = await withRateLimitBackoff(async () => {
    const account = await readCredentialAccount(rpc, rpcUrl, target);
    const records = await queryAttestationsForCredential(rpc, rpcUrl, target);
    const { decoded, excluded } = await resolveAndDecode(rpc, rpcUrl, records);
    return { account, decoded, excluded };
  });

  const result: CredentialLookup = {
    credential: account,
    cluster: "devnet",
    rpcHost: rpcHost(),
    elapsedMs: Date.now() - started,
    cached: false,
    fetchedAt: new Date().toISOString(),
    decoded: decoded.map(toDecodedView),
    excluded: excluded.map((e) => ({ attestation: e.attestationAddress, reason: e.reason })),
  };
  credentialCache.set(target, result);
  return result;
}

export interface AuthorityLookup {
  authority: string;
  cluster: "devnet";
  rpcHost: string;
  elapsedMs: number;
  cached: boolean;
  fetchedAt: string;
  credentials: CredentialView[];
}

const authorityCache = new Map<string, AuthorityLookup>();

/** Every credential a wallet controls as authority. */
export async function lookupAuthority(raw: string): Promise<AuthorityLookup> {
  const target = parseAddress(raw, "authority address");
  const hit = authorityCache.get(target);
  if (hit && Date.now() - Date.parse(hit.fetchedAt) < LOOKUP_TTL_MS)
    return { ...hit, cached: true };

  const { rpcUrl } = config();
  const rpc = createRpcClient(rpcUrl);
  const started = Date.now();
  const credentials = await withRateLimitBackoff(async () => {
    const addresses = await queryCredentialsForAuthority(rpc, rpcUrl, target);
    if (addresses.length === 0) return [];
    const accounts = await withRetry(() => fetchAllMaybeCredential(rpc, addresses), { rpcUrl });
    return accounts.map<CredentialView>((a) => ({
      credential: a.address,
      exists: a.exists,
      authority: a.exists ? a.data.authority : null,
      name: a.exists ? new TextDecoder().decode(new Uint8Array(a.data.name)) : null,
      authorizedSigners: a.exists ? [...a.data.authorizedSigners] : [],
    }));
  });

  const result: AuthorityLookup = {
    authority: target,
    cluster: "devnet",
    rpcHost: rpcHost(),
    elapsedMs: Date.now() - started,
    cached: false,
    fetchedAt: new Date().toISOString(),
    credentials,
  };
  authorityCache.set(target, result);
  return result;
}
