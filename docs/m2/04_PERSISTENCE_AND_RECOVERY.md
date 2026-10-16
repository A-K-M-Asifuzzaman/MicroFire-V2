# Preview persistence, size and scientific validation

## Existing guarantees to retain

The core save key is `microfire-v2:save:v1:{normal|demo}` even though its data is GameState **v2**. `MAX_SAVE=500_000` measures serialized JavaScript string length (UTF-16 code units), not HTTP bytes. `saveProgress` checks schema, apparatus consistency and existing save readability; it never overwrites corrupt/unsupported/mismatched saves. `loadProgress` checks size both before and after normalization/migration. Classification retries remain correctable after the 200-history cap. REMOVE_PROPOSAL provides deliberate recovery from large lunar proposals; no automatic note/caveat deletion is allowed.

A structurally successful `loaded` result does **not** verify scientific references, arbitrary conclusions, play history or server authorization. A current, schema-valid qualification field is not enough to trust unverified client progress.

## One preview save, separate profile

Proposed key: **microfire-v2:m2-preview:checkpoint:v1:demo**. Store the opaque signed checkpoint string returned by the server. It contains exactly one GameState v2 and one bounded training object as defined in the frontend contract. Do not also write that embedded state into the existing normal/demo keys, and never serialize HUD state as an alternative mission authority. No signing/access secret or auth cookie goes in localStorage.

The saved payload includes checkpointVersion, previewId, rulesVersion, origin, datasetVersion (inside the core state), catalog hash, sessionId and session revision. Scientific validation status/progress projection are **recomputed**, not trusted persisted booleans. A valid MAC means this local server issued those bytes; it is neither encryption, proof the user read a source nor human scientific approval.

Implement a thin preview SaveStorage adapter with load/save/raw/discard results. It reuses GameStateSchema, core loadProgress/migrateV1/setupIsConsistent where applicable and validatePassport after structural checks. Adapt the nested core field through an in-memory read adapter to `loadProgress` rather than writing existing legacy keys. Avoid parallel assembly invariants or a second Passport model. New wrapper error distinctions are not forced into the old LoadResult union, preserving existing consumers.

## Byte strategy, fixed production limits

| Boundary | Budget / unit | Policy |
|---|---|---|
| Existing core save | 500,000 UTF-16 units | Unchanged; common core success check still rejects oversized candidate before mutation |
| Existing POST body | 32,768 actual UTF-8 bytes | Unchanged; stream-count even without Content-Length; reject malformed UTF-8/media/oversize |
| Decoded preview checkpoint payload | **20,480 UTF-8 bytes**, `TextEncoder().encode(JSON.stringify(payload)).byteLength` | Hard cap before signing/session commit; includes state, training metadata and wrapper fields |
| Encoded signed checkpoint | ≤27,351 ASCII bytes | 20,480-byte payload encodes to ≤27,307 unpadded base64url chars, plus dot + 43-char SHA-256 MAC |
| Resume request | ≤32,768 bytes including JSON keys/commandId | Maximum checkpoint plus a 36-char commandId leaves >5 KiB headroom; no full state/action batch upload |
| Game response | 65,536 UTF-8 bytes | Snapshot and opaque checkpoint can duplicate presentation bytes; reject candidate before session commit if schema/response bound fails |
| Learner notes | max 4; each ≤500 UTF-16 units and ≤2,048 serialized UTF-8 bytes | Append-only during Passport review; reject outer whitespace explicitly to avoid existing TextSchema normalization; preserve accepted text; no canonical caveat replacement |
| Training history | one introduced fault, one repair receipt; max 40 unique part/fault count cells, first/last wrong choice | Counts preserve retries; no unbounded per-frame/drag/click log; list never grows past finite vocabulary |

A full first episode creates **two** source-linked Passport entries. Setup edits before observation do not append Assembly evidence; after observation the episode locks rebuilds and offers completion/new case, preventing endlessly accumulating invalidated entries in this preview. Rejected attempts don't append arbitrary text. Normal campaign semantics and its 500k cap are not reduced.

Warn at 16 KiB, retain at least 4 KiB of hard-budget headroom for required canonical completion. Required implementation tests must construct the maximum legal diagnosis summary, both canonical entries, all four maximum-byte notes, worst bounded IDs/timestamps and a final completion. Preflight optional note admission against that full completion projection, not only current payload size. If a future canonical limitation grows or an unmodeled payload exceeds the bound, refuse the new optional update **before** committing it; keep source caveats and old note text intact. No silent shrinking, elision or migration to larger HTTP limits. Essential repair/completion actions must fit all reachable accepted checkpoints; this is an acceptance invariant, not a promise inferred from one happy-path measurement.

Planning measurements in the verification file exercise the current real core path and conservative proposed metadata/notes. They establish budget feasibility, **not an implemented signed-storage feature**. Future tests must use the actual runtime schemas/adapter and fail if serialization changes exceed these bounds.

## Save/restore ordering and durability

