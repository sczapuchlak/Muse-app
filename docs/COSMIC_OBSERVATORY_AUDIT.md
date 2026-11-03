# The Cosmic Observatory — audit and milestone record

Audit completed November 2, 2026. This document records inspected source and proposed work, not an implemented Observatory or a deployment approval.

## Existing systems to extend

| Concern | Existing authority | Findings and integration direction |
| --- | --- | --- |
| Zodiac identity | `lib/cosmic-forecast.ts` | All twelve lowercase sign IDs already exist. Reuse and re-export them; do not introduce a second sign registry. |
| Forecast content | `lib/cosmic-forecast.ts`, `components/CosmicForecast.tsx` | A provider contract, unavailable implementation, and small date/sign memory cache exist. There is no live API, server endpoint, expiry, in-flight deduplication, weekly/monthly/category support, or persistent cache. Extend this boundary with one normalized service. |
| Preferences | `profiles.cosmic_enabled`, `profiles.zodiac_sign`, `lib/data/account.ts`, `AccountPreferences`, `useCosmicPreferences` | Authenticated profile data is canonical. Settings and Daily Edit already share it. Browser-local compatibility utilities are not an active authority. Extend existing preference commands for category/period rather than creating duplicate zodiac settings. |
| Daily Edit | `components/DailyEdit.tsx`, `CosmicForecast.css` | Exactly one Forecast is rendered, first in the current left working stack. Some older documents describe full-width placement; the later approved independent-stack layout and current source differ from that historical text. Preserve the current DOM position and geometry during service integration; do not move it based on obsolete prose. |
| Whimsy navigation | `components/whimsy/WhimsyFoundation.tsx`, `lib/whimsy/models.ts` | Five fixed destinations share one registry and the experience header. Add the sixth fixed route using those conventions. Do not create a sidebar module. The widget registry is separate from the destination registry: astrology should reuse the existing Forecast instead of creating another widget. |
| Private persistence | `lib/whimsy/persistence.ts`, feature-specific migrations | Authenticated Supabase/RLS, revisions, stable retry command IDs, acknowledged readback, and cross-tab refresh are established. Add feature-specific profile/chart/journal/activity storage without changing existing records. No birth profile, natal chart, astrology journal, or horoscope cache currently exists. |
| Insights | `components/insights/useInsightsSources.ts`, `lib/insights/metrics.ts`, `lib/whimsy/integrations.ts` | Whimsy metrics already flow through canonical normalized Insights sources. Extend them with actual astrology records and readiness. No independent analytics store or speculative Mood correlation is needed. |
| Recap | `lib/whimsy/connected.ts:readWhimsyRecap` | A range-based deterministic projection exists; there is no weekly/monthly recap generator to duplicate. Extend the source contract and retain local-date boundaries and source IDs. |
| Export / deletion | `app/api/account/export/route.ts`, owner foreign keys and authenticated deletion | New private records must join export and owner deletion. Birth-profile deletion must remove dependent chart data without deleting independently authored reflections. |
| Dates / controls / themes | `lib/dates.ts`, existing date conversion helpers, Muse controls, `lib/themes.ts` | Reuse civil-date arithmetic, native modal lifecycle, semantic material/color tokens, official Muse stars, and the actual theme registry. Validate ambiguous/nonexistent local birth times rather than choosing offsets silently. |

No duplicate astrology engine or existing library was found. Dormant constellation/profile decoration is not a calculation service. No private account, birth information, or hosted database was read during this audit.

## New request versus earlier planning

The current explicit request approves a sixth Whimsy experience, optional birth details, explicit horoscope saves/journals, and minimal astrology activity. It supersedes the earlier roadmap's exploratory-only astrology and no-history-by-default planning for these specific features. It does not approve subscriptions, transmitting birth details, hosted migrations, deployment, automatic reuse of unrelated personal data, or generic tracking of private birth fields.

Browsing another sign is temporary selection, while an explicit default-sign action updates the existing account preference. Horoscope content, astronomical calculation, educational interpretation, and private user records remain separate authorities. Provider coverage must be represented per period/category, not as an invented Cartesian product.

