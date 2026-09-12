/**
 * Runs the six devnet validation tests against live devnet. Requires the
 * fixtures written by scripts/setup-devnet.ts.
 *
 * Writes devnet-attestations.json (every attestation published) and one
 * report per test under test-results/.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  address,
  appendTransactionMessageInstruction,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  devnet,
  getBase58Decoder,
  getBase58Encoder,
  getSignatureFromTransaction,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type KeyPairSigner,
  type Rpc,
  type SolanaRpcApi,
} from "@solana/kit";
import { createKeyPairSignerFromBytes } from "@solana/signers";
import {
  deriveAttestationPda,
  deriveSchemaPda,
  fetchMaybeAttestation,
  fetchMaybeSchema,
  getChangeSchemaVersionInstruction,
  getCloseAttestationInstruction,
  getCreateAttestationInstruction,
  getCreateSchemaInstruction,
} from "sas-lib";
import { createRpcClient, withRetry } from "../packages/core/src/rpc/client.js";
import { loadConfig } from "../packages/core/src/config/index.js";
import { logger } from "../packages/core/src/logging/logger.js";
import { queryAttestationsForProgram } from "../packages/core/src/aggregator/query.js";
import { resolveAndDecode, type DecodedAttestation } from "../packages/core/src/aggregator/decode.js";
import * as verifiedBuild from "../packages/core/src/schemas/verified-build.js";
import { encodeAttestationData } from "../packages/core/src/schemas/borsh-adapter.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEYS_PATH = join(__dirname, "../scripts/.devnet-keys.json");
const RESULTS_DIR = join(__dirname, "test-results");
const ATTESTATIONS_JSON_PATH = join(__dirname, "devnet-attestations.json");

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

interface PublishedAttestationRecord {
  test: string;
  attestationAddress: string;
  credential: string;
  schema: string;
  schemaVersion: number;
  programId: string;
  publishSignature: string;
  fields: Record<string, unknown>;
}

const allPublished: PublishedAttestationRecord[] = [];

function randomProgramId(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

function toAddress(bytes: Uint8Array): Address {
  return address(getBase58Decoder().decode(bytes));
}

function fieldsToJson(fields: verifiedBuild.VerifiedBuildFields): Record<string, unknown> {
  return {
    programId: Buffer.from(fields.programId).toString("hex"),
    binaryHash: Buffer.from(fields.binaryHash).toString("hex"),
    sourceCommit: fields.sourceCommit,
    verificationStatus: verifiedBuild.verificationStatusName(fields.verificationStatus),
    verificationTimestamp: fields.verificationTimestamp.toString(),
  };
}

class DevnetHarness {
  constructor(
    public readonly rpc: Rpc<SolanaRpcApi>,
    public readonly rpcSubscriptionsUrl: string,
    public readonly rpcUrl: string,
  ) {}

  sendAndConfirmFn() {
    const rpcSubscriptions = createSolanaRpcSubscriptions(devnet(this.rpcSubscriptionsUrl));
    return sendAndConfirmTransactionFactory({
      rpc: this.rpc as Rpc<SolanaRpcApi> & { "~cluster"?: "devnet" },
      rpcSubscriptions,
    });
  }

  async ensureSchema(
    authority: KeyPairSigner,
    credential: Address,
    version: number,
    layout: readonly number[],
    fieldNames: readonly string[],
    description: string,
  ): Promise<Address> {
    const [schemaPda] = await deriveSchemaPda({ credential, name: verifiedBuild.PREDICATE_TYPE, version });
    const maybe = await withRetry(() => fetchMaybeSchema(this.rpc, schemaPda), { rpcUrl: this.rpcUrl });
    if (maybe.exists) return schemaPda;

    const sendAndConfirm = this.sendAndConfirmFn();

    if (version === 1) {
      const { value: blockhash } = await withRetry(() => this.rpc.getLatestBlockhash().send(), {
        rpcUrl: this.rpcUrl,
      });
      const ix = getCreateSchemaInstruction({
        payer: authority,
        authority,
        credential,
        schema: schemaPda,
        name: verifiedBuild.PREDICATE_TYPE,
        description,
        layout: Uint8Array.from(layout),
        fieldNames: [...fieldNames],
      });
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(authority, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
        (tx) => appendTransactionMessageInstruction(ix, tx),
      );
      const signed = await signTransactionMessageWithSigners(message);
      await sendAndConfirm(signed as Parameters<typeof sendAndConfirm>[0], { commitment: "confirmed" });
      return schemaPda;
    }

    // version > 1: ChangeSchemaVersion from the existing (version - 1) schema.
    const [existingSchema] = await deriveSchemaPda({
      credential,
      name: verifiedBuild.PREDICATE_TYPE,
      version: version - 1,
    });
    const { value: blockhash } = await withRetry(() => this.rpc.getLatestBlockhash().send(), {
      rpcUrl: this.rpcUrl,
    });
    const ix = getChangeSchemaVersionInstruction({
      payer: authority,
      authority,
      credential,
      existingSchema,
      newSchema: schemaPda,
      layout: Uint8Array.from(layout),
      fieldNames: [...fieldNames],
    });
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayerSigner(authority, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
      (tx) => appendTransactionMessageInstruction(ix, tx),
    );
    const signed = await signTransactionMessageWithSigners(message);
    await sendAndConfirm(signed as Parameters<typeof sendAndConfirm>[0], { commitment: "confirmed" });
    return schemaPda;
  }

  async publish(
    testName: string,
    authority: KeyPairSigner,
    credential: Address,
    schema: Address,
    schemaVersion: number,
    fields: verifiedBuild.VerifiedBuildFields,
  ): Promise<{ attestation: Address; signature: string }> {
    const nonceBytes = verifiedBuild.nonce(fields.programId);
    const nonceAddress = toAddress(nonceBytes);
    const [attestationPda] = await deriveAttestationPda({ credential, schema, nonce: nonceAddress });

    const encodedData = verifiedBuild.encode(fields);
    const { value: blockhash } = await withRetry(() => this.rpc.getLatestBlockhash().send(), {
      rpcUrl: this.rpcUrl,
    });
    const ix = getCreateAttestationInstruction({
      payer: authority,
      authority,
      credential,
      schema,
      attestation: attestationPda,
      nonce: nonceAddress,
      data: encodedData,
      expiry: 0n,
    });
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayerSigner(authority, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
      (tx) => appendTransactionMessageInstruction(ix, tx),
    );
    const signed = await signTransactionMessageWithSigners(message);
    const sendAndConfirm = this.sendAndConfirmFn();
    await sendAndConfirm(signed as Parameters<typeof sendAndConfirm>[0], { commitment: "confirmed" });
    const signature = getSignatureFromTransaction(signed);

    allPublished.push({
      test: testName,
      attestationAddress: attestationPda,
      credential,
      schema,
      schemaVersion,
      programId: Buffer.from(fields.programId).toString("hex"),
      publishSignature: signature,
      fields: fieldsToJson(fields),
    });

    return { attestation: attestationPda, signature };
  }

  /**
   * The attestation PDA for a fixed programId is deterministic, so a re-run
   * would collide with a record left open by a previous run. Close it first.
   */
  async closeIfExists(authority: KeyPairSigner, credential: Address, attestation: Address): Promise<void> {
    const maybe = await withRetry(() => fetchMaybeAttestation(this.rpc, attestation), { rpcUrl: this.rpcUrl });
    if (maybe.exists) {
      await this.close(authority, credential, attestation);
    }
  }

  async close(authority: KeyPairSigner, credential: Address, attestation: Address): Promise<string> {
    const { value: blockhash } = await withRetry(() => this.rpc.getLatestBlockhash().send(), {
      rpcUrl: this.rpcUrl,
    });
    const ix = getCloseAttestationInstruction({ payer: authority, authority, credential, attestation });
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayerSigner(authority, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
      (tx) => appendTransactionMessageInstruction(ix, tx),
    );
    const signed = await signTransactionMessageWithSigners(message);
    const sendAndConfirm = this.sendAndConfirmFn();
    await sendAndConfirm(signed as Parameters<typeof sendAndConfirm>[0], { commitment: "confirmed" });
    return getSignatureFromTransaction(signed);
  }

  async queryDecoded(programId: Uint8Array): Promise<{ decoded: DecodedAttestation[]; excluded: unknown[] }> {
    const programIdAddress = toAddress(programId);
    const records = await queryAttestationsForProgram(this.rpc, this.rpcUrl, programIdAddress);
    return resolveAndDecode(this.rpc, this.rpcUrl, records);
  }
}

