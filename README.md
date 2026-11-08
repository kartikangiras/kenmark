# Kenmark

[![CI](https://github.com/kartikangiras/kenmark/actions/workflows/ci.yml/badge.svg)](https://github.com/kartikangiras/kenmark/actions/workflows/ci.yml)

Machine-readable security attestations for Solana programs.

Security facts about a program (verified builds, audits, upgrade authority, bug bounties,
incidents) are published today as PDFs, registry pages, and posts. Kenmark defines typed
predicate schemas for those facts on top of the
[Solana Attestation Service](https://attest.solana.com) (SAS) and ships a stateless aggregator
that resolves every attestation about a program from raw RPC. Issuers publish under their own
SAS credentials. Kenmark does not score programs and does not decide who may attest.

## What exists today

Implemented and validated against live devnet:

| Piece | Where | What it does |
|---|---|---|
| `v1/VerifiedBuildAttestation` | `packages/spec`, `packages/core/src/schemas` | The first predicate: program ID, binary hash, source commit, status, timestamp. Versioned on-chain schema. |
| Stateless aggregator | `packages/core/src/aggregator` | `getProgramAccounts` with memcmp filters on the discriminator and program ID, then schema and credential resolution and per-record decoding. |
| Typed error matrix | `packages/errors` | Read and write failures mirroring the SAS program's error set. |
| Validation suite | `validation/` | Six tests on devnet plus a cross-check against OtterSec's verified-builds registry. Every report is a real transaction. |
| Dashboard | `apps/web` | Every published attestation, the issuers, the validation reports, and a live lookup for any program ID. |
| Hosted API | `apps/api` | `GET /programs/{programId}/security` served over HTTP from the same aggregator. |

Planned, in order: the remaining eight predicates (upgrade authority, audit, static analysis,
bug bounty, formal verification, runtime observation, supply chain, incidents), an issuer
trust allowlist, TypeScript and Rust SDKs, and a CLI with a policy check. The docs page marks
each of these as planned, not shipped.

## Repository layout

| Path | Contents |
|---|---|
| `packages/spec` | Predicate schema definitions (JSON). No runtime code. |
| `packages/core` | Schema encode/decode, RPC client with retry and rate-limit backoff, and the aggregator. |
| `packages/errors` | Error classes mirroring the SAS program's error set. |
| `apps/web` | Landing page, docs, and the attestation dashboard (Next.js). |
| `apps/api` | Hosted aggregation API (Hono on Node). |
| `scripts` | `setup-devnet.ts`: provisions devnet issuer wallets and credentials. |
| `validation` | Devnet validation scripts and their published results. |

## Getting started

```bash
npm install
npm run lint
npm run test:unit
npm run build
```

Against devnet:

```bash
npm run devnet:setup        # fund two wallets and create their credentials (idempotent)
npm run devnet:validate     # six validation tests; writes validation/test-results/
npm run devnet:cross-check  # publish OtterSec registry data for three mainnet programs
npm run test:integration    # single publish-and-read-back round trip
```

`devnet:setup` writes `scripts/.devnet-keys.json` and the keypairs next to it. They are
gitignored. Set `KENMARK_RPC_URL` to use your own endpoint; the public one rate-limits
airdrops and `getProgramAccounts`. See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## Web app

```bash
npm run dev -w @kenmark/web    # http://localhost:3000
```

| Route | What it shows |
|---|---|
| `/` | Landing page. |
| `/docs` | How the schema, aggregator, and validation fit together, with what is live and what is planned. |
| `/dashboard` | Overview of every attestation in `validation/`: counts, status split, per-test table and chart, plus a live on-chain count per issuer. |
| `/dashboard/attestations` | Searchable, sortable table of all published attestations with Explorer links. |
| `/dashboard/issuers` | The two devnet credentials, with authority and name read live from the chain. |
| `/dashboard/validation` | The markdown reports from `validation/test-results/`, rendered. |
| `/dashboard/lookup` | Runs the aggregator for any program ID against devnet. |
| `/api/lookup?program=<id>` | JSON for the same query. |
| `/api/export` | The normalised attestation records as a JSON download. |

The dashboard reads `validation/devnet-attestations.json`, `validation/real-world-attestations.json`,
and `validation/test-results/*.md` from the repo, so regenerating those artifacts updates it. Live
reads use `KENMARK_RPC_URL` when set and public devnet otherwise. The lookup backs off on 429s and
caches results for 30 seconds.

## API

```bash
npm run dev -w @kenmark/api    # http://localhost:8787
```

| Route | Response |
|---|---|
| `GET /health` | Cluster, RPC host, implemented predicates. |
| `GET /programs/{programId}/security` | The security profile shape: `verifiedBuild` (latest), `verifiedBuilds` (all), empty sections for predicates not yet implemented, and `rawAttestations` so no consumer has to trust the summary. |
| `GET /programs/{programId}/attestations` | Every decoded attestation plus records excluded with a reason. |

Invalid addresses return 400. When the RPC endpoint rate-limits, the API returns 503 with
`retryable: true` and a `retry-after` header. Responses are cached for 30 seconds per program.
CORS is open.

## Tests

| Command | Scope |
|---|---|
| `npm run test:unit` | Encoding, header parsing, error matrix, rate-limit helpers, dashboard record normalisation. No network. |
| `npm run test:integration` | One real publish and read-back on devnet. |
| `npm run devnet:validate` | The six validation tests; regenerates `validation/`. |
| `npm run test:e2e -w @kenmark/web` | Drives a built copy of the app in a Chromium-based browser (Brave, Chrome, or `BROWSER_BIN`) and compares every number on screen with the artifacts and with independent devnet reads. |

```bash
npm run build && npm run start -w @kenmark/web -- -p 3123   # in one terminal
E2E_BASE_URL=http://localhost:3123 npm run test:e2e -w @kenmark/web
```

## Deployment

- **Web** deploys to Vercel with the project root directory set to `apps/web`; `apps/web/vercel.json`
  builds the workspace packages first.
- **API** deploys to Railway from the repository root; `railway.toml` builds `@kenmark/api` and
  starts it with a `/health` check. The service listens on `PORT`.
- Set `KENMARK_RPC_URL` on both to a dedicated devnet endpoint.

## License

[MIT](./LICENSE)
