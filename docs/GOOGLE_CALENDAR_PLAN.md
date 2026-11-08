# Google Calendar integration (#35)

Status: **Phase 1 (read-only) implemented on `feature/google-calendar-35-plan`.** The migration has not been applied to Preview or Production. Nothing is deployed or merged.

## Decisions (approved by Stephanie, 2026-11-08)

1. **Google Cloud:** Stephanie owns the Cloud project and OAuth credentials. Preview starts with a Testing-mode OAuth client. In Testing mode, Google expires refresh tokens after 7 days, and Muse shows "Reconnect" when that happens. Calendar authorization is separate from "Sign in with Google".
2. **Tokens:** they are encrypted on the server with AES-256-GCM, using a dedicated `GOOGLE_TOKEN_KEY` stored in hosting secrets. Refresh tokens, the client secret and the key never reach the browser. The tokens table has no browser access at all, and every other table is readable only by its owner.
3. **Showing events:** Google events appear in Planner Agenda Day, Week and Month. They keep their Google identity and never become Muse records, so there are no duplicates. They are **not** added to the Future Log automatically. Explicitly linking or importing selected events may be considered later.
4. **Muse events to Google:** this is a future capability, per event and off by default. Phase 1 creates, edits and deletes nothing in Google and requests no write scopes.

## Implemented (phase 1)

| Area | Where |
|---|---|
| Schema: `google_connections`, `google_tokens` (no browser grants), `google_calendars` (owner can change only `visible`), `google_events` (unique per connection, calendar and event) | `supabase/migrations/20261128000100_google_calendar.sql`, `lib/database.types.ts` |
| Token encryption | `lib/google/crypto.ts` |
| OAuth: read-only scope, offline access, revoke, and a granted-scope check | `lib/google/oauth.ts` |
| Routes: connect and reconnect, the callback (with a per-user state cookie), sync (origin-checked and throttled to every 10 minutes) and disconnect (revokes access, then deletes) | `app/api/google/*`, `lib/google/http.ts` |
| Sync: calendar list; incremental `syncToken` per visible calendar; the first sync reads 60 days back and a year ahead with recurring events expanded; a full restart on a 410; cancelled events removed; times converted to the person's Muse time zone | `lib/google/sync.ts`, `lib/google/calendars.ts`, `lib/google/events.ts` |
| Status: `active`, `needs-reconnect` (expired or revoked access, including the 7-day Testing limit) and `error`, with short plain messages | `lib/google/sync.ts`, `lib/google/calendars.ts` |
| Browser store (read-only, follows database access rules) | `components/google/GoogleCalendarStore.ts` |
| Settings card: connect, show or hide calendars, refresh, reconnect, disconnect with confirmation | `components/google/GoogleCalendarSettings.tsx` |
| Agenda: Day, Week and Month merge Google events and show a calendar-color dot; read-only details link to Google; the Future Log is unchanged | `components/planner/Agenda.tsx`, `AgendaSections.tsx`, `components/google/GoogleEventDetails.tsx` |
| Daily Edit "Today's plan" → Schedule: the selected day's Google events (visible calendars, multi-day included), with the calendar color as the row's accent line; read-only details | `components/ScheduleCard.tsx`, `components/google/GoogleSourceDot.tsx` |
| Tests | `tests/google-calendar.test.mjs` |

**Known limits in phase 1:**
- Changing your Muse time zone applies to Google events at the next full sync. Disconnecting and reconnecting forces one.
- Muse Marks don't attach to Google events yet.
- Sync happens when a page opens or you choose Refresh. There is no background job yet.

## Setup (Stephanie)

### Google Cloud Console
1. Create or choose your project, then enable the **Google Calendar API** under APIs & Services → Library.
2. Set up the **OAuth consent screen**:
   - User type: External.
   - Publishing status: Testing.
   - App name: Muse. Add a support email and a developer contact.
   - Scopes: `openid`, `.../auth/userinfo.email` and `.../auth/calendar.readonly`.
   - Test users: add every Google account that will connect.
3. Under Credentials, create an **OAuth client ID** of type Web application. Under **Authorized redirect URIs**, add exactly one per environment:
   - Local: `http://localhost:3000/api/google/callback`
   - Preview: `https://<your preview SITE_URL host>/api/google/callback`. Muse uses `SITE_URL`, or the Vercel branch URL when no `SITE_URL` is set. Google needs an exact, stable address, so use the branch's fixed alias.
   - Production (later): `https://<production host>/api/google/callback`

   No JavaScript origins are needed.

### Hosting environment variables (server-only; never `NEXT_PUBLIC_`)
| Name | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | From the OAuth client |
| `GOOGLE_CLIENT_SECRET` | From the OAuth client |
| `GOOGLE_TOKEN_KEY` | `openssl rand -base64 32`. Use a different key for each environment. Changing it later means everyone must reconnect. |
| `SUPABASE_SECRET_KEY` | Already in use for account deletion. The sync needs it. |

### Database
Apply `20261128000100_google_calendar.sql` with the existing staging process (`npm run db:push:staging`) only after approval, then production later with its own approval. The migration only adds tables and changes nothing that already exists.

## Preview testing checklist

1. Run the migration on the local Supabase (`npm run db:start && npm run db:migrate`). On approval, push it to staging.
2. Set the three `GOOGLE_*` variables on Preview and redeploy Preview.
3. **Not configured:** before setting the variables, Settings → Google Calendar should say "isn't set up" after you choose Connect.
4. **Connect:** choose Connect Google Calendar. Google's consent screen should list only "See and download any calendar you can access". Approve it and you should land back on Settings with "Google Calendar is connected."
5. **Untick Calendar on consent:** Settings should explain that Muse needs the permission, and no connection should be created.
6. **Cancel on consent:** Settings should say nothing changed.
7. **Calendars:** your primary and owned calendars should be checked, and holidays or other people's calendars unchecked. Toggling a box should survive a reload.
8. **Agenda:** in Day, Week and Month, Google events show a color dot.
   - Times match Google, and all-day and multi-day events span correctly.
   - Selecting one opens read-only details with "Open in Google Calendar".
   - The Future Log shows no Google events.
9. **No duplicates:** choose Refresh now several times. Event counts should stay the same.
10. **Changes flow in:** create, edit and delete an event in Google, then choose Refresh now in Settings. All three changes should show up in the Agenda.
11. **Hide a calendar:** its events should disappear from the Agenda and nothing should change in Google. Re-showing it should bring them back.
12. **Expired access:** remove Muse at myaccount.google.com → Security → Third-party connections, then choose Refresh. Settings should show the reconnect message and a Reconnect button, and reconnecting should restore events. Expect the same after 7 days in Testing mode.
13. **Disconnect:** confirm it. Google events should disappear from the Agenda, the access should be gone from your Google account permissions, and Muse's own events should be unchanged.
14. **Security spot-check:** in DevTools Network, no response should contain a token. With the browser Supabase client, a `select` on `google_tokens` should fail.
15. A second Muse account must not see the first account's calendars or events.

## Later phases (not built)

- **Phase 2:** scheduled background sync, Muse Marks on Google events, an automatic re-sync when the time zone changes, and a published (verified) OAuth app.
- **Phase 3 (write):** an incremental `calendar.events` scope; a per-event "Also add to Google" that is off by default and stores `planner_events.google_event_id`; edits guarded with `etag`/If-Match.
- **Phase 4:** push notifications and multiple Google accounts (the schema already allows several connections).