1. Server atomically accepts/signs a transition only after structural, scenario, source-lineage, invariant and size checks. A rejected action returns the previous exact state/training/checkpoint.
2. Browser receives and schema-parses the full response; only then shows confirmed progress. Animation may preview a drag but cannot mark it committed until the response.
3. Autosave/Save writes the **latest received checkpoint** to the isolated key with one `setItem`, then reads back the same string. Keep the previous valid token in memory until write/read succeeds. Single-item localStorage replacement is atomic; quota/permission failures are caught.
4. UI states distinguish **confirmed in this session**, **saved on this device**, and **not saved / download a backup**. A failed save must not falsely say Saved. The server session still holds the new confirmed progress; offer its checkpoint as a raw download and retry storage, without overwriting the old checkpoint.
5. An invalid existing checkpoint is never overwritten merely because a new case can be created. Download it first; deliberate discard uses an explicit `discard-preview-save-after-export` confirmation. Browser download initiation cannot prove the user retained the file; explain before destructive confirmation.
6. Reload reads raw without mutation, bounds encoded bytes, parses versions/structure for display, and requires reauthorization/resume to recover authoritative progression. Server validates MAC, origin/rules/dataset/hash, GameState consistency, training invariants and Passport lineage before accepting it.
7. On server process restart or 60-minute idle eviction, the in-memory session is absent. An authorized resume can reconstruct it from a valid signed checkpoint using the same signing key. Key rotation/loss preserves raw/read-only recovery but cannot recreate trusted progression by silently signing an edited save.
8. In two tabs, expectedRevision/CAS and single in-flight request prevent silent overwrite of an active server head. A stale checkpoint cannot replace a newer live head. Show both revisions and offer download/return to current. Across complete server loss this is a local preview, not an anti-rollback service: an older valid checkpoint may be explicitly resumed. It does not issue external achievements or scientific promotions.

On reload, compare any still-live server session to the locally saved revision before writing. If server is newer (e.g. response/save interruption), GET and offer saving that confirmed checkpoint; do not automatically replace newer server progress with an older local token. If the server is gone, the last successfully saved/downloaded token is the recoverable boundary. A crash after a server commit but before receipt/save can lose that unsaved action when the process also dies; no local-only architecture can promise otherwise. UI wording and the interruption test must expose this limit.

## Load/recovery result specification

| Preview result / cause | Progression | Required UI and preservation |
|---|---|---|
| empty | Fresh authorized start permitted | No invented entries; normal/demo saves untouched |
| pending-auth / expired cookie | Paused | Read-only local snapshot marked unvalidated; reauthorize; raw download |
| loaded-and-verified | Resume current phase | Fresh server evidenceReview with lineage-only scope; recompute qualification/allowed actions |
| storage-unavailable | Current runtime may continue; durable save unavailable | Explain unsaved state, enable checkpoint download, retry storage |
| corrupt JSON/base64/unsupported checkpoint version | No automatic resume | Exact raw remains; recovery/download, explicit discard only |
| bad MAC / modified training metadata / forged completed prefix | No resume/re-sign | CHECKPOINT_UNTRUSTED; read-only inspection where safe; no earned proof |
| dataset/hash/rules/origin mismatch | No automatic migration | Preserve raw; explain incompatibility; independent migration review needed |
| valid structure, unknown experiment/claim/missing caveats | No scientific approval or completion | Rejected scientific lineage; show trusted catalog limitations for known IDs only, unknown references explicitly unknown |
| network timeout/429/500 | Neither approved nor rejected scientifically | Existing checkpoint/progress remains; Retry-After or retry/resume; never clear data |
| legacy Passport >32 KiB | Existing validator may return 413 | Label **not validated**, not scientifically invalid; keep exact raw; no bulk-upload loophole |
| stale active head | Do not overwrite | Fetch/choose current revision; no silent last-writer-wins across tabs |

Unknown references such as `constructor`, `prototype`, B19 or mixed B20+unknown must never inherit B20 source content through object prototypes. Preserve the accepted Map/own-key lookups and per-entry boundary. A recovery screen must remain usable even if one entry fails to render. Signatures prevent forged checkpoint progression, but the raw-recovery renderer must still safely handle arbitrary untrusted data.

## Scientific validation state

Use the existing `/api/passport/validate` for a Passport within its body limit; preview server can invoke **the same validatePassport function** while validating its ≤20 KiB checkpoint. Never create a more permissive validator or return scope “scientific truth verified.” The server's snapshot evidenceReview is derived from that check against the pinned catalog, plus separate coordinator/provenance checks. Never cache its valid flag across a different dataset/hash.

Transport/size/rate/availability failures yield not-validated. Actual lineage failure yields rejected. Empty Passport is empty, not a scientific achievement. Known canonical limitations are rendered directly from the trusted catalog during pending/error/rejected states. Saved learner text remains separately labeled even after lineage passes. Arbitrary conclusions are not made true by a matching citation or a trusted game checkpoint.

## Migration and legacy safety

No changes to GameState v2 or Passport v1 are proposed. Existing v1 loader migration remains: drop untrusted v1 installed parts/qualification, invalidate setup-dependent proof via current code, preserve legitimate source notes/current prefix, report `migratedFrom:1`. v2 without learnerNotes still defaults safely. Required regression tests retain corrupt/unsupported/version/size/mode/dataset behavior.

The first preview checkpoint format has no predecessor. **Do not fabricate a migration from unsigned v1/v2 local saves into trusted training completion.** Old cases can be structurally loaded and read/lineage-checked with current UI, but they lack signed diagnosis/fault history. Preserve them in their original keys and let the player start an explicit isolated training episode. No automatic loss, reassignment, source-note copying or renaming of progress is needed. A future importer would need a reviewed untrusted-origin contract and cannot waive training gates.
