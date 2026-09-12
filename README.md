# Kenmark

Machine-readable security attestations for Solana programs.

Security signals about a program (verified builds, audits, upgrade authority, bug bounties,
incidents) are published today as PDFs, registry pages, and posts. Kenmark defines a fixed set of
typed predicate schemas for those signals on top of the
[Solana Attestation Service](https://attest.solana.com) (SAS), plus a stateless aggregator that
resolves every attestation about a program from raw RPC. Issuers publish under their own SAS
credentials. Kenmark does not score programs and does not decide who may attest.

## Status

Implemented and validated against devnet:

- `v1/VerifiedBuildAttestation` schema
- Stateless aggregator: `getProgramAccounts` with memcmp filters, then per-record schema resolution and decoding
- Typed read and write error classes mirroring the SAS program's error set
- Devnet validation suite and a cross-check against OtterSec's public verified-builds registry (see [`validation/`](./validation))

Planned, in order: the remaining eight predicates, a hosted aggregation API, an issuer allowlist,
TypeScript and Rust SDKs, and a CLI with a policy check.

## Repository layout

| Path | Contents |
|---|---|
| `packages/spec` | Predicate schema definitions (JSON) and changelog. No runtime code. |
| `packages/core` | Schema encode/decode, RPC client, and the aggregator. |
| `packages/errors` | Error classes mirroring the SAS program's error set. |
| `apps/web` | Marketing site and docs (Next.js). |
| `scripts` | `setup-devnet.ts`: provisions devnet issuer wallets and credentials. |
| `validation` | Devnet validation scripts and their published results. |

## Getting started

```bash
npm install
npm run lint
npm run test:unit
```

Against devnet:

```bash
npm run devnet:setup        # fund two wallets and create their credentials (idempotent)
npm run devnet:validate     # six validation tests; writes validation/test-results/
npm run devnet:cross-check  # publish OtterSec registry data for three mainnet programs
npm run test:integration    # single publish-and-read-back round trip
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details, including how to use your own RPC endpoint.

## License

[MIT](./LICENSE)
