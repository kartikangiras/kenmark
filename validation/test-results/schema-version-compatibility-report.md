# Test 6: Schema Version Compatibility

**Result: PASS**

- Schema v1 (`vrVARCwX3QXMeP2cKKR7g974SmimmmKPMCkXsQAzrua`): standard field order `[programId, binaryHash, sourceCommit, verificationStatus, verificationTimestamp]`
- Schema v2 (`3zA8LSuu88X8iJr5UWLBRUajBgiiGsZq7NbnuRV2EeTy`): fields 2-5
  REVERSED, field 1 still `programId` `[programId, verificationTimestamp, verificationStatus, sourceCommit, binaryHash]` — a genuine structural difference

- v1 attestation `5TKubZ4ozJM1r3rmW4qriinvfHyEKoH4NZQ7Vr7N7uoQ` (tx `3yCXJPdGKJedGH3BTTYBg9nDnN93VZwXoHpSXwddRTRoLUGoiFbscvsSXkyCUSJYfepnVJvZ78SDEs2m9wPKatLC`) → decoded correctly against v1: true (1 query attempt(s))
- v2 attestation `7crNDNfBTTwsCLuhCi9cDYQQVH4VTmggaKzoqL86uBM1` (tx `26nUSMGWBkae3XCeY6wvKdTvis3eiexoQDQbGTYQWFBnuP9kps7b8KozsHcg5pr1FYUQoAp351qpbrsPUpV2xX2s`) → decoded correctly against v2: true (1 query attempt(s))

No cross-decoding occurred: each attestation's data was interpreted using its OWN resolved
schema version's layout, not the other version's.
