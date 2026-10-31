# UI Session 1 — Daily experience

Implemented UI refinement, following completed persistence engineering. Sessions 2 and 3 are explicitly deferred for separate review; no Money/login/theme-restoration/Insights redesign is included.

## Dependency audit

Daily Edit uses the existing authenticated DailyStore and Planner priority commands: creation makes a planned task, current title/completion remain Planner-owned, removing a designation does not delete its task, and historical completion evidence is unchanged. Daily intention/emoji, ordered top three, Day in Three and day-level Pulse are persistent. Morning/Evening remain independent sessions. Saved profile IANA timezone and appearance preferences are preserved.

Rituals has authoritative definitions, groups, entries, recurrence-aware opportunities, pause/archive intervals, deletion tombstones, revisions and retry/conflict recovery. Little Rituals consumes that existing provider, `ritualOpportunity` and `RitualWeekCell`; numeric/duration/weekly controls use the existing entry editor. Wellness has actual dated movement activities and hydration totals/goal/unit snapshots, so Dayprint can read them without inventing history. Movement intentions are never displayed as actual activity.

## Composition and interactions

- The Daily Edit section starts with an approximately 62/38 grid: optional Forecast and Priorities stacked left; Little Rituals right. Nested cards explicitly reset the dashboard's twelve-track spans. The left content determines row height; size containment prevents long habit lists from enlarging it. Little Rituals has stationary header/footer and one scrollable grouped list. Tablet/mobile stack before tracks become cramped, with a bounded, natural widget height.
- Intention and emoji remain in Priorities. Up to three vertical rows retain completion, task menu, reordering and removal; text entry uses existing field/material/focus tokens. Desktop actions stay beside the title. Narrow mobile layouts place actions beneath the title to retain readable text and touch targets.
- Today's Plan retains bounded event/task previews and their original records. One Open Planner link replaces the redundant source badge/Manage pair. Add controls use existing secondary button styling. Planner save/recovery status is in the Daily Edit footer, preserving errors and draft recovery rather than hiding them.
- Reflection and Emotional Landscape stretch together on desktop and stack naturally on smaller screens. History heading, Browse History and week controls share a compact header. Browse retains access to earlier recorded dates.
- Exactly one selected Dayprint uses seven native accessible day buttons within its card. Current weeks default to today in the saved timezone; other weeks choose the latest recorded date or Monday. Week controls remain in the history header.
- Dayprint desktop order is **The Day → Morning → Evening → Day Summary**. Intermediate widths use two columns; mobile stacks in that order. The Day displays saved intention/emoji, actual activities and dated hydration only. Priorities remain stored but are deliberately absent from this presentation, as are meals, Ritual lists and financial data.
- Day Summary keeps Day in Three with exact daily Pulse values and restrained neutral mini-meters; missing signals are omitted, never zero-filled. Morning/Evening retain their own edit/delete controls, feelings/colors, saved context labels and reflections. Long reflections have a preview plus native Read more disclosure containing the complete remaining text; no silent truncation or nested text scroll.
- Mood summary retains existing calculations while grouping Frequently Felt, Feeling Families and Day Pulse compactly. Observation counts use human language; daily ratings can appear even without an emotional session.
- Saved Ritual group accent colors now participate in selected weekdays, completion edges/orbs and progress, independently of banner gradients. Unchanged saved banner presets stay intact when saving unrelated group edits. Group editor keeps icon/name accessible and groups accent/banner controls in Appearance with an expandable gradient section.

## Boundaries

No database schema, RLS, authentication, calculation or persistence-framework changes. No prototype records are copied into real accounts. No new recurrence or reorder system: the current Rituals model has persisted array order but no existing reorder command/UI; this pass preserves it rather than inventing one. Ritual definitions currently have no individual icon field; configured group icons are shown. Check-in metadata remains the existing shared influence tags; no new companions/activity storage is invented.

The Forecast remains the existing optional provider/unavailable boundary, with no new API. A disabled Forecast takes no reserved space. Existing conflict, retry, loading and deletion confirmation semantics remain. Sessions 2–3, including site-wide status redesign and Disco restoration, remain for later review.

## Verification

265 unit/render/store tests passed before the final documentation check, including new editorial Dayprint and 0/3/10/24 Ritual presentation cases. Focused local Daily/Mood and Ritual API suites passed, including RLS, historical dates, independent sessions, lifecycle/recurrence, conflicts, idempotency and retained drafts.

Isolated local-browser checks passed: three linked priorities and the limit, 22 scheduled Ritual controls with internal scrolling, shared completion/missed/clear across Daily Edit/Rituals, blocked-write retry, saved historical movement/water, four-column Dayprint and full reflection access, equal reflection/landscape height, date switching without data mutation, and page containment at 1440/1100/768/390px. All nine theme/two material combinations were checked for containment; reduced-motion/Muse Magic modes were exercised. Screenshots were inspected in light/dark themes. This is not an exhaustive assistive-technology or contrast certification.

Disposable verification accounts were removed. Final ESLint, TypeScript and production build passed. No commit, push or deployment.
