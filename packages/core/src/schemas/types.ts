/**
 * SAS schema data-type ordinals, as used in a Schema account's `layout` bytes.
 * Verified against sas-lib's compactLayoutMapping: ordinal 25 is a duplicate
 * of `Char` (11), not `VecString` (24), and there is no `VecChar`.
 */
export const SCHEMA_DATA_TYPES = {
  U8: 0,
  U16: 1,
  U32: 2,
  U64: 3,
  U128: 4,
  I8: 5,
  I16: 6,
  I32: 7,
  I64: 8,
  I128: 9,
  Bool: 10,
  Char: 11,
  String: 12,
  VecU8: 13,
  VecU16: 14,
  VecU32: 15,
  VecU64: 16,
  VecU128: 17,
  VecI8: 18,
  VecI16: 19,
  VecI32: 20,
  VecI64: 21,
  VecI128: 22,
  VecBool: 23,
  VecString: 24,
  /** Duplicate encoding of Char (11) — sas-lib maps both to the same 4-byte representation. */
  CharDuplicate25: 25,
} as const;

export const MAX_SCHEMA_DATA_TYPE_ORDINAL = 25;

/** Mirrors the on-chain `Schema::validate` range check. */
export function isValidSchemaDataType(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= MAX_SCHEMA_DATA_TYPE_ORDINAL;
}
