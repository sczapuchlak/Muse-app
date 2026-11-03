# Cosmic Observatory continuation and QA

## Milestone A — status at continuation

Inspected the existing source, migration, tests, provider research and 36-response evidence before implementation. This is a continuation, not a new architecture.

| Feature | Starting status | Exact remaining work |
| --- | --- | --- |
| Shared forecasts | Partially implemented | Normalized service and six tests exist; detail mode, stale-result transitions, cache policy edge cases and UI integration need verification. No approved adapter. |
| Observatory navigation | Partially implemented | Sixth registry entry exists; destination route and six-section interface missing. |
| Cosmic Profile/preferences | Partially implemented | Authenticated API, revisioned store, local migration and birthplace form exist; wire into accessible UI, persisted preference controls and deletion/retry flows. |
| Big Three/chart | Partially implemented | Local engine, interval uncertainty and wheel exist; twelve tests passed across engine/service. Wire full interpretations, text breakdown, house/aspect exploration, improve crowded glyphs and responsive QA. |
| Library | Partially implemented | 58 original structured entries exist; related-link integrity/content tests, searchable browser and immediately complete detail experience missing. |
| Calendar | Partially implemented | Calculated phases/seasons and authenticated API exist; month navigation, local dates/details/saves missing. Ingresses/stations remain outside verified calculation coverage. |
| Journal | Partially implemented | Owner-only schema/API/store exist and local database script previously passed; editor, collection, linked saves and retry/conflict UX missing. |
| Daily Edit | Partially implemented | Existing card uses shared unselected service; verify layout/compact expansion and default changes, prevent stale previous-request display. |
| Insights/recap/export | Partially implemented | Existing architecture extended, birth details excluded from analytics; add source/count/privacy/owner tests and user-triggered activity wiring. |
| Live horoscopes | Blocked | FreeHoroscopeAPI is a candidate only. Publication freshness, rights and operational questions unresolved. No cost/provider activation/external inquiry approved. |
| Final QA | Not implemented for completed UI | Full suite/lint/types/build, local persistence/auth/API, dynamic theme/material/mobile/keyboard/contrast and regression checks. |

No hosted migration, deployment, production data write, subscription or external inquiry is authorized. The existing local-only migration is retained; independent implementation uses the approved local Astronomy Engine calculation layer.

## Milestone completion — local implementation, November 2, 2026

The starting-status table above is historical. The six-section Observatory is assembled in the protected sixth Whimsy route. **Forecast has a working sign/period/preference and shared-service interface, but real readings remain explicitly unavailable.** The other five sections are functional against real local calculations, original reference content, and owner-scoped persistence. This is not a claim that the required live horoscopes or hosted rollout are complete.

| Section | Actual local status |
| --- | --- |
| Forecast | All twelve signs can be browsed without changing the saved default; an explicit action changes that default. Today/This Week/This Month use the same normalized service as the preserved Daily Edit card. All return a truthful source-unselected state. No substitute text or invented specialized categories. Forecast saving is disabled until rights and content are approved. |
| My Cosmic Profile | Quick sign preferences; optional birth date/time/place, exact/approximate/unknown precision, fold disambiguation and unknown-place path; local place search plus manual correction; acknowledged edit/recalculation, retry, revision conflict, export and typed deletion. Birth details are never sent to a forecast vendor. |
| Birth Chart | Ten computed planetary positions, Sun/Moon/Rising uncertainty, Ascendant/Midheaven and twelve Whole Sign houses when calculable, five major aspects, responsive interactive SVG, keyboard/touch controls, accessible text list and immediate full placement/sign/house interpretations. Unknown birthplace suppresses angles/houses/aspects rather than inventing coordinates. |
| Astrology Library | 58 original structured entries: 12 signs, 10 bodies, 12 houses, four elements, three modalities, five aspects and 12 other concepts. Search/filter/related links work. Every full interpretation opens directly in one detail experience. Entries remain **editorial drafts** pending owner review, not approved/published reference copy. |
| Cosmic Calendar | Calculated lunar phases, equinoxes and solstices with month browsing, local time, source basis, factual/traditional separation, library links and journal reflection actions. Planetary ingresses/stations/transits are not presented because they have not been validated as event products. |
| Cosmic Journal | Owner-only create/edit/delete/search/sort and linked chart, library and event reflections; retained notes/links, acknowledged saves, conflict/retry controls and typed deletion. No provider forecast text is stored. |

### Connections and privacy

The Observatory reuses the existing Whimsy header/navigation, account zodiac and forecast category preferences, account export/deletion, Insights source pipeline, and recap data contracts. Chart placements open complete library-backed explanations; event cards can open related concepts and prefill journal references; journal entries reopen their source where it remains available. Meaningful chart/library exploration is deduplicated and counted from owner records. Insights and recap projections use actual activity and notes counts only; they contain no birth details, journal text, causal claims about mood, or invented engagement.

