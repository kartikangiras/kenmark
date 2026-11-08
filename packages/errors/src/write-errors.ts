/**
 * Write/publish-path errors, mirroring the on-chain AttestationServiceError
 * enum. Only ordinals reachable from a plain (non-tokenized) publish are
 * included: 0-6 and 11. Ordinals 7-10 are tokenization and CPI only.
 */

export abstract class SasWriteError extends Error {
  abstract readonly ordinal: number;
  abstract readonly code: string;
}

export class InvalidCredentialError extends SasWriteError {
  readonly ordinal = 0;
  readonly code = "InvalidCredential";
  constructor(address: string) {
    super(`Credential not found or malformed at ${address}`);
    this.name = "InvalidCredentialError";
  }
}

export class InvalidSchemaError extends SasWriteError {
  readonly ordinal = 1;
  readonly code = "InvalidSchema";
  constructor(address: string) {
    super(`Schema not found or malformed at ${address}`);
    this.name = "InvalidSchemaError";
  }
}

export class InvalidAttestationError extends SasWriteError {
  readonly ordinal = 2;
  readonly code = "InvalidAttestation";
  constructor(address: string) {
    super(`Attestation account mismatch at ${address}`);
    this.name = "InvalidAttestationError";
  }
}

export class InvalidAuthorityError extends SasWriteError {
  readonly ordinal = 3;
  readonly code = "InvalidAuthority";
  constructor() {
    super("Only the credential authority can do this");
    this.name = "InvalidAuthorityError";
  }
}

export class InvalidSchemaDataTypeError extends SasWriteError {
  readonly ordinal = 4;
  readonly code = "InvalidSchemaDataType";
  constructor(layoutByte: number, fieldIndex: number) {
    super(`Layout byte ${layoutByte} at field index ${fieldIndex} exceeds the maximum data type ordinal (25)`);
    this.name = "InvalidSchemaDataTypeError";
  }
}

export class SignerNotAuthorizedError extends SasWriteError {
  readonly ordinal = 5;
  readonly code = "SignerNotAuthorized";
  constructor() {
    super(
      "This key cannot publish under this credential; ask the credential authority to add it via ChangeAuthorizedSigners",
    );
    this.name = "SignerNotAuthorizedError";
  }
}

export class InvalidAttestationDataError extends SasWriteError {
  readonly ordinal = 6;
  readonly code = "InvalidAttestationData";
  constructor() {
    super("Attestation data does not match the schema layout");
    this.name = "InvalidAttestationDataError";
  }
}

export class SchemaPausedError extends SasWriteError {
  readonly ordinal = 11;
  readonly code = "SchemaPaused";
  constructor() {
    super(
      "This predicate type has been paused by its credential authority and cannot accept new attestations",
    );
    this.name = "SchemaPausedError";
  }
}

export const WRITE_ERROR_ORDINALS = [0, 1, 2, 3, 4, 5, 6, 11] as const;
