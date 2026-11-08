# Test 1: Data Fidelity

**Result: PASS**

1. Published original attestation: `EVodP48rSBcp349FJMjw44tTgHEy9iAywEfrZxXwUtHU` (tx `5yAnVoaguqxLYs5PDrqg88pGrY7aFuZ89ptQA7BMFN5TUuHnfaY3ezkr442rCFDT6iw6BKM26h2puVp6bTHdHLmY`)
   - Query after publish (1 attempt(s)): 1 record(s), sourceCommit=test1-original
2. Closed attestation (tx `3nyfBeya4gu95KuHRHJyYAqwfnHvnS9UJwPqqNn58hEMi2cbZxGWyDdCTzPLq5WHFpy5zFYnEzY2phQGCLtGNCzz`)
   - Query after close (1 attempt(s)): 0 record(s) (expected 0)
3. Republished with new value: `EVodP48rSBcp349FJMjw44tTgHEy9iAywEfrZxXwUtHU` (tx `42BcYcHqQqt4AGCSAsP8GhtDS6YdGPsEZQzjSHWea671hxBv3qHhdJbytZqWL2wPERf1ENB7KcU8Q1SFQ3ERXspE`)
   - Query after republish (1 attempt(s)): 1 record(s), sourceCommit=test1-republished

programId: `7868d738ff0904da5e3973594c1d0f84ea1c98cebecf2bfdf5eb5c4a755cfc50`
