# Muse Integration Map

One life, one system. Muse is a personal life operating system, not a set of separate tools. This page records which module owns each kind of record, how other modules may refer to it, and the check to run before building a major feature. Approved in #117 (November 2026).

**The cycle:** Envision → Intend → Live → Reflect → Understand → Envision again. This is the product model behind Muse. It is not a required workflow or a navigation structure: people can start anywhere and use any module on its own.

## Muse Cohesion Check (run before every major feature)

Write down the answers before you build. Put them in the PR description or the feature's spec section.

1. **Authoritative source.** Which module owns the new record? It has exactly one home.
2. **Related owners.** Which existing modules already own related information?
3. **Duplicates.** Could this create a second copy of an Aspiration, Task, Ritual, Bucket List dream, event or memory? If so, use a reference instead.
4. **Optional relationships.** Which connections help? None may be required unless the relationship is intrinsic.
5. **Patterns.** Which navigation patterns, components and tokens already exist for this? Extend them rather than imitate them.
6. **Place in the cycle.** What happens before and after this experience?
7. **Now or later.** Which integrations work now, and which are only prepared for the future? Say which in the docs.

## Principles

- **One authoritative record.** Other modules hold its id, never a copy of it.
- **Connections are optional.** Nothing requires using another feature, unless the link is intrinsic. For example, a Task always belongs to a Workspace.
- **Complete journeys.** Link to the related page before and after, such as Intentions ↔ Reflections for the same period.
- **Live references vs. saved snapshots.** A live view reads the current record. A saved page keeps a small snapshot (name, date) of what it pointed at. Editing or deleting the record later never rewrites an older page; the page shows "now …" or "no longer there".
- **Explicit actions only.** A module never creates or changes another module's records in the background. Turning an Intention priority into a Task is a button the person presses, and it happens once.
- **Different personalities, one design system.** Envision is aspirational, Planner purposeful, Rituals encouraging, Reflections thoughtful. All use the same tokens and components.

## Record ownership

