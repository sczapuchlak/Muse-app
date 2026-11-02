# Local authentication — Phase 1

**Implemented and verified locally.** Authentication is connected. The subsequent [persistent daily stage](PHASE1_DAILY_PERSISTENCE.md) now connects Daily Edit/Mood/Dayprint; other domains remain prototypes. The original auth stage did not import prototype data or add hosted services or privacy-management UI.

## Preview and test

1. Start Docker and run `npm run db:start` if needed. The existing ignored `.env.local` contains local connection settings; `npm run db:env` creates them on a fresh setup.
2. Run `npm run dev` and open **http://localhost:3000/login**. Use this canonical origin; the authentication boundary redirects alternate hosts to configured `SITE_URL`.
3. Provision your address through the local administrator command: `npm run auth:invite -- your@email.example`.
4. Open **http://127.0.0.1:54324**, select your invitation and follow its link. Mail stays in this local inbox; it is not sent externally.
5. After accepting the invitation, use `/login` to request subsequent email magic links. Request feedback is deliberately generic for invited and unknown addresses. Links are single-use; expired/used/incomplete links offer a fresh request.
6. Sign out from the sidebar footer, or **More → Sign out** on mobile. Anonymous visits to any app destination return to login. Appearance preferences remain; private in-memory work is disposed.

The invitation command uses the ignored local admin secret only in a Node process and refuses non-loopback API/site configuration. There is no browser invitation endpoint and no permanent test account. Studio remains a local administrative surface. Do not expose local Auth, Studio, inbox or development ports publicly.

## Boundaries

- The live `/login` reuses the approved `MuseLoginFrame`, original `LoginPreview.css`, branding, official stars and atmosphere. `/login-preview` remains a separate, explicitly non-sending design demo.
- Existing app pages live in `app/(app)`, with unchanged public URLs. Login/preview use `app/(entry)`, without mounting private domain providers. The root layout retains fonts/tokens only.
- Next16 `proxy.ts` checks private document and RSC requests. A request-bound private layout verifies identity again under Suspense, as required by Cache Components. Both use **`getUser()`**, not an unverified session object. The boundary fails closed if Auth is unavailable. Database operations must continue authorizing independently through RLS and the existing request-scoped repositories.
- `POST /auth/link` validates input/origin, calls OTP with `shouldCreateUser:false`, and returns generic success for unknown addresses. Supabase's configured global signup prohibition is the enforceable registration boundary; the hidden/absent signup UI is not. Email login remains enabled for invited accounts. Existing provider limits and UI resend cooldown handle repeated requests.
- `GET /auth/confirm` accepts only email/invite token hashes and verifies them with Supabase. It writes SSR session cookies into the actual redirect response. Local templates already target this handler. It never forwards the verification token in the destination URL.
- Safe return paths are limited to actual app destinations. A short-lived HttpOnly, SameSite return cookie remembers the requested destination in the requesting browser; a link opened in a different browser defaults to Daily Edit. Callback, auth and private responses are private/no-store with no-referrer protection. Do not share dev logs, inbox contents or token-bearing URLs.
- Proxy owns cookie refresh for Server Components and forwards refreshed cookies to both the request and response, including SDK cache headers. There is no shared cache of private user/session data. Supabase SSR's standard client-readable session cookies support the browser SDK; they are not treated as server-verified identity without verification.
- `POST /auth/logout` checks Origin and revokes the current browser session's refresh token, then clears project auth/PKCE/return cookies even if provider revocation fails. It reports that fallback honestly. Other devices retain their independent sessions. As with Supabase's normal token model, an already issued access token can remain valid until expiry; client cleanup is not a claim of instant invalidation of a copied JWT.
- Client logout uses a full navigation to discard router caches, providers and drafts. Other tabs receive only an ephemeral logout signal through BroadcastChannel/storage. The session boundary also handles SDK sign-out/account change, focus verification and Back/forward cache restoration. A transient verification outage hides private UI with a retry state while retaining mounted drafts; an invalid/different session causes full navigation and disposal.

## Validation

`npm test`, ESLint, TypeScript and production build pass. `npm run db:test` retains57 passing database assertions; `npm run test:db:api` retains foundation ownership, transactional and lifecycle coverage.

With the local app running, `npm run test:auth` provisions a temporary synthetic invitee, reads real Mailpit messages, follows verification links, checks all private routes, one-use/expired links, safe return paths, SSR refresh-cookie propagation, logout/cookie cleanup, origin rejection and unknown-address handling. Cleanup deletes its Auth account. This is an HTTP integration test, not a screenshot test.

Actual isolated Chrome checks also passed: invitation and magic-link navigation by clicking local inbox email links, request/loading/network-error and expired-link feedback, cross-tab logout, protected Back navigation and prototype-store disposal. Login layout was checked at1440/1024/768/390px in representative light/dark/Disco themes; light desktop and dark mobile screenshots were inspected. This does not claim exhaustive testing of every existing module or appearance combination.

## Subsequent daily stage and remaining work

The authenticated profile/timezone and canonical daily/session integration is now implemented; see [PHASE1_DAILY_PERSISTENCE](PHASE1_DAILY_PERSISTENCE.md). Fictional daily fallbacks are removed from the migrated fields. User-facing export and confirmed self-account deletion are now implemented locally; see [PRODUCTION_READINESS_PHASE1](PRODUCTION_READINESS_PHASE1.md). Explicit HTTPS staging/production origins are supported in code. Hosted invitation delivery, production email/recovery, deployment configuration and hosted verification remain separate work. No domain data cutover, new migration or unrelated UI redesign is included here.

