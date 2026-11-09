# Google Calendar integration (#35)

Status: **Phase 1 (read-only) is live.** **Phase 3 (two-way editing and background sync) is built on `feature/web-ui-112`**; its migration is local only and needs the setup below.

## Decisions (approved by Stephanie, 2026-11-08)

1. **Google Cloud:** Stephanie owns the Cloud project and OAuth credentials. Preview starts with a Testing-mode OAuth client. In Testing mode, Google expires refresh tokens after 7 days, and Muse shows "Reconnect" when that happens. Calendar authorization is separate from "Sign in with Google".
2. **Tokens:** they are encrypted on the server with AES-256-GCM, using a dedicated `GOOGLE_TOKEN_KEY` stored in hosting secrets. Refresh tokens, the client secret and the key never reach the browser. The tokens table has no browser access at all, and every other table is readable only by its owner.
3. **Showing events:** Google events appear in Planner Agenda Day, Week and Month. They keep their Google identity and never become Muse records, so there are no duplicates. They are **not** added to the Future Log automatically. Explicitly linking or importing selected events may be considered later.
4. **Muse events to Google:** per event and off by default ("Also add to Google", phase 3). Connecting still requests only read access; editing is a separate, incremental permission.

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

## Phase 3: two-way editing and background sync (#112) — approved 2026-11-09, built on the feature branch

Nothing hosted has changed yet. The migration has run on the local database only, and no Google Cloud setting has changed. The setup steps below are yours.

### What it does
- **Edit and create Google events from Muse.** If you allow editing, events in calendars you can edit in Google become editable in the Agenda. A new event's **Save to** can be Muse or one of those calendars. Supported fields are title, all-day, dates, times, location and notes.
- **Delete in Google only after asking.** Deleting a Google event, or a Muse event's Google copy, always needs an explicit confirmation. The server refuses a delete without it.
- **"Also add to Google"** (off by default) on a Muse event. The Muse event stays the authoritative record, and its copy in Google is a reference with a state: Sending, In Google, Didn't reach Google yet, Changed in Google, or Deleted in Google.
- **Background sync** about every 30 minutes, even when Muse is closed, plus the existing sync when a page opens and Refresh now.