| Record | Owner (navigation) | Table(s) | Referenced by | How |
|---|---|---|---|---|
| Aspiration | Envision → Aspirations | `aspirations`, `aspiration_updates` | Intentions, Bucket List, Muse Marks, Lists, Agenda, Insights, Stream, Almanac, Future Log | id; Intentions and Future Log keep a name snapshot |
| Bucket List dream | Envision → Bucket List | `bucket_lists`, `bucket_entries` | Intentions, Insights, Future Log | id; Intentions and Future Log keep a name snapshot |
| Vision Board | Envision → Vision Boards (#118) | `vision_boards` (+ its private image files) | Intentions (“Vision board” section) | id + name snapshot. A board element may point at one Aspiration or Bucket List dream by id + name snapshot; nothing is copied or created |
| Task | Planner → Tasks | `tasks` (+ `task_occurrences`) | Daily Edit priorities, Aspirations, Lists, Intentions, Future Log | id; an Intention priority stores the `taskId` it made; Future Log references the series id |
| Muse event | Planner → Agenda | `planner_events` | Intentions (Looking forward to), Daily Edit, Future Log | id + occurrence date snapshot; Future Log references the series id |
| Google event | Google Calendar (Muse keeps a cache) | `google_events` | Agenda, Daily Edit | shown, never copied into Muse; editable through Google when editing is allowed (#112) |
| Muse event's Google copy | Planner → Agenda ("Also add to Google") | `google_event_links` | Agenda (hides the copy so it shows once) | reference: Muse event id → Google id `muse<uuid>`, etag and state; the Muse event stays authoritative |
| Intention page | Planner → Intentions | `intention_pages` | Reflections (link only) | period + start |
| Intention prompts (favorites, own prompts) | Planner → Intentions | `intention_prompts` | Intention pages copy a prompt's title and question when added (no live link) | owner; library prompts by stable key || Reflection | Planner → Reflections | `reflection_reviews`, `life_areas`, `life_ratings` | Intentions (link only) | period + start |
| Custom feelings | Mood | `custom_feelings` (+ `emotion_favorites`) | Check-ins keep their own snapshot (`mood_checkins.feelings`); no foreign key, so edits/deletes never rewrite history | owner; `custom:<uuid>` ids only in snapshots |
| Manual steps | Wellness → Movement | `step_days`, `step_settings` | Insights read it; separate from planned movement and completed activities; per-day goal snapshot | owner + local date; `source=manual` |
| Ritual (habit) | Rituals | `rituals`, `ritual_entries`, `ritual_groups` | Aspirations, Intentions, Daily Edit, Wellness, Insights | id; Intentions keeps a name snapshot |
| Daily intention | Daily Edit | `daily_records` | Insights | separate from Intentions; never overwritten by them |
| Lists | Mindspace → Lists | `lists`, `list_*` | Planner (linked tasks), Aspirations | id |
| Insights | Insights | none (derived) | none | reads other modules; stores nothing |
| Book and reading journal (#135) | Collections → Books | `whimsy_books`, `book_journal_entries` | Reading Desk, Series, Daily Edit, Reading Atlas, Insights | book id; journal keeps a title snapshot and optional read/session references; session deletion retains writing |
| Book import provenance (#133) | Collections → Books Settings | `book_import_batches`, `book_import_sources`, `book_import_observations`, `book_import_collection_links` | Import review/refresh, Library export; future Book Detail history presentation | canonical book id + stable source id; immutable normalized source/opinion/title snapshots; optional existing completion id; source shelf references the same canonical My Collection even after renaming |
| Reading session and open timer | Collections → Books | `whimsy_reading_sessions`, `whimsy_reading_timers` | Book detail, Reading Atlas, Insights | book id; one recoverable timer may carry an optional timed target, while only saved active segments count toward goals and streaks |
| Book series catalog | Collections › Series page (`/collections/series/…`) | `collection_series`, `collection_series_members` | Book page, Add Book search, Collections search, Reading Atlas | catalog-only members have source IDs and titles but no book ID; owned members reference the canonical book; manual corrections and hidden tombstones override refresh; reading history stays with the book |
| Future Log entry | Planner → Agenda → Future Log | `future_log_entries` | none | standalone entries are their own record; a reference (#112) stores only `source_kind` + `source_id` + a name snapshot, has no done state of its own, and one record can be referenced once |
| Planned movement and its outcome | Daily Edit / Wellness → Movement | `movement_day_types`, `movement_day_outcomes` (#112), `movement_records` | Insights, Wellness goals, Connected Rituals | Completed is only `movement_records`; Skipped, Rest and Sick are outcomes and never count as done |
| Comparison birth profile | Cosmic Observatory → Birth Chart | `astrology_comparison_profiles` (#28) | Synastry and Composite chart tools | private input by id; calculated chart results are temporary and never copied into this record |

## Lifecycles worth knowing

- **Renaming or deleting a referenced record:** references stay readable (name snapshot). Nothing is cascaded into Intentions.
- **Deleting an Intentions page:** only the page is deleted. Aspirations, Rituals, dreams, Tasks and events are untouched.
- **Hiding an Intentions section** keeps its content. Deleting a section that has content asks for confirmation first.
- **Aspirations and the Bucket List moved from Rituals to Envision (#117).** Same records, settings and components. `/rituals?view=aspirations|bucket` redirects to `/envision` with the query intact.
- **Intentions ↔ Reflections:** each links to the same period on the other side. Neither needs the other to exist, and neither writes to the other. Quarters exist only in Intentions.

## Integration status (#117)

| Integration | Status |
|---|---|
| Intentions → Aspirations, Rituals, Bucket List, Agenda events (choose and reference) | Working |
| Intention priority → Task (explicit, once) | Working |
| Intentions ↔ Reflections links for the same period | Working (week, month, year) |
| Intentions → Vision Board preview | Working (#118): optional `boards` section, up to 3 board references with a live preview |
| Daily Edit showing the week's or month's intention | Future idea: read the page; never copy it into daily records |
| Insights over Intentions | Not planned yet |

## Integration status (#112)

| Integration | Status |
|---|---|
| Show in Future Log: Planner tasks and events, Aspirations and milestones, Bucket List dreams (explicit, a reference) | Working |
| Future Log follows a source's title, date and done state; a gone source keeps its name snapshot | Working |
| Future Log no longer shows events (Muse or Google) automatically | Working |
| Google events in the Future Log | Depends on Google Phase 3 (stable links). See GOOGLE_CALENDAR_PLAN |
| Google two-way editing and background sync | Built on the feature branch; needs the Google scope, a secret and the migration (GOOGLE_CALENDAR_PLAN, Phase 3) |

## Integration status (#118)

| Integration | Status |
|---|---|
| Board element → Aspiration or Bucket List dream (optional reference, name snapshot, “now …” / “no longer there”) | Working |
| Intentions “Vision board” section (reference + live preview, links to the board) | Working |
| Board with a period → that period’s Intentions (link) | Working |
| Aspirations / Bucket List showing the boards that reference them | Future |
| Reflections looking back at a period’s board | Future |
| Background removal | Option A (Apple Photos cutout + Paste, guided on iPhone/iPad). Integrated button: future, needs approval |

## Cosmic Observatory chart tools (#28)

The existing private birth profile remains the authoritative record for the user's birth details. `astrology_comparison_profiles` owns optional, named details for other people used in synastry and composite tools. Each record is private, reusable in either chart position, included in personal export, and independently deletable; it does not copy the user's profile or store chart results. Temporary natal, synastry, composite and transit results remain in memory for the current browser session. An explicit reflection action creates a normal Cosmic Journal entry referencing an existing library concept, not a copy of a chart or someone else's birth details. Chart-result references remain future work requiring a snapshot and deletion design.

### Books Import 2.0 (#143) — feature branch

Cohesion check: Books owns DNF and its reading cycle, while import provenance holds the original source snapshot. Review editions/ISBN corrections affect proposed metadata, never source evidence or existing Muse values. Existing Series installments are optional references; their order/role/decoration remain in Series. Catalog search/editions reuse the existing authenticated providers. No second Library, Atlas record or completion tracker is introduced. Migration/acceptance gates and local verification: [BOOK_IMPORT_143](BOOK_IMPORT_143.md).
