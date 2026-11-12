# Database releases: staging first

Hosted projects: **staging** `muse-staging` (`deazpeyomcwjplikbphl`) and **production** `muse-production` (`ajjtlpwpvxirwsygnzlt`).

**The Supabase CLI on a development machine stays linked to staging.** A stray `supabase db push` can only reach staging. Check the link with `npm run db:remote:status`; restore it with `npm run db:link:staging`.

## Workflow

1. **Local:** apply with `npm run db:migrate` and run the relevant local test suites.
2. **Staging:**
   - Run `npm run db:push:staging`. It shows a dry run and asks you to type `staging`.
   - Run the matching `scripts/verify-hosted-*.sql` (read-only), if there is one.
   - Check the feature in the staging app.
3. **Production:** only after staging passes, and only with explicit approval.
   - Run `npm run db:push:production`.
   - Type the project name `muse-production`, review the dry run, then type `apply production`.
   - The CLI link returns to staging afterwards, even if the push fails.
   - Run the verify script again.

## Rules

- **Never point the CLI or an agent at production without explicit approval.** Agents propose; a person confirms production.
- **Keep migration history in step with the schema.** Every applied migration needs its `supabase_migrations.schema_migrations` row with the file's own version.
  - SQL pasted into the dashboard does not record history.
  - The Supabase MCP `apply_migration` tool records a new timestamp instead of the file's version, so don't use it for repo migrations.
  - If SQL is applied by hand, insert the history row in the same transaction.
- **Verify from objects, not history.** Before reconciling history, confirm the migration's tables, columns, indexes, policies, grants and function bodies match the file.
- **Additive by default.** Destructive changes need their own explicit approval and a backup.

## Vercel deploy quota

If Vercel reports "Deployment rate limited" for a merge, no Production deployment is created for that commit, so there is nothing to redeploy in the dashboard. Merge any small commit to `main` once the limit has cleared; Production then builds the whole of `main`.
