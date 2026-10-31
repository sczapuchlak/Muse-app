# Notes, theme collection and shared-header pass

2026-10-30. Existing working changes were preserved. No commit or push.

## Completed

- Daily Edit keeps its personalized italic-serif greeting and one shared rotating mantra. A normal-flow two-column grid top-aligns greeting/date, removes old copy padding, and aligns the week strip beneath the full-width date pill. The shared header signature has its own three-star safe zone beside copy. No header illustration or constellation strokes remain in active headers. Daily Edit cards and their models were not changed.
- `MuseHeaderFrame` standardizes module title/eyebrow/signature/mantra/context rhythm. Planner can reserve a wider context for its existing controls. Shared tokens tighten Rituals/Nourish stacked gaps without reducing targets or removing content. Date controls retain full-size arrows, fit labels responsively and have unique accessible IDs.
- Money now exposes global date navigation, independent from reporting/paycheck state. Nourish preserves its view/query date when navigating. Insights retains its placeholder functionality with the same header/signature/date language.
- The sidebar picker remains. The duplicate top-bar picker is removed. Mobile users reach the same nine theme/material choices through More → Appearance. Appearance is now functional, with previews and Crystal/Frosted selection.
- The six approved display renames preserve all existing IDs/preferences/palette blocks. New `disco-damage` supplies the complete ninth theme contract: near-black violet, chrome, hot pink, ultraviolet, cyan, ice and selective gold. Its preview is holographic, Crystal more specular, Frosted softer. No existing theme palette was replaced.
- Shared atmospheric dust is deterministic, clustered and varied, with quiet areas and sparse micro-glints/wisps throughout the document. Disco adds small static fractured chrome facets/reflected beams, fading away from header safe zones. No giant disco ball, header-only artwork, repeated tile or expensive full-screen animated filter. Reduced motion remains static.
- Notes is a functional three-pane tag-first workspace. One-action untitled notes, compact list, immediate selection, search/sort, multi/nested tags, parent filtering, tag creation/rename/branch deletion, icons/pins, archive/trash/restore, confirmed permanent deletion, duplication and keyboard navigation are implemented. Parent tags include descendant notes without duplication; deleting tags preserves content.
- Notes has two-pane collapse and editor-only focus mode, browser-stored pane preferences, and progressive mobile Tags → List → Editor navigation. Query/selection/drafts survive client navigation through the existing session architecture. The editor stays mounted when panes hide.
- Rich text uses official Tiptap 3.32.1 packages, with structured ProseMirror JSON: headings, bold/italic/underline/strike, bullet/number/check lists, blockquotes, safe links, rules, paste and undo/redo. Toolbar/link/tag controls use Muse styling. Prose has a calm theme canvas shielding paragraphs from galaxy decoration.
- Drafts enter shared session state immediately. Debounced commits carry note IDs/revisions; stale commits cannot overwrite later edits or another selected note. Timestamp labels honor the mock profile timezone. Save copy explicitly says session, not cloud.

## New files

- `components/MuseHeaderFrame.tsx`, `DateNavigator.css`, `SharedDateNavigator.tsx`
- `components/AppearanceSettings.tsx`, `AppearanceSettings.css`
- `components/notes/Notes.tsx`, `Notes.css`, `NotesList.tsx`, `NotesTagRail.tsx`, `NoteTags.tsx`, `NoteEditor.tsx`, `NoteToolbar.tsx`, `useNotes.ts`
- `lib/notes.ts`, `notes-sample.ts`, `notes-preference.ts`
- `tests/notes-layout-theme.test.mjs`
- This report

## Materially changed in this pass

- `app/notes/page.tsx`, `app/appearance/page.tsx`, `app/themes.css`, `app/atmosphere.css`, `app/materials.css`
- `components/AppShell.tsx`, `MuseHeader.tsx`, `MuseHeader.css`, `MusePageHeader.tsx`, `MusePageHeader.css`, `MuseAtmosphere.tsx`, `DateNavigator.tsx`, `MuseIcon.tsx`, `MuseSectionNav.css`, `ModulePlaceholder.tsx`
- `components/money/Money.tsx`, `Money.css`; `components/planner/Planner.tsx` (header context only); `components/rituals/Rituals.css`; `components/nourish/Nourish.tsx`, `Nourish.css`
- `lib/themes.ts`, `mantras.ts`, `display-date.ts`; `package.json`, `package-lock.json`
- `tests/daily-edit.test.mjs`; three permanent Muse docs

## Validation

- Lint and TypeScript pass.
- **125 tests pass**, including nine-theme contracts/material/readability checks, stable old theme IDs, new labels/Disco, shared header signature and no picker/illustration, Notes multi-tag/nesting/search, stale-save rejection, duplication/archive/trash/restore, preference restoration/restricted storage, official rich-text schema roundtrips/checklists/history and timezone-safe timestamp labels.
- Production build passes on Next.js 16.4.3. Tiptap internally generates random per-instance IDs even with `immediatelyRender:false`; the DOM-based editor therefore uses the supported `next/dynamic({ssr:false})` boundary inside the client Notes workspace. Static header/tag/list content remains prerenderable. This addresses the actual lifecycle requirement without suppressing Next diagnostics or changing project cache settings.
- Existing port 3000 returns HTTP 200 for Daily Edit, Planner, Rituals, Nourish, Mood, Money, Notes, Insights and Appearance. Served HTML contains the shared header/workspace/previews. HTTP/SSR/token tests are structural checks, not optical approval.
- **No browser is connected.** Same-viewport screenshots and actual desktop/laptop/tablet/mobile, pointer/focus/clipboard/glass-compositing verification remain pending. Inspect Daily Edit alignment, Planner's wider utility context, Ritual/Nourish first-content spacing, Notes pane toggles/mobile back paths, rich-text toolbar and all nine themes/both materials.

## Deliberate limits / decisions

Notes and drafts remain session-local and reset on refresh; pane preferences persist when browser storage is available. No Supabase/backend/cloud saving is claimed. Inline hashtag parsing is deferred in favor of reliable explicit tags, so ordinary hashtags are untouched. Durable version history, backend conflict resolution and cross-module task/Money links are deferred. Native editor undo history is scoped to the currently mounted note editor; content/formatting survives switches, while undo history is not persisted across note switches or reloads.

The written Bear-inspired tag/list/editor brief guided the workspace; no connected screenshot comparison was possible. Installing the mature editor was explicitly authorized by the current Notes brief. Existing Planner timers/drag/task model, Ritual completion logic, Nourish records and Money calculations remain unchanged.

References: [Tiptap Next.js integration](https://tiptap.dev/docs/editor/getting-started/install/nextjs), [StarterKit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit), [Next.js client-only lazy loading](https://nextjs.org/docs/app/guides/lazy-loading#skipping-ssr). The project's installed Next.js guide was consulted for the boundary.
