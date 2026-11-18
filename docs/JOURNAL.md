# Muse Journal V1

Everyday → Journal: a private place to think out loud. You talk with an AI companion that remembers what matters, then finish the conversation into an entry you can search, tag and revisit. The conversation is the record; the analysis only makes it easier to find.

**Status:** implemented on branch `feat/journal-v1` and tested locally with a mock AI provider. It is not deployed. Staging needs the migration, an OpenAI API key and AI access turned on for the owner's account.

## Everyday experience (daily-experience and visual passes, November 18)

"Open Journal. Start talking. Everything else is in the toolbar." The secondary navigation is **Journal | History | Insights**.

- **First visit:** a short setup with one journal (named "My Journal" by default) and one companion chosen from the starters. You can optionally rewrite its personality or open the Studio to test it. Then you go straight to the workspace. Nothing asks again.
- **Workspace:** opening Journal lands on a ready-to-write page. An unfinished entry in the current journal is resumed. Otherwise the page is blank: the date, a greeting, this week drawn as a small constellation, and a composer ready for typing or dictation.
- **What creates records:**
  - Opening Journal creates nothing.
  - A draft entry is saved after a pause in writing.
  - Send creates the entry.
  - Once you've written, the bottom of the page offers two equal buttons: **Finish entry** (confirm, then Finish & save turns to a fresh page with a quiet link to the saved entry) and **Go deeper** (sends, and the companion replies; "Add to entry" when AI is off).
  - **Voice typing:** a mic in the field's tool row uses the browser's own speech recognition (Safari/Chrome; free, no Muse AI request). Words appear live at the caret; tap again to stop; typing or sending stops it. Browsers without it show no mic, and the keyboard's own dictation still works.
- **Toolbar:**
  - *Journal:* switch, new, rename or edit, and manage.
  - *Companion:* switch, make default, customize and test, new companion, and the greeting switch. In a conversation, it says which version is replying.
  - *New entry.*
  - *⋯ menu:* morning or evening opening, resume another unfinished entry, move this entry, memory on or off, delete or discard, and preferences.
  - On phones, the toolbar is a single row.
- **Greeting:** "Start new entries with a greeting" is on by default.
  - Only a deliberate **New entry** asks the companion for one opening, through the normal opening request (personality, permitted memory and budget).
  - Opening Journal never makes a request.
  - A greeting is never repeated for the same entry.
  - If AI is unavailable or the budget is used up, you get the blank page and a short note.
- **Switching:**
  - Switching journals changes the page's context and keeps each journal's draft. It never moves an entry; "Move this entry to…" does that explicitly.
  - Switching companions mid-entry keeps every message. Each reply is labelled by the companion version that wrote it, and later replies use the new companion.
- **Management:** journals and companions are managed in a modal (Manage journals & companions). The Companion Studio opens as a full-screen sheet with its version history, Test and Compare. There is no separate management page; old `?view=journals` links open the workspace with the manager.

## What's in V1

