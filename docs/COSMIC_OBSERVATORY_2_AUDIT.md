# Cosmic Observatory 2.0 — issue #28 audit

Audited November 9, 2026 against the local source and [issue #28](https://github.com/sczapuchlak/Muse-app/issues/28). This is the issue's Phase 1 deliverable, not a claim that the full enhancement is implemented or released. The work is prepared on `feat/28-cosmic-observatory-2`; unrelated viewport edits were left untouched.

## Muse Cohesion Check

1. **Authoritative source:** The existing `astrology_birth_profiles` record owns the user's birth details and its derived `astrology_natal_charts` record. The Observatory owns any future comparison profile or chart result. The existing forecast service owns transient provider readings; it currently does not save source text.
2. **Related owners:** Account preferences own the default zodiac sign and forecast settings. `astrology_journal_entries` owns reflections. Planner owns events; Insights is a read-only projection. No new chart type should copy those records.
3. **Duplicates:** A saved personal chart must be referenced by id and revision, not copied into a comparison. The second person's birth details need an explicitly private, independently deletable record if saving is approved. A one-time comparison can remain unsaved.
4. **Optional relationships:** Synastry can use the user's chart or two entered profiles. A journal reflection may reference a chart result. Neither requires Planner, Insights, or a relationship category.
5. **Patterns:** Reuse the Observatory `?view=` navigation, `MuseModal`, `NatalWheel` geometry and text alternative, local Astronomy Engine, theme tokens, owner-scoped API/store, and account export/delete. New chart renderers may extend the wheel without changing natal calculations.
6. **Cycle:** Explore a chart or sky event → optionally reflect in Cosmic Journal → optional read-only Insights/recap. No automatic cross-module write.
7. **Now or later:** Natal, general horoscopes, the library, calendar and journal exist. This local pass adds temporary synastry, composite and selected-date transits. Progressions and solar returns remain outside issue scope. Historical forecast browsing requires a source and rights decision.

No new record owner was created. `INTEGRATION_MAP.md` now records the temporary chart and journal-reference relationship. Update it again before adding saved comparison profiles or chart references.

## Current architecture and evidence

| Layer | Verified implementation |
| --- | --- |
| Navigation | `components/astrology/CosmicObservatory.tsx` retains five URL-preserving sections: Horoscopes, Birth Chart, Astrology Library, Cosmic Calendar and Cosmic Journal. My Cosmic Profile is a modal. The user chose this approved structure; Charts & Calculations is inside Birth Chart. |
| Personal data | `CosmicProfileForm.tsx`, `AstrologyData.tsx`, `lib/astrology/store.ts`, `app/api/astrology/records/route.ts` and `20261102003100_cosmic_observatory.sql` handle one private birth profile, derived chart, journal and activity. Export includes astrology. There is no second-person profile model or saved comparison. |
| Calculations | `calculateNatal` uses local Astronomy Engine 2.1.19, tropical longitudes, Whole Sign houses, ten bodies, five major aspect types and uncertainty bounds. `chart-tools.ts` now calculates inter-chart aspects, shorter-arc composite midpoints and selected-date transit positions/aspects. Composite houses are omitted. |
| Charts | The existing natal wheel and detail remain. `ChartTools.tsx` adds a four-tool directory, temporary inputs, two-ring synastry/transit wheels, a single composite wheel, complete text positions/aspects and journal actions. All calculations require the authenticated Muse route and save no birth inputs. |
| Forecast | `app/api/astrology/forecast/route.ts` and `lib/astrology/forecast.ts` serve authenticated CosmyDay daily/weekly/monthly **overview** readings for the reader's current local period, with source link and at most 15 minutes of server memory cache. Daily Edit and Observatory share the service. Other categories and history are unsupported. |
| Learning and calendar | The library has 60 original draft entries, seven collections, search and direct detail. This issue adds a seven-step Astro 101 path, including synastry and composite explanations. `cosmicEvents` calculates lunar phases and seasons. There is no lesson completion or validated planetary event catalogue. |
| Reflections and Insights | Cosmic Journal saves owner-scoped linked reflections; Insights/recap derive counts from real records. The journal is an existing canonical owner, so new chart reflection actions should link there. |
| Verification | The full suite passed 855/855 on November 9, including the new chart and snapshot tests. TypeScript, focused lint and `next build` passed with the chart route. Local authenticated browser and hosted migration behavior remain unverified in this pass. The earlier UI/database evidence is recorded in `COSMIC_OBSERVATORY_IMPLEMENTATION.md`. |

## Requirement audit matrix

`COMPLETE` means implemented in local source and supported by current tests or directly inspected behavior. `PARTIAL` means an existing feature needs the stated improvement. `MISSING` means no implementation was found. `BLOCKED` means an external source or an explicit product/architecture decision is needed.

| Issue requirement | Status | Verified gap and recommended action |
| --- | --- | --- |
| Four logical destinations | **DEFERRED BY USER DECISION** | User chose the approved five-section structure and profile modal. All existing deep links remain. The four concepts are organized within those sections; criterion 1 as literally written is deferred. |
| My Cosmic Profile birth data, Big Three and wheel | **PARTIAL** | Private birth data, Big Three and chart exist, but profile is a modal and chart detail is a separate section. Add a clearer overview only after the navigation decision. |
| Planets, houses, aspects, angles, retrogrades | **PARTIAL** | Ten positions, Whole Sign houses, all four angles, major aspects, retrograde flags, approximate natal lunar phase and element/modality distributions are now visible. Nodes, Chiron, Lilith, asteroids and patterns need separate calculation/reference validation. |
| Layered personalized interpretation | **PARTIAL** | Placement detail combines body, sign, house and its actual calculated aspects with links to full reference entries. A complete personalized chart reading remains absent. Keep calculation and interpretation separate. |
| Daily/weekly/monthly horoscopes | **COMPLETE** | Current-period overview readings are shared with Daily Edit and source attributed. Current provider coverage is overview only. |
| Historical forecasts and category cards | **BLOCKED** | Route rejects dates outside the reader's current local date; source text is not durably saved. CosmyDay has no verified category-specific readings or approved historical/private snapshot rights. Do not generate headings with repeated generic text. |
| Natal chart tool for an unsaved person | **COMPLETE LOCALLY** | Temporary calculation is available through the authenticated chart route; it does not overwrite the user's chart. |
| Synastry, neutral relationship contexts | **PARTIAL** | Two-person inputs, inter-chart aspects, dual-ring view, optional neutral contexts and aspect-grounded reflective themes exist. Saved comparison profiles and deeper individualized interpretations remain absent. |
| Composite chart | **PARTIAL** | Shorter-arc planetary and angle midpoints, a midpoint wheel and calculated aspects exist. Exact oppositions are omitted; houses are deliberately omitted pending method validation. |
| Selected-date transit chart | **PARTIAL** | Selected instant, calculated transit placements, dual-ring overlay and natal-to-transit aspects exist. Predictive timing and personalized forecast prose are not generated. |
| Explore & Learn reference | **PARTIAL** | Searchable library and related links exist. Seven short Astro 101 steps have diagrams and direct links to existing entries, including two new draft comparison concepts. Lesson completion is not stored. |
| Celestial calendar | **PARTIAL** | Calculated lunar phases and equinoxes/solstices have local dates, factual/interpretive detail and journal links. Other event types need independent date validation; no invented stations or ingresses. |
| Interactive, accessible visual detail | **PARTIAL** | Natal wheel and comparison/transit/composite graphics have complete text alternatives. Manual screen-reader and cross-device browser verification remain. |
| Cosmic Journal, Daily Edit, Insights links | **PARTIAL** | Chart results can start a private journal reflection through a library-concept reference. Daily Edit retains the shared current forecast. Other widgets and lesson-completion metrics remain future work. |
| Privacy, export and release | **PARTIAL** | Existing natal/journal RLS, export and delete paths exist. New second-person data needs its own owner-scoped lifecycle, explicit deletion, export and hosted migration review. No hosted migration or deployment is authorized by this audit. |

## Acceptance criteria disposition

This records the issue's 28 criteria as of the audit; none is marked completed by this issue yet.

| Criteria | Audit disposition |
| --- | --- |
| 1–3 Navigation, preserved data, natal authority | **1 EXPLICITLY DEFERRED** by the user's five-section decision; **2–3 PARTIAL** pending full regression and hosted checks. |
| 4–6 Forecast organization, categories, reading access | **4–5 PARTIAL/BLOCKED** by provider coverage and historical rights; **6 COMPLETE** for current full readings. |
| 7–10 Layered readings, calculated data, wheel, details | **7 PARTIAL** with placement-specific aspects; **8 COMPLETE** for currently displayed data; **9–10 COMPLETE** for existing natal interactions, with mobile/assistive-tech limits in prior QA. |
| 11–14 Chart directory, synastry, composite, transit | **11 COMPLETE LOCALLY** inside Birth Chart; **12–14 PARTIAL** with real calculations and visuals, while saved profiles and deeper interpretation remain. |
| 15–16 Learning and Astro 101 | **15–16 PARTIAL**; seven lessons now cover natal fundamentals, transits, synastry and composite charts. |
| 17–20 Calendar, visuals, hierarchy, depth | **17 PARTIAL** (verified phases/seasons only); **18–20 PARTIAL** across the existing natal/library/calendar views. |
| 21–22 Unknown times and no fabricated data | **COMPLETE** on existing natal/forecast/calendar paths; new chart types must meet the same standard. |
| 23–24 Shared design and accessibility | **23 COMPLETE** for current views; **24 PARTIAL** pending comparison graphics and manual assistive-tech checks. |
| 25–26 Journal/Insights reuse and private data | **PARTIAL** for planned chart types; existing records are owner scoped and exported. |
| 27–28 Desktop/mobile and release controls | **27 PARTIAL** pending new views; **28 COMPLETE** as a process boundary: no production operation was performed. |

## Recommended build order and decisions

1. The user chose the **approved five-section navigation**. Keep that decision and all existing `?view=` links.
2. Review the temporary chart experiences in a browser and validate composite and cross-chart cases against independent references. Add saved second-person profiles only after an explicit private lifecycle design, RLS, export and deletion.
3. Deepen synastry and composite interpretation only where it can be traced to actual aspects or midpoints; avoid fabricated scores or generic claims.
4. Historical/category horoscopes stay unavailable until a provider actually supports them and rights are approved.

Any significant navigation/data-model change needs a reviewable design decision under issue #28. Production database migration and deployment remain separate approvals under `DATABASE_RELEASES.md`.

## Work completed in this pass

Astro 101 now appears in the existing Library Explore view as seven short, optional lessons. Each has a small explanatory diagram and opens a complete library entry directly. Two new comparison-concept entries are editorial drafts. Charts & Calculations is an expandable area inside Birth Chart with temporary natal, synastry, composite and transit experiences. It creates no saved progress, analytics event, second birth-profile record or schema. The chosen five-section navigation remains intact.

The existing natal chart now has a compact derived snapshot (approximate lunar phase, element/modality counts, four angles and retrograde bodies). Placement detail lists its actual calculated aspects. The full local test suite passed 855/855; TypeScript, focused lint and `next build` passed. The full lint pass had no errors and one unrelated existing warning. Authenticated local browser QA was not run because the local Docker API was unavailable to the sandbox; manual mobile and assistive-technology checks remain.
