import { describe, expect, it } from "vitest";
import { address, getBase58Decoder, type Address, type ReadonlyUint8Array } from "@solana/kit";
import { getSchemaEncoder, getCredentialEncoder } from "sas-lib";
import { resolveAndDecode } from "../../src/aggregator/decode.js";
import { encodeAttestationData, joinVecsOfStrings } from "../../src/schemas/borsh-adapter.js";
import { PREDICATE_TYPE } from "../../src/schemas/verified-build.js";
import type { RawAttestationRecord } from "../../src/aggregator/query.js";

function addrFromByte(fill: number): Address {
  return address(getBase58Decoder().decode(new Uint8Array(32).fill(fill)));
}

function toBase64AccountFixture(bytes: ReadonlyUint8Array, owner: Address) {
  return {
    data: [Buffer.from(bytes).toString("base64"), "base64"] as const,
    executable: false,
    lamports: 1_000_000n,
    owner,
    rentEpoch: 0n,
  };
}

/**
 * Mocks only what fetchEncodedAccounts (called internally by sas-lib's
 * fetchAllMaybeSchema/fetchAllMaybeCredential) actually needs:
 * rpc.getMultipleAccounts(addresses, config).send().
 */
function makeMockRpc(responsesByAddress: Map<string, ReturnType<typeof toBase64AccountFixture>>) {
  return {
    getMultipleAccounts: (addresses: Address[]) => ({
      send: async () => ({
        value: addresses.map((a) => responsesByAddress.get(a) ?? null),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("resolveAndDecode", () => {
  it("decodes two attestations against two schemas with DIFFERENT (reversed) field layouts without cross-decoding", async () => {
    const schemaAAddress = addrFromByte(0xa1);
    const schemaBAddress = addrFromByte(0xb2);
    const credentialAddress = addrFromByte(0xc3);
    const authorityAddress = addrFromByte(0xd4);
    const sasOwner = addrFromByte(0xff);

    // Schema A: v1 field order.
    const layoutA = [13, 13, 12, 0, 8];
    const fieldNamesA = ["programId", "binaryHash", "sourceCommit", "verificationStatus", "verificationTimestamp"];

    // Schema B: reversed field order, so the two byte layouts actually differ.
    const layoutB = [8, 0, 12, 13, 13];
    const fieldNamesB = ["verificationTimestamp", "verificationStatus", "sourceCommit", "binaryHash", "programId"];

    const sampleProgramId = new Uint8Array(32).fill(1);
    const sampleBinaryHash = new Uint8Array(32).fill(2);
    const sampleFields = {
      programId: sampleProgramId,
      binaryHash: sampleBinaryHash,
      sourceCommit: "commit-abc",
      verificationStatus: 0,
      verificationTimestamp: 42n,
    };

    const dataA = encodeAttestationData(layoutA, fieldNamesA, sampleFields);
    const dataB = encodeAttestationData(layoutB, fieldNamesB, sampleFields);

    const schemaABytes = getSchemaEncoder().encode({
      discriminator: 2,
      credential: credentialAddress,
      name: new TextEncoder().encode(PREDICATE_TYPE),
      description: new Uint8Array(0),
      layout: Uint8Array.from(layoutA),
      fieldNames: joinVecsOfStrings(fieldNamesA),
      isPaused: false,
      version: 1,
    });
    const schemaBBytes = getSchemaEncoder().encode({
      discriminator: 2,
      credential: credentialAddress,
      name: new TextEncoder().encode(PREDICATE_TYPE),
      description: new Uint8Array(0),
      layout: Uint8Array.from(layoutB),
      fieldNames: joinVecsOfStrings(fieldNamesB),
      isPaused: false,
      version: 2,
    });
    const credentialBytes = getCredentialEncoder().encode({
      discriminator: 1,
      authority: authorityAddress,
      name: new TextEncoder().encode("test-issuer"),
      authorizedSigners: [authorityAddress],
    });

    const responses = new Map([
      [schemaAAddress, toBase64AccountFixture(schemaABytes, sasOwner)],
      [schemaBAddress, toBase64AccountFixture(schemaBBytes, sasOwner)],
      [credentialAddress, toBase64AccountFixture(credentialBytes, sasOwner)],
    ]);
    const rpc = makeMockRpc(responses);

    const recordA: RawAttestationRecord = {
      pubkey: addrFromByte(0xe1),
      discriminator: 0,
      nonce: new Uint8Array(32),
      credential: credentialAddress,
      schema: schemaAAddress,
      data: dataA,
    };
    const recordB: RawAttestationRecord = {
      pubkey: addrFromByte(0xe2),
      discriminator: 0,
      nonce: new Uint8Array(32),
      credential: credentialAddress,
      schema: schemaBAddress,
      data: dataB,
    };

    const result = await resolveAndDecode(rpc, "mock://rpc", [recordA, recordB]);

    expect(result.excluded).toEqual([]);
    expect(result.decoded).toHaveLength(2);

    const decodedA = result.decoded.find((d) => d.attestationAddress === recordA.pubkey)!;
    const decodedB = result.decoded.find((d) => d.attestationAddress === recordB.pubkey)!;

    // Same logical values from different byte layouts: each was decoded against its own schema.
    expect(Buffer.from(decodedA.fields.programId).equals(Buffer.from(sampleProgramId))).toBe(true);
    expect(Buffer.from(decodedB.fields.programId).equals(Buffer.from(sampleProgramId))).toBe(true);
    expect(decodedA.fields.sourceCommit).toBe("commit-abc");
    expect(decodedB.fields.sourceCommit).toBe("commit-abc");
    expect(decodedA.schemaVersion).toBe(1);
    expect(decodedB.schemaVersion).toBe(2);
  });

  it("returns an empty result for zero records without calling RPC", async () => {
    const rpc = makeMockRpc(new Map());
    const result = await resolveAndDecode(rpc, "mock://rpc", []);
    expect(result.decoded).toEqual([]);
    expect(result.excluded).toEqual([]);
  });
});
