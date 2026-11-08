/** Read/query-path errors. */

/** The RPC endpoint could not be reached after retries. */
export class RpcUnreachableError extends Error {
  constructor(rpcUrl: string, cause?: unknown) {
    super(`RPC unreachable at ${redactRpcUrl(rpcUrl)}`, { cause });
    this.name = "RpcUnreachableError";
  }
}

/**
 * Strips sensitive query parameters (api-key, token, secret) from an RPC URL
 * before it is embedded in error messages or logs.
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
    return "[REDACTED_URL]";
  }
}

/**
 * An attestation's schema name is not a predicate this package can decode.
 * The record is excluded from typed output; this is not treated as fatal.
 */
export class UnknownPredicateType extends Error {
  constructor(public readonly predicateType: string) {
    super(`Unrecognized predicateType: ${predicateType}`);
    this.name = "UnknownPredicateType";
  }
}
