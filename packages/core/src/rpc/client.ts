import { createSolanaRpc, type Rpc, type SolanaRpcApi } from "@solana/kit";
import { RpcUnreachableError } from "@kenmark/errors";
import { logger } from "../logging/logger.js";

const DEFAULT_MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 300;

/**
 * Strips sensitive query parameters (api-key, token, secret) from an RPC URL
 * before it is written to logs, so provider API keys are never exposed.
 */
function redactRpcUrl(rpcUrl: string): string {
  try {
    const u = new URL(rpcUrl);
    for (const param of ["api-key", "apiKey", "token", "secret", "key"]) {
      if (u.searchParams.has(param)) {
        u.searchParams.set(param, "[REDACTED]");
      }
    }
    return u.toString();
  } catch {
    // Not a valid URL — return a fully-redacted placeholder rather than
    // risk leaking whatever the string contains.
    return "[REDACTED_URL]";
  }
}

const RATE_LIMIT = /\b429\b|too many requests/i;

/** True when the error, or anything in its cause chain, is an RPC rate limit. */
export function isRateLimitError(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; current && depth < 6; depth++) {
    const message = current instanceof Error ? current.message : String(current);
    if (RATE_LIMIT.test(message)) return true;
    current = current instanceof Error ? current.cause : undefined;
  }
  return false;
}

/**
 * Public endpoints throttle getProgramAccounts per method, so a burst of
 * queries hits 429s that withRetry's short backoff does not outlast. Waits
 * longer between attempts for that one failure class and rethrows anything else.
 */
export async function withRateLimitBackoff<T>(
  operation: () => Promise<T>,
  delaysMs: readonly number[] = [800, 2000, 4000],
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (!isRateLimitError(err) || attempt === delaysMs.length) throw err;
      await sleep(delaysMs[attempt]);
    }
  }
}

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
        rpcUrl: redactRpcUrl(options.rpcUrl),
        error: err instanceof Error ? err.message : String(err),
      });
      if (attempt < maxAttempts) {
        await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  }

  throw new RpcUnreachableError(options.rpcUrl, lastError);
}
