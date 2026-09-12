# Real-World Cross-Check: VerifiedBuildAttestation Against OtterSec's Registry

Every field below was pulled live from OtterSec's public verified-builds registry
(`verify.osec.io`) for three mainnet programs Kenmark does not control. Together their live data
covers all three `verificationStatus` values:

- **Phoenix** — `Verified`.
- **Marinade** — `Mismatch`: the registry's own `on_chain_hash` and `executable_hash` disagree.
- **Kamino** — `Unknown`: the registry has no verification data, so every field is empty or null,
  which exercises the zero-sentinel conventions against genuinely absent data.

Each was mapped into Kenmark's schema, published as a `CreateAttestation` transaction on devnet,
and queried back through the same aggregation code path a consumer would use.

### Phoenix (`PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY`)

**Source:** live query to `https://verify.osec.io/status/PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY` at test time.

```json
{
  "is_verified": true,
  "message": "On chain program verified",
  "on_chain_hash": "6877a5b732b3494b828a324ec846d526d962223959534dbaf4209e0da3b2d6a9",
  "executable_hash": "6877a5b732b3494b828a324ec846d526d962223959534dbaf4209e0da3b2d6a9",
  "repo_url": "https://github.com/Ellipsis-Labs/phoenix-v1",
  "commit": "None",
  "last_verified_at": "2024-12-12T13:23:28.496764",
  "is_frozen": false,
  "is_closed": false
}
```

**Mapped to `VerifiedBuildAttestation`:** `verificationStatus = Verified` (derived from `is_verified`), `sourceCommit = "None"`, `verificationTimestamp = 1733990008`.

**Published:** `BrzgqUkwdiCiCyDmPRemvYYwzAzczcnMKhmZRWfX4cka` (tx `5TB9748aLCdVvysu9RFctCLtketmqvLuhyZNvch74sJNCcG3vzSVb5r42tBhpcrEpnbsb6dBBSzwKDBaGFTpXDT`)

**Round-trip result:** PASS — the aggregator returned 2 record(s) for this programId (other issuers may hold attestations for the same program). Our record was found and matched: binaryHash true, sourceCommit true, verificationStatus true, verificationTimestamp true.

### Marinade (`MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD`)

**Source:** live query to `https://verify.osec.io/status/MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD` at test time.

```json
{
  "is_verified": false,
  "message": "On chain program not verified",
  "on_chain_hash": "db89efca1670f85397f978e9a02f6c2806a9adaa17ebb5783e7e99eddcb26be3",
  "executable_hash": "daeb88a604e11a83382fd2e318abb99e455fd02a2b612227e61e0bb7b5568ab7",
  "repo_url": "https://github.com/marinade-finance/liquid-staking-program",
  "commit": "",
  "last_verified_at": "2024-01-26T07:53:47.286115",
  "is_frozen": false,
  "is_closed": false
}
```

**Mapped to `VerifiedBuildAttestation`:** `verificationStatus = Mismatch` (derived from `is_verified` and on_chain_hash != executable_hash), `sourceCommit = ""`, `verificationTimestamp = 1706235827`.

**Published:** `7TVoiKVfrYGb6kS6qWJijrMFMTNijugzCBxMjajSvj1R` (tx `5g5fVd7QojbMvnQ6g7thxReFGrdgxQ9Qee3z61cbtStM4wYRFQX4yok1vfvLRF5ffbZSB2xaw93NLgbHgM818Ehi`)

**Round-trip result:** PASS — the aggregator returned 2 record(s) for this programId (other issuers may hold attestations for the same program). Our record was found and matched: binaryHash true, sourceCommit true, verificationStatus true, verificationTimestamp true.

### Kamino (`KaminoLendkCC8gK7iCK6oCEQaefsUEC1BeXKcm5cVc`)

**Source:** live query to `https://verify.osec.io/status/KaminoLendkCC8gK7iCK6oCEQaefsUEC1BeXKcm5cVc` at test time.

```json
{
  "is_verified": false,
  "message": "On chain program not verified",
  "on_chain_hash": "",
  "executable_hash": "",
  "repo_url": "",
  "commit": "",
  "last_verified_at": null,
  "is_frozen": false,
  "is_closed": false
}
```

**Mapped to `VerifiedBuildAttestation`:** `verificationStatus = Unknown` (derived from `is_verified`), `sourceCommit = ""`, `verificationTimestamp = 0` (0 sentinel — OtterSec has no record of this program ever being checked).

**Published:** `Fhjs9dduo3DFbWaCfw7ahKNyu2Xs6GgTdum3XX8mBUkZ` (tx `3h5ce9qVeoLRbZGcaBXbLw3KtN8sNj4MozqouvTUMcVt8Aqrg9msErrhzMFf8AGE8wKiWpgKAeVtuakyyVwNqCkn`)

**Round-trip result:** PASS — the aggregator returned 2 record(s) for this programId (other issuers may hold attestations for the same program). Our record was found and matched: binaryHash true, sourceCommit true, verificationStatus true, verificationTimestamp true.


## What this adds to the six synthetic tests

1. **The schema holds up against messy third-party data.** An empty `commit`, a literal `"None"`
   (Phoenix's own API response), and a `null` `last_verified_at` all round-tripped through the
   `String` and `I64` fields unchanged.
2. **Every `verificationStatus` value now has a real example on devnet.** The synthetic tests only
   produced Verified and Unknown, with made-up data.
3. **Kenmark represents an issuer's claim without altering it.** This is the production case, and
   self-published test data cannot exercise it because Kenmark is then both publisher and issuer.

Raw output: `real-world-attestations.json` holds every attestation published, with pubkeys, tx
signatures, and the OtterSec API snapshot each was built from.
