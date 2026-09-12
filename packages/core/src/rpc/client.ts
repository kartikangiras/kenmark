import { createSolanaRpc, type Rpc, type SolanaRpcApi } from "@solana/kit";
import { RpcUnreachableError } from "@kenmark/errors";
import { logger } from "../logging/logger.js";

const DEFAULT_MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 300;

/** Thin wrapper over the Solana RPC connection — no retry logic here, see withRetry(). */
export function createRpcClient(rpcUrl: string): Rpc<SolanaRpcApi> {
  return createSolanaRpc(rpcUrl);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an RPC call with exponential backoff (3 attempts by default) and
 * throws RpcUnreachableError once attempts are exhausted.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { rpcUrl: string; maxAttempts?: number },
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      logger.warn(`RPC attempt ${attempt}/${maxAttempts} failed`, {
        rpcUrl: options.rpcUrl,
        error: err instanceof Error ? err.message : String(err),
      });
      if (attempt < maxAttempts) {
        await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  }

  throw new RpcUnreachableError(options.rpcUrl, lastError);
}
