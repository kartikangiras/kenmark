# Test 5: Cross-Validation Against Real Data

**Result: PASS**

Subject: SPL Token program (`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`), a real, immutable, canonical mainnet program.

- Binary hash independently computed via a fresh `getAccountInfo` call against public mainnet RPC
  and local SHA-256, **before** publishing: `5b31219b7bc4060b1638b933be5f50df3400109acfef12408a196d57ad119748`
- Source commit independently fetched from the GitHub API (`solana-program/token`, `main` branch)
  at test time: `dbd89438108fda6ac40866d1ccfbb85f2e7436d4`
- Published as devnet attestation: `65ER8GRWwCw9axHGq1CmdFeGMrGzc189i1mQjkH76zK6` (tx `4AdfnVcHPUmwv8RrG3FmAX7mnxjs9qcVmwFmfCVPTBSYzZnQw8H5mSiMnaaYK6Uj22ZzXRetP9frz7eZurd44uZH`)
- Queried back — binaryHash matches independently-computed value: true
- Queried back — sourceCommit matches independently-fetched value: true

**Scope:** this checks that the published and decoded values match the ones recomputed at test
time. It does not prove that this commit produced this binary; that needs reproducible-build
tooling, which Kenmark does not provide.
