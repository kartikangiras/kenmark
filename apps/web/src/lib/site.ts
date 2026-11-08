export const GITHUB_URL = "https://github.com/kartikangiras/kenmark";
export const VALIDATION_URL = `${GITHUB_URL}/tree/main/validation`;
export const SAS_URL = "https://attest.solana.com";

export const CLUSTER = "devnet" as const;

export function explorerAddressUrl(address: string) {
  return `https://explorer.solana.com/address/${address}?cluster=${CLUSTER}`;
}

export function explorerTxUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER}`;
}
