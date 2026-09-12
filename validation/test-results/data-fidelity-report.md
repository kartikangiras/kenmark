# Test 1: Data Fidelity

**Result: PASS**

1. Published original attestation: `2rZtaodEawm6YWrJpM3Gf6W5KKAyYw6C5dZQBLgkgir5` (tx `4E49z6b5dRcvceM9RrvVbmvBLsbj3gtbxwp9VszTKfhLayVHwW5hEi5qyAWndcgYDh4cRwaUmsSoCJVPCbvGGBYw`)
   - Query immediately after: 1 record(s), sourceCommit=test1-original
2. Closed attestation (tx `4pnhGjmJE4x4wcTtTR89Fa3Br2sPE5dccpEw2KmKdfiQBAAvGzEEwbp9zXVb7dwFRQnF1wb8m7JrCNJgCkmFWmWb`)
   - Query immediately after close: 0 record(s) (expected 0)
3. Republished with new value: `2rZtaodEawm6YWrJpM3Gf6W5KKAyYw6C5dZQBLgkgir5` (tx `FWRhhdahq8zsVnFUzoBfhfSQ5QGrf56kh8b84vkVBk7mUCTuaEaNJmM9RrrAmyHHS3Bwc4GKNty4EL2CbemmhMY`)
   - Query after republish: 1 record(s), sourceCommit=test1-republished

programId: `0b964ddeda3888da6774b9f166c61447712a54d5eee97f7e87b79e539fcda591`
