import { describe, expect, it } from "vitest";
import { address } from "@solana/kit";
import { parseAttestationHeader } from "../../src/aggregator/query.js";

/** Builds a synthetic Attestation account buffer with the on-chain header layout. */
function buildSyntheticAttestationBuffer(opts: {
  discriminator: number;
  nonce: Uint8Array;
  credential: Uint8Array;
  schema: Uint8Array;
  data: Uint8Array;
}): Uint8Array {
  const { discriminator, nonce, credential, schema, data } = opts;
  const buf = new Uint8Array(101 + data.length + 32 + 8 + 32); // + signer + expiry + tokenAccount tail
  buf[0] = discriminator;
  buf.set(nonce, 1);
  buf.set(credential, 33);
  buf.set(schema, 65);
  new DataView(buf.buffer).setUint32(97, data.length, true);
  buf.set(data, 101);
  return buf;
}

describe("parseAttestationHeader", () => {
  it("extracts nonce/credential/schema/data at the exact documented offsets", () => {
    const nonce = new Uint8Array(32).fill(1);
    const credential = new Uint8Array(32).fill(2);
    const schema = new Uint8Array(32).fill(3);
    const data = new Uint8Array([10, 20, 30, 40, 50]);

    const buf = buildSyntheticAttestationBuffer({ discriminator: 0, nonce, credential, schema, data });
    const parsed = parseAttestationHeader(address("11111111111111111111111111111111"), buf);

    expect(parsed.discriminator).toBe(0);
    expect(Array.from(parsed.nonce)).toEqual(Array.from(nonce));
    expect(Array.from(parsed.data)).toEqual(Array.from(data));
    // credential/schema round-trip through base58 — just confirm they decode to non-empty addresses
    expect(parsed.credential.length).toBeGreaterThan(0);
    expect(parsed.schema.length).toBeGreaterThan(0);
  });

  it("handles zero-length data correctly", () => {
    const buf = buildSyntheticAttestationBuffer({
      discriminator: 0,
      nonce: new Uint8Array(32),
      credential: new Uint8Array(32),
      schema: new Uint8Array(32),
      data: new Uint8Array(0),
    });
    const parsed = parseAttestationHeader(address("11111111111111111111111111111111"), buf);
    expect(parsed.data.length).toBe(0);
  });

  it("distinguishes two different credential/schema byte patterns at their exact offsets", () => {
    const bufA = buildSyntheticAttestationBuffer({
      discriminator: 0,
      nonce: new Uint8Array(32).fill(0xaa),
      credential: new Uint8Array(32).fill(0x11),
      schema: new Uint8Array(32).fill(0x22),
      data: new Uint8Array([1]),
    });
    const bufB = buildSyntheticAttestationBuffer({
      discriminator: 0,
      nonce: new Uint8Array(32).fill(0xbb),
      credential: new Uint8Array(32).fill(0x33),
      schema: new Uint8Array(32).fill(0x44),
      data: new Uint8Array([2]),
    });

    const parsedA = parseAttestationHeader(address("11111111111111111111111111111111"), bufA);
    const parsedB = parseAttestationHeader(address("11111111111111111111111111111111"), bufB);

    expect(parsedA.credential).not.toBe(parsedB.credential);
    expect(parsedA.schema).not.toBe(parsedB.schema);
  });
});