### Architecture
| Concern | How |
|---|---|
| Permission | Connecting still asks only for `calendar.readonly`. **Allow editing** sends you back to Google for `calendar.events` with `include_granted_scopes`, so read-only users are never asked. Unticking it on Google's screen keeps the connection read-only and revokes nothing (`no-write`). Granted scopes are stored per connection and checked on the server for every write. |
| Where writes happen | `POST /api/google/events`, same-origin and signed-in only. Its actions are `create`, `update`, `delete`, `push`, `google-version` and `unlink`. Tokens stay on the server (`lib/google/access.ts`, `lib/google/write.ts`); the browser never calls Google. |
| No duplicates | Muse chooses every Google id: `muse<event uuid>` for a Muse event's copy, and `musec<key>` for a create, where the key is fixed when the form opens. A retry gets Google's 409 and finds the existing event instead of creating another. In the Agenda, a Muse event's Google copy is hidden, so it shows once, as the Muse event. |
| No silent overwrites | Edits and deletes send `If-Match: <etag>`. A 412 response returns Google's current version, and you choose **Use Google's version** or **Save mine anyway** (or, for a copy, **Keep Muse's version**). The overwrite then targets only the version you just saw. |
| Changes made in Google | After each sync, every copy is compared with Google. A different etag means **Changed in Google** (you choose); a deleted copy becomes **Deleted in Google**, and saving the Muse event restores it under the same id. Neither is overwritten automatically. |
| Failed writes | The Muse event is saved first, and its copy is pushed only after the Planner confirms that save. The link row is written before Google is called. A failure records the copy's state and message, the Muse event is never touched, and background sync retries `pending` and `error` copies. |
| Recurring events | A Google occurrence is edited or deleted by its own instance id (that date only); whole-series changes stay in Google Calendar. Repeating Muse events can't be mirrored yet (see limitations). |
| Disconnected or expired access | Writes stop with a reconnect message. Settings and the editor offer **Reconnect**, and nothing in Muse is lost. |
| Background sync | Supabase **pg_cron** runs `muse_private.request_google_sync()` every 30 minutes. It reads the URL and secret from **Vault** and uses **pg_net** to POST to `/api/google/cron` with `Authorization: Bearer <GOOGLE_SYNC_SECRET>`. The route compares the secret in constant time and answers 404 without it. It syncs connections not synced for 25 minutes (oldest first, up to 25 per run, within a 45-second budget, skipping ones that need a reconnect), then retries failed copies. Each background run stamps `last_background_sync_at`, so Settings says honestly whether background sync is running. |
| Schema (`20261202000300_google_calendar_write.sql`) | `google_events` gains `description` and `recurring_event_id`. A new `google_event_links` table holds one row per Muse event, unique per Google event, with owner read only and server writes. `google_connections` gains `last_background_sync_at`. The migration also enables `pg_cron` and `pg_net`, defines the no-op-until-configured function, and creates the job `muse-google-sync`. |

### Cost and limits (checked 2026-11-09)
- `pg_cron`, `pg_net` and Vault are all available on the staging project (pg_cron 1.6.4, pg_net 0.20.4, Vault installed). They are part of every Supabase plan, including Free, at no extra charge; the job uses a little database time every 30 minutes.
- The job calls one Vercel Function every 30 minutes, about 1,440 a month, well inside Hobby's included invocations. The route caps itself at 60 seconds (`maxDuration`), within Hobby's limit.
- The Google Calendar API is free, and these volumes are far below its quotas.
- A Vercel Cron alone wouldn't work, because Hobby cron jobs run only once a day. That's why the schedule lives in Supabase.

### Remaining limitations
- **Repeating Muse events** aren't mirrored to Google, because their per-date exceptions don't map one-to-one onto Google's. Add them in Google instead.
- **Google series** can only be edited one occurrence at a time from Muse; edit the whole series in Google Calendar.
- A **canceled** Muse event stays in Google with "Canceled · " in its title, because Google's own "cancelled" status deletes the event, and deleting always needs your confirmation.
- Editing covers title, dates, times, location, notes and tentative. Attendees, reminders, colors and attachments are kept as Google has them and aren't editable in Muse.
- Background sync waits up to about 30 minutes, longer in the rare case of many connections. Google push notifications (phase 4) could make it near-instant.
- Testing-mode OAuth still expires refresh tokens after 7 days. Publishing (verifying) the app removes that limit.

### Setup (Stephanie) — needed before this works anywhere hosted
1. **Google Cloud Console → APIs & Services → OAuth consent screen → Data access (Scopes) → Add or remove scopes.** Add `https://www.googleapis.com/auth/calendar.events` next to `calendar.readonly`, then save. It's a sensitive scope, so it's fine in Testing mode for your test users; publishing the app later needs Google's verification.
2. **Vercel → Project → Settings → Environment Variables**, separately for Preview and Production (server-only, never `NEXT_PUBLIC_`):
   - `GOOGLE_SYNC_SECRET` = the output of `openssl rand -base64 48`. Use a different value per environment. It must be at least 32 characters, or the route refuses it.
   - Redeploy after adding it.
3. **Database:** with approval, apply the migration to staging (`npm run db:push:staging`), then later to production. It does nothing in the background until step 4.
4. **Turn on background sync for each environment.** In the Supabase SQL editor for that project, using the same secret as step 2 and that environment's Muse address:
   ```sql
   select vault.create_secret('https://<your Muse host>/api/google/cron', 'google_sync_url');
   select vault.create_secret('<GOOGLE_SYNC_SECRET value>', 'google_sync_secret');
   ```
   - To check: `select jobname, schedule from cron.job;` should list `muse-google-sync`.
   - After about 30 minutes, Settings → Google Calendar should say "In the background … (last N minutes ago)".
   - To turn it off: `select cron.unschedule('muse-google-sync');`
5. In Muse: Settings → Google Calendar → **Allow editing**, and approve the new permission on Google's screen.

### Testing checklist (Preview)
1. Allow editing; untick the permission on Google's screen. Settings should still show "See events", and the connection should be intact.
2. Allow editing properly; Settings should show "See and edit events".
3. Create a Google event from **Save to** and double-click Save. Google should show exactly one event.
4. Edit it in Muse and it should change in Google. Edit it in Google, then save the old form in Muse: you should get the conflict choice.
5. Delete from Muse. It should ask first, then the event should be gone from Google.
6. Turn on **Also add to Google** for a Muse event. One Google copy should appear, with no duplicate in the Agenda.
   - Edit it in Google and refresh: it should show **Changed in Google** with both choices.
   - Delete it in Google and refresh: it should show **Deleted in Google**, and saving should restore it.
7. Turn off Wi-Fi and save a mirrored Muse event. The Muse event should be saved and the copy should show "Didn't reach Google yet"; it should succeed on Retry or in the background.
8. Remove Muse's access in your Google account. Saving should show Reconnect, and Muse events should be intact.
9. Repeating Google event: edit one date and only that date should change. A repeating Muse event can't be mirrored, and Muse says so.
10. After step 4 of setup, wait 30+ minutes with Muse closed; Settings should show a recent background check.

## Later phases (not built)
- Muse Marks on Google events, an automatic full re-sync when your Muse time zone changes, and publishing (verifying) the OAuth app.
- **Phase 4:** Google push notifications (`events.watch`, renewed by the same scheduler) for near-instant updates; mirroring repeating Muse events; whole-series edits; multiple Google accounts in the UI (the schema already allows several connections).
