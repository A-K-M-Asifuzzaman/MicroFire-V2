# Preview persistence and recovery — final consumer candidate 3

**Proposed contracts only.** GameState v2 and Passport v1 stay unchanged. Existing core save keys `microfire-v2:save:v1:{normal|demo}`, 500,000 UTF-16-unit limit, v1 migration, canonical caveats and cap-exhaustion correction remain intact. Structural loading is not play-history/scientific/authentication validation. No unsigned legacy save is promoted into trusted training completion.

## C3 — One isolated authoritative local slot

Keep key **microfire-v2:m2-preview:checkpoint:v1:demo**, but its value is now a strict **LocalSlot JSON envelope**, not the candidate1 raw token. Shape is in [contract-types](fixtures/contract-types.ts): `{storageVersion:1,epoch,generation,head:{sessionId,revision,checkpoint}|null}`. New format has never shipped; old proposal examples are untrusted read-only, not silently migrated. A null head is a **tombstone**, never removeItem: preserve generation to prevent an old tab from reintroducing discarded data. Never reset a valid epoch/generation automatically. Browser storage clearing outside the app is an explicit external deletion, not an in-app recovery guarantee.

The token contains one GameState and bounded Training metadata/provenance. No parallel HUD state, second Passport, grant, secret, source catalog or scientific-validation flag is saved. Head's sessionId/revision must match its embedded token on structural read and fresh server verification. Browser epoch (random UUID) and generation are local concurrency metadata, not signed scientific authority. A controller retains both as its expected local version.

Three independent revisions:

| Field | Owner / meaning |
|---|---|
| state.setup.revision | Existing core; each install/remove, including inner injection edits |
| snapshot/payload.revision | Server session; every accepted training command once; refusals/GET/resume do not advance |
| LocalSlot.generation | Browser save transaction; advances once for changed slot, case replacement or explicit discard; never sent as server expectedRevision |

All are nonnegative safe integers; no wrap or reuse. At local generation exhaustion, read-only/download; no zero reset. No claim of unbounded mathematical counters.

## Locked write protocol

Use the native **Web Locks API**, exclusive lock name `microfire-v2:m2-preview:save:v1`, same origin as this configured preview. All browser writers (Save/autosave/replace/discard) use **one adapter**, including future page consumers. The lock covers re-read→strict parse/admission→compare→single setItem→read-back→publish result. Do not hold it during HTTP, dialogs or download: capture decisions first, then revalidate them inside the lock. No nested locks, steal:true, fallback timer lease or unlocked read-then-write. Use `ifAvailable:true`; if busy return LOCAL_LOCK_BUSY (savedOnDevice=false) and offer retry on explicit action or notification, no forced takeover. A tab crash releases the lock; the slot remains the complete old or complete new JSON value according to whether setItem completed. Read-back mismatch is LOCAL_WRITE_FAILED with cause=read-back-mismatch/writeOutcome=unknown, never Saved.

