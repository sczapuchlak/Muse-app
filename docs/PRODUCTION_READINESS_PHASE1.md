# Production readiness Phase 1 — auth origins and account deletion

Implemented locally; no hosted resources, migrations, deployment, commits or production data changes. Daily Edit and approved appearance files are unchanged. Existing unrelated working-tree documentation is preserved.

## Authentication configuration

- `SITE_URL`: required exact canonical application origin, one per deployment.
- `NEXT_PUBLIC_SUPABASE_URL`: matching Supabase root origin.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: matching publishable or legacy anon key only. A build-time guard rejects privileged/malformed public keys before emitting browser chunks.
- `SUPABASE_SECRET_KEY`: privileged matching project key, server-only; required for confirmed account deletion, never browser imports or public variables.

Local application/API endpoints must both be loopback. Hosted staging/production endpoints must both use HTTPS without credentials, paths, query or fragments. Invalid/missing configuration fails closed with unavailable feedback, never a localhost fallback. Alternate read origins canonicalize safely; writes from a different origin are rejected. Session/return cookies use Secure on HTTPS. Server identity verification remains `getUser`, with private/no-store responses and safe return paths. Magic-link requests retain `shouldCreateUser:false` and generic unknown-email responses. Enforce disabled public signup in each Supabase environment, not just Muse UI.

### Hosted dependencies — not verified locally

1. Choose separate staging/production application origins and matching Supabase projects. Put matching environment secrets in the host secret manager; public values must be correct at build time.
2. Configure Supabase Site URL and exact auth redirect allowlist for `/auth/confirm`. Configure invitation and magic-link templates to send `token_hash` and supported `type=invite` / `type=email` to that handler. Preserve disabled public signup and admin-managed invitations.
3. Configure real SMTP/email delivery, provider limits and invitation administration; local Mailpit is not hosted email evidence. Local invitation scripts intentionally refuse hosted endpoints.
4. Verify the hosting proxy exposes the canonical HTTPS URL to Next, along with cookie refresh, invalid/used links, unavailable configuration, logout and protected documents/RSC/API routes. No arbitrary forwarded host is trusted.
5. Establish backup retention, recovery and deletion disclosures before real-data use. A live deletion does not erase retained backups immediately. Perform staging self-deletion with disposable accounts before launch.

## Confirmed self-account deletion

Settings uses existing Muse confirmation/dialog controls. The user must type `DELETE`; cancellation is non-destructive. `POST /api/account/delete` requires same-origin, server-verified authentication, JSON and the exact confirmation object. It accepts no target account ID. The authenticated user ID alone reaches the server-only Auth admin hard-delete operation.

All current owner/dependency records cascade from Auth users within the Auth deletion transaction. No domain tables are manually cleared, so constraint failure cannot leave a deliberately piecemeal deletion. An acknowledged matching user confirms success; a lost/failed response succeeds only after explicit Auth `404/user_not_found` verification. Otherwise the response honestly reports uncertainty and preserves retry/session feedback. No internal errors or credentials are returned.

Success expires auth/PKCE/return cookies, clears HTTP cache, sends the existing ephemeral cross-tab logout signal and performs full navigation to discard private providers, drafts and router memory. Non-private appearance preferences remain. A copied JWT may remain valid until expiry; deleted owner rows no longer exist, server identity checks fail and dependent writes cannot resurrect the account. Repeated calls cannot select another user. Storage/attachments are disabled; enabling file ownership later requires explicit deletion orchestration, not an assumption that database cascades delete objects.

## Verification

- Targeted auth/deletion tests exercise HTTPS/local endpoint validation, missing config, safe canonical redirects, invite-only magic links, Secure cookies, authorization/CSRF, confirmation/body limits, admin failures and uncertain-response verification.
- `npm run test:auth`: actual local inbox magic-link/invite flow, single-use links, refresh, logout, route protection and unknown-email signup denial passed with disposable accounts.
- `npm run test:account-deletion`: populated disposable users across daily/Mood/priorities, Planner, Notes, Wellness/groceries, Rituals and Money. Rejected anonymous/cross-origin/wrong-confirmation/target-ID requests preserve records. Real hard deletion removes all owner-table records; a second account remains intact and authenticated. Stale sessions/repeated deletion fail, stale-token writes cannot resurrect daily data. Test accounts are cleaned up.
- Owner-table checks use read-only aggregate SQL in the explicitly local database; some private tables intentionally deny service-role REST reads. No grants were weakened for testing.
- Isolated Chrome desktop/mobile checks passed: disabled unconfirmed action, non-destructive Cancel, blocked-request error with retained confirmation, successful retry and account-deleted notice, cleared auth cookies and denied protected navigation. A discovered session-guard/deletion-response race is covered by a shared short-lived exit hold and release/reverification regression test.
- TypeScript, ESLint and production build pass. Final full suite: 294 tests, 291 passing, with all 12 new Phase 1 regressions passing. The three previously identified frozen Disco material/contrast failures remain unrelated and unchanged. A secret-value scan found the configured server credential absent from all 85 emitted client-output files.

No hosted authentication, email delivery, TLS/reverse-proxy behavior or production deletion is claimed from these local checks. No schema changes were needed.
