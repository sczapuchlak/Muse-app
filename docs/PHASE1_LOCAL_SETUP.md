# Phase 1 — local setup and database foundation

Status: **implemented and validated locally; application cutover is pending**. This is the first approved stage, not a claim that the entire Phase 1 user journey is finished. No hosted project was created/linked, no production changes, no commit/push. Existing app views still use their prototype sources until the next authenticated UI/data integration stage.

## Running local services

Docker Engine29.9.2 was verified via its local Unix socket. Project-local Supabase CLI is pinned to2.122.0; PostgreSQL17 is managed by that CLI. Core services are running with explicit loopback publications:

| Service | Local URL |
|---|---|
| API/Auth | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Email test inbox | http://127.0.0.1:54324 |
| Postgres | 127.0.0.1:54322 |

Only the Muse local containers/network were created. Database volume state survives normal stop/start; a restart was verified to preserve both applied migrations. No `supabase login`, remote link, remote migration/push or hosted resource operation was performed. Emails go to the local inbox, not an external SMTP provider. Synthetic test messages may remain in that inbox; their temporary Auth users were removed.

Docker Desktop installed the CLI under `~/.docker/bin`, outside the original shell PATH. The project wrapper locates it without changing shell/Git settings. Supabase2.122 on this Engine did not honor the Docker network's default loopback binding. `scripts/bin/docker`, scoped to CLI subprocesses and Muse container names/network, explicitly qualifies published ports with127.0.0.1. It does not change Docker daemon configuration or other projects. Current published bindings were verified using Docker inspection.

## Commands

| Command | Effect |
|---|---|
| `npm run db:start` | Start/reuse local services on `muse-local-only` |
| `npm run db:stop` | Stop Muse local services, preserving data |
| `npm run db:status` | Show service URLs without printing keys |
| `npm run db:env` | Populate ignored `.env.local` from local status, with0600 permissions; refuses conflicting existing values |
| `npm run db:migrate` | Apply pending migrations with explicit `--local` |
| `npm run db:types` | Regenerate `lib/database.types.ts` from local public schema |
| `npm run db:test` | Run rolled-back pgTAP security/constraint fixtures |
| `npm run db:lint` | Lint local public-schema functions |
| `npm run test:db:api` | Test local Auth/API with temporary synthetic users, deleted afterward |

The wrapper rejects unknown/remote commands and remote Docker endpoints. It passes the custom network to container-based commands; the current in-process type generator intentionally receives no network flag. No automatic data-reset command is exposed. Do not reset an environment holding meaningful data without explicit authorization and a recovery plan.

## Environment and secrets

`.env.example` contains blank placeholders. `.env.local` was generated from the running local stack without displaying keys and is ignored by Git. Variables:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: endpoint/public client configuration.
- `SUPABASE_SECRET_KEY`: privileged **server-only** local administration, never browser-bundled or used for ordinary user CRUD.
- `SITE_URL`: `http://localhost:3000` for the future authenticated application callback.

No cloud account, access token, external SMTP or additional user-provided key was required. Local default credentials are for development, not a production configuration.

## Database schema and ownership

Applied migrations:

1. `20261030000100_phase1_foundation.sql`: profiles/timezones, daily records, standalone priorities, Morning/Evening sessions, emotion vocabulary/joins, influences and favorites; immutable identity/capture fields and server timestamps/revisions.
2. `20261030000200_phase1_security_commands.sql`: owner RLS, explicit grants, canonical-vocabulary read policy and atomic daily/session commands.

Personal tables have owner-safe composite foreign keys and authenticated ownership policies. Profiles bootstrap on admin-controlled Auth creation; users cannot forge profile creation or delete profiles directly. Day identity is unique per user/date, with independent nullable1–10 ratings and bounded ordered0–3 Day in Three. Three priority slots enforce the daily cap. Three influence positions enforce that limit without a racy count. No score columns exist on emotional sessions. Deleting a session preserves daily data/priorities; clearing all session content removes that session. Account deletion cascades owned records; deleted users cannot recreate private data using a still-unexpired token.