| Area | Implemented |
|---|---|
| Views | Journal (the workspace), History and Insights (`/journal?view=`). A finished entry opens with `?entry=<id>`; the Companion Studio opens as a sheet with `?companion=<id\|new>`. |
| Journals | Four optional starters (Everyday Reflections, Work & Career, Relationships & Connection, Inner Exploration). Each journal has a name, description, icon, colour, cover, default companion, its own instructions, morning and evening instructions, and a memory setting. Journals can be archived. Deleting one asks whether to move its entries elsewhere or delete them too. |
| Companions | Four starters (The Thought Partner, The Strategist, The Confidant, The Explorer). Each has fully freeform personality instructions, conversation preferences and an opening approach. You can duplicate a companion, restore a starter's original words, or restore any earlier version. Every save keeps a version snapshot. |
| Companion Studio | Edit on one side and test on the other. On phones, Instructions and Test conversation switch. The studio can compare two versions on the same message, keep either one, save, recover unsaved changes, and keep a test conversation as a journal entry. |
| Conversation | A spacious, auto-growing composer that works with iPhone dictation. Drafts save on the device at every keystroke, and to the server after a pause or when the app is backgrounded. Replies stream in. Every sent message is saved before the AI is asked. If a reply fails, "Ask again" retries it. Finish & Save closes the entry. |
| Morning and evening | Optional modes with default guidance plus per-journal instructions. You never have to use them. |
| Finished entries | A read-only Conversation view and an Analysis view. A dictation slip can be corrected; the original wording is kept. Passages can be bookmarked with a note, saved as an Inner World discovery, and photos can be attached. Entries can be favorited, moved to another journal, kept out of AI context, or deleted. |
| Continue from here | On a saved entry, **Continue from here** opens a fresh page with a small "Referencing “Title” · date" pill (tap for a read-only preview; × stops referencing). Nothing is created and no AI runs until you write; the new entry stores `continues_id` plus a title/date snapshot (migration `20270101000100`), and the address switches to it so a reload resumes the same draft. The first reply (or an opening you ask for) gets the original as a bounded developer note (summary, insight, threads, and the conversation cut to 12,000 characters with an honest excerpt marker); later replies get only the summary. One level only; photos are named, never resent; an entry kept out of AI context or deleted is never sent. The original is never changed and shows "Continued in" links; the new one shows "Continues". |
| Highlights | Saved passages (`journal_bookmarks`, extended by migration `20270102000100`: start/end within the message, `updated_at`, My tags via `journal_highlight_tags`). On a computer, select words in a saved conversation and tap **Save highlight**; on any device, a message's ⋯ → **Highlight…** (trim the passage, add a note). Highlights paint as a soft theme-aware wash (overlaps merge into one mark); the text never changes. A highlight is placed only where its exact words still are: after a correction it is never moved onto other words, and the card says the message was corrected. "N highlights" in an entry lists them with Jump, Note & tags and Remove. History → **Highlights** searches highlighted words and notes, filters by My tags and opens an entry right at the passage (`?entry=…&hl=…`). No AI. |
| Manage Tags | Journal settings → **Tags**: every tag by category (My tags, People, Places, Topics, Moods, Themes) with entry counts and a search over names and aliases. A tag opens to rename, edit aliases, change category (refused if that category already has the name: merge instead), merge (with a plain count of what moves and an option to keep the old name as an alias; entries, highlight tags and remembered corrections move) or delete (optionally **never suggest again**: `journal_tags.suppressed`, migration `20270103000100`; the tag leaves every entry, entries stay, analysis skips the name; restorable). On an entry, ↺ **Replace** swaps a wrong tag for the right one on that entry only and remembers the correction (`journal_tag_corrections`) as a hint for future analysis, never a rule or an alias; corrections are listed and removable. Analysis receives known people with confirmed aliases and these corrections. No AI for any of it. |
| Guided Journals | Guided prompts belong to a journal. In **New journal / Edit journal**, switch on **Use guided prompts** and set the questions (add, edit, reorder, duplicate, optional, delete; examples to copy: Tarot, Travel, Gratitude, Spanish), **One at a time** or **All together**, an opening note, and whether the companion may talk about an answer when asked. A guided journal starts its questions on every new entry; a freeform journal opens the composer. There is no separate guide to create or pick (internally each journal has at most one guide record, `journal_guides` via `default_guide_id`, switched by `journal_journals.guided`, migrations `20270104000100` + `20270105000100`; switching off keeps the questions). A guided entry is a normal entry: nothing is created until the first answer; answers save like a draft (`guide_state`) and resume where you were; the entry keeps an immutable copy of the questions (`guide_snapshot`), so edits only affect new entries. Finish entry saves each answer as a message under its question (`guide_question`), so search, tags, photos and analysis work as usual. Companions stay independently selectable and never change the questions. Moving between questions never calls AI; **Talk about this** (when allowed) sends one answer for one reply. |
| Memory Studio | Journal settings → **Memory**: the memory switch, a plain **How memory works**, **What Muse wants to remember** (AI suggestions, never used until you choose Remember; edit before approving; Dismiss) and **What your companion knows** (approved memories grouped by category, pinned first; edit, change category or where it applies, pin, remove; add your own). Each shows its source entry when there is one. A suggestion that matches or closely resembles a known memory says so and can replace it. Dismissing, or correcting an AI memory's words, records the old wording on its entry (the analysis `dismissed` list) so re-analysis never brings it back; suggestions never change approved memories. **Pin** (`journal_memories.pinned`, migration `20270106000100`, which also adds a Goals category) orders pinned memories first inside the same size budget, so it adds no tokens. Categories are yours to set; AI suggestions start as Life & background. The entry's "Remember this?" uses the same cards. No AI for any of it. |
| Analysis | One bounded AI request after Finish & Save, if analysis is on. It produces a title, recap, observations and threads to revisit. People, places, topics, themes and moods become real tag records. Suggested memories stay suggestions until you confirm them. A failed analysis never affects the saved entry, and you can retry it. The analysis also writes **A closer look at you** (3–5 grounded paragraphs in the person's register) and an **Insight on the situation** (the dynamic underneath, a reframe, or usable perspective). Only people, topics and moods become tags; places and themes are no longer made (older ones stay stored and searchable). |
| Tags | People, places, topics, themes and moods are separate kinds. Names are unique regardless of case, and people and places can have aliases. Tags can be renamed, merged (the merged name becomes an alias) or deleted. Clicking a tag opens every entry that has it. AI suggestions show dashed until you keep them; a removed suggestion isn't added back by a later analysis. Similar names are never merged automatically. **My tags** (`custom`, shown as #Name) are a separate kind you make yourself on any saved entry, with autocomplete from your earlier tags; they never come from AI, analysis never removes or changes them, and they appear first on rows and cards. Adding, removing, renaming, merging and searching tags never calls AI. |
| History | Full-text search over every message, title and summary, with highlighted snippets. Filters by journal, companion, each tag kind, favorites and bookmarks, and date range, all combinable, plus sorting (on phones the filters fold behind one Filters button). Opens on **Week**: a slim strip of the seven days (a lit star where you wrote, today ringed), that week's entries as compact rows, and the week's AI reflection living with the week (linking to it in Insights, `?view=insights&week=`). **All** lists compact rows by month with Muse's shared page controls. **Bookmarks** lists kept passages. **Jump to a date** is a small calendar (shared `MuseDatePicker`, now with optional marked days) that dots the days you wrote; there is no separate Calendar view. **Search and Filters** look across the whole journal, whatever week is on screen: one search field (full-text, plus case-insensitive partial matches in messages, titles, summaries, saved analyses and every tag name and alias, via `search_journal`, migration `20261230000100`) and one Filters panel (a tag finder, then My tags, People, Places, Topics, Moods and Themes by use, then journal, companion, dates, kept and sort). Selected tags combine with AND and with the search text; active filters show as removable chips, each tag chip with rename, aliases or merge. |
| Insights | Weekly numbers counted on the device with no AI: entries, days, words, current streak, words by day, journals, and tags by kind. An optional AI-written weekly reflection is created only when you ask, saved, and shown again without another request. It says when it's out of date. |
| On this day | A quiet count on Today. Entries from earlier years appear only when you ask, and it can be turned off. |
| Memory | Confirmed memories you can edit, scope to one journal or delete, plus recent context and full-text retrieval (details below). Memory can be turned off for everything, for a journal, or for one conversation. |
| Integrations | A Rituals habit can connect to "Journal days". Inner Compass discoveries can cite a journal entry. Entries can link to Chapters, Experiences and Life Atlas areas. There is an opt-in Journal card on the Daily Edit. Journal data is included in the account export, and has its own export as JSON or Markdown. |
| AI access | Off for every account until a server-side entitlement row turns it on. The budget is $10 a month with a warning at $7.50 and a $2 daily guard; the owner can change it within a server ceiling. Every request is logged with its token counts and an estimated cost. |

Not in V1: voice recording, transcription, text-to-speech, other AI providers, bring-your-own-key, billing, shared or public journals, automatic mood or Life Atlas changes, image analysis, embeddings (search by meaning) and cross-module psychological analytics.

## Records (migration `20261228000100_journal.sql`)

Everyday → Journal owns every table below. Rows are owner-only (row-level security, no anonymous access), and every table cascades on account deletion.

| Table | What it holds |
|---|---|
| `journal_journals` | Spaces for conversations. `memory_scope` is `shared`, `journal` or `off`. |
| `journal_companions` | Personalities. `version` increases only when the words change. |
| `journal_companion_versions` | Append-only snapshots written by a trigger, with no foreign key to the companion, so past conversations keep the words they used even if the companion is deleted. |
| `journal_preferences` | Global instructions plus memory, auto-analysis, On this day, Daily Edit card and default journal settings. |
| `journal_conversations` | One dated entry: `status` draft → active → completed (never back), the pinned `companion_version_id`, title and summary with who wrote them, favorite, exclusions, photos, a draft, and counters. |
| `journal_messages` | The original words. Readable, insertable and deletable by the owner, but never updatable directly. A trigger refuses messages on a completed entry and keeps the counters right. `reply_to` is unique, so a retry can never store two replies to one message. |
| `journal_message_corrections` | The earlier wording of a corrected message, written by `correct_journal_message`. |
| `journal_tags`, `journal_entry_tags` | Tags by kind, unique on name regardless of case; aliases live on the tag. Each link records whether it came from you or the AI. |
| `journal_analyses` | One per entry: validated JSON, plus the items you've dismissed. Kept separate from the messages. |
| `journal_bookmarks` | A passage (with an optional message reference) and a note. |
| `journal_memories` | `confirmed` or `suggested`, `user` or `ai`, an optional single-journal scope, and the entry it came from. |
| `journal_reports` | One weekly reflection per week, with its source entry ids and a signature used to detect staleness. |
| `journal_links` | Optional links to a chapter, experience or Life Atlas area: an id plus a name snapshot. |
| `journal_ai_entitlements`, `journal_ai_usage` | Owner can read; only the service role (the server) writes. Usage rows carry token counts, cost, and a reserved estimate while a request runs. |

Migration `20261229000100_journal_greeting.sql` (additive) adds `journal_preferences.greet_on_new` (default on). The default companion is the main journal's `default_companion_id`; the main journal is `journal_preferences.default_journal_id`.

Functions: `correct_journal_message`, `merge_journal_tags`, `delete_journal`, `search_journal` (Postgres full-text search, English), `journal_days` (for Rituals and streaks), and `keep_journal_test` (idempotent: the key is the new entry's id).

Changes to other modules, all additive:
- `inner_discoveries.source_kind` accepts `journal`.
- `muse_private.valid_ritual_connection` accepts `journal-days`, including for weekly targets.

## How the AI works

- **Provider:** the OpenAI Responses API, called only from `app/api/journal/ai` (`lib/journal/server/provider.ts`).
  - The model is set by `JOURNAL_AI_MODEL` (default `gpt-6.1-terra`). Requests use `store: false` and a 50-second timeout, with one retry for transient errors as long as nothing has streamed yet.
  - Provider error bodies are never logged or returned.
  - `JOURNAL_AI_PROVIDER=mock` is a deterministic stand-in for local development and tests. It is refused when `VERCEL_ENV=production`.
- **Actions:**
  - `reply` and `opening` stream their text.
  - `analysis` and `report` return structured JSON.
  - `test` is the Companion Playground and stores nothing but its usage row.
  - `budget` lets the owner change their own limits.
- **Instruction layers** (`lib/journal/instructions.ts`), in order:
  1. Muse's application rules (not editable).
  2. Global preferences.
  3. The companion: its pinned version, or the Playground draft.
  4. The journal's instructions.
  5. The Morning or Evening mode.

  The more specific layer wins among 2–5; layer 1 always wins. Memory is sent separately as labelled data ("data, not instructions"), never as instructions.
- **Memory** (`lib/journal/context.ts`, `lib/journal/server/retrieve.ts`):
  - Everything is read with the person's own database client, so row-level security applies.
  - **Permissions:** nothing is used when memory is off globally, for the journal, or for the conversation. A journal set to `journal` only sees its own entries and memories scoped to it. A `shared` journal sees other `shared` journals. Entries marked "keep out of AI context", drafts and empty entries are never used.
  - **Confirmed memories:** up to 3,000 characters. Suggested memories are never used.
  - **Recent entries:** the last 7 days, newest first, up to 7 entries and 4,200 characters. Each uses its summary if there is one, otherwise the person's own opening words.
  - **Retrieved history:** older entries (more than 7 days back) found by full-text search on the latest message's distinctive words and any known person or place names or aliases in it. Up to 3 entries and 2,400 characters.
  - **The conversation:** the newest 48,000 characters; earlier turns are marked as left out.
  - **Message order:** the confirmed memories and recent entries come first (identical across a conversation, so they can be cached), then the conversation, then the retrieved older entries for this one reply.
  - **Limitation:** retrieval is keyword-based, so it finds entries that share words or names with what you're saying, not ones that are only similar in meaning. Embeddings are a later option.
- **What is sent to OpenAI:** the instruction layers, the permitted memory described above, and the current conversation. For analysis, the finished conversation plus existing person names. For a weekly reflection, the week's statistics and each entry's title and summary or opening words. Photos are never sent. Test conversations send only the draft companion and the test messages, plus memory if "Test with my journal context" is on.
- **Photos with a message:** up to 7 photos can go with one of your messages (`journal_message_images`, migration `20261231000100`; files resized to 1600px in the private `constellation-images` bucket under `<user>/<entry>/`). They are sent, at high detail, only with the request that answers that message. Earlier photos are named in the text as no longer visible and are never resent; "Ask about this again" attaches one to the next message. The companion separates what it sees from guesses and never identifies people from their faces. Each attached photo reserves about 3,000 input tokens of budget; actual image tokens are billed in the normal usage row. Entry photos (the Photos section of a saved entry) are still never sent to AI. Deleting an entry clears its photo folder.
- **Provider data policy** (as published, checked 2026-11-17): API data isn't used for training unless the account opts in; abuse-monitoring logs are kept for up to 30 days; zero data retention needs approval from OpenAI.

## Cost and limits

Prices are in `lib/journal/pricing.ts` (OpenAI's standard tier, checked 2026-11-17).

| Model | Input | Cached input | Output |
|---|---|---|---|
| `gpt-6.1-terra` (default) | $1 | $0.05 | $5 |
| `gpt-6-luna` (cheaper fallback) | $0.10 | $0.01 | $0.50 |

Prices are per million tokens.

**Typical use with `gpt-6.1-terra`:**
- A reply is about 0.5–3k fresh input tokens plus 3–8k cached, and about 250 output tokens: roughly $0.002–0.005.
- An opening is about $0.004; an analysis about $0.01–0.02; a weekly reflection about $0.01.
- A 15-message day plus the analysis comes to about $0.05–0.08, or roughly **$1.50–2.50 a month** for daily use.

**Limits** (`lib/journal/server/usage.ts`). These are Muse's own limits, not an OpenAI billing cap.
- Before each request, a deliberately high cost estimate is reserved: every input token assumed uncached and every allowed output token used.
- A request is refused when spending plus open reservations plus the new estimate would go over the monthly limit ($10) or the daily guard ($2).
- At most 2 requests can run at once, and at most 8 per minute.
- When a request finishes, the reservation is replaced by the cost calculated from OpenAI's reported token counts.
- Months and days are counted in UTC.
- The owner can change the monthly budget, warning point and daily guard in Journal settings, up to `JOURNAL_AI_BUDGET_CEILING_USD` (default $25). Nothing ever buys credits.
- When the budget is used up, the AI pauses. Writing, History, search, tags and saved analyses keep working.

## Setup for Staging (needs approval)

1. Apply `20261228000100_journal.sql` to Staging (`npm run db:push:staging`), then run `scripts/verify-hosted-journal.sql`.
2. In the OpenAI dashboard, create a project for Muse, a key for it, and a monthly budget alert (for example $10). This is separate from ChatGPT Plus.
3. On the `muse-staging` Vercel project, set `OPENAI_API_KEY`. Optionally set `JOURNAL_AI_MODEL` and `JOURNAL_AI_BUDGET_CEILING_USD`. Never set `JOURNAL_AI_PROVIDER=mock` on a hosted project.
4. Turn AI on for the owner only, in the SQL editor:
   ```sql
   insert into public.journal_ai_entitlements (user_id, enabled) values ('<owner auth user id>', true)
   on conflict (user_id) do update set enabled = true;
   ```
5. Deploy `muse-staging` from the branch, following the AGENTS.md Staging workflow.

## Tests

- `node --test tests/journal.test.mjs`: memory permissions and budgets, retrieval queries, instruction order, conversation trimming, weekly statistics, tag identity, analysis validation, pricing, Markdown export.
- `npm run test:journal:db`: owner-only access and isolation between two accounts, server-only entitlement and usage, companion version snapshots, drafts, append-only messages, finished entries, corrections, tags and merge, search, journal days, keep-test, journal deletion, moods, budget defaults.
- `npm run test:journal:ui` (with `JOURNAL_AI_PROVIDER=mock npm run dev`): 71 browser checks covering first-run setup, the workspace, the greeting and its budget fallback, scenarios A–H, the Playground, the archive and tagging criteria, no stray drafts, phones and themes.
