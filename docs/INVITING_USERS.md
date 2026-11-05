# Inviting someone to Muse

Muse is private and invite-only. There are no passwords: an invitation email signs the person in, and afterwards they sign in with Google, a passkey or a 6-digit email code. Public signup stays disabled in every environment.

## One-time setup per Supabase project

Do this in **staging first**, then in production. These are dashboard settings; Muse cannot read or change them.

1. **SMTP (Project Settings → Authentication → SMTP Settings).** Enable custom SMTP with your email provider's host, port, username and password, plus a sender address on your own domain.
   - Without custom SMTP, Supabase's built-in email only reaches members of your Supabase team, at a low hourly limit, so an invitation to anyone else will not arrive.
   - Keep these credentials in the dashboard; they never go in the repo.
2. **Invite template (Authentication → Emails → Invite user).**
   - Subject: `You’re invited to Muse`.
   - Body: paste the full HTML from `supabase/templates/invite.html`. Its link must stay `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite`; Supabase's default invite email does not work with Muse's sign-in route.
3. **Magic link template (Authentication → Emails → Magic Link).** Use subject `Your Muse sign-in code and link` and the HTML from `supabase/templates/magic-link.html`, as described in `docs/AUTH_LOCAL.md`.
4. **URL configuration (Authentication → URL Configuration).**
   - Site URL: the environment's exact HTTPS origin, for example `https://<your-domain>`.
   - Redirect URLs: `https://<your-domain>/auth/confirm` and `https://<your-domain>/auth/oauth/callback`.
5. **Providers (Authentication → Sign In / Providers).**
   - Email: enabled, with **"Allow new users to sign up" off**.
   - Google: enabled if used. Its authorized redirect URI in Google Cloud is the Supabase callback the dashboard shows (`https://<project-ref>.supabase.co/auth/v1/callback`).
6. **Database.** Apply `20261107000100_profile_onboarding.sql` with the staging-first process in `docs/DATABASE_RELEASES.md`. Until it is applied, Muse runs as before, without onboarding.

## Sending an invitation

1. Supabase dashboard (the right project) → **Authentication → Users → Invite user** → enter the email.
2. They open **Accept your invitation**. Muse signs them in and opens **Welcome to Muse**, where they:
   - choose their name;
   - confirm their timezone (detected from their device);
   - choose a theme and glass.

   Nothing is saved until they press **Finish setup**.
3. They land on Daily Edit with a short, dismissible orientation. Their account starts empty and private. You don't need to create or edit any records for them.

If the link expired or was already used, Muse explains what to do: sign in if they already accepted, otherwise ask for a new invitation (send one the same way).

## Checks before the first real invitation

- Invite a test address you control in **staging** and confirm the email arrives.
- Confirm that the link opens **Welcome to Muse** on the staging domain, that **Finish setup** lands on Daily Edit, and that signing out and in with an email code skips onboarding.
- Delete the test user in staging (Authentication → Users), or from Settings → Delete account while signed in as them.
