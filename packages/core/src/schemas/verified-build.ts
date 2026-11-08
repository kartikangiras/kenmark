import { createHash } from "node:crypto";
import { validateSchemaLayout } from "@kenmark/errors";
import { decodeAttestationData, encodeAttestationData } from "./borsh-adapter.js";

/** Predicate name, used as the SAS Schema name (a PDA seed, so at most 32 bytes). */
export const PREDICATE_TYPE = "v1/VerifiedBuildAttestation";

export const LAYOUT = [13, 13, 12, 0, 8] as const;
export const FIELD_NAMES = [
  "programId",
  "binaryHash",
  "sourceCommit",
  "verificationStatus",
  "verificationTimestamp",
] as const;

export const VERIFICATION_STATUS = { Verified: 0, Mismatch: 1, Unknown: 2 } as const;
export type VerificationStatus = (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];

const VERIFICATION_STATUS_REVERSE: Record<number, keyof typeof VERIFICATION_STATUS> = {
  0: "Verified",
  1: "Mismatch",
  2: "Unknown",
};

export function verificationStatusName(ordinal: number): string {
  return VERIFICATION_STATUS_REVERSE[ordinal] ?? `Unknown(${ordinal})`;
}

export interface VerifiedBuildFields {
  programId: Uint8Array;
  binaryHash: Uint8Array;
  sourceCommit: string;
  verificationStatus: VerificationStatus;
  verificationTimestamp: bigint;
}

/**
 * nonce = sha256(programId || predicateType). There is no disambiguator, so
 * each issuer holds one live record per program and must close the old one
 * before republishing.
 */
export function nonce(programId: Uint8Array): Uint8Array {
  const predicateTypeBytes = new TextEncoder().encode(PREDICATE_TYPE);
  const input = new Uint8Array(programId.length + predicateTypeBytes.length);
  input.set(programId, 0);
  input.set(predicateTypeBytes, programId.length);
  return new Uint8Array(createHash("sha256").update(input).digest());
}

/** Encodes fields as attestation data using the v1 layout. */
export function encode(fields: VerifiedBuildFields): Uint8Array {
  validateSchemaLayout(LAYOUT);
  return encodeAttestationData(LAYOUT, FIELD_NAMES, {
    programId: fields.programId,
    binaryHash: fields.binaryHash,
    sourceCommit: fields.sourceCommit,
    verificationStatus: fields.verificationStatus,
    verificationTimestamp: fields.verificationTimestamp,
  });
}

/**
 * Decodes attestation data against the layout and field names resolved from
 * the attestation's own Schema account, so a later schema version with a
 * different layout still decodes correctly.
 */
export function decode(
  rawData: Uint8Array,
  resolvedLayout: readonly number[],
  resolvedFieldNames: readonly string[],
): VerifiedBuildFields {
  validateSchemaLayout(resolvedLayout);
  return decodeAttestationData<VerifiedBuildFields>(resolvedLayout, resolvedFieldNames, rawData);
}
