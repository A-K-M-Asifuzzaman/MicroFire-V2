# M2 gameplay frontend: integration with Sol's Stage A

Branch `feat/m2-claude-gameplay`, rooted at the Astra-approved contract SHA `11ec4caa772b71e112b5fc176baacdd6853f8173`.
It contains no backend, no gameplay rules, no authorization, no signing and no canonical-JSON implementation.

**Status:** M2 is not yet playable end to end. Every UI behaviour has been tested against the approved fixtures; none has been tested against Sol's real preview API.

## The seam (the only files that change at integration)

| File | Today (this branch) | At integration |
|---|---|---|
| `apps/web/game/contract.ts` | Type-only re-export of `docs/m2/fixtures/contract-types.ts`. `contractRuntime = null` | Point the type export at `@microfire/shared`. Set `contractRuntime` (below) |
| `apps/web/game/contract/specs.ts` | Maps `./equipment-copy.ts` to `PartSpec[]` | Import `partDefinitions` (with `label`/`anchorLabel`) and `equipmentCopy` from `@microfire/shared` |
| `apps/web/game/contract/equipment-copy.ts` | Byte-identical mirror of the approved `docs/m2/fixtures/equipment-copy.ts`, drift-tested | Delete |

`contractRuntime` is assembled from Sol's exports:

```ts
import { ActionResponseSchema, AuthorizeResponseSchema, CapabilityResponseSchema, HttpFailureSchema, RevokeResponseSchema,
  StartResponseSchema, noteIssue, requestIdentity } from '@microfire/shared';
export const contractRuntime: ContractRuntime = {
  parse: { capability: (v) => CapabilityResponseSchema.parse(v), authorize: (v) => AuthorizeResponseSchema.parse(v),
    revoke: (v) => RevokeResponseSchema.parse(v), snapshot: (v) => StartResponseSchema.parse(v),
    action: (v) => ActionResponseSchema.parse(v), failure: (v) => HttpFailureSchema.parse(v) },
  identify: requestIdentity, noteIssue
};
```

These names match Sol's committed `codex/m2-stage-a-backend` exports at `9f61c21`. If the zod output types differ from the planning types, keep the planning types as the target and adjust only `contract.ts`.

## Remaining connection steps

1. Merge Sol's reviewed Stage A, then apply the seam changes above.
2. Sol supplies the preview API at `/api/game/preview/{capability,authorize,revoke,start,action,resume,session/:id}`.
   - `createHttpTransport` already calls exactly these paths.
   - It keeps the status, typed code and Retry-After, and maps 5xx (except 503), timeouts and malformed bodies to "unknown commit".
3. **Browser saves.** `readOnlySaveAdapter` is the approved default. A writable `SaveAdapter` (Web Locks + localStorage around Sol's pure save-admission helper) is built only after:
   - the helper ships;
   - each engine passes the cross-process consistency gate (Chromium, Firefox and WebKit).
4. **End-to-end tests.** Add `tests/m2-ui/*-live.spec.ts` against a disposable server with the preview enabled:
   - use a per-run test token and signing key generated in memory, never logged;
   - run one complete mission each for keyboard, touch, no-WebGL and 3D;
   - respect the 30 POST/min budget with one disposable server per full run (a perfect run is 23 POSTs).
5. **Passport route.** The `/passport?profile=m2-preview` view is not built yet; the Passport currently renders inside the mission shell.

## What runs where

- **Public mission pages** (`/missions/station-arrival`, `/missions/bass-assembly`):
  - unchanged unless `?preview=bass-b20-training-v1` is present;
  - with it, the gameplay chunk loads, and the 3D bench loads only when the learner asks for it;
  - without `contractRuntime`, the shell says the backend is not integrated and sends nothing.
- **Fixture gallery** (`/m2-fixtures`):
  - returns 404 unless `MICROFIRE_M2_FIXTURE_GALLERY=1` at runtime; `noindex`; never linked;
  - reads the approved JSON from disk and drives the real controller;
  - requests are logged, never sent;
  - it is presentation evidence, not M2 completion.

## Tests

- `npx vitest run --config vitest.m2-ui.config.ts`: controller, recovery semantics and view model, against the approved fixtures.
- `npx playwright test -c playwright.m2-ui.config.ts`: run after `npm run build`; port 3240, gallery enabled.
- Screenshots go to `docs/qa/screenshots/m2/`.
