# Phase 1 — persistent daily experience

**Implemented locally.** Authentication and the existing foundation remain intact. Daily Edit, Mood, Dayprint and the existing Insights Pulse readers now use the same authenticated Supabase records. No hosted resources, sample imports, Planner linking or new analytics were added.

## Persistent ownership

| Source | Persistent values | Surfaces |
|---|---|---|
| `daily_records` | Intention text/emoji, ordered zero–three Day in Three emojis, nullable1–10 Energy/Stress/Overall Day | Daily Edit, Mood, derived Dayprint, existing Insights daily ratings |
| `daily_priorities` | Up to three standalone commitments; stable IDs, text/order/completion and database capture timestamps | Daily Edit editor and historical Dayprint |
| `mood_checkins` and its joins | Independent Morning/Evening identity, feelings, influence IDs/order, reflection, capture timezone, original timestamps | Daily Edit feelings, Mood editor/history, Dayprint and existing emotion Insights |
| `influence_tags` | User-created influence library; no automatic sample seed | Shared picker and historical labels |

Dayprint remains a projection, not a table. Its date inventory includes intention-only, Pulse-only, emoji-only and priority-only days with no emotional session. Clearing a dimension leaves unrelated facts alone. Deleting/fully clearing one emotional session preserves daily values and priorities and leaves the other period intact. Fully blank days stay absent from meaningful history even if a preparation row exists.

The UI does not read old prototype Pulse values or copy daily ratings onto emotional sessions. Legacy pure prototype helpers/types remain for unmigrated/test compatibility; the live session adapter supplies null legacy numeric fields and live calculations receive explicit daily observations. No fictional scores are converted, averaged or imported. The current Mood summary and Insights numeric denominators count known daily values, including rated days without feelings, once per local date.

## Shared access and synchronization

- `lib/data/daily.ts` provides typed reads and commands. A day is read in one nested SQL projection, avoiding separate torn parent/child queries. Date-range reads use bounded pages. Navigation reads never create data.
- `DailyStore` is instantiated per authenticated profile inside the private AppShell and is the single editable daily cache. React uses `useSyncExternalStore`; no independent component-owned saved record or localStorage journal exists. App navigation preserves that cache; refresh/restart reads the database.
- Draft commands serialize per date. Intention typing coalesces briefly; priorities and session changes save promptly. Field patches preserve unrelated daily dimensions. Response readback precedes confirmed saved feedback. Request epochs prevent an earlier range/day read from replacing a newer edit or save.
- Daily and session commands use existing database revisions. The added `save_daily_priorities` command locks the owner/day, checks the complete expected priority identity/revision set, and changes slots atomically. A deferrable unique slot constraint permits swaps while preserving IDs, original creation and completion capture. Concurrent edits fail explicitly instead of silently overwriting.
- Pending/failed commands retain their draft in memory and remain visible as unsaved. Network retry is explicit. Revision conflicts do not automatically retry against a newer revision; the user can review/copy unsaved daily text and deliberately discard it to load the latest saved version. No automatic overwrite or invented merge is provided. An ambiguous committed-write/readback failure also stays unconfirmed and may require a latest-version reload.
- Unsaved reflection drafts remain distinct until Save, keep their date/period key, and do not become history merely by typing. Pending writes/drafts warn before leaving. Typing in intention stays stable while saved text normalizes whitespace; once a different authoritative value arrives on refocus, an already-saved typing buffer cannot mask it.
- Successful writes broadcast only user/date invalidation metadata, never private record bodies. Other tabs refetch; focus/reconnect also refresh loaded days/ranges. Dirty days are not overwritten by refresh. Cross-device updates appear on refocus/reconnect; continuous Realtime subscriptions are not implemented.
- Authentication, owner RLS and owner-safe foreign keys continue enforcing access. The admin secret is not used in UI CRUD. Logout/account change disposes the user-scoped cache with the existing auth boundary.

## Dates, profile and history

The authenticated profile supplies the first name and stable IANA timezone. Default Today comes from that zone, not the fictional profile or device travel zone. A new profile's existing foundation default is UTC until intentionally configured; this pass does not invent a name or infer travel changes. Local Studio can configure the existing profile fields during development; user-facing profile controls remain later work.