The existing Daily Edit Cosmic Forecast keeps its card placement and styling and calls `observatoryForecasts` through the shared reading component. Its preview, expand control, sign/date and Observatory link are present; without an approved adapter it shows unavailable, not an old or fabricated forecast. Changing the canonical sign updates both surfaces; browsing another sign is temporary.

`astronomy-engine@2.1.19` is pinned and its MIT notice retained. Tropical longitudes of date and Whole Sign houses are stated in the UI. The local 236,874-place GeoNames extract is CC BY 4.0 with attribution; it is traced into the server build. Place lookup is local and requires confirmation. Historical civil-zone uncertainty is labeled. No provider API credential is required for the independent sections. The local-only migration `20261102003100_cosmic_observatory.sql` adds owner-scoped profile/chart/journal/activity records and revision/idempotency commands using the existing user and preferences architecture. No hosted migration has been applied.

### Verification

Final command results are recorded at the end of this document. Verification includes 20 independent NASA/JPL apparent-position reference values at two instants (within one arcminute), independently sourced Ascendant/Midheaven/Whole Sign cases, DST gap/fold and historical-offset cases, uncertainty paths, real lunar/seasonal events, service cache/errors/date boundaries, library completeness and links, activity aggregation/privacy, and owner isolation. The authenticated local database exercise checks profile/chart/journal CRUD, revisions/idempotency, RLS, export/deletion and account cascade with disposable users. The authenticated production-browser exercise checks all six destinations, profile edit/recalculation, shared Daily Edit preference, full details, library search, journal/event links, keyboard/focus, mobile touch, and responsive layout across all nine registered themes, Frosted/Crystal, and widths 320/390/768/1280/1920.

Automated contrast checks cover chart glyphs against each theme/material combination. Manual Safari, assistive-technology screen-reader use, hosted environment and actual live-provider rollover/availability remain unverified. An automated accessibility and responsive pass is evidence for its tested interactions and viewports, not a blanket accessibility certification.

### Provider activation blockers

FreeHoroscopeAPI remains the first no-cost written-content candidate. The public 36-response sample confirms all twelve signs and three period endpoints return general text, but its weekly responses were stale and labeled the prior week. Publication timezone/refresh schedule, ongoing REST quota/reliability, content provenance, allowed shared-cache lifetime and private save/export/offline rights need clarification and fresh boundary verification. No specialized life-area text was verified. The [provider research](ASTROLOGY_PROVIDER_RESEARCH.md) contains the evidence and [unsent inquiry](FREEHOROSCOPEAPI_INQUIRY.md) contains precise questions. A provider adapter, historical forecast saves and corresponding Daily Edit live content remain blocked until an approved source and its rights are established. Horoscopes remain required work, not permanently deferred.

### Changed files by purpose

| Area | Files |
| --- | --- |
| Protected UI and styles | `app/(app)/whimsy/observatory/page.tsx`; `components/astrology/*`; `components/AppShell.tsx`; `components/whimsy/WhimsyFoundation.tsx`; `lib/whimsy/models.ts`; `lib/auth/paths.ts` |
| Shared forecasts and Daily Edit | `lib/astrology/forecast.ts`; `components/CosmicForecast.tsx`; `components/CosmicSettings.tsx`; `components/useCosmicPreferences.ts` |
| Calculation, library and content | `lib/astrology/{models,calculations,time,wheel,places,library}.ts`; `content/astrology/*`; `next.config.ts`; `package.json`; `package-lock.json` |
| Private persistence and API | `app/api/astrology/{records,places,calendar}/route.ts`; `lib/astrology/store.ts`; `supabase/migrations/20261102003100_cosmic_observatory.sql`; `lib/database.types.ts`; `app/api/account/export/route.ts`; `lib/data/account.ts` |
| Insights and recap | `lib/astrology/insights.ts`; `components/insights/{AstrologyInsights,useInsightsSources,Insights}.tsx`; `lib/insights/{metrics,normalize}.ts`; `lib/whimsy/connected.ts` |
| Tests and decisions | `tests/astrology-*.test.mjs`; `scripts/{test-local-astrology,test-observatory-ui,test-whimsy-layout}.mjs`; `docs/{COSMIC_OBSERVATORY_AUDIT,COSMIC_OBSERVATORY_IMPLEMENTATION,ASTROLOGY_PROVIDER_RESEARCH,FREEHOROSCOPEAPI_INQUIRY,FEATURE_SPEC,PRODUCT_RULES,DESIGN_SYSTEM}.md` |

### Final command results

