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
