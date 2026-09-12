import type { Address, Rpc, SolanaRpcApi } from "@solana/kit";
import { fetchAllMaybeCredential, fetchAllMaybeSchema } from "sas-lib";
import { UnknownPredicateType } from "@kenmark/errors";
import { withRetry } from "../rpc/client.js";
import { logger } from "../logging/logger.js";
import { splitVecsOfStrings } from "../schemas/borsh-adapter.js";
import * as verifiedBuild from "../schemas/verified-build.js";
import type { RawAttestationRecord } from "./query.js";

export interface ResolvedIssuer {
  credential: Address;
  authority: Address;
}

export interface DecodedAttestation {
  attestationAddress: Address;
  predicateType: string;
  schemaVersion: number;
  issuer: ResolvedIssuer;
  fields: verifiedBuild.VerifiedBuildFields; // VerifiedBuild is the only predicate implemented so far
}

export interface ExcludedRecord {
  attestationAddress: Address;
  reason: string;
}

export interface ResolveAndDecodeResult {
  decoded: DecodedAttestation[];
  excluded: ExcludedRecord[];
}

/**
 * Batch-fetches the Schema and Credential accounts behind a set of raw
 * records, then decodes each record against its own schema's layout. Records
 * that fail to resolve or decode are excluded and logged rather than thrown.
 */
export async function resolveAndDecode(
  rpc: Rpc<SolanaRpcApi>,
  rpcUrl: string,
  records: readonly RawAttestationRecord[],
): Promise<ResolveAndDecodeResult> {
  const decoded: DecodedAttestation[] = [];
  const excluded: ExcludedRecord[] = [];

  if (records.length === 0) {
    return { decoded, excluded };
  }

  const schemaAddresses = Array.from(new Set(records.map((r) => r.schema)));
  const credentialAddresses = Array.from(new Set(records.map((r) => r.credential)));

  const [schemaAccounts, credentialAccounts] = await Promise.all([
    withRetry(() => fetchAllMaybeSchema(rpc, schemaAddresses), { rpcUrl }),
    withRetry(() => fetchAllMaybeCredential(rpc, credentialAddresses), { rpcUrl }),
  ]);

  const schemaByAddress = new Map(schemaAccounts.map((a) => [a.address, a]));
  const credentialByAddress = new Map(credentialAccounts.map((a) => [a.address, a]));

  for (const record of records) {
    const maybeSchema = schemaByAddress.get(record.schema);
    const maybeCredential = credentialByAddress.get(record.credential);

    if (!maybeSchema?.exists || !maybeCredential?.exists) {
      const reason = `Could not resolve schema (${record.schema}, exists=${maybeSchema?.exists ?? "unknown"}) or credential (${record.credential}, exists=${maybeCredential?.exists ?? "unknown"})`;
      logger.warn(reason, { attestation: record.pubkey });
      excluded.push({ attestationAddress: record.pubkey, reason });
      continue;
    }

    const schema = maybeSchema.data;
    const credential = maybeCredential.data;

    const predicateType = new TextDecoder().decode(new Uint8Array(schema.name));
    const layout = Array.from(schema.layout);
    const fieldNames = splitVecsOfStrings(new Uint8Array(schema.fieldNames));

    if (predicateType !== verifiedBuild.PREDICATE_TYPE) {
      const err = new UnknownPredicateType(predicateType);
      logger.warn(err.message, { attestation: record.pubkey });
      excluded.push({ attestationAddress: record.pubkey, reason: err.message });
      continue;
    }

    try {
      const fields = verifiedBuild.decode(new Uint8Array(record.data), layout, fieldNames);
      decoded.push({
        attestationAddress: record.pubkey,
        predicateType,
        schemaVersion: schema.version,
        issuer: { credential: record.credential, authority: credential.authority },
        fields,
      });
    } catch (err) {
      const reason = `Attestation ${record.pubkey} excluded: schema validation failed against resolved schema ${record.schema} — ${err instanceof Error ? err.message : String(err)}`;
      logger.warn(reason);
      excluded.push({ attestationAddress: record.pubkey, reason });
    }
  }

  return { decoded, excluded };
}
