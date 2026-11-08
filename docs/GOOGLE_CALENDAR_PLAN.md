# Google Calendar integration (#35): audit and plan

Status: **proposal only**. Nothing is implemented, no schema has changed, and no Google credentials are configured.

## Audit (2026-11-08)

| Area | Today in Muse | Status |
|---|---|---|
| Native events | `planner_events` (title, date/time, all-day, end, location, status, recurrence rule). One `DayEvent` model is shown in Day, Week, Month, Future Log and Daily Edit. | COMPLETE (reuse) |
| Planner surfaces | Agenda Day/Week/Month/Future Log and Daily Edit "Today's plan" all read `DayEvent` via `PlannerStore` and `projectEvents`. | COMPLETE (extend) |
| Google sign-in | Supabase Auth Google identity linking (Settings → Sign-in). This does **not** give Muse a stored, server-usable Calendar refresh token. | PARTIAL (not reusable for Calendar) |
| Calendar OAuth / token storage | None. | MISSING |
| Server-side integration code | Route handlers exist (`app/api/books`, `app/api/account`). There are no Supabase Edge Functions and no admin/service-role client in the app. | PARTIAL |
| Background sync (cron or jobs) | None. | MISSING |
| Settings for integrations | One Settings page with sections and no Integrations section. | PARTIAL (add a section) |
| Muse Marks on events | Marks can link to an event id. | COMPLETE (works for Google events once they have stable ids) |

## Proposed architecture

1. **A separate Calendar OAuth flow** through Next route handlers: `/api/google/connect` → Google consent → `/api/google/callback`. This is not Supabase sign-in.
   - Scopes: read first (`calendar.readonly` plus the email), then an incremental upgrade to write (`calendar.events`) only when you turn on publishing.
2. **Tokens kept on the server only.**
   - `google_connections` (owner-readable fields: email, status, scopes, last sync, last error) plus a separate `google_tokens` table with **no client grants**.
   - The refresh token is encrypted (Supabase Vault or app-level AES with a server key), and only route handlers using a server key can read it. Tokens are never sent to the browser and never logged.
   - Disconnecting revokes the token with Google and deletes it.
   - `account_id` is keyed so a second Google account can be added later.
3. **Calendars:** a `google_calendars` table (calendar id, name, color, access role, primary, `visible`). Hiding a calendar only changes `visible` and deletes nothing.
4. **Events:** a `google_events` cache (calendar id, Google event id, etag, title, start/end, all-day, recurrence instance, status, `updated`).
   - Unique on (account, calendar, event id), so syncing can never create duplicates.
   - It maps into the same `DayEvent` shape with `source: "google"`, read-only unless the calendar is writable and write access was granted.
5. **Sync:**
   - Incremental with Google `syncToken` per calendar; a full resync on 410 Gone.
   - Runs on demand (opening the Planner or Daily Edit, or "Refresh"), plus an optional Supabase `pg_cron` every 15–30 minutes later.
   - Push notifications (webhooks) are a later phase.
6. **Writing to Google (phase 3):**
   - Create or edit a Google event from Muse.
   - "Also add to Google" on a native Muse event stores a link (`planner_events.google_event_id`), so it's never published twice.
   - Edits use `etag` / If-Match, so Muse never overwrites a newer change made in Google.
7. **The display rule:** Google events appear beside Muse events with the calendar's color and a small Google glyph. Tasks stay separate from events, and nothing is copied into `planner_events` unless you choose "Save a Muse copy".

## Phases

1. **Read-only:** connect, choose calendars, cached read sync, show in Agenda, Future Log and Daily Edit, disconnect.
2. **Reliability:** scheduled sync, status and retry UI, recurring-instance edge cases, time zones.
3. **Write:** create and edit Google events from Muse, and publish a Muse event to Google.
4. **Later:** push notifications, multiple accounts.

## Needs your decision

- **Google Cloud project:**
  - OAuth consent screen: while the app is in "Testing" mode, refresh tokens expire after 7 days. Production mode with a sensitive scope like `calendar.events` needs Google verification.
  - Who owns the Cloud project?
- **Token encryption:** Supabase Vault or an app-level key in your hosting secrets?
- **Phase 1 Future Log:** show Google events in the Future Log, or only events you mark?
- **Muse events in Google:** publish them by default or per event? I recommend per event, off by default.
