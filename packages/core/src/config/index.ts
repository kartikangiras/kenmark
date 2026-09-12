import { address, devnet, type Address } from "@solana/kit";

/** Deployed SAS program address. Same on mainnet and devnet, so it is not configurable. */
export const SAS_PROGRAM_ID: Address = address("22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG");

export interface KenmarkConfig {
  rpcUrl: string;
  rpcSubscriptionsUrl: string;
}

/**
 * RPC endpoint configuration. Signing keys are never read from the
 * environment; callers that sign load them from `scripts/.devnet-keys.json`.
 *
 * Precedence: `KENMARK_RPC_URL` > `overrides.rpcUrl` (usually the endpoint
 * recorded by setup-devnet.ts) > public devnet.
 */
export function loadConfig(overrides?: { rpcUrl?: string }): KenmarkConfig {
  const rpcUrl =
    process.env.KENMARK_RPC_URL ?? overrides?.rpcUrl ?? devnet("https://api.devnet.solana.com");
  const rpcSubscriptionsUrl =
    process.env.KENMARK_RPC_SUBSCRIPTIONS_URL ?? devnet("wss://api.devnet.solana.com");

  return { rpcUrl, rpcSubscriptionsUrl };
}
