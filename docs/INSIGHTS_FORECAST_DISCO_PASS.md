# Insights, Forecast hero and Disco Damage pass

Implemented in the existing local Muse prototype. No commit, push, backend, tracking endpoint or live horoscope/Health integration.

## Result

- Cosmic Forecast appears once in the Daily Edit hero, immediately below the right-side week strip. Greeting/date top alignment, personalized copy, rotating mantra, official stars and dashboard widgets remain. Compact sizing is content-driven; mobile stacks and coarse-pointer actions retain touch targets. Existing loading/unavailable/preview/preferences/expand behavior is reused.
- Disco Damage alone gains a recognizable spherical mirrored chrome/holographic ball: one 69,234-byte transparent local SVG with 780 projected, individually shaded facets and spectral highlights. Measured masks reserve header copy/context regions. Irregular reflected fragments and layered glows continue through the scrollable document. Cobalt/lime strengthen its reflection roles; brighter art sits behind readable translucent glass. Other eight theme token blocks were preserved from the start of this pass.
- Insights replaces the placeholder with Overview, Plans & Rituals, Mood & Energy, Money and Nourish. All use the shared header, mantra, official three-star identity, section navigation, materials and semantic chart palette.

## Files created in this pass

Atmosphere/source registration:
- `components/DiscoAtmosphere.tsx`
- `components/DiscoAtmosphere.css`
- `public/atmosphere/disco-ball.svg`
- `lib/daily-session-seed.ts`

Pure analytics:
- `lib/insights/ranges.ts`
- `lib/insights/normalize.ts`
- `lib/insights/plans.ts`
- `lib/insights/feelings.ts`
- `lib/insights/life.ts`
- `lib/insights/metrics.ts`
- `lib/insights/relationships.ts`
- `lib/insights/revelations.ts`

Insights presentation:
- `components/insights/Insights.tsx`
- `components/insights/Insights.css`
- `components/insights/useInsightsSources.ts`
- `components/insights/useInsightAnalysis.ts`
- `components/insights/RangeControls.tsx`
- `components/insights/InsightPanel.tsx`
- `components/insights/InsightChart.tsx`
- `components/insights/ChartCanvas.tsx`
- `components/insights/Overview.tsx`
- `components/insights/PlansInsights.tsx`
- `components/insights/RitualHeatmap.tsx`
- `components/insights/MoodInsights.tsx`
- `components/insights/MoneyInsights.tsx`
- `components/insights/NourishInsights.tsx`
- `components/insights/PeriodComparison.tsx`
- `components/insights/DateInspection.tsx`

Validation/report:
- `tests/insights.test.mjs`
- `docs/INSIGHTS_FORECAST_DISCO_PASS.md`

## Existing files materially changed in this pass

- `app/insights/page.tsx`: fixed Insights route with the appropriate Suspense boundary for section URL state.
- `components/MuseHeader.tsx`, `components/MuseHeader.css`: Forecast placement and content-driven hero spacing.
- `components/CosmicForecast.tsx`, `components/CosmicForecast.css`: reusable compact variant; provider contract unchanged.
- `components/DailyEdit.tsx`: removes the old dashboard Forecast instance.
- `components/MuseAtmosphere.tsx`: Disco-only art/reflection composition in the shared atmosphere.
- `app/themes.css`: only the Disco block changes this pass (cobalt/lime reflection roles and readable glass opacity).
- `app/materials.css`: Insights panels join the existing Crystal/Frosted material selectors.
- `components/AppShell.tsx`, `components/MuseSession.tsx`, `components/rituals/Rituals.tsx`: expose existing canonical records, register the existing one-day movement/water fixture once, and mount the same Ritual source above routes. No second domain store.
- `lib/models.ts`, `lib/planner.ts`: optional actual completion timestamp, captured on completion and cleared on undo; moving preserves it.
- `lib/water.ts`, `components/WaterCard.tsx`: selected-day goal/unit snapshots for recorded quantities. A config-only edit on an unlogged day creates no intake record and leaves other days unchanged.
- `lib/mantras.ts`: approved Insights fallback in its centralized rotating collection.
- `package.json`, `package-lock.json`: Recharts 3.10.1; no UI framework or animation dependency.
- `docs/PRODUCT_RULES.md`, `docs/DESIGN_SYSTEM.md`, `docs/FEATURE_SPEC.md`: approved scope, evidence/denominator rules, Forecast placement, Disco art exception, metrics, source limits and future work.

The tree already contained substantial uncommitted work from earlier Muse passes. Those changes were preserved; the inventory above describes this pass, not every file in `git status`.

## Data and interaction decisions

