import { address, getBase58Decoder, type Address, type Rpc, type SolanaRpcApi } from "@solana/kit";
import { withRetry } from "../rpc/client.js";
import { SAS_PROGRAM_ID } from "../config/index.js";
import { logger } from "../logging/logger.js";

/**
 * Account discriminators as deployed: Credential=0, Schema=1, Attestation=2.
 * sas-lib's generated SolanaAttestationServiceAccount enum labels them
 * differently and is stale; these were read back from a live devnet account.
 */
const ATTESTATION_DISCRIMINATOR = 2;

/**
 * Byte offset of the programId field. Every Kenmark predicate puts programId
 * (VecU8, 32 bytes) first, so after the 101-byte account header and the
 * 4-byte vec length prefix it always starts at offset 105.
 */
const PROGRAM_ID_OFFSET = 105;

export interface RawAttestationRecord {
  pubkey: Address;
  discriminator: number;
  nonce: Uint8Array;
  credential: Address;
  schema: Address;
  data: Uint8Array;
}

/** Parses the fixed-offset header of a raw Attestation account. Pure; no RPC. */
export function parseAttestationHeader(pubkey: Address, raw: Uint8Array): RawAttestationRecord {
  const discriminator = raw[0];
  const nonce = raw.slice(1, 33);
  const credentialBytes = raw.slice(33, 65);
  const schemaBytes = raw.slice(65, 97);
  const dataLen = new DataView(raw.buffer, raw.byteOffset + 97, 4).getUint32(0, true);
  const data = raw.slice(101, 101 + dataLen);

  const base58Decoder = getBase58Decoder();
  return {
    pubkey,
    discriminator,
    nonce,
    credential: address(base58Decoder.decode(credentialBytes)),
    schema: address(base58Decoder.decode(schemaBytes)),
    data,
  };
}

function toBase58Bytes(raw: Uint8Array): string {
  return getBase58Decoder().decode(raw);
}

/**
 * Finds every attestation about a program: getProgramAccounts on the SAS
 * program with memcmp filters on the discriminator (offset 0) and programId
 * (offset 105), then parses each header. sas-lib has no bulk scan, so this
 * calls RPC directly.
 */
export async function queryAttestationsForProgram(
  rpc: Rpc<SolanaRpcApi>,
  rpcUrl: string,
  programId: Address,
): Promise<RawAttestationRecord[]> {
  const discriminatorBytes = toBase58Bytes(new Uint8Array([ATTESTATION_DISCRIMINATOR]));

  const results = await withRetry(
    () =>
      rpc
        .getProgramAccounts(SAS_PROGRAM_ID, {
          encoding: "base64",
          // Writes confirm at "confirmed"; reading at the "finalized" default
          // would miss an attestation published moments earlier.
          commitment: "confirmed",
          filters: [
            {
              memcmp: {
                offset: 0n,
                bytes: discriminatorBytes as never,
                encoding: "base58",
              },
            },
            {
              memcmp: {
                offset: BigInt(PROGRAM_ID_OFFSET),
                bytes: programId as unknown as never,
                encoding: "base58",
              },
            },
          ],
        })
        .send(),
    { rpcUrl },
  );

  const records = results.map((result) => {
    const [base64Data] = result.account.data;
    const raw = new Uint8Array(Buffer.from(base64Data, "base64"));
    return parseAttestationHeader(result.pubkey, raw);
  });

  logger.debug(`queryAttestationsForProgram found ${records.length} record(s)`, {
    programId,
  });

  return records;
}