## Reviewable milestones

| Milestone | Deliverable and validation gate | Current status |
| --- | --- | --- |
| 1. Audit | Existing authorities, integration points, conflicts, and migration boundaries | Complete, source inspection |
| 2. Provider research | Linked capability/cost/license comparison and actual-response checks | Reopened for no-subscription coverage; public FreeHoroscopeAPI 36-case pass completed structurally, stale weekly content and rights/operations blockers remain. Horoscopes are required. See `ASTROLOGY_PROVIDER_RESEARCH.md`; no provider selected. |
| 3. Shared forecasts | Normalized provider/capability/cache service, expiry, deduplication, typed failures; deterministic tests | Next independent implementation milestone; adapter activation awaits provider decision/credentials. |
| 4–5. Observatory / Forecast | Sixth destination and real supported forecast browsing, deliberate default preference, shared source | Not implemented |
| 6. Cosmic Profile | Local migration/RLS, optional birth fields, edit/delete/export, preferences | Not implemented |
| 7. Natal chart | Validated positions, angles, chosen houses, aspects, uncertainty, accessible SVG/text | Not implemented; recommended engine still subject to the documented decision |
| 8. Library | Original structured entries: 12 signs, 10 bodies, 12 houses, 4 elements, 3 modalities, 5 aspects, 12 additional concepts | Not implemented; target 58 foundational entries, not a claim of existing content |
| 9. Cosmic Calendar | Verified calculated phases/seasons and supported later events, with basis/timezone | Not implemented |
| 10. Cosmic Journal | Private reflections and license-permitted links/snapshots; acknowledged saves and deletion | Not implemented |
| 11. Daily Edit | Same forecast request/cache/preferences, existing placement, link and truthful states | Existing preview preserved; integration not implemented |
| 12–13. Insights / recap | Source-derived counts, idempotent activity identities, no causal Mood claims | Existing contracts audited; astrology not implemented |
| 14. QA | Reference cases, DST/uncertainty/RLS/export tests, dynamic theme/material and five viewport checks, full regressions/build | Not run for new feature; no accuracy or production-readiness claim |

Each milestone must pass its own meaningful checks before its status changes. A successful astronomical function call is not reference validation. A provider marketing page is not an authenticated integration test. No sample provider output may count as a live forecast.

## Intended calculation and privacy approach (recommendation)

Use local/server-side astronomical calculations, tropical longitudes of date, and an explicitly labeled Whole Sign house adapter. Calculate Ascendant and Midheaven independently; Midheaven is not automatically the tenth Whole Sign cusp. Reject undefined geometry and report time/location uncertainty. Validate against independent published/reference ephemerides and angle/house cases before exposing the natal feature.

Use a self-hosted GeoNames place dataset with attribution and IANA timezone identifiers. Search must return disambiguated places for user confirmation, with explicit coordinates/timezone correction when a place is missing or historical zone assignment is uncertain. The dataset is not a guarantee of pre-1970 civil-time accuracy. Do not send birth dates, times, places, coordinates, or journal text to a horoscope content vendor.

## Deployment boundary

This request authorizes local implementation and local validation. Hosted schema application and any deployment require a separate explicit approval. Provider payment/renewing trials and external birth-data transmission require the specific approval described in the request. Do not place API keys in chat, client bundles, logs, or committed files.

## Continuation result

The milestone table above captures the **preimplementation audit**, not the present status. The protected sixth destination, six connected sections, local calculation/profile/chart/library/calendar/journal, shared unavailable forecast contract, Daily Edit link, Insights/recap projections and local QA are now implemented. The actual completion states, test evidence, file inventory and provider blockers are maintained in [COSMIC_OBSERVATORY_IMPLEMENTATION](COSMIC_OBSERVATORY_IMPLEMENTATION.md). No hosted migration or deployment occurred. Live horoscope integration remains required and blocked pending the documented provider decision.