References: [Web Locks specification](https://w3c.github.io/web-locks/#api-lock-manager), [HTML Storage interface](https://html.spec.whatwg.org/multipage/webstorage.html#the-storage-interface). The shared lock supplies coordination; individual storage writes do not supply cross-tab CAS. Standard browser storage does not guarantee an fsync against device/power loss. Treat “Saved on this device” as successful browser storage/read-back, offer a file backup, and never guarantee recovery of an unsaved response.

Admission under the lock, in this order:

1. Feature-detect usable locks and localStorage; absent/throwing → LOCAL_READ_ONLY/LOCAL_STORAGE_UNAVAILABLE, no write. Read raw; absent key has virtual epoch=null/generation0/headnull; the first successful writer creates a random epoch UUID inside the lock. Strictly parse bounded envelope/token structure; malformed/unknown-version/mismatched head/token → LOCAL_NEEDS_REVIEW, leave raw intact.
2. Candidate must be a **freshly server-verified** Snapshot in this controller, not a parsed local JSON assertion. Offline raw loading cannot become an accepted write. Check canonical token equality and revision against candidate; no client signing or scientific validation shortcut.
3. If same case+revision+identical token already stored, return idempotent saved result without increasing generation. Same revision/different token → LOCAL_SAME_REVISION_CONFLICT. Candidate revision lower → LOCAL_NEWER. Keep both values available for inspection, no overwrite.
4. For a genuinely changed write, require caller's expectedEpoch/expectedGeneration equal the locked slot epoch/generation (null/0 only for genuinely absent storage). Otherwise LOCAL_GENERATION_CHANGED; re-read/reconcile, never automatically update expectedGeneration and replay a stale write. Higher server revision alone does not waive this check.
5. Same case/newer revision may replace after this check. Different case requires explicit `replace-after-backup` consent bound to **expected generation and exact previous raw bytes**, obtained after a recovery/download opportunity. Recheck that exact value inside lock or LOCAL_DIFFERENT_CASE/GENERATION_CHANGED. A later response cannot become implicit consent. Invalid raw needs explicit `discard-preview-save-after-export` with matching raw bytes; it is never overwritten by ordinary Save.
6. Single setItem of next strict envelope generation+1, then exact read-back while lock held. Catch quota/permission/stringify errors as LOCAL_WRITE_FAILED with the exact cause and writeOutcome=not-written; no automatic clear. Standard failed setItem leaves previous value; if read-back itself fails, return LOCAL_WRITE_FAILED with cause=read-back-unavailable/writeOutcome=unknown and preserve both in-memory tokens/downloads. Do not attempt an unlocked rollback that could erase a later tab's save.
7. Publish LocalSaveResult and a storage/BroadcastChannel notification **after success**. Notifications only request re-read; they are not synchronization or proof. All UI state changes use the transaction's returned generation. Save failure does not revoke confirmed server progress.

Discard also acquires this lock, rechecks exact raw/generation and explicit confirmation, writes a same-epoch generation+1 tombstone; no removeItem. When explicitly discarding corrupt raw whose version cannot be trusted, write a **new random epoch UUID**, generation1 tombstone under the raw-bound consent. It cannot match an old writer even when that writer retained generation1. Normal saves/discards never rotate epoch or reset generation. Old in-memory candidates still require the newly returned epoch/generation plus deliberate reconciliation; they cannot auto rewrite the tombstone. A crash before a consented discard writes nothing. Browser state/extension tampering is untrusted; all resumed progress is still MAC/science/reachability checked server-side.

## Browser capability and fallback

Writable preview persistence requires `isSecureContext`, callable `navigator.locks.request`, working same-origin storage and Web Crypto (for request intent hashing). HTTP loopback may be treated as a trustworthy context; feature-detect the actual browser, do not infer support from a version string. Target current Chromium/Firefox/Safari only after their real capability/transaction tests. On denied/unavailable locks or storage use **read-only saved-file inspection + checkpoint download**. The authorized runtime can continue with visible “not saved on this device”; a user can retain a raw checkpoint file and explicitly resume it later. Do not silently switch to uncoordinated localStorage writes. No IndexedDB service, leader-election lease or new dependency is necessary for this first slice. Compatibility is tested per capability, not blanket browser certification.

## Required interleavings

| Scenario | Required observable result |
|---|---|
| A saves N; B reads generationG/N; A saves N+1/G+1; B saves N/G | B refuses LOCAL_NEWER (or generation conflict); N+1 remains. Both tabs cannot report N as the new durable head |
| A/B nearly simultaneous writes from G | Locks serialize; first valid changed write produces G+1; second cannot use G. Refuse/reconcile even if its candidate revision is greater; explicit retry after current-state review may save the newer valid value |
| Equal revision, distinct signed token | LOCAL_SAME_REVISION_CONFLICT; raw backup/review; neither winner guessed |
| Case X is replaced with Y, delayed X response arrives | Case/generation/consent checks reject X; Y preserved |
| Crash before/after setItem | Entire old/new slot; next lock holder re-reads. No half-token accepted, no destructive cleanup |
| Stale resume response after newer save | Controller refuses lower confirmed revision; storage adapter independently refuses lower revision/old generation |
| Discard races with old autosave | Tombstone increments generation; old expected generation cannot repopulate slot |
| Storage notification lost/delayed | Next transaction re-reads under lock, still safe; notification is only UX |
| Server restart after newer save | Reauth/resume the stored newer token; generation is not rewound to a saved server revision |

The proof harness enumerates serialized transaction orders and old-or-new crash outcomes; it does **not** exercise an actual browser lock. Real two-tab/worker crash tests are mandatory in future implementation.

## Save/restore and server relationship

Server validates/reduces/signs/serializes candidate before commit. Browser parses response, checks runtime/session/request identity and refuses a lower confirmed revision. Then Save invokes the locked adapter; only a successful local transaction displays Saved. If HTTP succeeded but storage failed, distinguish “confirmed in session” from “saved”, retain old checkpoint, offer new raw token download. A raw backup contains token/notes, never credentials; warn it is not encrypted and users should avoid personal information.

Reload reads exact raw without mutation. Parse LocalSlot safely, show pending/unverified snapshot with trusted catalog caveats, then authorize and GET its known case. If live head is newer, offer its checkpoint for saving with a fresh generation after reconciliation; never replace the live head by old resume. If GET404, explicitly resume the signed saved token in the current runtime. See03 for head equality/conflict, key rotation, expiry and receipt behavior. A lost response can be recovered by GET while the server lives. If both process and unsaved response are lost, last saved/downloaded checkpoint is the recovery boundary; do not replay ambiguous actions automatically or promise exactly-once persistence.

Server verifies token bounds/canonical encoding/MAC/keyId, realm/origin/rules/catalog, nested core via an in-memory read adapter to loadProgress, training reachability, exact canonical composition and validatePassport. It rederives diagnostic/progress/evidenceReview; local generation/auth expiry are not scientific proof. Unknown IDs/prototypes remain unknown with own-key/Map lookups and per-entry rendering recovery. Missing caveats/claim mismatch are rejected; HTTP413/429/500 are not scientific rejections. Bad MAC or key loss preserves raw/read-only recovery, not automatic re-signing. v1/v2 legacy keys remain untouched and readable through existing recovery; no trusted migration into this episode.

## Fixed size limits and finalization

| Boundary | Limit / rule |
|---|---|
| Existing core state | 500,000 serialized UTF-16 units, unchanged |
| Every preview POST | 32,768 actual streamed UTF-8 bytes, unchanged |
| Canonical checkpoint payload | 20,480 UTF-8 bytes, including pending/lastCommand/versions/source binding |
| Encoded token | ≤27,351 ASCII bytes including dot+43-char MAC |
| Resume JSON | Token plus runtime UUID and64-char commandId; exact maximum measured in07, no full-state upload |
| Full Snapshot/ActionResponse | ≤65,536 UTF-8 bytes; include duplicated token/state and current diagnostic |
| LocalSlot JSON | ≤28,000 UTF-8 bytes; includes max token, generation and bounded head identifiers; no growing log |
| Notes | ≤4; each nonblank, unchanged trimmed text, ≤500 UTF-16 units and ≤2,048 serialized UTF-8 bytes. Reject lone surrogates, forbidden controls except tab/newline, and outer whitespace explicitly |
| Diagnostic strings | symptom≤240, interpretation≤500, repair≤500, purpose text≤500 UTF-16 units; ≤2 source citations per finding, ≤10 current findings. Actual authored strings never silently shortened; bad author content fails fixture/schema gate |
| Metadata | One pending receipt, one completed repair,40 unique count cells, first/last wrong choice, one lastCommand. Fixed24-char timestamps; UUID36; keyId≤32; origin≤64 ASCII |

Warn at16KiB decoded payload; optional updates must reserve4KiB **after projecting all essential completion fields**, including current source entries/training receipts/lastCommand. Reject an optional note before mutation if that full suffix cannot fit. Essential repair/observation/completion must remain possible from every admitted case; test property, not inferred from one size sample. A hard-limit failure returns CHECKPOINT_LIMIT_REACHED with identical prior state/training/session revision/checkpoint, preserving previous valid save. Response-limit failure similarly rolls back candidate; invalid author diagnostic text must not create a dead end in a deployed fixture.

Because the current contract rejects lone surrogates, the earlier2,048-byte escaped-surrogate notes are now **invalid stress inputs**, not legal notes. Maximum legal JSON string bytes for500 well-formed UTF-16 units under these controls is1,502 (500 three-byte BMP scalars + quotes); keep the2,048 ceiling as defense in depth. Measure both the largest representative *legal* case and a hypothetical2,048-byte transport stressor separately; never label invalid text as earned progress.

Boundary tests: payload20,479/20,480/20,481; HTTP32,767/32,768/32,769 with chunking, missing/lying Content-Length and malformed UTF-8; predecode token length/MAC; equal-intent key ordering; max response; escaped tab/newline/quotes/backslashes and composed/decomposed Unicode without normalization. A legal max token resume is below32KiB; test the body reader's exact boundary with trailing JSON whitespace as well as oversized/invalid token rejection. Notes/citations/limitations are never truncated to pass.

## Ownership

Sol owns candidate token/scientific/reachability schemas, pure local admission rules/refusal codes, server revision/identity contracts and negative proof fixtures. Claude owns browser Web Locks/localStorage/controller implementation, feature detection, transaction serialization, conflict UX, focus/error announcements, raw downloads and restore UI **after freeze**. Sol reviews its admission semantics; Astra tests adversarial integration. No two editors write shared schemas/E2E/config simultaneously. See06 for explicit shared-file windows and09 for frontend handoff.


## Final consumer error, provenance and browser gates

LocalSaveResult now includes LOCAL_LOCK_BUSY and LOCAL_WRITE_FAILED as specified in [R4](10_FINAL_CONSUMER_CORRECTIONS.md#r4--precise-save-and-note-failures). A failed write/read-back is not a confirmed device save; keep old/candidate tokens for download and re-read under a later lock, without automatic rollback. Permission failures before storage access remain LOCAL_STORAGE_UNAVAILABLE; denied/unverified write capability is LOCAL_READ_ONLY.

Invalid note content is HTTP400 INVALID_REQUEST/noteIssue, distinct from valid-note state limits; preserve exact editor text and prior state. Research entries have no training corrections under r3. Reconstruct separate training history from signed receipts on resume; do not trust a saved presentation or silently re-sign r2. Budget both the bounded response projection and opaque token; the proposed64KiB **response** cap is separate from the existing32KiB **request** cap. Updated full completion bytes are in07/MEASUREMENTS.

**Feature detection alone does not enable writable saves.** Require accepted cross-process lock/storage visibility/lost-update tests for each supported Chromium, Firefox and WebKit engine/build family. The new lock holder must observe the previous writer's committed value. Record process-isolation method/browser/OS/commit/iterations and zero lost updates, plus crash/reopen, stale resume, case/tombstone/epoch and exception tests. Until an engine's gate passes independent review, use LOCAL_READ_ONLY plus raw checkpoint download/read-only restore, even if navigator.locks exists. The consumer-reported Chromium result was not rerun here; Firefox/WebKit remain untested. Notifications are still only UX hints. No engine/browser support is approved by the planning proof model.
