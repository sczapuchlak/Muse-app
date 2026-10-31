# Phase 1 — local setup and database foundation

Status: **database foundation, application authentication and approved daily-data cutover implemented locally; later domains are pending**. This is not a claim that the entire Phase 1 user journey is finished. No hosted project was created/linked, no production changes, no commit/push. Daily Edit/Mood/Dayprint now use canonical daily records; later module views retain prototype sources. See [PHASE1_DAILY_PERSISTENCE](PHASE1_DAILY_PERSISTENCE.md). See [AUTH_LOCAL](AUTH_LOCAL.md) for login and invitation instructions.

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
| `npm run auth:invite -- your@email.example` | Send an admin-managed local invitation to the test inbox |
| `npm run test:daily` | Verify persistent daily data, priorities, sessions, concurrency and RLS with disposable users |
| `npm run test:auth` | Test the running app's login/callback/refresh/logout through real local inbox messages |

The wrapper rejects unknown/remote commands and remote Docker endpoints. It passes the custom network to container-based commands; the current in-process type generator intentionally receives no network flag. No automatic data-reset command is exposed. Do not reset an environment holding meaningful data without explicit authorization and a recovery plan.

## Environment and secrets

`.env.example` contains blank placeholders. `.env.local` was generated from the running local stack without displaying keys and is ignored by Git. Variables:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: endpoint/public client configuration.
- `SUPABASE_SECRET_KEY`: privileged **server-only** local administration, never browser-bundled or used for ordinary user CRUD.
- `SITE_URL`: `http://localhost:3000` for the authenticated application and callback.

No cloud account, access token, external SMTP or additional user-provided key was required. Local default credentials are for development, not a production configuration.

## Database schema and ownership

Applied migrations:

1. `20261030000100_phase1_foundation.sql`: profiles/timezones, daily records, standalone priorities, Morning/Evening sessions, emotion vocabulary/joins, influences and favorites; immutable identity/capture fields and server timestamps/revisions.
2. `20261030000200_phase1_security_commands.sql`: owner RLS, explicit grants, canonical-vocabulary read policy and atomic daily/session commands.

Personal tables have owner-safe composite foreign keys and authenticated ownership policies. Profiles bootstrap on admin-controlled Auth creation; users cannot forge profile creation or delete profiles directly. Day identity is unique per user/date, with independent nullable1–10 ratings and bounded ordered0–3 Day in Three. Three priority slots enforce the daily cap. Three influence positions enforce that limit without a racy count. No score columns exist on emotional sessions. Deleting a session preserves daily data/priorities; clearing all session content removes that session. Account deletion cascades owned records; deleted users cannot recreate private data using a still-unexpired token.

Only the existing canonical80-emotion vocabulary is inserted by migration; personal seeds are disabled. No Stephanie profile, priorities, meals, moods or water fixtures were imported. Default user name is blank and timezone UTC until intentionally configured/provided by an invite; the mock UI profile is not silently treated as an authenticated identity. Influences/favorites are user-owned and initially empty; their UI integration/default choices remain next-stage work.

Daily/session write commands retain invoker rights and RLS. Daily writes patch only approved fields and require the version held by the editor; stale writes return40001. Session creation/replacement locks its parent day and validates expected revision, with joins in the same transaction. Constraints enforce scale/date relationships even for direct API calls. The Auth bootstrap helper is unexposed, fixed-search-path, minimally privileged and not executable as an API function.

Standalone priorities are implemented; no placeholder Planner table/task FK or Money/Whimsy schema was created. Priority completion capture timestamps record when the status was entered, not proof of when real work happened. Later linked-priority history must meet the approved end-of-day semantics in the blueprint.

## Application authentication

Local Auth is private/invitation-only: global signup and anonymous login are disabled, unused providers disabled. The email provider remains enabled for existing invited users. In this CLI version, setting both global and email-level signup switches false disables email login entirely; the negative public-signup API test verifies the global switch still blocks registration while magic-link issuance works.

The existing standalone login design is now functional at **http://localhost:3000/login**. Admin invitations and subsequent magic links arrive in the local inbox and verify through `/auth/confirm`. Next16 Proxy refreshes cookies and protects document/RSC requests; a request-bound Suspense layout verifies identity before mounting the private shell. Logout clears auth cookies and disposes in-memory UI across open tabs. Unknown addresses cannot register through the sign-in form. See [AUTH_LOCAL](AUTH_LOCAL.md) for security boundaries, error states, invitation provisioning and verification details.

Typed browser/request-scoped server/admin factories and a daily/session repository exist. Ordinary data access uses the public key plus the user's authenticated session/RLS. Admin factory is `server-only`. Auth now gates AppShell; daily capture components now connect through one shared user-scoped cache; later domain providers remain prototype-only.

## Validation

- Docker Engine/local endpoint, migration application, service health and explicit loopback port binding verified.
-57 pgTAP assertions pass: ownership/anonymous denial, foreign-owner link rejection, date uniqueness, bounded values/slots, revision conflict, influence limit, immutable historical identity, session independence, rollback on failed replacements, clearing, daily-without-session data and account cascades/stale-subject denial. Tests roll back all fixtures.
- Local HTTP integration passes: public registration denied; anonymous reads denied; admin invitation/verification; magic-link issuance; own-profile isolation; durable date values; conflict response and competing writes; cross-user read/link denial; fresh authenticated client roundtrip; separate sessions; deletion preserves daily values; Auth deletion/cascade and local signout. Both temporary Auth users are removed in cleanup.
- Database lint passes.182 Node tests pass. ESLint, TypeScript noEmit and production build pass. Foundation-stage production dependency audit reported no vulnerabilities; installation also reported moderate development-tooling findings, with no unrelated forced upgrades applied.
- Application HTTP auth integration and actual isolated Chrome inbox login/logout checks pass; details and coverage limits are in [AUTH_LOCAL](AUTH_LOCAL.md). Temporary auth/browser test accounts are removed afterward.

These checks do not claim browser domain persistence, user-facing export/account deletion, cross-device domain synchronization, a configured production backup policy or hosted readiness.

## Current daily integration and next stages

[PHASE1_DAILY_PERSISTENCE](PHASE1_DAILY_PERSISTENCE.md) records the implemented coordinated cutover: authenticated profile/date, Daily Edit, Mood, derived Dayprint and existing Insights Pulse. The additive `20261030000300_daily_priority_command.sql` migration supplies revision-checked atomic standalone priority replacement/reorder; the original foundation is preserved and no personal fixture import occurred.

Still pending: user-facing profile controls, scoped export/confirmed account deletion before real-data use, later linked-priority history and module-specific persistence. Hydration UI/ownership, Planner, Nourish, Rituals, Money, Notes and hosted configuration remain separate scope. Unexpected durable real data must be preserved, not treated as disposable prototype values.
