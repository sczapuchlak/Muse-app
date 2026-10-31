# Settings persistence and focused UX refinement

**Implemented locally.** Existing Notes work was preserved. The original Settings phase did not deploy or implement deletion. Confirmed self-deletion was subsequently implemented in [PRODUCTION_READINESS_PHASE1](PRODUCTION_READINESS_PHASE1.md).

## Account preferences and timezone

`20261031000700_account_preferences.sql` extends the existing `profiles` row with `time_zone_confirmed_at`, `cosmic_enabled` and nullable `zodiac_sign`. The profile remains the authoritative timezone owner; the signed-in email is read-only and comes from verified Auth identity. No extra profile fields or email-change workflow were added.

UTC defaults remain unconfirmed until explicitly confirmed; no timezone is inferred from a device or travel. A searchable Muse selector offers named IANA zones and a human-readable selected label. Explicitly saving a timezone records server confirmation time. DST uses the existing IANA-aware date utilities. Changing timezone affects Today and new capture defaults, never reinterprets old local dates, daily capture zones or task completion evidence. The selected calendar date is deliberately retained.

`save_account_preferences` checks ownership, supported fields/types, valid timezone and the profile revision under a row lock. Direct authenticated timezone writes cannot bypass this command. Stable command receipts make uncertain retries idempotent; authoritative readback must match the acknowledgement. Failed saves retain the choice, conflicts require explicit discard/latest-load recovery, and a timezone chosen before background refresh retains its original revision. Unsubmitted timezone choices are labeled unsaved, not confirmed. No optimistic value is presented as the saved application timezone.

The account provider lives in the authenticated shell. Confirmed profile changes update the existing daily/Planner owners in place, without remounting their draft stores. Date-sensitive prototype displays also use that same profile timezone, while their records remain prototypes. Notes timestamps receive the updated profile through their existing provider. Other-tab signals, refocus and reconnect reload saved preferences when no queued draft exists; continuous cross-device Realtime is not implemented.

## Forecast and appearance

Cosmic Forecast enabled/sign preferences now belong only to the authenticated profile. The forecast remains an illustrative preview; no live horoscope integration or invented data was added. Legacy browser values neither override account data nor appear as a user-facing import link. The old browser utility remains for compatibility/tests, not as an active preference owner.

Theme, Crystal/Frosted and Quiet/Magical/Extra controls share the sidebar theme dropdown and preserve their browser storage and reduced-motion behavior. Appearance is absent from desktop/mobile navigation. The old direct Appearance route remains compatible; no duplicate Appearance controls were placed in Settings.

## Scoped export and account deletion

`export_personal_data` is an authenticated, security-invoker MVCC query with explicit owner filters and RLS. The no-store authenticated `/api/account/export` route returns a portable versioned JSON attachment. It includes profile preferences; daily records, priorities, Morning/Evening joins/reflections, influences/favorites and the reference emotion catalog; Planner organization/tasks/subtasks/tags/events/time sessions/completion evidence including retained deleted-task history; Notes documents, archived/trashed states, tags and links. Dayprints remain derived, not duplicate export records. Receipts, internal revision scopes and search indexes are excluded.

The UI clearly excludes prototype-only Rituals/Nourish/Money/hydration, browser appearance/pane preferences and unsaved drafts. It does not claim a complete export of every app surface. Download handling rejects login redirects, non-JSON/invalid responses and mismatched profile identity. A failed export shows an error; successful preparation is not a claim about the user's chosen file destination. Future persistence migrations must explicitly extend the export registry and disclosure.

Confirmed self-deletion is now implemented in Settings: authenticated same-origin POST, typed DELETE confirmation, server-only hard Auth deletion and existing transactional ownership cascades. No caller-supplied target ID is accepted. Confirmed success clears auth cookies/cache and disposes private browser state; failure retains the confirmation and an honest retry path. Live backup retention is a separately configured policy, not immediate backup erasure. See [PRODUCTION_READINESS_PHASE1](PRODUCTION_READINESS_PHASE1.md).

## Settings composition and copy

Four existing-style glass sections: Account & Preferences, Cosmic Forecast, Privacy & Your Data, About Muse. Desktop uses a deliberate two-column grid, stacking on mobile. Shared card spans are scoped to that local grid; controls do not create implicit extra columns. Forecast title, description, toggle, zodiac control and disclosure use the existing spacing scale. Truthful save/retry/conflict status is a subtle footer below all four sections, with no reserved blank panel.

About uses the approved statement: **“You are the muse. You are the artist. Your life is the masterpiece.”** Version is secondary. No approved longer About paragraph was found in project documentation; that paragraph remains a copy follow-up, rather than invented brand prose.

## Validation

- 214 Node tests pass: existing regressions plus preference failure/retry/idempotency/conflict/selection-revision tests, retained daily/Planner drafts, timezone midnight/DST boundaries, footer status and approved-copy checks.
- 131 rolled-back database assertions pass, including18 preference/export assertions. Existing timezone-history fixtures now use the revision-checked preference command rather than bypassing it.
- `npm run test:account`: actual local persistence, UTC confirmation, competing writes, invalid inputs, RLS/direct-write denial, historical stability, fresh clients and authenticated export HTTP checks. Export fixtures include archived Notes/tags and retained Planner completion history; a second user and anonymous requests cannot retrieve them. Disposable accounts are deleted.
- Daily and Planner local integration regressions pass after adapting timezone configuration to the new command.
- Isolated Chrome verifies UTC confirmation, searchable timezone selection, forecast persistence, failed saves/retry/conflict recovery, live module timezone propagation, refresh and actual browser restart. Unsaved Planner and daily drafts survive timezone changes and can retry. Device timezone override never mutates the profile. Export failure/retry is truthful. Desktop/tablet/mobile containment and all theme IDs were checked, with representative light/dark rendered inspection; this is not exhaustive visual approval of every screen in every theme.
- ESLint, TypeScript, database lint and production build complete the validation. No personal seeds, database reset, hosted changes, commit or push.

## Limits

Pending/unsubmitted preferences are tab-local until confirmed, not crash-recovery storage. Conservative profile-level revisions can conflict on otherwise unrelated preference edits. There is no automatic device-zone travel update, calendar integration, new analytics or live forecast. Hosted/private deployment verification and the approved longer About copy remain deferred.