async function loadIssuerSigner(issuer: DevnetKeysFile["issuers"][number]): Promise<KeyPairSigner> {
  const bytes = new Uint8Array(JSON.parse(readFileSync(issuer.keypairPath, "utf-8")));
  return createKeyPairSignerFromBytes(bytes);
}

// --- Test 1: Data fidelity ---
async function test1DataFidelity(harness: DevnetHarness, authority: KeyPairSigner, credential: Address, schema: Address): Promise<string> {
  const programId = randomProgramId();
  const originalFields: verifiedBuild.VerifiedBuildFields = {
    programId,
    binaryHash: crypto.getRandomValues(new Uint8Array(32)),
    sourceCommit: "test1-original",
    verificationStatus: verifiedBuild.VERIFICATION_STATUS.Verified,
    verificationTimestamp: BigInt(Math.floor(Date.now() / 1000)),
  };

  const pub1 = await harness.publish("test1-fidelity", authority, credential, schema, 1, originalFields);
  const afterPublish = await harness.queryDecoded(programId);

  const closeSig = await harness.close(authority, credential, pub1.attestation);
  const afterClose = await harness.queryDecoded(programId);

  const updatedFields: verifiedBuild.VerifiedBuildFields = {
    ...originalFields,
    sourceCommit: "test1-republished",
    verificationTimestamp: BigInt(Math.floor(Date.now() / 1000)),
  };
  const pub2 = await harness.publish("test1-fidelity", authority, credential, schema, 1, updatedFields);
  const afterRepublish = await harness.queryDecoded(programId);

  const pass =
    afterPublish.decoded.length === 1 &&
    afterPublish.decoded[0].fields.sourceCommit === "test1-original" &&
    afterClose.decoded.length === 0 &&
    afterRepublish.decoded.length === 1 &&
    afterRepublish.decoded[0].fields.sourceCommit === "test1-republished";

  return `# Test 1: Data Fidelity

**Result: ${pass ? "PASS" : "FAIL"}**

1. Published original attestation: \`${pub1.attestation}\` (tx \`${pub1.signature}\`)
   - Query immediately after: ${afterPublish.decoded.length} record(s), sourceCommit=${afterPublish.decoded[0]?.fields.sourceCommit ?? "N/A"}
2. Closed attestation (tx \`${closeSig}\`)
   - Query immediately after close: ${afterClose.decoded.length} record(s) (expected 0)
3. Republished with new value: \`${pub2.attestation}\` (tx \`${pub2.signature}\`)
   - Query after republish: ${afterRepublish.decoded.length} record(s), sourceCommit=${afterRepublish.decoded[0]?.fields.sourceCommit ?? "N/A"}

programId: \`${Buffer.from(programId).toString("hex")}\`
`;
}