Ranges are inclusive calendar periods anchored to the selected date, with 7/30/90 days, year-to-date and custom up to two years. Previous comparison is the immediately preceding equal-length range. Local-date logs never shift through UTC; actual timestamps use the mock profile timezone. Missing and zero are distinct, and no percentage is invented from a missing/zero baseline.

Planner completion-rate snapshot is completed / currently planned in range; actual completion trends use timestamps. Legacy completions remain undated. Timer totals are cumulative saved task snapshots scoped by planned date, not fabricated daily sessions. Estimates and actuals stay independent. Ritual states retain recurrence, missing coverage, explicit missed outcomes and weekly-target semantics. Confirmed streaks reuse the canonical recurrence rules, disclose their cutoff and may start before the chosen range.

Mood ratings remain independent optional signals, with multiple emotions and exploratory influences. Weekday means require three distinct rated dates. Descriptive Pearson relationships require ten paired varying dates; intention-group comparison requires five explicitly recorded dates in each group. No causal/clinical/sleep claim. Unknown movement is never classified as no movement.

Money charts use recorded transactions only, including split-category amounts. Payments and expectations are separate. Paycheck allocation/actual snapshots are explicitly whole-plan/current, while transaction trends use the selected range. Savings is an explicitly selected existing allocation group, never guessed from a name. Recurring figures are current-schedule expectations, not historical actual charges.

Nourish measures plans, not consumption. Nutrition summarizes the subset with all four known values and discloses per-field coverage for the rest. No estimated values from meal names, nutrition targets or dietary judgment.

Revelations are deterministic typed observations with range, evidence basis, sample size, underlying IDs and owner link. Empty inputs stay empty. The persistent Prototype insights notice identifies fictional starter data plus session edits. Source-aware interfaces anticipate imported/manual adapters without pretending those integrations exist.

Charts use Recharts accessibility support, tooltips, axes, legends and calmer data surfaces. Captions and source-value tables remain in server markup; the responsive chart canvas loads client-side. Zero and Not recorded remain distinguishable in those tables. Click drill-down uses stable IDs through Recharts 3's active tooltip index, including categories with identical names. Tables and the date inspector provide accessible alternatives. Heatmap dates have roving arrow/Home/End navigation, month/year context and text state counts. Chart animations are disabled. Disco's optional slow opacity-only light shimmer is static under reduced motion.

## Verification

Passed:
- `npm run lint`
- `npx tsc --noEmit`
- `npm test`: **145/145**, including 20 added Insights/Forecast/asset/interaction tests.
- `npm run build`: all fixed routes prerender successfully with Next.js 16.4.3.
- `git diff --check`
- Existing local preview HTTP 200 for Daily Edit, all five Insights views, Planner, Rituals, Nourish, Mood, Money, Notes, Appearance, Settings and the mirrorball asset.
- Served HTML contains exactly one Forecast inside the Daily Edit header and no Next error marker across the checked pages. Insights section content/source notice is present in served markup.

Coverage includes inclusive/date/timezone boundaries, previous-period zero/missing baselines, empty/sparse sources, duplicate/latest records, invalid dates/numeric values, optional zero, completion timestamps and move semantics, ritual states/weekly totals/recurrence-aware streaks, independent Mood fields/multiple feelings, transaction/payment accounting and split shares, recurring anchors, planned nutrition coverage, source goal snapshots, deterministic revelations, chart-value tables/stable drill-down, Forecast placement and the faceted local asset. Existing theme/material/domain tests also pass.

The user explicitly said no browser is needed. Validation above is automated/structural and served HTML, not a claim of screenshot, pointer/touch or optical-compositing review.

## Honest limitations / deferred work

Domain records remain session-local, including Insights source edits; refresh restores the existing fictional starter state. Theme/material/Forecast preferences retain their existing browser storage. Sparse Mood and historical completion data correctly produce limited comparisons, not added demo history.

No live Forecast provider, Supabase/auth, durable analytics cache, timer-session history, effective-dated classification/schedule history, Health/sleep/steps integration, AI summaries or third-party analytics tracking was added. Future imports need external IDs and provenance-aware matching. Current recurring anchors/status cannot reconstruct previous prices/cancellations; allocation actuals are current linked/manual snapshots. These limits are stated in the UI/spec.

Recommended local review: the larger Disco environment on short and long pages, compact Forecast states, responsive chart labels/tooltips, keyboard date inspection and the distinction between unknown/explicit missed Ritual days. No additional major module work is started.

## Implementation references

- [Recharts accessibility](https://github.com/recharts/recharts/wiki/Recharts-and-accessibility)
- [Recharts tooltip API](https://recharts.github.io/en-US/api/Tooltip/)
- [Recharts responsive sizes](https://recharts.github.io/en-US/guide/sizes/)
- Installed Next.js guide: `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`.
- Installed Recharts 3 event contract: `node_modules/recharts/types/synchronisation/types.d.ts`.
