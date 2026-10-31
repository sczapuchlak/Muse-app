# Notes persistence — Pass A

**Implemented locally.** Standalone Notes now uses authenticated Supabase records. Planner task notes and every other module's behavior remain unchanged. No hosted resources, prototype imports, attachments, new editor features, commit or push.

## Preserved experience and ownership

The existing three-pane workspace, Focus/pane controls, title and Tiptap editor remain. Persistent notes retain stable IDs, structured rich-text JSON, title, pin, active/archive/trash status, restoration source, creation/edit timestamps and revision. Search text is derived from document content on the server. Empty/untitled notes are valid; the existing display-title fallback remains.

Independent tags retain stable IDs, canonical nested paths, icons and pins; links remain many-to-many. Parent filters include descendants. Create/assign/remove, branch rename/move, confirmed branch deletion without note deletion, note duplication with document/tags, archive/trash/restore and confirmed permanent deletion are preserved. Search and pinned-first edited/created/title sorting still use the existing client-side semantics. A new account starts empty; sample fixtures remain test-only. Pane preferences still use browser storage; selected note/filter remain session UI state.

## Schema and commands

`20261031000600_notes_pass_a.sql` adds `notes`, `note_tags`, `note_tag_links`, `notes_versions` and idempotency receipts in `notes_commands`. Every table has owner RLS. Authenticated users cannot mutate these tables directly. Fixed-search-path commands use `auth.uid()`, reject foreign identities, and enforce same-owner relationships. Canonical parent paths strictly shorten, preventing tag cycles. Account deletion cascades owned data; permanent note removal requires a saved Trash state. Tag deletion clears relationships without deleting notes.

`read_notes` returns one MVCC library snapshot without REST row-limit truncation. `save_notes` atomically saves the existing normalized library graph under an owner revision lock: this deliberately conservative scope keeps subtree edits and associations consistent. Creation/update timestamps and note revisions are server-owned. Metadata and tag changes participate in the library revision; a note's row revision advances when its own fields change. A stable receipt prevents duplicate creation or repeated toggles after ambiguous responses. Acknowledgement/readback revision disagreement is a conflict, never a silent rebase.

The database validates the existing editor node/mark vocabulary, document nesting, heading levels, checklist state, safe HTTP(S)/mailto links, payload size and depth. It derives plain text and an indexed search vector; the UI does not introduce a new search engine. Formatting, including marked line breaks and task lists, stays structured JSON. No HTML-string storage, file uploads or per-keystroke history table.

## Save and editor reliability

One user-scoped `NotesStore` reuses the existing Notes reducer with the established daily/Planner queue, revision and readback conventions. It lives in the authenticated shell across route navigation. Edits appear immediately; title/body network saves debounce500ms. Atomic batches serialize, preserving edits made to another note during an in-flight save. A receipt/payload is retained unchanged on retry. Stale reads cannot replace a newer draft. Failures retain reviewable drafts; conflicts require explicit discard/load-latest. Pending changes warn before leaving the page. No optimistic state is called saved.

The existing editor header reports actual save state; a shared-style status line provides loading/errors, retry, draft review and explicit reload. Revision-dependent controls are inactive before loading or during a failed/conflicting state. Acknowledgements do not remount Tiptap or reset selection/undo history. External changes and explicit reload reconcile document content only when the ProseMirror document differs, avoiding JSONB object-key-order resets. Dates display in the authenticated profile timezone.

Cross-tab signals contain invalidation metadata only. Other tabs, refocus and reconnect refetch when no draft is pending. Logout/account change disposes the user-scoped owner through the existing auth boundary. Notes contents are not copied to localStorage.

## Verification

- `npm run test:notes`: disposable real local users; empty libraries; create/idempotent retry; full rich-text/checklist JSON and derived search text; long content; nested tag creation/rename/pinning/assignment/deletion; note pin/archive/trash/restore/duplicate/permanent deletion; competing owner writes; unsafe-document rollback; fresh authenticated client retrieval; foreign/anonymous/direct-write denial. Test accounts are removed.
- Seven targeted store tests: empty/no-seed reads, coalescing, retained failed drafts, idempotent ambiguous saves, explicit conflict recovery, stale reads, edits during in-flight saves, and acknowledgement races.
- Nineteen rolled-back Notes database assertions plus the existing94:113 total. All206 Node tests pass. ESLint, TypeScript, database function lint and production build are checked for this phase.
- Isolated local Chrome: creation/title/body/bold, stable editor through save/Focus, nested tag assignment, pin/search, failed-write retry, conflicting save and explicit reload, client navigation, refresh and mobile containment. Browser-restart and archive/duplicate/Trash/delete checks complete the focused workflow verification. Representative light/dark inspection is not exhaustive visual approval across all themes.

## Deliberate limits

This is a bounded small-library migration: at most1000 notes,500 tags,10000 links,512KiB/document,8MiB/save and document depth32. Oversized/invalid saves are rejected with retained draft and visible error. Aggregate reads/writes and conservative whole-library conflicts trade scale for a small reliable initial implementation. Narrower per-note commands, cursor paging and server search may follow if actual library size warrants them; they are not implemented here.

Unsaved drafts remain in the current authenticated app/tab, not crash/restart-durable local storage. Confirmed data survives refresh and browser restart. Continuous cross-device Realtime, version-history/compare UI, attachments, inline hashtag parsing, cross-module links, hosted rollout and privacy/export UI remain outside this pass. Notes does not become a storage layer for Planner task notes.
