# Test 6: Schema Version Compatibility

**Result: PASS**

- Schema v1 (`AFRdxYq4A2p7UpFwb338qxcF886q5CNUKjSgdxxRxfAJ`): standard field order `[programId, binaryHash, sourceCommit, verificationStatus, verificationTimestamp]`
- Schema v2 (`EpyH8ptQjh7obBBg1s4ZaKcx25LidfjkhFiiHuj73ASN`): fields 2-5
  REVERSED, field 1 still `programId` `[programId, verificationTimestamp, verificationStatus, sourceCommit, binaryHash]` — a genuine structural difference

- v1 attestation `BvFeyqqmH5pGKbxDNT6CBFE7ZGqJ847t9ik8csDr1Mhv` (tx `4PWXwmpD1EsxVy7DBYaD1rcCQ6b9J8yNNcHRQrPtEgkaxqJabc9UcSjKNXRmqR9g2UggzQ1ncXxbF6pS8q2CRggY`) → decoded correctly against v1: true
- v2 attestation `CDCwsibkw3EYuLo4RnEMHduC4sh4biyoXR4RbfTY2QGJ` (tx `DUzcsNKM9C5EPogPrUTvboBKo1v9NW5jeeT581gUaK3djpQX8K2uUTRBriM6QM6GB8EBMVrYqGLZ89R6UEEA6jw`) → decoded correctly against v2: true

No cross-decoding occurred: each attestation's data was interpreted using its OWN resolved
schema version's layout, not the other version's.