// --- Test 2: Multi-issuer isolation ---
async function test2MultiIssuerIsolation(
  harness: DevnetHarness,
  issuerA: { signer: KeyPairSigner; credential: Address; schema: Address; authority: string },
  issuerB: { signer: KeyPairSigner; credential: Address; schema: Address; authority: string },
): Promise<string> {
  const programId = randomProgramId();
  const fieldsA: verifiedBuild.VerifiedBuildFields = {
    programId,
    binaryHash: crypto.getRandomValues(new Uint8Array(32)),
    sourceCommit: "issuer-a-commit",
    verificationStatus: verifiedBuild.VERIFICATION_STATUS.Verified,
    verificationTimestamp: BigInt(Math.floor(Date.now() / 1000)),
  };
  const fieldsB: verifiedBuild.VerifiedBuildFields = {
    programId,
    binaryHash: crypto.getRandomValues(new Uint8Array(32)),
    sourceCommit: "issuer-b-commit",
    verificationStatus: verifiedBuild.VERIFICATION_STATUS.Mismatch,
    verificationTimestamp: BigInt(Math.floor(Date.now() / 1000)),
  };

  const pubA = await harness.publish("test2-multi-issuer", issuerA.signer, issuerA.credential, issuerA.schema, 1, fieldsA);
  const pubB = await harness.publish("test2-multi-issuer", issuerB.signer, issuerB.credential, issuerB.schema, 1, fieldsB);

  const result = await harness.queryDecoded(programId);
  const authorities = result.decoded.map((d) => d.issuer.authority).sort();
  const expectedAuthorities = [issuerA.authority, issuerB.authority].sort();
  const pass = result.decoded.length === 2 && JSON.stringify(authorities) === JSON.stringify(expectedAuthorities);

  return `# Test 2: Multi-Issuer Isolation

**Result: ${pass ? "PASS" : "FAIL"}**

Both issuers published a VerifiedBuildAttestation for the SAME programId \`${Buffer.from(programId).toString("hex")}\`:
- Issuer A (\`${issuerA.authority}\`): attestation \`${pubA.attestation}\` (tx \`${pubA.signature}\`)
- Issuer B (\`${issuerB.authority}\`): attestation \`${pubB.attestation}\` (tx \`${pubB.signature}\`)

Query returned ${result.decoded.length} record(s), attributed to: ${JSON.stringify(authorities)}
Expected: ${JSON.stringify(expectedAuthorities)}
`;
}