Only the existing canonical80-emotion vocabulary is inserted by migration; personal seeds are disabled. No Stephanie profile, priorities, meals, moods or water fixtures were imported. Default user name is blank and timezone UTC until intentionally configured/provided by an invite; the mock UI profile is not silently treated as an authenticated identity. Influences/favorites are user-owned and initially empty; their UI integration/default choices remain next-stage work.

Daily/session write commands retain invoker rights and RLS. Daily writes patch only approved fields and require the version held by the editor; stale writes return40001. Session creation/replacement locks its parent day and validates expected revision, with joins in the same transaction. Constraints enforce scale/date relationships even for direct API calls. The Auth bootstrap helper is unexposed, fixed-search-path, minimally privileged and not executable as an API function.

Standalone priorities are implemented; no placeholder Planner table/task FK or Money/Whimsy schema was created. Priority completion capture timestamps record when the status was entered, not proof of when real work happened. Later linked-priority history must meet the approved end-of-day semantics in the blueprint.

## Auth foundation versus application login

Local Auth is private/invitation-only: global signup and anonymous login are disabled, unused providers disabled. The email provider remains enabled for existing invited users. In this CLI version, setting both global and email-level signup switches false disables email login entirely; the negative public-signup API test verifies the global switch still blocks registration while magic-link issuance works.

Admin-generated invitations, verification and magic-link issuance were tested using fake local-only addresses. Callback email templates target the planned `/auth/confirm` token-hash handler with explicit invite/email types. **That application route, private route protection and browser cookie-refresh boundary are not implemented yet.** Mail links are not a claim of a finished browser login experience.

Typed browser/request-scoped server/admin factories and a daily/session repository now exist. Ordinary data access uses the public key plus the user's authenticated session/RLS. Admin factory is `server-only`. These boundaries are not yet wired into AppShell or existing capture components; importing them does not switch the UI to persistence.

## Validation

- Docker Engine/local endpoint, migration application, service health and explicit loopback port binding verified.
-57 pgTAP assertions pass: ownership/anonymous denial, foreign-owner link rejection, date uniqueness, bounded values/slots, revision conflict, influence limit, immutable historical identity, session independence, rollback on failed replacements, clearing, daily-without-session data and account cascades/stale-subject denial. Tests roll back all fixtures.
- Local HTTP integration passes: public registration denied; anonymous reads denied; admin invitation/verification; magic-link issuance; own-profile isolation; durable date values; conflict response and competing writes; cross-user read/link denial; fresh authenticated client roundtrip; separate sessions; deletion preserves daily values; Auth deletion/cascade and local signout. Both temporary Auth users are removed in cleanup.
- Database lint passes.169 existing/new Node tests pass. ESLint, TypeScript noEmit and production build pass. Production dependency audit reports no vulnerabilities; installation also reports moderate development-tooling findings, with no unrelated forced upgrades applied.

These checks do not claim completed browser persistence/login, user-facing export/account deletion, cross-device UI synchronization, a configured production backup policy or hosted readiness.

## Next approved stage

Implement private login/confirmation/cookie refresh/logout with Next16 Cache Components boundaries and server-verified identity. Bind the authenticated profile and canonical daily/session queries to Daily Edit, Mood, Dayprint and the existing Insights score adapter together; remove sample fallbacks for migrated data, preserve empty/error/conflict/draft behavior and support history without Mood. Add standalone priority capture/edit/delete and user-facing profile timezone controls. Provide scoped export plus confirmed account deletion/cache clearing before real personal-data use. Other modules remain visibly prototype-only until their own slices.

Approved prototype scores may be discarded during that coordinated cutover. If unexpected real persisted data is found, preserve it and stop for review. Planner-linked historical completion, hydration UI, Money and later domains are not part of this foundation stage.
