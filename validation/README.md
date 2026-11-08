# Devnet validation

Evidence that the schema and aggregator work against live devnet. Nothing here is mocked; every
result is a real transaction you can open in an explorer.

## Tests

`run-validation.ts` runs six tests and writes one report each to `test-results/`:

1. **Data fidelity** — publish, close, republish a different value. The aggregator reflects each
   state, and a closed attestation is gone.
2. **Multi-issuer isolation** — two credentials publish for the same `programId`. Both come back,
   correctly attributed.
3. **memcmp filter accuracy** — publish for three `programId`s, query one, get exactly one.
4. **Binary round-trip** — encode, publish, query, decode. Every field matches.
5. **Cross-validation against real data** — the SPL Token program's mainnet binary hash
   (recomputed from a fresh RPC read) and current commit (fetched from GitHub) are published and
   read back unchanged.
6. **Schema version compatibility** — a v1 schema and a v2 schema with a different field order.
   Each attestation decodes against its own version.

`real-world-cross-check.ts` pulls live data from OtterSec's verified-builds registry
(`verify.osec.io`) for Phoenix, Marinade, and Kamino and publishes it as devnet attestations. The
three cover `Verified`, `Mismatch`, and `Unknown` with data Kenmark did not produce, including
empty and null fields.

## Files

- `devnet-attestations.json` — every attestation published by the six tests: pubkey, credential,
  schema, tx signature, decoded fields. Look any of them up at
  `https://explorer.solana.com/address/<pubkey>?cluster=devnet`.
- `real-world-attestations.json` — the three cross-check attestations and the OtterSec API
  response each was built from.
- `test-results/*.md` — one report per test, marked PASS or FAIL with the evidence.

## Re-running

```bash
npm install
npm run devnet:setup        # two funded wallets with credentials; idempotent
npm run devnet:validate
npm run devnet:cross-check
```

All three read `scripts/.devnet-keys.json`, which setup writes. Set `KENMARK_RPC_URL` to use your
own endpoint; the public devnet endpoint rate-limits airdrops.
