# Grand Collection — content production report

Status: **four fictional collections complete; Curiosities target incomplete.** This is an editorial library, not a publication or database import. The collection contains **1,695 entries**, including **1,414 new drafts** and 281 preserved published records. No new entry is approved or selectable in Muse yet.

| Collection | Existing published | New drafts | Actual / structurally validated | Target | Unwritten |
| --- | ---: | ---: | ---: | ---: | ---: |
| Weekly Side Quests | 200 | 300 | 500 | 500 | 0 |
| Fortune Cookies | 24 | 341 | 365 | 365 | 0 |
| Oracle answers | 20 | 345 | 365 | 365 | 0 |
| Tiny Prophecies | 24 | 341 | 365 | 365 | 0 |
| Curiosities | 13 | 87 | 100 | 250 | 150 |

## Completed writing and validation

Each quest category has exactly 100 entries: 40 preserved published records and 60 drafts. Oracle distribution is exactly **90 Yes, 90 No, 90 Maybe, 50 Not Yet, 45 Cryptic**; legacy Affirmative/Negative/Uncertain/Chaotic labels are counted through an editorial mapping without rewriting their saved canonical versions. New quests include setting, participation, cost, energy, skill, materials, duration, tags and editorial/version metadata. New fictional fortunes include tone, and prophecies also include a theme.

The source-backed Curiosities have teasers, original expandable explanations, approved category labels, traceable source titles/publishers/URLs, verification dates and draft status. The 87 new claims were checked against the actual source material available during research, primarily NASA, NOAA, MBARI, Smithsonian, museums, libraries and universities. Source links are not treated as proof by themselves. Uncertainties are retained, including reconstructed ancient devices, estimated shark ages, hidden oceans, and later art reproductions versus deliberate forgery. No source images are copied or licensed for reuse by this work.

**The remaining 150 Curiosities have not been written or verified.** `CURIOSITIES_RESEARCH_QUEUE.json` reserves CUR-101–CUR-250 and supplies research leads, not pretend entries. The original brief explicitly prioritizes verified quality over filling 250 slots. The current 100 includes 13 previously published source-linked entries; do not describe those 13 as newly rechecked in full by this continuation. Mammoth Cave's published length was specifically rechecked against current NPS material and remains supported at more than 426 mapped miles. The new library has substantial space/ocean coverage; future research should broaden history, plants, culture and everyday ingenuity.

## Preserved history and outstanding editorial exceptions

Existing canonical IDs, versions and documents remain unchanged. `PUBLISHED_BASELINE.json` protects their bytes; `GRAND_COLLECTION_INDEX.json` maps requested editorial IDs to immutable canonical IDs without modifying user history. Existing published records keep their original, more limited metadata. In particular, the 13 legacy Curiosities do not yet have the new Tell Me More fields. Expanded legacy metadata and explanations require reviewed versioned enrichment rather than silently changing an immutable published document.

The Creative quotas cannot all fit while preserving the existing 40 broadly themed published Creative entries within a 100-entry category. Those 40 remain intact as legacy exceptions, not newly reclassified or retired. The 60 new Creative drafts contain **20 fiber, 2 painting, 2 DIY, 2 new-craft, 20 coding and 14 UX** activities. Thus the collection meets 100 Creative entries but **does not meet every proposed Creative subquota**. This tradeoff still needs editorial acceptance; it is not recorded as a new approved product rule.

Automated review found no exact duplicate bodies, duplicate quest titles, duplicate new Curiosity titles, or high-similarity quest/fortune wording at the documented thresholds. It flags **20 shared-source Curiosity pairs** for semantic review: these generally cover distinct claims, such as rings versus atmospheric structure, but shared topics still deserve human inspection. **41 preferred-length exceptions** are explicitly listed rather than padded or hidden. Preferred word ranges are guidance, not a substitute for good prose. Machine comparison cannot certify semantic uniqueness, literary quality, internet-wide originality or factual truth.

All 1,414 new entries need human editorial approval. Review variety, warmth, actionability, safety, repeated motifs, collection-specific voice, sources and exceptions before publication. Structural validation is not approval.

## Review and import preparation

- Validate the present files: `node scripts/validate-whimsy-content.mjs --write-report`.
- Create an offline review package: `node scripts/prepare-whimsy-content.mjs --output /tmp/muse-whimsy-review.json`.
- The package is deterministic, draft-only, excludes existing IDs, and splits entries into batches of at most 500 under the existing RPC's size limits. It contains no user records or credentials and performs no network or database operations.
- `--final` remains a strict full-target gate and **fails while the 150-entry research shortfall exists**. Do not label 1,845 entries complete.
- **Do not import the draft review package.** Database content versions are immutable, including editorial state. After human approval, prepare separately approved published documents, preserving canonical IDs and using a new version for any already-imported document that changes. Runtime library JSON and the database catalog must reference the same published IDs/versions.
- The existing service-role-only `import_whimsy_content` RPC supports identical-version idempotency and rejects altered same-version collisions; it is not replaced here. Hosted import, credentials and publication require separate explicit authorization. No content was imported by this pass.
- Tarot's 78-card encyclopedia and the Dream Symbol Encyclopedia remain excluded.

See `CONTENT_PROGRESS.json` for counts and `CONTENT_REVIEW.json` for the generated review queue. This report deliberately distinguishes actual content, factual research, structural checks and editorial approval.

## Verification for this continuation

- Content structure/source-field/uniqueness validation: passed for the actual 1,695 entries.
- Offline review packaging: 1,414 drafts in three bounded batches; no import or publication.
- Focused content, Bookshelf and Fortunes tests: 20/20 passed.
- Full unit regression suite: **351/351 passed**, no failures or skipped tests.
- TypeScript (`npx tsc --noEmit`): passed.
- ESLint on changed content scripts and tests: passed.
- Full-target gate: intentionally rejects this incomplete 1,845 target; its refusal is covered by a passing regression test.
- No application code, styles, database records, hosted services, commits or deployments were changed in this content continuation. The earlier Bookshelf phase's successful production build was not repeated for JSON, offline-script, test and documentation changes.