Daily/Mood/Insights date selection is retained in a safe `date=YYYY-MM-DD` URL. Intentional historical selection survives refresh and is not relabeled when a timezone changes. Existing daily/session capture zones are preserved. UTC timestamps remain capture instants; local dates are the record identity. History follows the selected date by default, supports independent week browsing and explicit earlier-history batches. The initial broader history window is90 days, with Load earlier days; it is not a claim that all account history is loaded at once. Insights loads the requested and comparison ranges before displaying daily-dependent results.

## Deliberately still prototype-only

Subsequent [Planner Pass A](PLANNER_PASS_A.md) now persists tasks/events and their existing shared preview; priority linking remains deferred. Movement, hydration, meals/Nourish, Rituals, Money and Notes retain their prototype owners and behavior. They are not saved by the daily adapter. Daily Edit's footer and Insights source note distinguish them from persistent daily data. Favorites, reflection drafts and open/filter state remain session UI preferences; appearance preferences retain their existing browser persistence. No new Whimsy backend was added.

Export/account deletion UI, profile editing, recovery policies, hosted email/deployment and remaining module cutovers are not included. Approved user-controlled export and confirmed deletion are still required before real-world personal-data use. This is local development functionality, not a production-readiness claim.

## Validation

- 182 Node tests pass, including queue coalescing, explicit conflict recovery, retry, stale-read protection, priority-only Dayprint, day-level Insights denominators, refreshed intention display and calendar/timezone regression coverage. Legacy presentation fixtures were updated where session-score expectations were superseded by the approved daily model.
- Existing57 pgTAP assertions, foundation API integration and inbox/auth integration pass.
- `npm run test:daily` uses disposable invited users to verify the real typed repository/cache against local Supabase: values/order/completion, atomic swaps, timestamps, conflict rejection, independent sessions/joins/reflection, historical and no-Mood days, refresh-equivalent fresh clients, zone stability, clear/delete semantics, owner isolation and anonymous denial. Its accounts are deleted afterward.
- Actual isolated Chrome checks exercised real form capture, emotion/emoji selection, custom influence creation, Morning/Evening reflections, shared history, module navigation, refresh, actual browser restart, missing/partial days, mobile containment, and error/retry/conflict recovery. Representative light/dark layouts were inspected; this is not exhaustive visual testing of every existing theme/module.
- ESLint, TypeScript and production build pass. Only the local additive priority command/constraint migration was applied; no database reset or production changes.

## Completion verification

The previously interrupted browser conflict test is complete. Its old administrative-write fixture was replaced by an ordinary authenticated revision-checked RPC, preserving the existing database permissions. Browser checks confirm a failed write retains a readable draft, a competing save produces an explicit conflict, deliberate discard loads the latest version, and a subsequent retry can complete successfully. A reproduced stale intention typing-buffer issue was fixed: server normalization may preserve typing whitespace, but a different refreshed saved value is now displayed immediately. Disposable test accounts were removed.

No current weekday-format mismatch was reproduced. Shared calendar labels/week arithmetic already treat a selected `YYYY-MM-DD` as a calendar date, using UTC only for neutral formatting/arithmetic. Only the choice of Today uses the authenticated profile timezone; the former fictional fixed initial date is no longer the daily default. New tests cover Friday October30 versus Saturday October31 at the same UTC instant, travelling device zones, both DST transitions, Monday-first alignment and year boundaries. A real browser also displayed Sunday March8 correctly with a Kiritimati device zone and aligned historical-week results. A profile intentionally left at the foundation's UTC default can have a different Today from Los Angeles; no existing profile or historical record was silently changed.

Final continuation checks:182 unit tests, lint, TypeScript and production build pass. Existing57 database assertions, foundation/auth integration and local daily integration had already passed; no database/auth implementation changed during completion, so those suites were not needlessly repeated. Remaining module migrations, profile/privacy UI and hosted work remain deferred. No Planner work, cosmetic pass, commit or push was performed.
