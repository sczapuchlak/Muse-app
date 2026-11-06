# Stream of Consciousness (#27)

Muse's optional, private-first friends feed. This file holds the consolidated specification, the implementation plan
and the genuine conflicts found during the architecture audit. FEATURE_SPEC and PRODUCT_RULES point here.

## Specification sources and fidelity

- **Sections 1–5, 20, 21 and the Additional Implementation Clarifications** are in Issue #27 as written.
- **Sections 6–19 are missing from the issue text.** The original wording was not available while building. The
  requirements for those sections below come from Stephanie's *Original Specification Fidelity Addendum* (which
  summarizes the recovered originals and is authoritative) and her *Full Specification Restoration* brief (an
  implementation guide). **They are not the original text.** When the original Sections 6–19 are pasted in, they
  replace the summaries below word for word and any conflicts are resolved in their favor.
- Duplicate numbering in the issue (two "Section 20"s) is resolved here as: 20 Testing & acceptance, 21 Implementation
  phasing, 22 Additional implementation clarifications.

## Sections 6–19 (from the Fidelity Addendum; not verbatim)

6. **Tarot & Whimsy.** Eligible saved Tarot readings (including daily draws), Side Quest milestones, saved Fortunes and
   Curiosities, and other supported Whimsy records. Astrology may share selected zodiac placements and educational
   discoveries, never birth date, exact birth time, birthplace, private chart notes or journal entries by default.
7. **Connected activities and milestones.** Ritual (habit) milestones and financial milestones. Financial milestones use
   a dedicated privacy-safe representation: never account numbers, card details, credit limits, balances, APR,
   transactions or other financial data.
8. **Post presentation.** One cohesive card system with context-specific presentation: literary reading/watching cards,
   mystical dream and Whimsy cards, celebratory milestone cards. Every card shows author identity, timestamp, an
   appropriate preview, the primary reaction, Comment, and post options.
9. **Audiences.** Only me (default), Friends, Selected friends; evaluated against current friendship and blocking.
10. **Publishing and consent.** Share to Stream from eligible source modules without disrupting the current workflow.
    Sensitive records are saved privately first and need granular field selection (nothing sensitive preselected),
    audience confirmation, preview and explicit publication. Save & Share may be offered for nonsensitive activities
    with explicit confirmation.
11. **Feed.** Reverse-chronological; optional filters **All, Reading & Watching, Life Updates, Whimsy, Celebrations**;
    the **"Quiet in the universe today"** empty state with useful actions; never fake friend activity.
12. **Contextual reactions.** One primary reaction suited to the post, with Comment as the consistent secondary action;
    never five equal choices. React for ordinary statuses, reading/watching and Whimsy; Send Love for difficult moods;
    Share Joy for happy moods; Cheer for habit milestones; Celebrate for financial achievements (and celebrations).
    Mixed moods stay neutral (React) unless the author picks a tone. Each reaction has its own microanimation, played
    only after a successful reaction, never continuously, respecting Muse Magic intensity, reduced motion and sound.
13. **Comments.** Simple chronological comments (no nested threads in V1). Authors can turn comments on or off per post
    and remove unwanted comments. Blocking and reporting exist before broad social access.
14. **Spoilers.** Hidden by default until deliberately revealed; never leaked through previews or notifications; titles
    and safe metadata stay visible.
15. **Editing, unpublishing, deletion.** Edit, change audience, unpublish to Only me, delete. Deleting a post removes its
    interactions and never its source record.
16. **Profiles & Showcases.** Independently controlled. Authors link to their profile, which wears the author's
    visitor-facing theme without changing the viewer's own app theme. Optional recent activity only where authorized.
17. **Notifications.** In-app first, with category-level preferences: friend requests, accepted requests, reactions,
    comments. No pressure notifications or engagement streaks. Email and push are not in V1.
18. **Security & data.** Reuse Social Foundation identity, friendship, discovery, invitations and blocking. Canonical
    source references, publication-time snapshots, granular consent, current-friendship authorization, selected-friend
    membership, all enforced by the database.
19. **Module customization & experience.** Stream integrates with Make Muse Yours: it can be hidden from navigation
    without deleting social data, clearly distinct from unpublishing posts or pausing social participation. Works across
    all themes, desktop and mobile, keyboard, screen readers and reduced motion.

## Architecture (as built)

