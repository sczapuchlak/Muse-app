# Tarot Grimoire editorial integration audit

Status: local draft integration. Editorial publication is **not approved** by this work. The seven supplied source files are preserved byte for byte under `content/whimsy/grimoire/source/`; none of the older enrichment candidates are merged.

## Coverage and identity

- Seven valid JSON batches contain 78 unique source entries: 22 Major Arcana and 14 each of Wands, Cups, Swords, and Pentacles. Every canonical Muse card is represented once by name, and every mapped card has an existing Rider–Waite–Smith artwork record. No reading, artwork, or personal-meaning ID changes are required.
- The Swords courts use provisional source IDs. The application maps Page, Knight, Queen, King of Swords to `tarot-swords-11`, `-12`, `-13`, `-14` respectively. Their original IDs remain in the source JSON and normalized `sourceId`; the canonical IDs are used for routes and saved-reading references.
- All 78 cards have six nonempty chapter containers, upright and reversed interpretation text, reflection material, and at least one HTTPS source URL. The six source formats are not identical: Swords use a chapter array; Pentacles use `life` for “In Your Life”; the other batches use a chapter object. The adapter handles only these documented differences.

## Editorial issues requiring review before publication

- Every source entry is explicitly `draft`. Batch headers also identify creative-director or group review as pending. This integration does not change those statuses or publish to a database or hosted environment.
- The Major Arcana source notes describe at least one chapter expansion as a new proposal after a longer reference manuscript was unavailable. It must not be represented as a verbatim recovery or as an approved final manuscript.
- The 14 Swords entries omit top-level subtitles and `relatedCardIds`; their chapter Story subtitles can supply display subtitles, but no related-card links are invented. Their structured upright/reversed keyword arrays are empty. Meaning prose is present and is displayed without generated keywords.
- Typical chapter text is materially shorter than the attached editorial blueprint's suggested 1,800–2,800-word Major Arcana depth. The submitted writing is preserved exactly; editorial depth and source claim review remain separate decisions.
- Cups have one supplied source reference per card, while other batches supply two to four. Structural URL validation is complete; historical claim-by-claim source verification and artwork-rights review are not claimed here.

## Mapping and retention

The normalized view reads the original JSON directly. It maps `story`, `symbolism`, `meanings`, `inYourLife`/`life`, `hiddenKnowledge`, and `reflection` into the agreed chapter order. Source chapter values and all top-level metadata remain attached to each normalized entry. The UI displays the chapter text, orientation content, prompts, sources, and available supporting editorial material without rewriting wording. Missing optional fields remain absent. The original file checksums were compared after copying and matched byte for byte.

`node scripts/audit-tarot-grimoire.mjs` is the structural gate. It rejects missing or duplicate canonical identities, missing artwork mappings, malformed chapter coverage, missing orientation prose, and missing or malformed source URLs.

## Interactive symbolism readiness (future enhancement)

Fourteen Pentacles cards contain a structured `visualSymbols` list. The other 64 cards currently describe imagery in prose without a uniform per-symbol data model. None of the supplied files provides verified artwork coordinates, bounding boxes, or mobile tap regions. A future explorer can start with a reviewed per-card symbol ID, label, source passage, and responsive artwork region map, then progressively enable cards after image-specific editorial and accessibility review. The current pass does not infer coordinates, duplicate interpretations, or create fragile hotspots.

## Swords display overlay — local draft, awaiting creative review

`content/whimsy/grimoire/overlays/swords-editorial-v1.json` supplies four upright and four reversed display keywords for each of the 14 Swords cards, derived from the supplied interpretation prose. It also supplies a small set of canonical related-card links, each with a written rationale and a distinction between thematic interpretation and an explicitly source-mentioned connection. The overlay is separate from the seven unchanged source batches and does not alter card IDs, saved readings, or chapter text. Its status is `draft-awaiting-creative-review`; the owner should approve or revise the keyword choices and thematic links before publication. The only source-cited cross-arcana link is King of Swords → Justice, explicitly discussed in the King's Hidden Knowledge chapter. No other historical correspondence is claimed.

The Fool's `reviewNotes` and provenance remain in the source JSON and editorial debug metadata. The missing longer gold-standard manuscript has **not** been reviewed or reconstructed. Outstanding decision: accept the supplied chapter-form Fool expansion as the final editorial version despite that missing manuscript, or provide the longer manuscript for comparison and revision. The other Major entries remain usable as supplied drafts; this caveat does not block local UI work.
