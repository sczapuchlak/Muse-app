# Release: Aspirations + Stream 2.0 (November 2026)

Production state checked 2026-11-06 (read-only): 45 migrations recorded, latest `20261113000100`; the three below are the
only ones missing, all newer than production's latest, no partial objects, no drift. Production has 0 Stream posts and 0
reports. Supabase lists no physical backups and point-in-time recovery is off, so recovery relies on
`2026-11-aspirations-stream-v2.rollback.sql` (rehearsed locally in a rolled-back transaction).

## Sequence (each step needs Stephanie's approval)

1. `npm run db:remote:status`: the CLI must say staging.
2. `npm run db:push:production`. Type `muse-production`. The dry run must list exactly, in order:
   `20261114000100_aspirations`, `20261115000100_aspiration_renewals`, `20261116000100_stream_v2`. Anything else: cancel.
   Then type `apply production`. The CLI relinks to staging afterwards.
3. Verify (read-only SQL on production): `aspirations`, `aspiration_updates` exist with RLS on; history has all three
   versions; `stream_posts` has `stream_posts_source_kind` and `stream_posts_category_source` (old `_source_kind_check`
   and `_check1` gone); `stream_reports_review` is not executable by `authenticated`.
4. Merge the Stream 2.0 PR (`feature/stream-2`); wait for the Vercel production deploy.
5. Post-deploy checks in the real app (Stephanie's account):
   - Rituals → Aspirations loads (no "isn't available" message); add, check a milestone, renew, archive.
   - Insights → Plans & Rituals shows the Aspirations panel.
   - Stream: publish an Only me status; Share to Stream from a book and from Aspirations, preview, publish as Only me.
   - `node scripts/stream-reports.mjs` with `STREAM_REVIEW_URL`/`STREAM_REVIEW_SECRET_KEY` for production lists "No open reports".
   - `npm run check:passkeys` still passes.

## If something goes wrong

Fix forward when possible. To roll back (only before anyone creates aspirations, aspiration posts or resolves reports;
the script refuses otherwise): run `2026-11-aspirations-stream-v2.rollback.sql` against production in one transaction,
then revert the merge.
