# Reproducible current-core and projection probes

Candidate3 uses the single [verify-contracts.ts](fixtures/verify-contracts.ts) runner. It exercises current core source collection, ten-part assembly, fan/other-part repair, qualification, documented observation, mission completion and save/load. Proposed metadata/presentation/storage/auth policies are explicitly reference oracles, not transitionTraining or an HTTP service.

```sh
npm test
npm run validate:data
node --import tsx docs/m2/fixtures/verify-contracts.ts
node --import tsx docs/m2/fixtures/verify-contracts.ts --emit-types /private/tmp/m2-contract-types.ts
node node_modules/typescript/bin/tsc --noEmit --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --skipLibCheck --moduleResolution bundler --module ESNext --target ES2022 --resolveJsonModule --esModuleInterop docs/m2/fixtures/contract-types.ts docs/m2/fixtures/equipment-copy.ts docs/m2/fixtures/verify-contracts.ts /private/tmp/m2-contract-types.ts
```

Use Node24 and the existing dependency installation. Ordinary execution only checks committed fixtures; `--write` deliberately regenerates planning example/copy/vector/measurement files. Generated research entries come from actual reducer COLLECT/OBSERVE actions; learner-note projections go through the explicit proposed-action oracle; training annotations derive from receipts into a separate typed section. There is no direct positive fixture mutation of research corrections.

The candidate1/r2 size snippets remain recoverable from commits02e0588ce0eca1ebdb71bac0d758caea2abd1fc2 and030e1e9283d0887a0d5464fd668e3fa5e675bbc3. Their research-entry training prefixes and direct correction edits are **superseded**, so that obsolete positive example is not repeated in the active package. Current07/MEASUREMENTS supersede their byte projections; no hidden migration rewrites their saved data.

The baseline core can complete Assembly without a mandatory fault/diagnosis. That inventory fact is unchanged; the eventual approved coordinator must enforce the full training sequence. Passing this probe does not establish runtime preview, browser compatibility or gameplay acceptance.
