# Phase Zero security boundaries

No provider secrets are needed or read. `.env*` is ignored except empty `.env.example`; never use NEXT_PUBLIC_ for keys. Meshy is absent from the web runtime. No endpoint fetches user-supplied URLs, uploads files, mutates science data or executes retrieved text. React renders source text as escaped text; no HTML injection API is used.

Shared Zod schemas reject unknown fields, unsafe URL schemes, impossible numeric conditions and missing source references. POST requests are JSON-only, streamed up to 32 KiB and budgeted at 30 requests/minute per server process. Errors do not expose raw payloads, tokens or stacks. No CORS allow-origin header is set; data is public and validation has no persistence side effects.

Headers include nosniff, frame denial, same-origin/default CSP, restricted camera/microphone/geolocation and a referrer policy. **The P0 static shell uses unsafe-inline for Next hydration/styles**; this CSP reduces exposure but is not a nonce-based strict CSP. Upgrade to verified nonces/hashes before adding dynamic third-party or paid-provider features. Dev hot reload may need a development-only policy adjustment. Do not weaken production CSP for it.

`npm run security` checks included files for common credential patterns, unintended environment files and forbidden provider access. It is a small guard, not comprehensive secret detection or a penetration test. `npm audit --audit-level=high` and Dependabot cover dependency advisories. CI has read-only repository permissions, no credentials beyond checkout's token, a timeout and no deploy step. Actions are major-version tagged; pin audited immutable action revisions before public release.

Saves are untrusted client-local data. Schema validation catches corruption, not deliberate valid-shape edits; local hashes/signatures would not authenticate a user. Passport validation verifies source lineage only and must never be used as proof of scientific correctness or protected achievement. Future server achievements require independent replay/revalidation. Multi-tab simultaneous save writes are last-writer-wins; server sync/conflict resolution is not implemented.

Imported NASA facts retain source/rights metadata; do not assume every NASA image or third-party figure is public domain. Source snapshots and reference code must not execute automatically. Report suspected leaked credentials privately to the repository owner; rotate any real exposure before further use.
