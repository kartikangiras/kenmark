/**
 * Publishes one VerifiedBuildAttestation to devnet and reads it back through
 * the aggregator. Needs the fixtures written by scripts/setup-devnet.ts and
 * skips when they are absent, unless KENMARK_REQUIRE_DEVNET=1.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  address,
  appendTransactionMessageInstruction,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  devnet,
  getBase58Decoder,
  getSignatureFromTransaction,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type Rpc,
  type SolanaRpcApi,
} from "@solana/kit";
import { createKeyPairSignerFromBytes } from "@solana/signers";
import { deriveAttestationPda, deriveSchemaPda, fetchMaybeSchema, getCreateAttestationInstruction, getCreateSchemaInstruction } from "sas-lib";
import { createRpcClient, withRetry } from "../../src/rpc/client.js";
import { loadConfig } from "../../src/config/index.js";
import { queryAttestationsForProgram } from "../../src/aggregator/query.js";
import { resolveAndDecode } from "../../src/aggregator/decode.js";
import * as verifiedBuild from "../../src/schemas/verified-build.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEYS_PATH = join(__dirname, "../../../../scripts/.devnet-keys.json");

interface DevnetKeysFile {
  rpcUrl: string;
  issuers: {
    label: string;
    keypairPath: string;
    authority: string;
    credential: string;
    credentialName: string;
  }[];
}

const hasDevnetFixtures = existsSync(KEYS_PATH);

// CI sets KENMARK_REQUIRE_DEVNET=1 so a missing fixtures file fails instead of passing vacuously.
if (process.env.KENMARK_REQUIRE_DEVNET === "1" && !hasDevnetFixtures) {
  throw new Error(
    `KENMARK_REQUIRE_DEVNET=1 but ${KEYS_PATH} is missing. The devnet integration ` +
      `test would have silently skipped. Provision fixtures before running.`,
  );
}

describe.skipIf(!hasDevnetFixtures)("devnet round-trip", () => {
  it("publishes a VerifiedBuildAttestation and queries it back with all fields intact", async () => {
    const fixtures: DevnetKeysFile = JSON.parse(readFileSync(KEYS_PATH, "utf-8"));
    const issuer = fixtures.issuers[0];
    expect(issuer, "expected at least one issuer in .devnet-keys.json").toBeDefined();

    const config = loadConfig({ rpcUrl: fixtures.rpcUrl });
    const rpc = createRpcClient(config.rpcUrl);
    const rpcSubscriptions = createSolanaRpcSubscriptions(devnet(config.rpcSubscriptionsUrl));

    const authoritySigner = await createKeyPairSignerFromBytes(
      new Uint8Array(JSON.parse(readFileSync(issuer.keypairPath, "utf-8"))),
    );
    const credentialAddress = address(issuer.credential);

    // Step 1: idempotent Schema creation.
    const [schemaPda] = await deriveSchemaPda({
      credential: credentialAddress,
      name: verifiedBuild.PREDICATE_TYPE,
      version: 1,
    });
    const maybeSchema = await withRetry(() => fetchMaybeSchema(rpc, schemaPda), { rpcUrl: config.rpcUrl });

    const sendAndConfirm = sendAndConfirmTransactionFactory({
      rpc: rpc as Rpc<SolanaRpcApi> & { "~cluster"?: "devnet" },
      rpcSubscriptions,
    });

    if (!maybeSchema.exists) {
      const { value: blockhash } = await withRetry(() => rpc.getLatestBlockhash().send(), {
        rpcUrl: config.rpcUrl,
      });
      const createSchemaIx = getCreateSchemaInstruction({
        payer: authoritySigner,
        authority: authoritySigner,
        credential: credentialAddress,
        schema: schemaPda,
        name: verifiedBuild.PREDICATE_TYPE,
        description: "Kenmark VerifiedBuildAttestation",
        layout: Uint8Array.from(verifiedBuild.LAYOUT),
        // getCreateSchemaInstruction's own encoder handles Vec<String> encoding
        // internally — unlike serializeAttestationData, it takes a plain string[],
        // not the joined-vec byte blob from borsh-adapter's joinVecsOfStrings.
        fieldNames: [...verifiedBuild.FIELD_NAMES],
      });
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(authoritySigner, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
        (tx) => appendTransactionMessageInstruction(createSchemaIx, tx),
      );
      const signed = await signTransactionMessageWithSigners(message);
      // See setup-devnet.ts: known @solana/kit generic gap between
      // signTransactionMessageWithSigners' broad lifetime union and
      // sendAndConfirm's narrower blockhash-lifetime param type.
      await sendAndConfirm(signed as Parameters<typeof sendAndConfirm>[0], { commitment: "confirmed" });
    }

    // Step 2: build + publish a sample attestation.
    const sampleProgramId = crypto.getRandomValues(new Uint8Array(32));
    const sampleFields: verifiedBuild.VerifiedBuildFields = {
      programId: sampleProgramId,
      binaryHash: crypto.getRandomValues(new Uint8Array(32)),
      sourceCommit: "integration-test-commit",
      verificationStatus: verifiedBuild.VERIFICATION_STATUS.Verified,
      verificationTimestamp: BigInt(Math.floor(Date.now() / 1000)),
    };
    const encodedData = verifiedBuild.encode(sampleFields);
    const nonceBytes = verifiedBuild.nonce(sampleProgramId);
    const nonceAddress = address(getBase58Decoder().decode(nonceBytes));

    const [attestationPda] = await deriveAttestationPda({
      credential: credentialAddress,
      schema: schemaPda,
      nonce: nonceAddress,
    });

    const { value: blockhash2 } = await withRetry(() => rpc.getLatestBlockhash().send(), {
      rpcUrl: config.rpcUrl,
    });
    const createAttestationIx = getCreateAttestationInstruction({
      payer: authoritySigner,
      authority: authoritySigner,
      credential: credentialAddress,
      schema: schemaPda,
      attestation: attestationPda,
      nonce: nonceAddress,
      data: encodedData,
      expiry: 0n,
    });
    const message2 = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayerSigner(authoritySigner, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash2, tx),
      (tx) => appendTransactionMessageInstruction(createAttestationIx, tx),
    );
    const signed2 = await signTransactionMessageWithSigners(message2);
    await sendAndConfirm(signed2 as Parameters<typeof sendAndConfirm>[0], { commitment: "confirmed" });
    const publishSignature = getSignatureFromTransaction(signed2);

    // Step 3: query + decode via the real aggregator pipeline.
    const programIdAsAddress: Address = address(getBase58Decoder().decode(sampleProgramId));
    const records = await queryAttestationsForProgram(rpc, config.rpcUrl, programIdAsAddress);
    const { decoded, excluded } = await resolveAndDecode(rpc, config.rpcUrl, records);

    expect(excluded, `unexpected exclusions: ${JSON.stringify(excluded)}`).toEqual([]);
    expect(decoded).toHaveLength(1);

    const result = decoded[0];
    expect(Buffer.from(result.fields.programId).equals(Buffer.from(sampleProgramId))).toBe(true);
    expect(Buffer.from(result.fields.binaryHash).equals(Buffer.from(sampleFields.binaryHash))).toBe(true);
    expect(result.fields.sourceCommit).toBe(sampleFields.sourceCommit);
    expect(result.fields.verificationStatus).toBe(sampleFields.verificationStatus);
    expect(result.fields.verificationTimestamp).toBe(sampleFields.verificationTimestamp);
    expect(result.issuer.authority).toBe(issuer.authority);

    console.log(`Published attestation ${attestationPda} in tx ${publishSignature}`);
  }, 60_000);
});

if (!hasDevnetFixtures) {
  describe("devnet round-trip", () => {
    it.skip(`SKIPPED — run scripts/setup-devnet.ts first to produce ${KEYS_PATH}`, () => {});
  });
}
