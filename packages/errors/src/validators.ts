import { InvalidAttestationDataError, InvalidSchemaDataTypeError } from "./write-errors.js";

const MAX_SCHEMA_DATA_TYPE_ORDINAL = 25;

/** Rejects a layout containing a data-type ordinal the SAS program does not define. */
export function validateSchemaLayout(layout: readonly number[]): void {
  layout.forEach((byte, index) => {
    if (byte < 0 || byte > MAX_SCHEMA_DATA_TYPE_ORDINAL) {
      throw new InvalidSchemaDataTypeError(byte, index);
    }
  });
}

/**
 * Throws unless `submitted` equals `reencoded` byte-for-byte. Lets a caller
 * check data it is about to publish against a fresh encoding of the same
 * fields.
 */
export function validateAttestationDataRoundTrip(submitted: Uint8Array, reencoded: Uint8Array): void {
  if (submitted.length !== reencoded.length) {
    throw new InvalidAttestationDataError();
  }
  for (let i = 0; i < submitted.length; i++) {
    if (submitted[i] !== reencoded[i]) {
      throw new InvalidAttestationDataError();
    }
  }
}