## Hosted configuration and privacy completion

Each deployment must explicitly set its canonical `SITE_URL` and matching `NEXT_PUBLIC_SUPABASE_URL`. Local endpoints must both be loopback; hosted endpoints must both be root HTTPS origins. Missing/invalid configuration fails closed without a localhost redirect. Configure Supabase Site URL, exact callback allowlist and email templates for that deployment; keep unrestricted signup disabled. The browser uses only a publishable/legacy anon key; `SUPABASE_SECRET_KEY` remains server-only for confirmed self-deletion. Local invitation/test tooling still refuses hosted endpoints. See [PRODUCTION_READINESS_PHASE1](PRODUCTION_READINESS_PHASE1.md) for current verification and deployment requirements.

## Login-only appearance clarification

Entry routes now use a read-only Disco Damage fallback when no valid `muse.theme` preference exists; valid explicitly saved theme choices and saved material preferences are retained. This fallback never writes an appearance preference and does not change the authenticated application's Iridescent default. Login mounts its own static starfield and edge-biased neon atmosphere, with no rectangular confetti or shared Disco fragments. Its dark glow paint is entry-scoped; application themes, tokens, shared atmosphere, login geometry and authentication are unchanged. Reduced motion and Quiet decoration preferences remain respected.

The product owner has clarified that the UI Session 2 login wording must **not** be considered final. No later verifiable replacement was found in the available implementation/history/reports. The owner explicitly approved leaving all existing wording unchanged for now and revisiting final copy separately; no new copy has been invented.

## Email verification codes (local implementation; hosted template approval pending)

The live login defaults to Email code, with Magic link as an alternative. Both request the same Supabase `signInWithOtp` email through `/auth/link`, always `shouldCreateUser:false`. Existing invitation-only configuration remains mandatory; initial invitation acceptance still uses the unchanged Invite template/callback. The six-digit code is posted only in JSON to same-origin `/auth/verify`, which calls `verifyOtp({email, token, type:'email'})` on the configured project and writes the existing SSR session cookies. No OTP database, browser-persisted code, URL token for code entry, privileged browser key or custom verifier is used. Success fully navigates to a safe app return path. Incorrect/expired/used codes share friendly feedback; transient failures retain the code for retry. The UI has a 60-second resend cooldown; Supabase's server rate limits remain the security boundary.

### Exact hosted dashboard configuration (manual, not applied)

In **each environment separately**, open the intended Supabase project → **Authentication → Email Templates/Emails → Magic Link**. Use subject `Your Muse sign-in code and link` and copy the full HTML from `supabase/templates/magic-link.html`. It contains **both** `{{ .Token }}` (the numeric code) and the existing `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email` link. Do not replace that link with the default implicit-flow ConfirmationURL, and do not use `type=magiclink` in Muse's callback. Confirm Auth email OTP length is **6**. Keep/choose an explicit expiry (recommend 10 minutes for production) and a send interval of at least 60 seconds, with suitable verification rate limits. Any hosted setting change requires approval; no setting was changed by this implementation. Existing local configuration uses six digits and its existing one-hour expiry.

Keep email auth enabled, unrestricted public signup disabled, custom SMTP configured, Site URL set to that environment's exact canonical HTTPS origin and `/auth/confirm` in its exact redirect allowlist. Keep Invite separately configured from `supabase/templates/invite.html`. SMTP credentials belong only in Supabase. Staging and production must have different project keys/URLs; never allow one environment's origin in the other's app configuration.

Supabase does not select a different standard email template based on the UI method button. A combined email safely supports both methods; both represent the same single-use credential, so using the code invalidates its link and vice versa. Requesting a newer email can invalidate earlier credentials. Link scanners can consume a one-time link; code-first users should enter the code without opening the link. An already accepted invitation is recommended before first code login. Receiving email on a phone does not require opening Muse there: enter the code on the requesting computer.

### Verification and hosted checklist

`npm run test:email-code` is explicitly LOCAL ONLY: disposable-account code success, incorrect/reused/expired rejection, cookie persistence, safe return, magic-link compatibility and denied uninvited signup; it ages only a disposable local account timestamp to test actual expiry, then deletes that account. Local inbox and browser checks supplement the server test. Existing local tests must never be pointed at hosted databases.

After explicitly approving/configuring the hosted template: invite/accept a disposable staging account; request a code on desktop and read it on a phone; verify, refresh/restart and logout; test an incorrect code, an actually expired code, resend cooldown/latest-email behavior and code reuse; request a fresh email and use its magic link; verify the safe intended return page and unknown-email denial. Verify staging credentials fail against production and vice versa using disposable accounts and the intended project configurations. Repeat production smoke tests only after separate authorization. No hosted OTP or cross-environment end-to-end verification is claimed from local checks.

Local OTP validation passed: all 299 unit/render/store tests, TypeScript, ESLint and production build; disposable real-code success/incorrect/expired/reused checks; actual combined-template inbox delivery; browser autofocus, countdown/resend, change email, safe return, refresh and responsive checks. Existing real-inbox invitation/magic-link, session refresh/logout and unknown-address tests also passed. All test accounts were removed. Hosted authentication and cross-environment end-to-end verification remain pending.