- `npm run build`: PASS, Next.js 16.4.3 local production output includes `/whimsy/observatory` and all three astrology API routes; the GeoNames gzip file is in the place route's output trace. No deployment.
- `npm run lint`: PASS, zero warnings. `npx tsc --noEmit`: PASS.
- `npm test`: **392/392 PASS**, including **25/25 astrology tests** after the final zodiac text-glyph change. Calculation fixtures, forecast contract/cache/errors, route/deep-link/library/Insights/recap/store behavior and regression tests are included.
- `node scripts/test-local-astrology.mjs`: PASS against disposable local Supabase users. Verified auth, owner isolation/RLS, preference/profile/chart/journal CRUD, revision/idempotency retry, export, typed deletion, and populated account-deletion cascade. Disposable users were removed. The migration was applied **locally only** in the earlier implementation pass.
- `node scripts/test-observatory-ui.mjs` against local `next start`: PASS with authenticated disposable account and isolated Chrome profile, which were removed afterward. Verified all six destinations, profile edit/recalculation, sign/default distinction, immediate full library/chart detail, journal edits and calendar event save, keyboard Enter/Escape/focus, real mobile tap detail/close, Daily Edit shared preference, Quiet/reduced motion. **540** panel/theme/material/viewport layout checks (six sections × nine registered themes × two materials × five widths) had no horizontal overflow; chart-glyph contrast minimum **10.58:1** across theme/material combinations.
- Existing Whimsy header layout fixture: **648 PASS** in both source and production modes. Existing Fortunes UI fixture: **54 layout + 270 contrast PASS** in both modes; minimum contrast **5.00:1**. These are focused checks for the already working five Whimsy experiences, not a claim of manual cross-browser coverage.
- Visual inspection of generated desktop chart and 390px mobile full-detail screenshots: header remains vertically stacked; chart glyphs render as text; mobile detail scrolls, reads and closes by touch.

### Subsequent Whimsy and Observatory UI polish (local, uncommitted)

The Observatory now has five content tabs with Horoscopes first; My Cosmic Profile opens from the header with separate My Stars, Forecast Preferences, birth details, Appearance and Privacy sections. A device-local density control affects Observatory card spacing. The compact sign selector keeps temporary browsing distinct from the account default. Library entries show their full content and source links immediately. The wheel opens planets, signs, houses and aspects by keyboard or pointer; houses list real resident planets, and aspects expose a type filter, symbol, calculated separation/orb and uncertainty.

The Tarot Reading Table and journal, Dream Diary/Decoder/Atlas, Fortunes collection and Bookshelf received the targeted visual and interaction pass recorded in `FEATURE_SPEC.md`. No provider was activated. The latest local verification passed lint, TypeScript, 393/393 tests, production build, 450 Observatory theme/material/viewport layouts across five sections, 648 Whimsy layout fixtures, and 54 Fortunes layouts plus 270 contrast checks. An authenticated disposable browser account also saved a dream, updated its Decoder reflection, moved a book to Want to Read and selected it back onto the Reading Desk. Earlier six-section/540-layout results above describe the prior navigation state, not the current five-tab interface. The disposable account was deleted after testing.

### Library, Calendar and chart follow-up — November 2, 2026

The Library now opens on Explore: seven themed collections, curated links to existing full entries, and recently viewed entries drawn only from recorded activity. All Entries retains full-text search, category filtering, sorting and density. The Calendar presents the same calculated phases and seasons in a month grid and timeline, with a current featured event, a detail view separating astronomical fact from traditional symbolism, related Library links and a direct Cosmic Journal reflection. A server-rendering guard handles the initial unresolved local date; no event dates were invented. Selecting a zodiac sign on the existing SVG wheel now synchronizes its highlight with the corresponding calculated placement rows. The local calculation engine, chart positions and saved data model were not changed.

The focused, research-only [free forecast evaluation](ASTROLOGY_FREE_FORECAST_EVALUATION.md) ranks CosmyDay first for the observed long, distinct daily/weekly/monthly all-sign feeds and FreeHoroscopeAPI second due mixed/stale content dates. These are **candidates, not selections**. The audit did not establish long-term rollover/reliability, private saved-content and offline rights, or a complete life-area matrix. No provider adapter, subscription, hosted migration, external birth-data transmission or deployment followed.

Final verification for this follow-up: `npm run lint` and `npx tsc --noEmit` passed; `npm test` passed **394/394** including the initial-date server-render guard. Authenticated local Chrome passed profile recalculation, chart/list selection, Library collection/search/detail, Calendar month/timeline/event-journal flow, Dream reflection, Bookshelf status, Daily Edit shared preference and **450** section/theme/material/viewport layout checks (320, 390, 768, 1280, 1920px; nine themes; two materials). Chart glyph contrast minimum was **10.58:1**. Whimsy layout fixture passed **648** source layouts. Fortunes fixture passed **54** layouts and **270** contrast checks, minimum **5.00:1**, including hover, focus, disabled and keyboard controls. The final production build result is recorded in the completion response. The disposable browser account and isolated profile were removed.
