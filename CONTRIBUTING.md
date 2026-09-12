# Contributing

## Prerequisites

- Node.js 20 or later
- npm 10 or later. The repo uses npm workspaces and an npm lockfile; do not use pnpm or yarn.

## Setup

```bash
npm install
```

This installs every workspace, including `apps/web`.

## Commands

| Command | What it does |
|---|---|
| `npm run lint` | ESLint across the packages and the web app |
| `npm run test:unit` | Unit tests. Fast, no network. |
| `npm run build` | `tsc` for each package, `next build` for the web app |
| `npm run dev -w @kenmark/web` | Web app dev server |

## Devnet

`validation/` and `packages/core/tests/integration/` talk to real devnet. Nothing in those paths
is mocked.

```bash
npm run devnet:setup        # one-time, idempotent: two funded wallets with SAS credentials
npm run devnet:validate     # the six validation tests
npm run devnet:cross-check  # cross-check against OtterSec's registry
npm run test:integration    # publish-and-read-back round trip
```

`devnet:setup` records the RPC endpoint it used in `scripts/.devnet-keys.json`, and the other
commands reuse it. To use a different endpoint set `KENMARK_RPC_URL`; it takes precedence whenever
set. The public `api.devnet.solana.com` endpoint rate-limits airdrops, so setup may need a
pre-funded wallet or a different endpoint.

`npm run test:integration` skips when `scripts/.devnet-keys.json` is absent. CI sets
`KENMARK_REQUIRE_DEVNET=1`, which turns that skip into a failure.

## Never commit

`scripts/.devnet-keys.json` and `scripts/.devnet-keypair-*.json` hold private keys and an RPC URL
that may include an API key. They are gitignored. Check `git status` before committing.

## Things that are easy to get wrong

- **Predicate names are limited to 32 bytes.** `Schema.name` is a raw PDA seed. The convention is
  `v1/<Name>`. `sas-lib`'s `deriveSchemaPda` docstring says it truncates; it does not.
- **`sas-lib`'s account discriminator enum is stale.** The deployed values are `Credential=0`,
  `Schema=1`, `Attestation=2`.
- **Read at `commitment: "confirmed"`.** Writes confirm at `confirmed`; reading at the RPC's
  `finalized` default makes a query right after a publish return nothing.
- **Encoding and query changes need a devnet run.** The unit tests cover layout and header
  parsing, not the live program.

## Before opening a PR

```bash
npm run lint && npm run test:unit
```

If you changed schema encoding, the aggregator, or anything under `validation/`, re-run
`npm run devnet:validate` and include the regenerated `validation/test-results/`.
