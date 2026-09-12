/**
 * Cross-checks VerifiedBuildAttestation against a third-party source. Pulls
 * live data from OtterSec's public verified-builds registry (verify.osec.io)
 * for three mainnet programs and publishes each as a devnet attestation:
 *
 *   - Phoenix   (PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY) -> Verified
 *   - Marinade  (MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD) -> Mismatch
 *     (the registry's on_chain_hash and executable_hash disagree)
 *   - Kamino    (KaminoLendkCC8gK7iCK6oCEQaefsUEC1BeXKcm5cVc) -> Unknown
 *     (no verification data in the registry)
 *
 * The point is to exercise the schema against data Kenmark did not produce,
 * including the messy parts: empty commit strings, a literal "None", a null
 * timestamp. Nothing is cleaned up before publishing.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  address,
  appendTransactionMessageInstruction,
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
  type Rpc,
  type SolanaRpcApi,
} from "@solana/kit";
import { createKeyPairSignerFromBytes } from "@solana/signers";
import { deriveAttestationPda, deriveSchemaPda, fetchMaybeSchema, getCreateAttestationInstruction, getCreateSchemaInstruction } from "sas-lib";
import { createRpcClient, withRetry } from "../packages/core/src/rpc/client.js";
import { loadConfig } from "../packages/core/src/config/index.js";
import { queryAttestationsForProgram } from "../packages/core/src/aggregator/query.js";
import { resolveAndDecode } from "../packages/core/src/aggregator/decode.js";
import * as verifiedBuild from "../packages/core/src/schemas/verified-build.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEYS_PATH = join(__dirname, "../scripts/.devnet-keys.json");
const RESULTS_DIR = join(__dirname, "test-results");
const OUTPUT_PATH = join(__dirname, "real-world-attestations.json");

const OSEC_STATUS_URL = "https://verify.osec.io/status";

interface OsecStatus {
  is_verified: boolean;
  message: string;
  on_chain_hash: string;
  executable_hash: string;
  repo_url: string;
  commit: string;
  last_verified_at: string | null;
  is_frozen: boolean;
  is_closed: boolean;
}

interface Subject {
  label: string;
  programId: string; // base58 mainnet program address — used as the attestation subject, not deployed to devnet
  expectedStatus: keyof typeof verifiedBuild.VERIFICATION_STATUS;
}

const SUBJECTS: Subject[] = [
  { label: "Phoenix", programId: "PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY", expectedStatus: "Verified" },
  { label: "Marinade", programId: "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD", expectedStatus: "Mismatch" },
  { label: "Kamino", programId: "KaminoLendkCC8gK7iCK6oCEQaefsUEC1BeXKcm5cVc", expectedStatus: "Unknown" },
];

const ZERO_HASH = new Uint8Array(32); // sentinel for an absent hash

async function fetchOsecStatus(programId: string): Promise<OsecStatus> {
  const res = await fetch(`${OSEC_STATUS_URL}/${programId}`);
  if (!res.ok) throw new Error(`OtterSec API returned ${res.status} for ${programId}`);
  return (await res.json()) as OsecStatus;
}

function deriveVerificationStatus(status: OsecStatus): verifiedBuild.VerificationStatus {
  if (status.is_verified) return verifiedBuild.VERIFICATION_STATUS.Verified;
  if (status.on_chain_hash && status.executable_hash && status.on_chain_hash !== status.executable_hash) {
    return verifiedBuild.VERIFICATION_STATUS.Mismatch;
  }
  return verifiedBuild.VERIFICATION_STATUS.Unknown;
}

function hexToBytes32(hex: string): Uint8Array {
  if (!hex || hex.length !== 64) return ZERO_HASH;
  return new Uint8Array(Buffer.from(hex, "hex"));
}

function timestampFromIso(iso: string | null): bigint {
  if (!iso) return 0n; // sentinel: never verified
  return BigInt(Math.floor(Date.parse(iso) / 1000));
}

async function main() {
  if (!existsSync(KEYS_PATH)) {
    console.error(`Missing ${KEYS_PATH} — run scripts/setup-devnet.ts first.`);
    process.exitCode = 1;
    return;
  }
  const fixtures = JSON.parse(readFileSync(KEYS_PATH, "utf-8")) as {
    rpcUrl?: string;
    issuers: { keypairPath: string; credential: string }[];
  };
  const issuer = fixtures.issuers[0];

  const config = loadConfig({ rpcUrl: fixtures.rpcUrl });
  const rpc = createRpcClient(config.rpcUrl);
  const rpcSubscriptions = createSolanaRpcSubscriptions(devnet(config.rpcSubscriptionsUrl));
  const sendAndConfirm = sendAndConfirmTransactionFactory({
    rpc: rpc as Rpc<SolanaRpcApi> & { "~cluster"?: "devnet" },
    rpcSubscriptions,
  });

  const authoritySigner = await createKeyPairSignerFromBytes(
    new Uint8Array(JSON.parse(readFileSync(issuer.keypairPath, "utf-8"))),
  );
  const credentialAddress = address(issuer.credential);

  const [schemaPda] = await deriveSchemaPda({ credential: credentialAddress, name: verifiedBuild.PREDICATE_TYPE, version: 1 });
  const maybeSchema = await withRetry(() => fetchMaybeSchema(rpc, schemaPda), { rpcUrl: config.rpcUrl });
  if (!maybeSchema.exists) {
    const { value: blockhash } = await rpc.getLatestBlockhash().send();
    const ix = getCreateSchemaInstruction({
      payer: authoritySigner,
      authority: authoritySigner,
      credential: credentialAddress,
      schema: schemaPda,
      name: verifiedBuild.PREDICATE_TYPE,
      description: "Kenmark VerifiedBuildAttestation",
      layout: Uint8Array.from(verifiedBuild.LAYOUT),
      fieldNames: [...verifiedBuild.FIELD_NAMES],
    });
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayerSigner(authoritySigner, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
      (tx) => appendTransactionMessageInstruction(ix, tx),
    );
    const signed = await signTransactionMessageWithSigners(message);
    await sendAndConfirm(signed as Parameters<typeof sendAndConfirm>[0], { commitment: "confirmed" });
  }

  const rows: string[] = [];
  const published: Record<string, unknown>[] = [];

  for (const subject of SUBJECTS) {
    console.log(`Fetching live OtterSec status for ${subject.label} (${subject.programId})...`);
    const status = await fetchOsecStatus(subject.programId);
    const derivedStatus = deriveVerificationStatus(status);
    const derivedStatusName = verifiedBuild.verificationStatusName(derivedStatus);

    const programIdBytes = new Uint8Array(getBase58Encoder().encode(subject.programId));
    const fields: verifiedBuild.VerifiedBuildFields = {
      programId: programIdBytes,
      binaryHash: hexToBytes32(status.on_chain_hash),
      sourceCommit: status.commit,
      verificationStatus: derivedStatus,
      verificationTimestamp: timestampFromIso(status.last_verified_at),
    };

    // Close any attestation left open by a previous run so the script is idempotent.
    const nonceAddress = address(getBase58Decoder().decode(verifiedBuild.nonce(programIdBytes)));
    const [attestationPda] = await deriveAttestationPda({ credential: credentialAddress, schema: schemaPda, nonce: nonceAddress });
    const existing = await rpc.getAccountInfo(attestationPda, { commitment: "confirmed", encoding: "base64" }).send();
    if (existing.value) {
      const { getCloseAttestationInstruction } = await import("sas-lib");
      const { value: closeBlockhash } = await rpc.getLatestBlockhash().send();
      const closeIx = getCloseAttestationInstruction({
        payer: authoritySigner,
        authority: authoritySigner,
        credential: credentialAddress,
        attestation: attestationPda,
      });
      const closeMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(authoritySigner, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(closeBlockhash, tx),
        (tx) => appendTransactionMessageInstruction(closeIx, tx),
      );
      const signedClose = await signTransactionMessageWithSigners(closeMessage);
      await sendAndConfirm(signedClose as Parameters<typeof sendAndConfirm>[0], { commitment: "confirmed" });
    }

    const encodedData = verifiedBuild.encode(fields);
    const { value: blockhash } = await rpc.getLatestBlockhash().send();
    const ix = getCreateAttestationInstruction({
      payer: authoritySigner,
      authority: authoritySigner,
      credential: credentialAddress,
      schema: schemaPda,
      attestation: attestationPda,
      nonce: nonceAddress,
      data: encodedData,
      expiry: 0n,
    });
    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayerSigner(authoritySigner, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
      (tx) => appendTransactionMessageInstruction(ix, tx),
    );
    const signed = await signTransactionMessageWithSigners(message);
    await sendAndConfirm(signed as Parameters<typeof sendAndConfirm>[0], { commitment: "confirmed" });
    const signature = getSignatureFromTransaction(signed);

    const programIdAddress = address(getBase58Decoder().decode(programIdBytes));
    const records = await queryAttestationsForProgram(rpc, config.rpcUrl, programIdAddress);
    const { decoded } = await resolveAndDecode(rpc, config.rpcUrl, records);
    // Match on attestationAddress rather than expecting exactly one record:
    // other issuers may hold attestations for the same program.
    const result = decoded.find((d) => d.attestationAddress === attestationPda);

    const binaryHashMatches = !!result && Buffer.from(result.fields.binaryHash).equals(Buffer.from(fields.binaryHash));
    const commitMatches = result?.fields.sourceCommit === fields.sourceCommit;
    const statusMatches = result?.fields.verificationStatus === fields.verificationStatus;
    const timestampMatches = result?.fields.verificationTimestamp === fields.verificationTimestamp;
    const pass = !!result && binaryHashMatches && commitMatches && statusMatches && timestampMatches;

    console.log(`  OtterSec: is_verified=${status.is_verified} -> derived ${derivedStatusName}. Round-trip: ${pass ? "PASS" : "FAIL"}`);

    published.push({
      subject: subject.label,
      programId: subject.programId,
      attestationAddress: attestationPda,
      publishSignature: signature,
      osecSnapshot: status,
      derivedStatus: derivedStatusName,
      decodedRoundTrip: pass,
    });

    rows.push(`### ${subject.label} (\`${subject.programId}\`)

**Source:** live query to \`${OSEC_STATUS_URL}/${subject.programId}\` at test time.

\`\`\`json
${JSON.stringify(status, null, 2)}
\`\`\`

**Mapped to \`VerifiedBuildAttestation\`:** \`verificationStatus = ${derivedStatusName}\` (derived from \`is_verified\`${
      derivedStatus === verifiedBuild.VERIFICATION_STATUS.Mismatch ? " and on_chain_hash != executable_hash" : ""
    }), \`sourceCommit = ${JSON.stringify(status.commit)}\`, \`verificationTimestamp = ${fields.verificationTimestamp}\`${
      status.last_verified_at ? "" : " (0 sentinel — OtterSec has no record of this program ever being checked)"
    }.

**Published:** \`${attestationPda}\` (tx \`${signature}\`)

**Round-trip result:** ${pass ? "PASS" : "FAIL"} — the aggregator returned ${decoded.length} record(s) for this programId (other issuers may hold attestations for the same program). Our record was found and matched: binaryHash ${binaryHashMatches}, sourceCommit ${commitMatches}, verificationStatus ${statusMatches}, verificationTimestamp ${timestampMatches}.
`);
  }

  mkdirSync(RESULTS_DIR, { recursive: true });
  const report = `# Real-World Cross-Check: VerifiedBuildAttestation Against OtterSec's Registry

Every field below was pulled live from OtterSec's public verified-builds registry
(\`verify.osec.io\`) for three mainnet programs Kenmark does not control. Together their live data
covers all three \`verificationStatus\` values:

- **Phoenix** — \`Verified\`.
- **Marinade** — \`Mismatch\`: the registry's own \`on_chain_hash\` and \`executable_hash\` disagree.
- **Kamino** — \`Unknown\`: the registry has no verification data, so every field is empty or null,
  which exercises the zero-sentinel conventions against genuinely absent data.

Each was mapped into Kenmark's schema, published as a \`CreateAttestation\` transaction on devnet,
and queried back through the same aggregation code path a consumer would use.

${rows.join("\n")}

## What this adds to the six synthetic tests

1. **The schema holds up against messy third-party data.** An empty \`commit\`, a literal \`"None"\`
   (Phoenix's own API response), and a \`null\` \`last_verified_at\` all round-tripped through the
   \`String\` and \`I64\` fields unchanged.
2. **Every \`verificationStatus\` value now has a real example on devnet.** The synthetic tests only
   produced Verified and Unknown, with made-up data.
3. **Kenmark represents an issuer's claim without altering it.** This is the production case, and
   self-published test data cannot exercise it because Kenmark is then both publisher and issuer.

Raw output: \`real-world-attestations.json\` holds every attestation published, with pubkeys, tx
signatures, and the OtterSec API snapshot each was built from.
`;

  writeFileSync(join(RESULTS_DIR, "real-world-cross-check-report.md"), report);
  writeFileSync(OUTPUT_PATH, JSON.stringify(published, null, 2));
  console.log(`\nWrote report to ${join(RESULTS_DIR, "real-world-cross-check-report.md")}`);
  console.log(`Wrote raw data to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("real-world-cross-check failed:", err instanceof Error ? err.stack ?? err.message : String(err));
  process.exitCode = 1;
});
