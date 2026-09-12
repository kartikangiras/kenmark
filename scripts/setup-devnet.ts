/**
 * Provisions the devnet fixtures the integration test and validation suite
 * depend on: two funded wallets, each with its own SAS Credential. Two,
 * because the multi-issuer isolation test needs distinct issuers publishing
 * for the same programId.
 *
 * Idempotent: re-running reuses persisted keypairs, skips airdrop if the
 * wallet is already funded, and skips CreateCredential if the PDA already
 * exists on-chain.
 *
 * Devnet airdrops are rate-limited; if the RPC airdrop fails, this script
 * fails loudly with instructions to fund manually via https://faucet.solana.com
 * rather than silently proceeding with an unfunded wallet.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  airdropFactory,
  appendTransactionMessageInstruction,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  devnet,
  getSignatureFromTransaction,
  lamports,
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
import { createKeyPairFromPrivateKeyBytes } from "@solana/keys";
import { createKeyPairSignerFromBytes } from "@solana/signers";
import { deriveCredentialPda, fetchMaybeCredential, getCreateCredentialInstruction } from "sas-lib";
import { createRpcClient, withRetry } from "../packages/core/src/rpc/client.js";
import { loadConfig } from "../packages/core/src/config/index.js";
import { logger } from "../packages/core/src/logging/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEYS_OUTPUT_PATH = join(__dirname, ".devnet-keys.json");
const MIN_LAMPORTS = 500_000_000n; // 0.5 SOL — enough for bootstrap + several publishes
const AIRDROP_LAMPORTS = 1_000_000_000n; // 1 SOL

interface IssuerFixture {
  label: string;
  keypairPath: string;
  authority: string;
  credential: string;
  credentialName: string;
  fundingSignature: string | null;
  credentialCreationSignature: string | null;
}

interface DevnetKeysFile {
  rpcUrl: string;
  issuers: IssuerFixture[];
}

async function generateSecretKeyBytes(): Promise<Uint8Array> {
  const privateKeyBytes = new Uint8Array(await import("node:crypto").then((c) => c.randomBytes(32)));
  const { publicKey } = await createKeyPairFromPrivateKeyBytes(privateKeyBytes, true);
  const publicKeyBytes = new Uint8Array(await crypto.subtle.exportKey("raw", publicKey));
  const secretKeyBytes = new Uint8Array(64);
  secretKeyBytes.set(privateKeyBytes, 0);
  secretKeyBytes.set(publicKeyBytes, 32);
  return secretKeyBytes;
}

async function loadOrCreateKeypairSigner(path: string): Promise<KeyPairSigner> {
  if (existsSync(path)) {
    const bytes = new Uint8Array(JSON.parse(readFileSync(path, "utf-8")));
    return createKeyPairSignerFromBytes(bytes);
  }
  const bytes = await generateSecretKeyBytes();
  writeFileSync(path, JSON.stringify(Array.from(bytes)));
  return createKeyPairSignerFromBytes(bytes);
}

async function ensureFunded(
  rpc: Rpc<SolanaRpcApi>,
  rpcSubscriptionsUrl: string,
  signer: KeyPairSigner,
  rpcUrl: string,
): Promise<string | null> {
  const balance = await withRetry(() => rpc.getBalance(signer.address).send(), { rpcUrl });
  if (balance.value >= MIN_LAMPORTS) {
    logger.info(`${signer.address} already funded`, { lamports: balance.value.toString() });
    return null;
  }

  logger.info(`Airdropping to ${signer.address}`, { lamports: AIRDROP_LAMPORTS.toString() });
  const rpcSubscriptions = createSolanaRpcSubscriptions(devnet(rpcSubscriptionsUrl));
  const airdrop = airdropFactory({ rpc: rpc as Rpc<SolanaRpcApi> & { "~cluster"?: "devnet" }, rpcSubscriptions });

  try {
    const signature = await airdrop({
      commitment: "confirmed",
      recipientAddress: signer.address,
      lamports: lamports(AIRDROP_LAMPORTS),
    });
    const postBalance = await withRetry(() => rpc.getBalance(signer.address).send(), { rpcUrl });
    if (postBalance.value < MIN_LAMPORTS) {
      throw new Error(
        `Airdrop transaction ${signature} confirmed but balance (${postBalance.value}) is still below minimum (${MIN_LAMPORTS})`,
      );
    }
    return signature;
  } catch (err) {
    throw new Error(
      `Devnet airdrop failed for ${signer.address}: ${err instanceof Error ? err.message : String(err)}\n` +
        `Fund this wallet manually at https://faucet.solana.com (paste address ${signer.address}), then re-run this script — it will detect the balance and skip airdrop.`,
      { cause: err },
    );
  }
}

async function ensureCredential(
  rpc: Rpc<SolanaRpcApi>,
  rpcSubscriptionsUrl: string,
  authority: KeyPairSigner,
  credentialName: string,
  rpcUrl: string,
): Promise<{ credential: Address; signature: string | null }> {
  const [credentialPda] = await deriveCredentialPda({ authority: authority.address, name: credentialName });

  const maybeExisting = await withRetry(() => fetchMaybeCredential(rpc, credentialPda), { rpcUrl });
  if (maybeExisting.exists) {
    logger.info(`Credential already exists at ${credentialPda}`, { authority: authority.address });
    return { credential: credentialPda, signature: null };
  }

  logger.info(`Creating Credential`, { authority: authority.address, name: credentialName });
  const instruction = getCreateCredentialInstruction({
    payer: authority,
    credential: credentialPda,
    authority,
    name: credentialName,
    signers: [authority.address],
  });

  const rpcSubscriptions = createSolanaRpcSubscriptions(devnet(rpcSubscriptionsUrl));
  const { value: latestBlockhash } = await withRetry(() => rpc.getLatestBlockhash().send(), { rpcUrl });

  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(authority, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstruction(instruction, tx),
  );

  const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
  const sendAndConfirm = sendAndConfirmTransactionFactory({
    rpc: rpc as Rpc<SolanaRpcApi> & { "~cluster"?: "devnet" },
    rpcSubscriptions,
  });
  // signTransactionMessageWithSigners' return type carries a broader
  // TransactionWithLifetime union than sendAndConfirm's narrower
  // TransactionWithLastValidBlockHeight param — a known @solana/kit generic
  // gap, not a runtime concern, since setTransactionMessageLifetimeUsingBlockhash
  // above guarantees the blockhash variant.
  await sendAndConfirm(signedTransaction as Parameters<typeof sendAndConfirm>[0], { commitment: "confirmed" });
  const signature = getSignatureFromTransaction(signedTransaction);

  return { credential: credentialPda, signature };
}

async function main(): Promise<void> {
  // This script is documented as idempotent, so a re-run must not quietly
  // downgrade an endpoint that already works: carry forward whatever rpcUrl a
  // previous run recorded unless the environment explicitly overrides it.
  // Without this, re-running with a clean environment rewrites a working
  // custom RPC back to the rate-limited public default.
  const previousRpcUrl = existsSync(KEYS_OUTPUT_PATH)
    ? (JSON.parse(readFileSync(KEYS_OUTPUT_PATH, "utf-8")) as Partial<DevnetKeysFile>).rpcUrl
    : undefined;

  const config = loadConfig({ rpcUrl: previousRpcUrl });
  const rpc = createRpcClient(config.rpcUrl);
  mkdirSync(__dirname, { recursive: true });

  const issuers: IssuerFixture[] = [];

  for (const i of [1, 2] as const) {
    const label = `issuer-${i}`;
    const keypairPath = join(__dirname, `.devnet-keypair-${label}.json`);
    const credentialName = `kenmark-tranche1-${label}`;

    const signer = await loadOrCreateKeypairSigner(keypairPath);
    logger.info(`Loaded/created signer for ${label}`, { address: signer.address });

    const fundingSignature = await ensureFunded(rpc, config.rpcSubscriptionsUrl, signer, config.rpcUrl);
    const { credential, signature: credentialCreationSignature } = await ensureCredential(
      rpc,
      config.rpcSubscriptionsUrl,
      signer,
      credentialName,
      config.rpcUrl,
    );

    issuers.push({
      label,
      keypairPath,
      authority: signer.address,
      credential,
      credentialName,
      fundingSignature,
      credentialCreationSignature,
    });
  }

  const output: DevnetKeysFile = { rpcUrl: config.rpcUrl, issuers };
  writeFileSync(KEYS_OUTPUT_PATH, JSON.stringify(output, null, 2));
  logger.info(`Wrote devnet fixture summary to ${KEYS_OUTPUT_PATH}`);

  for (const issuer of issuers) {
    console.log(`${issuer.label}: authority=${issuer.authority} credential=${issuer.credential}`);
  }
}

main().catch((err) => {
  logger.error("setup-devnet failed", { error: err instanceof Error ? err.message : String(err) });
  process.exitCode = 1;
});
