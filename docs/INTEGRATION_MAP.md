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
| Reflection | Planner → Reflections | `reflection_reviews`, `life_areas`, `life_ratings` | Intentions (link only) | period + start |
| Ritual (habit) | Rituals | `rituals`, `ritual_entries`, `ritual_groups` | Aspirations, Intentions, Daily Edit, Wellness, Insights | id; Intentions keeps a name snapshot |
| Daily intention | Daily Edit | `daily_records` | Insights | separate from Intentions; never overwritten by them |
| Lists | Mindspace → Lists | `lists`, `list_*` | Planner (linked tasks), Aspirations | id |
| Insights | Insights | none (derived) | none | reads other modules; stores nothing |
| Future Log entry | Planner → Agenda → Future Log | `future_log_entries` | none | standalone entries are their own record; a reference (#112) stores only `source_kind` + `source_id` + a name snapshot, has no done state of its own, and one record can be referenced once |
| Planned movement and its outcome | Daily Edit / Wellness → Movement | `movement_day_types`, `movement_day_outcomes` (#112), `movement_records` | Insights, Wellness goals, Connected Rituals | Completed is only `movement_records`; Skipped, Rest and Sick are outcomes and never count as done |

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

The existing private birth profile remains the only saved astrology birth record. Temporary natal, synastry, composite and transit requests may reuse it as input, but results and another person's birth details stay in memory for the current browser session and are not written to a new table. An explicit reflection action creates a normal Cosmic Journal entry referencing an existing library concept, not a copy of a chart or someone else's birth details. Saved comparison profiles and chart-result references remain future work requiring an owner-scoped lifecycle, export and deletion review.