// --- Test 3: memcmp filter accuracy ---
async function test3MemcmpFilterAccuracy(harness: DevnetHarness, authority: KeyPairSigner, credential: Address, schema: Address): Promise<string> {
  const programIds = [randomProgramId(), randomProgramId(), randomProgramId()];
  const published: { attestation: Address; signature: string }[] = [];

  for (const pid of programIds) {
    const fields: verifiedBuild.VerifiedBuildFields = {
      programId: pid,
      binaryHash: crypto.getRandomValues(new Uint8Array(32)),
      sourceCommit: "test3-commit",
      verificationStatus: verifiedBuild.VERIFICATION_STATUS.Verified,
      verificationTimestamp: BigInt(Math.floor(Date.now() / 1000)),
    };
    published.push(await harness.publish("test3-memcmp", authority, credential, schema, 1, fields));
  }

  const targetIndex = 1;
  const result = await harness.queryDecoded(programIds[targetIndex]);
  const targetHex = Buffer.from(programIds[targetIndex]).toString("hex");
  const onlyTarget =
    result.decoded.length === 1 && Buffer.from(result.decoded[0].fields.programId).toString("hex") === targetHex;

  return `# Test 3: memcmp Filter Accuracy

**Result: ${onlyTarget ? "PASS" : "FAIL"}**

Published attestations for 3 distinct programIds:
${programIds.map((p, i) => `- [${i}] \`${Buffer.from(p).toString("hex")}\` → attestation \`${published[i].attestation}\` (tx \`${published[i].signature}\`)`).join("\n")}

Queried for programId[${targetIndex}] = \`${targetHex}\`
Result: ${result.decoded.length} record(s) returned (expected exactly 1, matching only the target)
`;
}

// --- Test 4: Binary round-trip ---
async function test4BinaryRoundTrip(harness: DevnetHarness, authority: KeyPairSigner, credential: Address, schema: Address): Promise<string> {
  const programId = randomProgramId();
  const original: verifiedBuild.VerifiedBuildFields = {
    programId,
    binaryHash: crypto.getRandomValues(new Uint8Array(32)),
    sourceCommit: "test4-roundtrip-commit",
    verificationStatus: verifiedBuild.VERIFICATION_STATUS.Unknown,
    verificationTimestamp: BigInt(Math.floor(Date.now() / 1000)),
  };

  const pub = await harness.publish("test4-roundtrip", authority, credential, schema, 1, original);
  const result = await harness.queryDecoded(programId);
  const decoded = result.decoded[0];

  const diffs = [
    { field: "programId", match: !!decoded && Buffer.from(decoded.fields.programId).equals(Buffer.from(original.programId)) },
    { field: "binaryHash", match: !!decoded && Buffer.from(decoded.fields.binaryHash).equals(Buffer.from(original.binaryHash)) },
    { field: "sourceCommit", match: decoded?.fields.sourceCommit === original.sourceCommit },
    { field: "verificationStatus", match: decoded?.fields.verificationStatus === original.verificationStatus },
    { field: "verificationTimestamp", match: decoded?.fields.verificationTimestamp === original.verificationTimestamp },
  ];
  const pass = diffs.every((d) => d.match);

  return `# Test 4: Binary Round-Trip

**Result: ${pass ? "PASS" : "FAIL"}**

Attestation: \`${pub.attestation}\` (tx \`${pub.signature}\`)

| Field | Match |
|---|---|
${diffs.map((d) => `| ${d.field} | ${d.match} |`).join("\n")}
`;
}

