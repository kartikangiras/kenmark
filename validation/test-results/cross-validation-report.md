# Test 5: Cross-Validation Against Real Data

**Result: PASS**

Subject: SPL Token program (`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`), a real, immutable, canonical mainnet program.

- Binary hash independently computed via a fresh `getAccountInfo` call against public mainnet RPC
  and local SHA-256, **before** publishing: `5b31219b7bc4060b1638b933be5f50df3400109acfef12408a196d57ad119748`
- Source commit independently fetched from the GitHub API (`solana-program/token`, `main` branch)
  at test time: `ebff90aee6facb59218fed68e61e7fbdcf92830e`
- Published as devnet attestation: `CjgDPc2vaPq7QP56DtbfdeM4KcJUXjE32Y4Q9Snnwgyc` (tx `5efeLfbLXka1gDjyAYkJHQMWK6VGnVJZJGcXKQ1gH1u6o49YUnVSvQ4w1KRbXeWqV2toPv6kP93Ru1TAPVAXsZ2`)
- Read back after 1 query attempt(s)
- Queried back — binaryHash matches independently-computed value: true
- Queried back — sourceCommit matches independently-fetched value: true

**Scope:** this checks that the published and decoded values match the ones recomputed at test
time. It does not prove that this commit produced this binary; that needs reproducible-build
tooling, which Kenmark does not provide.
