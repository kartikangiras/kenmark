/** Read/query-path errors. */

/** The RPC endpoint could not be reached after retries. */
export class RpcUnreachableError extends Error {
  constructor(rpcUrl: string, cause?: unknown) {
    super(`RPC unreachable at ${rpcUrl}`, { cause });
    this.name = "RpcUnreachableError";
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