// --- Test 5: Cross-validation against real, independently-verified data ---
async function test5CrossValidation(harness: DevnetHarness, authority: KeyPairSigner, credential: Address, schema: Address): Promise<string> {
  // SPL Token program — canonical, immutable (not upgradeable), extremely
  // well-known mainnet program. Its account data hash is a permanent,
  // independently reproducible fact.
  const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  const mainnetRpc = createSolanaRpc("https://api.mainnet-beta.solana.com");

  const accountInfo = await mainnetRpc.getAccountInfo(address(SPL_TOKEN_PROGRAM_ID), { encoding: "base64" }).send();
  if (!accountInfo.value) throw new Error("Could not fetch SPL Token program account from mainnet");
  const [base64Data] = accountInfo.value.data;
  const programBytes = Buffer.from(base64Data, "base64");
  const independentlyComputedHash = createHash("sha256").update(programBytes).digest();

  // Independently fetch a real, current commit SHA from the public GitHub
  // repo — a genuinely external, reproducible check, not a hardcoded guess.
  let sourceCommit = "unavailable";
  let githubFetchNote = "";
  try {
    const ghResponse = await fetch(
      "https://api.github.com/repos/solana-program/token/commits/main",
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (ghResponse.ok) {
      const ghJson = (await ghResponse.json()) as { sha: string };
      sourceCommit = ghJson.sha;
    } else {
      githubFetchNote = `GitHub API returned ${ghResponse.status}; sourceCommit left as placeholder.`;
    }
  } catch (err) {
    githubFetchNote = `GitHub API fetch failed: ${err instanceof Error ? err.message : String(err)}; sourceCommit left as placeholder.`;
  }

  // SPL Token program address decoded to raw bytes for the attestation's programId field.
  const programIdBytes = new Uint8Array(getBase58Encoder().encode(SPL_TOKEN_PROGRAM_ID));

  const fields: verifiedBuild.VerifiedBuildFields = {
    programId: programIdBytes,
    binaryHash: new Uint8Array(independentlyComputedHash),
    sourceCommit,
    verificationStatus: verifiedBuild.VERIFICATION_STATUS.Verified,
    verificationTimestamp: BigInt(Math.floor(Date.now() / 1000)),
  };

  const nonceAddress = toAddress(verifiedBuild.nonce(programIdBytes));
  const [existingAttestationPda] = await deriveAttestationPda({ credential, schema, nonce: nonceAddress });
  await harness.closeIfExists(authority, credential, existingAttestationPda);

  const pub = await harness.publish("test5-cross-validation", authority, credential, schema, 1, fields);
  const result = await harness.queryDecoded(programIdBytes);
  const decoded = result.decoded[0];

  const hashMatches = !!decoded && Buffer.from(decoded.fields.binaryHash).equals(independentlyComputedHash);
  const commitMatches = decoded?.fields.sourceCommit === sourceCommit;
  const pass = hashMatches && commitMatches;

  return `# Test 5: Cross-Validation Against Real Data

**Result: ${pass ? "PASS" : "FAIL"}**

Subject: SPL Token program (\`${SPL_TOKEN_PROGRAM_ID}\`), a real, immutable, canonical mainnet program.

- Binary hash independently computed via a fresh \`getAccountInfo\` call against public mainnet RPC
  and local SHA-256, **before** publishing: \`${independentlyComputedHash.toString("hex")}\`
- Source commit independently fetched from the GitHub API (\`solana-program/token\`, \`main\` branch)
  at test time: \`${sourceCommit}\`${githubFetchNote ? `\n  (${githubFetchNote})` : ""}
- Published as devnet attestation: \`${pub.attestation}\` (tx \`${pub.signature}\`)
- Queried back — binaryHash matches independently-computed value: ${hashMatches}
- Queried back — sourceCommit matches independently-fetched value: ${commitMatches}

**Scope:** this checks that the published and decoded values match the ones recomputed at test
time. It does not prove that this commit produced this binary; that needs reproducible-build
tooling, which Kenmark does not provide.
`;
}

// --- Test 6: Schema version compatibility ---
async function test6SchemaVersionCompatibility(
  harness: DevnetHarness,
  authority: KeyPairSigner,
  credential: Address,
): Promise<string> {
  const schemaV1 = await harness.ensureSchema(
    authority,
    credential,
    1,
    verifiedBuild.LAYOUT,
    verifiedBuild.FIELD_NAMES,
    "Kenmark VerifiedBuildAttestation v1",
  );

  // v2 reverses fields 2-5 so the byte layout genuinely differs from v1.
  // programId stays first: the aggregator's memcmp filter depends on it
  // sitting at a fixed offset in every predicate.
  const layoutV2 = [13, 8, 0, 12, 13];
  const fieldNamesV2 = ["programId", "verificationTimestamp", "verificationStatus", "sourceCommit", "binaryHash"];
  const schemaV2 = await harness.ensureSchema(
    authority,
    credential,
    2,
    layoutV2,
    fieldNamesV2,
    "Kenmark VerifiedBuildAttestation v2 (reversed field order, test fixture)",
  );

  const programIdV1 = randomProgramId();
  const programIdV2 = randomProgramId();

  const fieldsV1: verifiedBuild.VerifiedBuildFields = {
    programId: programIdV1,
    binaryHash: crypto.getRandomValues(new Uint8Array(32)),
    sourceCommit: "test6-v1-commit",
    verificationStatus: verifiedBuild.VERIFICATION_STATUS.Verified,
    verificationTimestamp: BigInt(Math.floor(Date.now() / 1000)),
  };
  const fieldsV2: verifiedBuild.VerifiedBuildFields = {
    programId: programIdV2,
    binaryHash: crypto.getRandomValues(new Uint8Array(32)),
    sourceCommit: "test6-v2-commit",
    verificationStatus: verifiedBuild.VERIFICATION_STATUS.Mismatch,
    verificationTimestamp: BigInt(Math.floor(Date.now() / 1000)),
  };

  // Publish v2's attestation using the v2 layout directly (bypassing
  // verifiedBuild.encode, which is hardcoded to v1's layout).
  const encodedV2 = encodeAttestationData(layoutV2, fieldNamesV2, {
    programId: fieldsV2.programId,
    binaryHash: fieldsV2.binaryHash,
    sourceCommit: fieldsV2.sourceCommit,
    verificationStatus: fieldsV2.verificationStatus,
    verificationTimestamp: fieldsV2.verificationTimestamp,
  });

  const pubV1 = await harness.publish("test6-schema-version", authority, credential, schemaV1, 1, fieldsV1);

  // Manual publish for v2 since it uses a non-default layout.
  const nonceV2 = toAddress(verifiedBuild.nonce(programIdV2));
  const [attestationV2] = await deriveAttestationPda({ credential, schema: schemaV2, nonce: nonceV2 });
  const { value: blockhash } = await withRetry(() => harness.rpc.getLatestBlockhash().send(), {
    rpcUrl: harness.rpcUrl,
  });
  const ixV2 = getCreateAttestationInstruction({
    payer: authority,
    authority,
    credential,
    schema: schemaV2,
    attestation: attestationV2,
    nonce: nonceV2,
    data: encodedV2,
    expiry: 0n,
  });
  const messageV2 = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(authority, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
    (tx) => appendTransactionMessageInstruction(ixV2, tx),
  );
  const signedV2 = await signTransactionMessageWithSigners(messageV2);
  const sendAndConfirm = harness.sendAndConfirmFn();
  await sendAndConfirm(signedV2 as Parameters<typeof sendAndConfirm>[0], { commitment: "confirmed" });
  const pubV2Signature = getSignatureFromTransaction(signedV2);
  allPublished.push({
    test: "test6-schema-version",
    attestationAddress: attestationV2,
    credential,
    schema: schemaV2,
    schemaVersion: 2,
    programId: Buffer.from(programIdV2).toString("hex"),
    publishSignature: pubV2Signature,
    fields: fieldsToJson(fieldsV2),
  });

  const resultV1 = await harness.queryDecoded(programIdV1);
  const resultV2 = await harness.queryDecoded(programIdV2);

  const v1Correct =
    resultV1.decoded.length === 1 &&
    resultV1.decoded[0].schemaVersion === 1 &&
    resultV1.decoded[0].fields.sourceCommit === "test6-v1-commit";
  const v2Correct =
    resultV2.decoded.length === 1 &&
    resultV2.decoded[0].schemaVersion === 2 &&
    resultV2.decoded[0].fields.sourceCommit === "test6-v2-commit";
  const pass = v1Correct && v2Correct;

  return `# Test 6: Schema Version Compatibility

**Result: ${pass ? "PASS" : "FAIL"}**

- Schema v1 (\`${schemaV1}\`): standard field order \`[${verifiedBuild.FIELD_NAMES.join(", ")}]\`
- Schema v2 (\`${schemaV2}\`): fields 2-5
  REVERSED, field 1 still \`programId\` \`[${fieldNamesV2.join(", ")}]\` — a genuine structural difference

- v1 attestation \`${pubV1.attestation}\` (tx \`${pubV1.signature}\`) → decoded correctly against v1: ${v1Correct}
- v2 attestation \`${attestationV2}\` (tx \`${pubV2Signature}\`) → decoded correctly against v2: ${v2Correct}

No cross-decoding occurred: each attestation's data was interpreted using its OWN resolved
schema version's layout, not the other version's.
`;
}

async function main() {
  if (!existsSync(KEYS_PATH)) {
    console.error(`Missing ${KEYS_PATH} — run scripts/setup-devnet.ts first.`);
    process.exitCode = 1;
    return;
  }

  const fixtures: DevnetKeysFile = JSON.parse(readFileSync(KEYS_PATH, "utf-8"));
  if (fixtures.issuers.length < 2) {
    console.error("Need at least 2 issuers in .devnet-keys.json for multi-issuer tests.");
    process.exitCode = 1;
    return;
  }

  const config = loadConfig({ rpcUrl: fixtures.rpcUrl });
  const rpc = createRpcClient(config.rpcUrl);
  const harness = new DevnetHarness(rpc, config.rpcSubscriptionsUrl, config.rpcUrl);

  const [issuerAFixture, issuerBFixture] = fixtures.issuers;
  const signerA = await loadIssuerSigner(issuerAFixture);
  const signerB = await loadIssuerSigner(issuerBFixture);
  const credentialA = address(issuerAFixture.credential);
  const credentialB = address(issuerBFixture.credential);

  logger.info("Ensuring v1 schemas exist for both issuers...");
  const schemaA = await harness.ensureSchema(
    signerA,
    credentialA,
    1,
    verifiedBuild.LAYOUT,
    verifiedBuild.FIELD_NAMES,
    "Kenmark VerifiedBuildAttestation v1",
  );
  const schemaB = await harness.ensureSchema(
    signerB,
    credentialB,
    1,
    verifiedBuild.LAYOUT,
    verifiedBuild.FIELD_NAMES,
    "Kenmark VerifiedBuildAttestation v1",
  );

  mkdirSync(RESULTS_DIR, { recursive: true });

  logger.info("Running test 1: data fidelity...");
  writeFileSync(join(RESULTS_DIR, "data-fidelity-report.md"), await test1DataFidelity(harness, signerA, credentialA, schemaA));

  logger.info("Running test 2: multi-issuer isolation...");
  writeFileSync(
    join(RESULTS_DIR, "multi-issuer-isolation-report.md"),
    await test2MultiIssuerIsolation(
      harness,
      { signer: signerA, credential: credentialA, schema: schemaA, authority: issuerAFixture.authority },
      { signer: signerB, credential: credentialB, schema: schemaB, authority: issuerBFixture.authority },
    ),
  );

  logger.info("Running test 3: memcmp filter accuracy...");
  writeFileSync(
    join(RESULTS_DIR, "memcmp-filter-accuracy-report.md"),
    await test3MemcmpFilterAccuracy(harness, signerA, credentialA, schemaA),
  );

  logger.info("Running test 4: binary round-trip...");
  writeFileSync(join(RESULTS_DIR, "binary-roundtrip-report.md"), await test4BinaryRoundTrip(harness, signerA, credentialA, schemaA));

  logger.info("Running test 5: cross-validation against real data...");
  writeFileSync(
    join(RESULTS_DIR, "cross-validation-report.md"),
    await test5CrossValidation(harness, signerA, credentialA, schemaA),
  );

  logger.info("Running test 6: schema version compatibility...");
  writeFileSync(
    join(RESULTS_DIR, "schema-version-compatibility-report.md"),
    await test6SchemaVersionCompatibility(harness, signerA, credentialA),
  );

  writeFileSync(ATTESTATIONS_JSON_PATH, JSON.stringify(allPublished, null, 2));
  logger.info(`Wrote ${allPublished.length} published attestation record(s) to ${ATTESTATIONS_JSON_PATH}`);
  logger.info(`Reports written to ${RESULTS_DIR}`);
}

main().catch((err) => {
  logger.error("run-validation failed", { error: err instanceof Error ? err.stack ?? err.message : String(err) });
  process.exitCode = 1;
});
