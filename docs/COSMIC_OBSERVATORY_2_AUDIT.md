# Cosmic Observatory 2.0 — issue #28 audit

Audited November 9, 2026 against the local source and [issue #28](https://github.com/sczapuchlak/Muse-app/issues/28). This audit tracks the issue against local implementation and the remaining external gates; it is not a claim that the full enhancement is released. The work is prepared on `feat/28-cosmic-observatory-2`; unrelated viewport edits were left untouched.

## Muse Cohesion Check

1. **Authoritative source:** The existing `astrology_birth_profiles` record owns the user's birth details and its derived `astrology_natal_charts` record. The Observatory owns optional named comparison birth profiles; chart results remain temporary. The existing forecast service owns transient provider readings; it currently does not save source text.
2. **Related owners:** Account preferences own the default zodiac sign and forecast settings. `astrology_journal_entries` owns reflections. Planner owns events; Insights is a read-only projection. No new chart type should copy those records.
3. **Duplicates:** A saved personal chart must be referenced by id and revision, not copied into a comparison. The second person's optional saved details live in an independently deletable, owner-only record. A one-time comparison can remain unsaved.
4. **Optional relationships:** Synastry can use the user's chart or two entered profiles. A journal reflection may reference a chart result. Neither requires Planner, Insights, or a relationship category.
5. **Patterns:** Reuse the Observatory `?view=` navigation, `MuseModal`, `NatalWheel` geometry and text alternative, local Astronomy Engine, theme tokens, owner-scoped API/store, and account export/delete. New chart renderers may extend the wheel without changing natal calculations.
6. **Cycle:** Explore a chart or sky event → optionally reflect in Cosmic Journal → optional read-only Insights/recap. No automatic cross-module write.
7. **Now or later:** Natal, general horoscopes, the library, calendar and journal exist. This local pass adds temporary synastry, composite and selected-date transits. Progressions and solar returns remain outside issue scope. Historical forecast browsing requires a source and rights decision.

`INTEGRATION_MAP.md` now records the comparison-profile owner, temporary chart results and journal-reference relationship. A saved chart result would need another ownership and snapshot review.

## Current architecture and evidence

| Layer | Verified implementation |
| --- | --- |
| Navigation | `components/astrology/CosmicObservatory.tsx` retains five URL-preserving sections: Horoscopes, Birth Chart, Astrology Library, Cosmic Calendar and Cosmic Journal. My Cosmic Profile is a modal. The user chose this approved structure; Charts & Calculations is inside Birth Chart. |
| Personal data | `CosmicProfileForm.tsx`, `AstrologyData.tsx`, `lib/astrology/store.ts`, `app/api/astrology/records/route.ts` and `20261102003100_cosmic_observatory.sql` handle one private birth profile, derived chart, journal and activity. Export includes astrology. `astrology_comparison_profiles` supports private named comparison birth details, with a staged migration, export and explicit deletion. |
| Calculations | `calculateNatal` uses local Astronomy Engine 2.1.19, tropical longitudes, Whole Sign houses, ten bodies, five major aspect types and uncertainty bounds. `chart-tools.ts` now calculates inter-chart aspects, shorter-arc composite midpoints and selected-date transit positions/aspects. Composite houses are omitted. |
| Charts | The existing natal wheel and detail remain. `ChartTools.tsx` adds a four-tool directory, two-ring synastry/transit wheels, a single composite wheel, linked position/aspect detail and journal actions. Calculations require the authenticated Muse route and save no chart result; optional named comparison birth inputs can be saved separately. |
| Forecast | `app/api/astrology/forecast/route.ts` and `lib/astrology/forecast.ts` serve authenticated CosmyDay daily/weekly/monthly **overview** readings for the reader's current local period, with source link and at most 15 minutes of server memory cache. Daily Edit and Observatory share the service. Other categories and history are unsupported. |
| Learning and calendar | The library has 60 original draft entries, seven collections, search and direct detail. This issue adds a seven-step Astro 101 path, including synastry and composite explanations. `cosmicEvents` calculates lunar phases and seasons. There is no lesson completion or validated planetary event catalogue. |
| Reflections and Insights | Cosmic Journal saves owner-scoped linked reflections; Insights/recap derive counts from real records. The journal is an existing canonical owner, so new chart reflection actions should link there. |
| Verification | The full suite passed 855/855 on November 9. TypeScript, focused lint and `next build` passed. Local comparison-table CRUD, RLS owner isolation, revision conflict, deletion and account cascade passed with disposable accounts. A current authenticated local Chrome journey now covers save, edit, reuse, all four chart tools, aspect detail, export, deletion and phone width. The comparison schema was applied to staging and verified by read-only schema dump. Manual screen-reader review and hosted app behavior remain release checks. |

## Requirement audit matrix

`COMPLETE` means implemented in local source and supported by current tests or directly inspected behavior. `PARTIAL` means an existing feature needs the stated improvement. `MISSING` means no implementation was found. `BLOCKED` means an external source or an explicit product/architecture decision is needed.

| Issue requirement | Status | Verified gap and recommended action |
| --- | --- | --- |
| Four logical destinations | **DEFERRED BY USER DECISION** | User chose the approved five-section structure and profile modal. All existing deep links remain. The four concepts are organized within those sections; criterion 1 as literally written is deferred. |
| My Cosmic Profile birth data, Big Three and wheel | **COMPLETE FOR APPROVED STRUCTURE** | Private birth data, Big Three, snapshot and interactive chart exist. The profile remains a modal and Birth Chart remains a section by the user’s explicit navigation decision. |
| Planets, houses, aspects, angles, retrogrades | **COMPLETE FOR SUPPORTED CALCULATIONS** | Ten positions, Whole Sign houses, four angles, major aspects, retrograde flags, approximate natal lunar phase and element/modality distributions are visible. Additional points and chart patterns are omitted until a validated calculation method exists, as the issue requires. |
| Layered personalized interpretation | **COMPLETE FOR APPROVED SCOPE** | Placement detail layers calculated body/sign/house/aspect context with full reference entries. The overview, wheel, placements, houses and aspects remain separate paths to depth rather than duplicating the entire reading in one report. |
| Daily/weekly/monthly horoscopes | **COMPLETE** | Current-period overview readings are shared with Daily Edit and source attributed. Current provider coverage is overview only. |
| Historical forecasts and category cards | **EXPLICIT PROVIDER DEFERRAL** | The current source offers current-period overview text only. Historical text and topic-specific cards stay unavailable because their data and reuse rights are unverified. The issue explicitly limits categories/history to what is genuinely available. |
| Natal chart tool for an unsaved person | **COMPLETE LOCALLY** | Temporary calculation is available through the authenticated chart route; it does not overwrite the user's chart. |
| Synastry, neutral relationship contexts | **COMPLETE FOR APPROVED SCOPE** | Two-person inputs, actual inter-chart aspects, dual-ring view, optional neutral contexts, aspect-grounded themes and linked traditional interpretation exist. Named comparison birth profiles can be saved, edited, reused and deleted privately. No compatibility score or generic psychological claim is generated. |
| Composite chart | **COMPLETE FOR DOCUMENTED METHOD** | Shorter-arc planetary/angle midpoints, midpoint wheel and calculated aspects exist. Exact oppositions and houses are honestly omitted where the method is undefined or unvalidated. |
| Selected-date transit chart | **COMPLETE FOR APPROVED SCOPE** | Selected instant, calculated transit placements, dual-ring overlay, natal-to-transit aspects and linked traditional meanings exist. Predictive timing and invented forecast prose are intentionally absent. |
| Explore & Learn reference | **COMPLETE FOR APPROVED SCOPE** | Searchable library, related links and seven short Astro 101 steps with diagrams and direct reference links exist. Lesson completion is a later analytics idea, not a prerequisite for learning. |
| Celestial calendar | **COMPLETE FOR VERIFIED SOURCES** | Calculated lunar phases and equinoxes/solstices have local dates, factual/interpretive detail and journal links. Unvalidated stations or ingresses are omitted as required by the issue. |
| Interactive, accessible visual detail | **COMPLETE LOCALLY, MANUAL QA REMAINS** | Natal and other chart graphics have complete text alternatives. Local Chrome verified aspect detail, keyboard Escape and phone width. Manual screen-reader and physical-device review remain release checks. |
| Cosmic Journal, Daily Edit, Insights links | **COMPLETE FOR CURRENT INTEGRATIONS** | Chart results can start a private journal reflection through a library-concept reference; Daily Edit retains the shared current forecast; Insights reads real owner records. Optional widgets and lesson-completion metrics remain later-phase ideas. |
| Privacy, export and release | **PARTIAL RELEASE** | Existing natal/journal RLS, export and delete paths exist. The comparison table has owner-only policies, explicit deletion, export inclusion and tested local account cascade. The sole pending migration was applied to staging and its table, constraints, owner policies and grants verified. Production migration and deployment remain separate approvals. |

## Acceptance criteria disposition

This records the issue's 28 criteria as of the audit; none is marked completed by this issue yet.

| Criteria | Audit disposition |
| --- | --- |
| 1–3 Navigation, preserved data, natal authority | **1 EXPLICITLY DEFERRED** by the user's five-section decision; **2–3 COMPLETE** in the current architecture, with production release checks separate. |
| 4–6 Forecast organization, categories, reading access | **4–6 COMPLETE FOR AVAILABLE PROVIDER DATA**; history and topic cards are explicitly deferred until a verified source and rights exist. |
| 7–10 Layered readings, calculated data, wheel, details | **COMPLETE FOR SUPPORTED CALCULATIONS**; placement layers, wheel, aspects and contextual detail are present. Manual screen-reader/device review remains a release check. |
| 11–14 Chart directory, synastry, composite, transit | **COMPLETE FOR APPROVED SCOPE** with real calculations, visual and text alternatives, reusable private comparison inputs, documented composite method and selected-date transit geometry. All four tools passed the authenticated local browser journey. |
| 15–16 Learning and Astro 101 | **COMPLETE**; seven optional lessons cover natal fundamentals, transits, synastry and composite charts. |
| 17–20 Calendar, visuals, hierarchy, depth | **COMPLETE FOR VERIFIED DATA**; phases/seasons, chart geometry and progressive detail are presented without inventing events or unsupported interpretations. |
| 21–22 Unknown times and no fabricated data | **COMPLETE** across natal, comparison, transit, forecast and calendar paths; uncertain birth times suppress exact claims. |
| 23–24 Shared design and accessibility | **23 COMPLETE** for current views; **24 COMPLETE IN LOCAL BROWSER** with text alternatives and keyboard detail. Manual assistive-technology review remains a release check. |
| 25–26 Journal/Insights reuse and private data | **25 COMPLETE FOR CURRENT INTEGRATIONS**; optional later metrics remain exploratory. **26 COMPLETE** for comparison inputs: local owner isolation, export, deletion and account cascade passed; staging schema is verified. |
| 27–28 Desktop/mobile and release controls | **27 COMPLETE IN LOCAL CHROME** at desktop and phone widths, with a remaining manual device/screen-reader audit. **28 COMPLETE** as a process boundary: staging only, no production operation was performed. |

## Recommended build order and decisions

1. The user chose the **approved five-section navigation**. Keep that decision and all existing `?view=` links.
2. The temporary chart experiences passed a local authenticated browser journey and calculation tests. The comparison-profile lifecycle, RLS, export and deletion passed local database and browser tests; the migration schema was verified on staging. Review the staging app and perform a manual screen-reader/device pass before production release.
3. Deepen synastry and composite interpretation only where it can be traced to actual aspects or midpoints; avoid fabricated scores or generic claims.
4. Historical/category horoscopes stay unavailable until a provider actually supports them and rights are approved.

Any significant navigation/data-model change needs a reviewable design decision under issue #28. Production database migration and deployment remain separate approvals under `DATABASE_RELEASES.md`.

## Work completed in this pass

Astro 101 now appears in the existing Library Explore view as seven short, optional lessons. Each has a small explanatory diagram and opens a complete library entry directly. Two new comparison-concept entries are editorial drafts. Charts & Calculations is an expandable area inside Birth Chart with temporary natal, synastry, composite and transit experiences. The initial pass created no saved progress or chart results; the follow-up adds the optional comparison birth-profile record described below. The chosen five-section navigation remains intact.

The existing natal chart now has a compact derived snapshot (approximate lunar phase, element/modality counts, four angles and retrograde bodies). Placement detail lists its actual calculated aspects. The full local test suite passed 855/855; TypeScript, focused lint and `next build` passed. The later completion pass below adds authenticated browser and staging-schema verification. Manual device and assistive-technology review remains a release check.

## Follow-up after review

The merged implementation includes an owner-only comparison-profile table, authenticated CRUD route, reusable named birth details for either synastry/composite person, explicit deletion, personal export, and local privacy/cascade tests. The profile is an input record; no chart result or journal copy is stored. Chart-tool position lists open calculated context with the full planetary reference entry. The local migration was applied and its owner isolation, revision, deletion and cascade paths passed. The local database already contained an unrelated `20261204000100` migration version, so this file uses `20261204000200`; the local CLI refused the missing version and the new file was applied with its history row in one local transaction.

Remaining issue limits are real: the current forecast provider supplies only current-period overview readings, so historical text and topic-specific readings cannot be shown honestly; the approved five-section navigation supersedes criterion 1; composite houses and additional points need independent method validation. The optional Daily Edit moon/event widgets and lesson completion tracking are later-phase ideas in the issue, not present behavior.

## Completion pass after merge

`scripts/test-observatory-chart-tools-ui.mjs` uses a disposable local account and isolated Chrome against the built app. It verified named comparison-profile create, edit, reuse for either person, calculated synastry and aspect detail, composite, selected-date transit and separate natal charts, personal export, explicit deletion and no horizontal overflow at phone width. The browser test ran with no runtime exceptions. The original Observatory UI script predates current onboarding and navigation; it was not used as evidence for this pass.

Staging's dry run listed only `20261204000200_astrology_comparison_profiles.sql`, which was applied. A read-only public schema dump confirmed the table, primary key, name/payload/revision constraints, user cascade, index, enabled RLS, all four owner policies and authenticated grants. Production was untouched. Comparison profiles may now be renamed or updated in the UI, with revision checks that keep a stale edit from overwriting a newer record.