- **Database** (`supabase/migrations/20261110000100_stream.sql`): `stream_posts`, `stream_post_members`,
  `stream_reactions`, `stream_comments`, `stream_notifications`, `stream_preferences`, `stream_reports`. All function-only
  (RLS on, no table grants). `muse_private.can_see_post` checks author, audience, selected membership, current
  friendship (which already includes blocking and paused participation) and live source existence on every read.
- **Snapshots** are validated by `valid_stream_display` (the Showcase allow-list plus one ≤280-character excerpt);
  money milestones have a stricter dedicated shape. Deleting a source marks posts missing (triggers) and hides them.
- **Reactions**: each post stores its `primary_reaction` (checked against its category); people give it or not.
- **Client**: `lib/stream/` (model, adapters, persistence), `components/stream/` (feed, composer, cards, reactions,
  comments, notifications, Share to Stream), route `/stream`.

## Stream 2.0 (#69) — implemented on feature branch

What changed in this pass, and what each piece depends on. Migration `20261116000100_stream_v2.sql` (additive).

**Complete before #69 and kept as is:** feed, composer, audiences, snapshots, contextual reactions (one primary
reaction per post, played only after the database confirms), comments, spoilers, notifications, blocking, reporting,
profile recent activity, the *Show Stream in navigation* setting.

**Muse Magic (#34, merged).** Reactions already used the shared Muse Magic levels (Quiet: no flourish, feedback kept;
Magical; Extra: a wider burst) and reduced motion. #69 gives each reaction its own sound from the shared palette
(`reactionSounds`: React confirm, Send Love reveal, Share Joy complete, Cheer seal, Celebrate celebrate), still only after
success and only when Sound effects are on. There is no Stream-specific sound setting.

**Share to Stream entry points.** Bookshelf, Dreamscapes and Tarot (existing), plus Collections (movie, TV and game
details), Rituals (the ritual editor, with its current streak), Side Quests (a completed quest), Fortunes (a saved
fortune or curiosity), the Observatory (Sun, Moon and Rising signs only), Mood (a check-in in the history) and
Aspirations (the aspiration detail). Every entry opens the same composer: canonical source reference, snapshot at
publication, optional words, field-by-field choice, Only me by default, preview, explicit publish. The share dialog now
opens at the page root, centred, so it never inherits another dialog's styles, and Escape closes only the share dialog.

**Collections moments.** From existing records only: books can add *the day I started* and *my latest reading session*
(pages and active time); TV shows can add *my latest episode* (season and number), *its episode title* (opting in also
turns on spoiler protection) and *latest season I finished*. Series completion and movie finishes come from the
existing status field. Nothing new is tracked.

**Aspirations.** New source kind `aspiration` (Celebrating). Shares the name, progress, milestones done, category and
finish date the author ticks; never the why, notes, journal or reflection unless the author writes or trims words in the
composer. Archiving an aspiration keeps what was shared; deleting it hides its posts like any deleted source.

**Money.** Not offered for new posts: no Money shortcut, no money-milestone records under Celebrating, no share entry
point. The database still accepts `money-milestone` and the `money` category, and the client keeps a retired label, so
earlier money posts keep rendering and can still be edited, unpublished or deleted. Nothing published was removed.

**Reports.** Reviewed by the Muse team with `node scripts/stream-reports.mjs` (local by default; hosted projects need
`STREAM_REVIEW_URL` and `STREAM_REVIEW_SECRET_KEY` for that one command, and production asks for the project name). It
calls `stream_reports_review` and `stream_report_resolve`, executable only by the service role. Resolutions: no action,
return the post to Only me (never deleted), or remove the reported comment. There is no admin route, and ordinary people
can neither read nor resolve reports.

## Deferred and known limitations

1. **Make Muse Yours** is separate. *Show Stream in navigation* stays the interim setting.
2. **Favourite tarot cards** are still not stored, so they cannot be shared. Readings and daily draws can.
3. **Wellness milestones** (water, movement goals) have no Stream source yet; Mood check-ins are shareable.
4. **Astrology discoveries** have no saved record beyond view activity; only chart signs are shareable.
5. **Reporting:** no in-app moderation queue, no reporter notification of the outcome, no appeal flow. Reviewing needs the
   service key, so only someone with hosted access can do it.
6. **Original Sections 6–19** remain the addendum summaries above, not the original text.
