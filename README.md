<p align="center">
  <img src="./assets/kenmark-logo.svg" width="520" alt="Kenmark">
</p>

[![CI](https://github.com/kartikangiras/kenmark/actions/workflows/ci.yml/badge.svg)](https://github.com/kartikangiras/kenmark/actions/workflows/ci.yml)

Verifiable security facts for Solana programs, as typed on-chain attestations that any wallet,
CI job, or dashboard can read in one query.

- Dashboard and docs: <https://kenmark-sigma.vercel.app>
- Hosted API: <https://kenmark-api-production.up.railway.app>
- Validation artifacts: [`validation/`](./validation)

## The problem

Facts about a Solana program's security are published in formats machines cannot consume.
Verified-build status lives in a registry's web page. Audit results live in PDFs linked from
READMEs. Upgrade-authority changes, bug bounties, and incident reports live in posts. A wallet
that wants to warn before a signature, a CI pipeline that wants to block a deploy, or an
explorer that wants to show a status has nothing to read. Each integrator scrapes one source,
trusts one party, and rebuilds the same plumbing.

## What Kenmark does

Kenmark defines typed predicate schemas for those facts on the
[Solana Attestation Service](https://attest.solana.com) (SAS) and ships a stateless aggregator
that resolves every attestation about a program from raw RPC.

1. **Issuers publish.** An auditor, a build registry, or a protocol team creates a SAS
   credential and publishes an attestation under it. The record is a plain Solana account:
   flat fields tied to a program ID and to the issuer's credential.
2. **The chain stores facts.** No Kenmark server sits between issuer and reader. The schema
   that decodes each record is itself an on-chain account.
3. **Anyone aggregates.** One `getProgramAccounts` call with two memcmp filters finds every
   attestation about a program; the schema and credential accounts are resolved in batch and
   each record is decoded against its own schema. Running it against the same RPC gives the
   same answer on any machine.
4. **The reader judges.** Kenmark returns facts and issuer identities, never a score and never
   a verdict. Which issuers to trust is the reader's policy.

## Solana services used

| Service | How Kenmark uses it |
|---|---|
| Solana Attestation Service (`22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG`) | Credential, Schema, and Attestation accounts. Credential PDAs derive from authority and name; schema PDAs from credential and predicate name; attestation PDAs from credential, schema, and a nonce of `sha256(programId ‖ predicateType)`. |
| Solana JSON-RPC | `getProgramAccounts` with memcmp filters on the account discriminator, program ID, credential, and authority; `getMultipleAccounts` for schema, credential, and live integrity reads; `getSlot` for the API's `queriedAtSlot`. |
| `@solana/kit` and `sas-lib` | Transaction building, signing, PDA derivation, and account decoding. Kenmark owns the predicate encode/decode layer on top. |
| Solana Explorer | Every address and signature in the dashboard links to the account or transaction on devnet; mainnet program IDs link to mainnet. |
| OtterSec verified-builds registry (`verify.osec.io`) | Independent source for the real-world cross-check. Its status for Phoenix, Marinade, and Kamino is republished as devnet attestations and compared field by field. |

## Verification services offered today

| Service | Where | What you get |
|---|---|---|
| Verify a program | `/dashboard/verify`, `GET /programs/{id}/security` | Every attestation about the program: issuer credential and authority, status, binary hash, source commit, timestamp, plus records excluded with a reason. |
| Verify a credential | `/dashboard/verify?mode=credential`, `GET /credentials/{c}/attestations` | Any SAS credential on devnet, not only Kenmark's: name, authority, signers, and everything published under it. Foreign schemas are listed with their predicate name rather than decoded. |
| Verify a wallet | `/dashboard/verify?mode=authority`, `GET /authorities/{a}/credentials` | The credentials a wallet controls as authority. |
| Real-world validation | `/dashboard/validation` | Four mainnet programs attested on devnet from data Kenmark did not produce, each re-read from the chain at request time and compared with the recorded artifact. |
| Explorer | `/dashboard/explorer` | Charts over the attestation set and recent devnet transactions for the showcased accounts, with the view chosen by the reader. |
| Issuer directory | `/dashboard/issuers` | Kenmark's two devnet credentials with authority and name read live, and the artifact count beside the live on-chain count. |

Every number on these pages is checked by the browser suite against the artifacts and against
independent RPC reads (see Tests).

## Use cases

- **Wallets and explorers** show a program's verified-build status next to the signing prompt
  by calling one endpoint, with the issuer visible so the user knows who said it.
- **Build registries and audit firms** publish once, under their own credential, and reach every
  consumer without a bilateral integration.
- **Protocol teams** attest their own programs and let downstream integrators check them.
- **CI pipelines** gate a deploy on a policy over the aggregated set. The policy check is on the
  roadmap; the aggregated set it needs exists today.
- **Researchers** pull the whole attestation set for a program or an issuer in one call.

## Evidence

Everything claimed above is backed by a re-runnable artifact in [`validation/`](./validation):

| Check | What it proves |
|---|---|
| Data fidelity | Publish, close, republish: the aggregator reflects each state, and a closed record is gone. |
| Multi-issuer isolation | Two credentials attest the same program; both come back, correctly attributed. |
| memcmp filter accuracy | Three programs published, one queried, exactly one returned. |
| Binary round-trip | Every field survives encode, publish, query, decode. |
| Mainnet cross-validation | The SPL Token program's hash recomputed from a fresh mainnet read and its commit fetched from GitHub, published and read back unchanged. |
| Schema version compatibility | A v2 schema with a different field order decodes against its own layout, never the other's. |
| Registry cross-check | Phoenix (Verified), Marinade (Mismatch), Kamino (Unknown) from OtterSec's registry, including empty and null fields. |

Nine of nine checks pass. Each report cites the attestation address and transaction signature
it produced, and the dashboard's validation page re-reads those accounts on every visit.

Scope, stated plainly: a matching hash and commit prove an attestation round-trips through the
chain unchanged. They do not prove the commit produced the binary; that needs reproducible
builds, which Kenmark does not provide.

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

`devnet:setup` writes `scripts/.devnet-keys.json` and the keypairs next to it; they are
gitignored. Set `KENMARK_RPC_URL` to use your own endpoint. The public endpoint rate-limits
airdrops and `getProgramAccounts`; the app backs off and caches reads for 30 seconds, but a
deployed instance should use a dedicated endpoint. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Web app

```bash
npm run dev -w @kenmark/web    # http://localhost:3000
```

| Route | What it shows |
|---|---|
| `/` | Landing page. |
| `/docs` | How the schema, aggregator, and validation fit together, with what is live and what is planned. |
| `/dashboard` | Verify bar, attestation and program counts, status split, per-source table and chart, live on-chain count per issuer. |
| `/dashboard/verify` | One entry point with three modes: program, credential, wallet. |
| `/dashboard/attestations` | Searchable, sortable table of every published attestation with Explorer links. |
| `/dashboard/issuers` | Kenmark's credentials read live, plus the credential and wallet lookup. |
| `/dashboard/validation` | Real-world integration validation: the four mainnet programs, registry data, live match against devnet, and the on-chain schema. |
| `/dashboard/explorer` | Reader-selected charts over the attestation set and recent devnet transactions. |
| `/api/lookup?program=<id>` | JSON for a program query. |
| `/api/issuer?credential=<addr>` or `?authority=<addr>` | JSON for a credential or wallet query. |
| `/api/export` | The normalised attestation records as a download. |

The dashboard reads `validation/devnet-attestations.json`, `validation/real-world-attestations.json`,
and `validation/test-results/*.md` from the repo, so regenerating those artifacts updates it.

## API

```bash
npm run dev -w @kenmark/api    # http://localhost:8787
```

| Route | Response |
|---|---|
| `GET /health` | Cluster, RPC host, implemented predicates. |
| `GET /programs/{programId}/security` | The profile shape from the spec: `verifiedBuild` (latest), `verifiedBuilds` (all), empty sections for predicates not yet implemented, and `rawAttestations` so no consumer has to trust the summary. |
| `GET /programs/{programId}/attestations` | Every decoded attestation plus records excluded with a reason. |
| `GET /credentials/{credential}/attestations` | One issuer's credential account and everything published under it. |
| `GET /authorities/{authority}/credentials` | The credentials a wallet controls as authority. |

Invalid addresses return 400. When the RPC endpoint rate-limits, the API returns 503 with
`retryable: true` and a `retry-after` header. Responses are cached for 30 seconds. CORS is open.

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

## Roadmap

In order, each with the artifact that marks it done:

1. **`UpgradeAuthorityAttestation`**: immutable, single key, multisig, timelocked, or DAO-governed, derived from the program's ProgramData account. Done when the four devnet tests pass for it and the dashboard shows it beside VerifiedBuild.
2. **`AuditAttestation` and `BugBountyAttestation`**: auditor, open critical findings, report URI; platform, maximum payout, active flag. Done when at least one audit firm or bounty platform publishes under its own credential.
3. **Policy check**: `kenmark policy check <program> policy.yaml` returning PASS, FAIL, or INDETERMINATE with exit codes 0, 1, 2, so CI can block on either or both. Done when the reference GitHub Actions job in this repo gates a deploy with it.
4. **Mainnet**: a cluster switch on the dashboard and API. The aggregator already works against any RPC; what is missing is a funded mainnet credential and a dedicated endpoint.
5. **Remaining predicates** (static analysis, formal verification, runtime observation, supply chain, incidents), the issuer allowlist file, and TypeScript and Rust SDKs.

## How a microgrant would be used

A $1,000 microgrant covers the two costs that currently gate items 1 to 4 above, with the
rest going to engineering time on them.

| Item | Estimate | Why it matters |
|---|---|---|
| Dedicated RPC for twelve months | about $600 at current developer-tier pricing | The public endpoint throttles the `getProgramAccounts` scans that every lookup depends on; a demo burst already hits it. |
| Hosting for the API and dashboard for twelve months | about $100 | Keeps the hosted endpoint and the live integrity checks available to integrators. |
| Mainnet credentials and schema accounts | under $20 in rent and fees | Lets the first real issuers publish where their users are. |

The remaining budget funds the upgrade-authority predicate and the policy check, each gated on
the artifacts named in the roadmap. Progress is checkable in this repository: the validation
suite, the browser suite, and the live deployments either show the new predicate and the
passing gate or they do not.

## License

[MIT](./LICENSE)
