import { describe, expect, it } from "vitest";
import {
  InvalidCredentialError,
  InvalidSchemaError,
  InvalidAttestationError,
  InvalidAuthorityError,
  InvalidSchemaDataTypeError,
  SignerNotAuthorizedError,
  InvalidAttestationDataError,
  SchemaPausedError,
  WRITE_ERROR_ORDINALS,
  validateSchemaLayout,
  validateAttestationDataRoundTrip,
} from "../src/index.js";

describe("write-path error matrix", () => {
  const ordinalToInstance: Record<number, InstanceType<typeof Error>> = {
    0: new InvalidCredentialError("addr"),
    1: new InvalidSchemaError("addr"),
    2: new InvalidAttestationError("addr"),
    3: new InvalidAuthorityError(),
    4: new InvalidSchemaDataTypeError(99, 0),
    5: new SignerNotAuthorizedError(),
    6: new InvalidAttestationDataError(),
    11: new SchemaPausedError(),
  };

  it("exports one error class per implemented on-chain ordinal", () => {
    for (const ordinal of WRITE_ERROR_ORDINALS) {
      const instance = ordinalToInstance[ordinal];
      expect(instance, `no instance registered for ordinal ${ordinal}`).toBeDefined();
      expect((instance as unknown as { ordinal: number }).ordinal).toBe(ordinal);
    }
    expect(WRITE_ERROR_ORDINALS).toEqual([0, 1, 2, 3, 4, 5, 6, 11]);
  });

  it("validateSchemaLayout rejects ordinals > 25 without an RPC connection", () => {
    expect(() => validateSchemaLayout([13, 13, 12, 0, 8])).not.toThrow();
    expect(() => validateSchemaLayout([13, 26])).toThrow(InvalidSchemaDataTypeError);
    expect(() => validateSchemaLayout([-1])).toThrow(InvalidSchemaDataTypeError);
  });

  it("validateAttestationDataRoundTrip rejects mismatched bytes without an RPC connection", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([1, 2, 3]);
    const c = new Uint8Array([1, 2, 4]);
    expect(() => validateAttestationDataRoundTrip(a, b)).not.toThrow();
    expect(() => validateAttestationDataRoundTrip(a, c)).toThrow(InvalidAttestationDataError);
  });
});
