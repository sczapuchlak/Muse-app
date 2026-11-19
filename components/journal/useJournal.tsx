"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { useDailyData } from "../daily/DailyData";
import { useMuseToday } from "../useMuseToday";
import * as P from "@/lib/journal/persistence";
import { aiAction, aiStatus, type AiStatus } from "@/lib/journal/ai-client";
import { cleanTagName, findTag, normalizeTag, type Bookmark, type Companion, type Conversation, type EntryLink, type Journal, type Memory, type Mode, type Preferences, type Tag, type TagKind, type Guide, type GuideSnapshot, type GuideState, normalizeMemory } from "@/lib/journal/model";
import { companionPreset } from "@/lib/journal/presets";

type Status = { loaded: boolean; error: string; saving: boolean; missing: boolean };
const empty: P.JournalState = { prefs: { globalInstructions: "", memoryEnabled: true, analysisAuto: true, onThisDay: true, showOnDaily: false, greetOnNew: true, defaultJournalId: null, revision: 0 }, journals: [], companions: [], conversations: [], tags: [], entryTags: [], bookmarks: [], memories: [], links: [], highlightTags: [], corrections: [], guides: [] };
const missingTable = (e: unknown) => ["PGRST205", "42P01"].includes((e as { code?: string })?.code ?? "");
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");
export const newId = () => crypto.randomUUID();
const noAi: AiStatus = { enabled: false, entitled: false, configured: false, provider: null, model: null, allowance: null };

/**
 * The signed-in person's Journal (Journal V1). Metadata loads once; an entry's messages load when it opens. Every write
 * goes through lib/journal/persistence (owner-only, revision-checked). Nothing here writes to another module.
 */
function useJournalStore() {
  const client = useMemo(() => createMuseBrowserClient(), []);
  const { profile } = useDailyData();
  const timeZone = profile.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const today = useMuseToday(timeZone);
  const [userId, setUserId] = useState("");
  const [state, setState] = useState<P.JournalState>(empty);
  const [status, setStatus] = useState<Status>({ loaded: false, error: "", saving: false, missing: false });
  const [ai, setAi] = useState<AiStatus>(noAi);
  const stateRef = useRef(state); stateRef.current = state;
  /** Records "don't propose these words again" on the entry an AI memory came from (the existing dismissed list). */
  const rememberNotToSuggest = useCallback(async (conversationId: string, body: string) => {
    const a = await P.loadAnalysis(client, userId, conversationId).catch(() => null);
    if (a) await P.dismissInAnalysis(client, userId, a, `memory:${normalizeMemory(body)}`).catch(() => undefined);
  }, [client, userId]);

  const refresh = useCallback(async () => {
    try {
      const auth = await client.auth.getUser();
      if (auth.error || !auth.data.user) throw Error("Sign in to open your journal.");
      setUserId(auth.data.user.id);
      const next = await P.loadJournal(client, auth.data.user.id);
      setState(next); setStatus((s) => ({ ...s, loaded: true, error: "", missing: false }));
    } catch (e) { setStatus((s) => ({ ...s, loaded: true, error: missingTable(e) ? "" : message(e), missing: missingTable(e) })); }
  }, [client]);
  const refreshAi = useCallback(async () => setAi(await aiStatus()), []);
  useEffect(() => { void refresh(); void refreshAi(); }, [refresh, refreshAi]);

  /** Runs a write, keeping the error visible; returns undefined when it failed. */
  const run = useCallback(async <T,>(work: () => Promise<T>): Promise<T | undefined> => {
    setStatus((s) => ({ ...s, saving: true, error: "" }));
    try { const out = await work(); setStatus((s) => ({ ...s, saving: false })); return out; }
    catch (e) { setStatus((s) => ({ ...s, saving: false, error: message(e) })); return undefined; }
  }, []);
  const patch = useCallback((fn: (s: P.JournalState) => P.JournalState) => setState(fn), []);
  const putConversation = useCallback((c: Conversation) => patch((s) => ({ ...s, conversations: s.conversations.some((x) => x.id === c.id) ? s.conversations.map((x) => (x.id === c.id ? c : x)) : [c, ...s.conversations] })), [patch]);

  const actions = useMemo(() => ({
    addStarters: (journalKeys: string[], companionKeys: string[]) => run(async () => { await P.addStarters(client, userId, journalKeys, companionKeys, stateRef.current); await refresh(); }),
    saveJournal: (j: Journal) => run(async () => { const saved = await P.saveJournal(client, userId, j); patch((s) => ({ ...s, journals: s.journals.some((x) => x.id === saved.id) ? s.journals.map((x) => (x.id === saved.id ? saved : x)) : [...s.journals, saved] })); return saved; }),
    deleteJournal: (id: string, moveTo: string | null, deleteEntries: boolean) => run(async () => { await P.deleteJournal(client, id, moveTo, deleteEntries); await refresh(); return true; }),
    saveCompanion: (c: Companion) => run(async () => { const saved = await P.saveCompanion(client, userId, c); patch((s) => ({ ...s, companions: s.companions.some((x) => x.id === saved.id) ? s.companions.map((x) => (x.id === saved.id ? saved : x)) : [...s.companions, saved] })); return saved; }),
    duplicateCompanion: (c: Companion) => run(async () => { const copy = await P.saveCompanion(client, userId, { ...c, id: newId(), name: `${c.name} (copy)`.slice(0, 80), presetKey: null, revision: 0, version: 1, position: stateRef.current.companions.length, archivedAt: null }); patch((s) => ({ ...s, companions: [...s.companions, copy] })); return copy; }),
    deleteCompanion: (id: string) => run(async () => { await P.deleteCompanion(client, userId, id); patch((s) => ({ ...s, companions: s.companions.filter((c) => c.id !== id), journals: s.journals.map((j) => (j.defaultCompanionId === id ? { ...j, defaultCompanionId: null } : j)) })); return true; }),
    restorePreset: (c: Companion) => { const p = companionPreset(c.presetKey); return p ? { ...c, name: p.name, description: p.description, instructions: p.instructions, conversationPrefs: p.conversationPrefs, openingStyle: p.openingStyle } : c; },
    savePrefs: (p: Preferences) => run(async () => { const saved = await P.savePreferences(client, userId, p); patch((s) => ({ ...s, prefs: saved })); return saved; }),

    startConversation: (o: { journalId: string; companion: Companion | null; mode: Mode; localDate?: string; startedAt?: string | null; status?: "draft" | "active"; draft?: string; continues?: { id: string; title: string; date: string } | null; guide?: { id: string; snapshot: GuideSnapshot; state?: GuideState } | null }) => run(async () => {
      const c = await P.createConversation(client, userId, { id: newId(), journalId: o.journalId, companion: o.companion, mode: o.mode, localDate: o.localDate ?? today, startedAt: o.startedAt ?? null, timeZone, status: o.status ?? "active", draft: o.draft, continues: o.continues, guide: o.guide });
      putConversation(c); return c;
    }),
    putConversation,
    /** Moves an entry to the day (and time) it belongs to; its words keep the time they were written. */
    redate: (c: Conversation, localDate: string, startedAt: string | null) => run(async () => { const saved = await P.redateConversation(client, c, localDate, startedAt); putConversation(saved); return saved; }),
    refreshConversation: async (id: string) => { const c = await P.refreshConversation(client, userId, id); if (c) putConversation(c); return c; },
    updateMeta: (c: Conversation) => run(async () => { const saved = await P.updateMeta(client, userId, c); putConversation(saved); return saved; }),
    deleteConversation: (id: string) => run(async () => { await P.deleteConversation(client, userId, id); patch((s) => ({ ...s, conversations: s.conversations.filter((c) => c.id !== id), entryTags: s.entryTags.filter((t) => t.conversationId !== id), bookmarks: s.bookmarks.filter((b) => b.conversationId !== id), highlightTags: s.highlightTags.filter((t) => s.bookmarks.some((b) => b.id === t.highlightId && b.conversationId !== id)) })); return true; }),
    /** Finish & Save: the entry closes; the analysis (if AI and allowed) runs after and may fail without losing anything. */
    finish: (c: Conversation) => run(async () => {
      const analyse = ai.enabled && stateRef.current.prefs.analysisAuto && !c.memoryOff;
      const done = await P.completeConversation(client, userId, c, analyse); putConversation(done);
      if (analyse) void aiAction({ action: "analysis", conversationId: c.id }).catch(() => undefined).finally(() => { void refresh(); void refreshAi(); });
      return done;
    }),
    analyse: async (id: string, regenerate = false) => { const r = await aiAction({ action: "analysis", conversationId: id, regenerate }); await refresh(); void refreshAi(); return r; },

    tagEntry: (conversationId: string, kind: TagKind, name: string) => run(async () => {
      const clean = cleanTagName(kind === "custom" ? name.replace(/^#+/, "") : name); if (!clean) return;
      let tag = findTag(stateRef.current.tags, kind, clean);
      if (!tag) { tag = await P.createTag(client, userId, kind, clean); const made = tag; patch((s) => ({ ...s, tags: [...s.tags.filter((t) => t.id !== made.id), made].sort((a, b) => a.name.localeCompare(b.name)) })); }
      if (tag.suppressed) { tag = await P.restoreTag(client, userId, tag.id); const back = tag; patch((s) => ({ ...s, tags: s.tags.map((x) => (x.id === back.id ? back : x)) })); }
      await P.tagEntry(client, userId, conversationId, tag.id); const id = tag.id;
      patch((s) => ({ ...s, entryTags: [...s.entryTags.filter((t) => !(t.conversationId === conversationId && t.tagId === id)), { conversationId, tagId: id, source: "user" }] }));
    }),
    confirmTag: (conversationId: string, tagId: string) => run(async () => { await P.tagEntry(client, userId, conversationId, tagId); patch((s) => ({ ...s, entryTags: s.entryTags.map((t) => (t.conversationId === conversationId && t.tagId === tagId ? { ...t, source: "user" } : t)) })); }),
    untagEntry: (conversationId: string, tag: Tag) => run(async () => {
      await P.untagEntry(client, userId, conversationId, tag.id);
      // Remember a rejected AI suggestion so a re-run of the analysis doesn't add it back.
      const a = await P.loadAnalysis(client, userId, conversationId); if (a) await P.dismissInAnalysis(client, userId, a, `tag:${tag.kind}:${normalizeTag(tag.name)}`);
      patch((s) => ({ ...s, entryTags: s.entryTags.filter((t) => !(t.conversationId === conversationId && t.tagId === tag.id)) }));
    }),
    setTagKind: (t: Tag, kind: TagKind) => run(async () => { const saved = await P.setTagKind(client, userId, t, kind); patch((s) => ({ ...s, tags: s.tags.map((x) => (x.id === saved.id ? saved : x)) })); return saved; }),
    suppressTag: (id: string) => run(async () => { const saved = await P.suppressTag(client, userId, id); patch((s) => ({ ...s, tags: s.tags.map((x) => (x.id === id ? saved : x)), entryTags: s.entryTags.filter((t) => t.tagId !== id), highlightTags: s.highlightTags.filter((t) => t.tagId !== id) })); return true; }),
    restoreTag: (id: string) => run(async () => { const saved = await P.restoreTag(client, userId, id); patch((s) => ({ ...s, tags: s.tags.map((x) => (x.id === id ? saved : x)) })); return true; }),
    /** One entry only: swap a wrong tag for the right one (Maya → Nia here), without touching the tag anywhere else.
     *  The wrong one is remembered as rejected for this entry, and the correction as guidance for future analysis. */
    replaceEntryTag: (conversationId: string, wrong: Tag, rightName: string) => run(async () => {
      const clean = cleanTagName(rightName.replace(/^#+/, "")); if (!clean || normalizeTag(clean) === wrong.normalized) return;
      await P.untagEntry(client, userId, conversationId, wrong.id);
      const a = await P.loadAnalysis(client, userId, conversationId); if (a) await P.dismissInAnalysis(client, userId, a, `tag:${wrong.kind}:${normalizeTag(wrong.name)}`);
      let right = findTag(stateRef.current.tags, wrong.kind, clean);
      if (!right) { right = await P.createTag(client, userId, wrong.kind, clean); const made = right; patch((s) => ({ ...s, tags: [...s.tags.filter((t) => t.id !== made.id), made].sort((x, y) => x.name.localeCompare(y.name)) })); }
      if (right.suppressed) { right = await P.restoreTag(client, userId, right.id); }
      await P.tagEntry(client, userId, conversationId, right.id); const rid = right.id;
      const fix = await P.recordCorrection(client, userId, wrong.kind, wrong.name, rid);
      patch((s) => ({ ...s, entryTags: [...s.entryTags.filter((t) => !(t.conversationId === conversationId && (t.tagId === wrong.id || t.tagId === rid))), { conversationId, tagId: rid, source: "user" }], corrections: [fix, ...s.corrections.filter((c) => c.id !== fix.id)] }));
    }),
    /** Guides: create or edit (a new version when the questions or behaviour change), archive, delete. No AI. */
    saveGuide: (g: Guide) => run(async () => {
      const before = stateRef.current.guides.find((x) => x.id === g.id);
      const changed = Boolean(before) && JSON.stringify([before!.questions, before!.intro, before!.mode, before!.companion]) !== JSON.stringify([g.questions.filter((q) => q.text.trim()), g.intro, g.mode, g.companion]);
      const saved = await P.saveGuide(client, userId, g, !before, changed);
      patch((s) => ({ ...s, guides: before ? s.guides.map((x) => (x.id === saved.id ? saved : x)) : [...s.guides, saved] }));
      return saved;
    }),
    deleteGuide: (id: string) => run(async () => { await P.deleteGuide(client, userId, id); patch((s) => ({ ...s, guides: s.guides.filter((g) => g.id !== id), journals: s.journals.map((x) => (x.defaultGuideId === id ? { ...x, defaultGuideId: null } : x)) })); return true; }),
    deleteCorrection: (id: string) => run(async () => { await P.deleteCorrection(client, userId, id); patch((s) => ({ ...s, corrections: s.corrections.filter((c) => c.id !== id) })); }),
    saveTag: (t: Tag) => run(async () => { const saved = await P.saveTag(client, userId, t); patch((s) => ({ ...s, tags: s.tags.map((x) => (x.id === saved.id ? saved : x)) })); return saved; }),
    mergeTags: (from: string, into: string) => run(async () => { await P.mergeTags(client, from, into); await refresh(); return true; }),
    deleteTag: (id: string) => run(async () => { await P.deleteTag(client, userId, id); patch((s) => ({ ...s, tags: s.tags.filter((t) => t.id !== id), entryTags: s.entryTags.filter((t) => t.tagId !== id), highlightTags: s.highlightTags.filter((t) => t.tagId !== id), corrections: s.corrections.filter((c) => c.toTagId !== id) })); return true; }),

    addBookmark: (b: Omit<Bookmark, "id" | "createdAt" | "updatedAt" | "start" | "end"> & { start?: number | null; end?: number | null }) => run(async () => { const saved = await P.addBookmark(client, userId, b); patch((s) => ({ ...s, bookmarks: [saved, ...s.bookmarks] })); return saved; }),
    saveBookmarkNote: (id: string, note: string) => run(async () => { await P.saveBookmarkNote(client, userId, id, note); patch((s) => ({ ...s, bookmarks: s.bookmarks.map((b) => (b.id === id ? { ...b, note } : b)) })); }),
    deleteBookmark: (id: string) => run(async () => { await P.deleteBookmark(client, userId, id); patch((s) => ({ ...s, bookmarks: s.bookmarks.filter((b) => b.id !== id), highlightTags: s.highlightTags.filter((t) => t.highlightId !== id) })); }),
    /** My tags on a highlight: an existing one by id, or a new one by name (deduplicated like any tag). No AI. */
    tagHighlight: (highlightId: string, tag: { id?: string; name?: string }) => run(async () => {
      let id = tag.id;
      if (!id && tag.name) { const clean = cleanTagName(tag.name.replace(/^#+/, "")); if (!clean) return; const made = findTag(stateRef.current.tags, "custom", clean) ?? await P.createTag(client, userId, "custom", clean); id = made.id; patch((s) => ({ ...s, tags: s.tags.some((t) => t.id === made.id) ? s.tags : [...s.tags, made].sort((a, b) => a.name.localeCompare(b.name)) })); }
      if (!id || stateRef.current.highlightTags.some((t) => t.highlightId === highlightId && t.tagId === id)) return;
      await P.tagHighlight(client, userId, highlightId, id); const tid = id;
      patch((s) => ({ ...s, highlightTags: [...s.highlightTags, { highlightId, tagId: tid }] }));
    }),
    untagHighlight: (highlightId: string, tagId: string) => run(async () => { await P.untagHighlight(client, userId, highlightId, tagId); patch((s) => ({ ...s, highlightTags: s.highlightTags.filter((t) => !(t.highlightId === highlightId && t.tagId === tagId)) })); }),

    /** Saves a memory. Correcting an AI-suggested memory's words also tells that entry's analysis not to propose the
     *  old wording again, so a routine re-analysis never quietly undoes your correction. */
    saveMemory: (m: Memory) => run(async () => {
      const before = stateRef.current.memories.find((x) => x.id === m.id);
      const saved = await P.saveMemory(client, userId, m);
      if (before && before.source === "ai" && before.sourceConversationId && normalizeMemory(before.body) !== normalizeMemory(saved.body)) await rememberNotToSuggest(before.sourceConversationId, before.body);
      patch((s) => ({ ...s, memories: [saved, ...s.memories.filter((x) => x.id !== saved.id)] })); return saved;
    }),
    deleteMemory: (id: string) => run(async () => { await P.deleteMemory(client, userId, id); patch((s) => ({ ...s, memories: s.memories.filter((m) => m.id !== id) })); }),
    /** Dismiss a suggestion: it's removed, and its entry's analysis won't propose the same words again. */
    dismissMemory: (m: Memory) => run(async () => {
      await P.deleteMemory(client, userId, m.id);
      if (m.sourceConversationId) await rememberNotToSuggest(m.sourceConversationId, m.body);
      patch((s) => ({ ...s, memories: s.memories.filter((x) => x.id !== m.id) }));
    }),

    addLink: (l: EntryLink) => run(async () => { await P.addLink(client, userId, l); patch((s) => ({ ...s, links: [...s.links.filter((x) => !(x.conversationId === l.conversationId && x.kind === l.kind && x.targetId === l.targetId)), l] })); }),
    removeLink: (l: EntryLink) => run(async () => { await P.removeLink(client, userId, l); patch((s) => ({ ...s, links: s.links.filter((x) => !(x.conversationId === l.conversationId && x.kind === l.kind && x.targetId === l.targetId)) })); }),
    keepTest: (o: Omit<Parameters<typeof P.keepTest>[1], "localDate" | "timeZone">) => run(async () => { const c = await P.keepTest(client, { ...o, localDate: today, timeZone }); putConversation(c); if (ai.enabled && stateRef.current.prefs.analysisAuto) void aiAction({ action: "analysis", conversationId: c.id }).catch(() => undefined).finally(() => void refresh()); return c; }),
    clearError: () => setStatus((s) => ({ ...s, error: "" })),
    /** First run: one journal, one default companion. */
    setup: (o: { journalName: string; presetKey: string; instructions?: string }) => run(async () => { const out = await P.setupJournal(client, userId, { ...o, prefs: stateRef.current.prefs }); await refresh(); return out; }),
    switchCompanion: (c: Conversation, companion: Companion) => run(async () => { const saved = await P.switchCompanion(client, userId, c, companion); putConversation(saved); return saved; }),
    /** The default companion belongs to a journal (the primary journal's is everyone's default). */
    setDefaultCompanion: (journal: Journal, companionId: string) => run(async () => { const saved = await P.saveJournal(client, userId, { ...journal, defaultCompanionId: companionId }); patch((s) => ({ ...s, journals: s.journals.map((x) => (x.id === saved.id ? saved : x)) })); return saved; }),
  }), [client, userId, run, patch, putConversation, refresh, refreshAi, today, timeZone, ai.enabled, rememberNotToSuggest]);

  return { client, userId, today, timeZone, state, status, ai, refresh, refreshAi, ...actions };
}

export type JournalStore = ReturnType<typeof useJournalStore>;
const Ctx = createContext<JournalStore | null>(null);
export function JournalProvider({ children }: { children: ReactNode }) { const store = useJournalStore(); return <Ctx.Provider value={store}>{children}</Ctx.Provider>; }
export function useJournal(): JournalStore { const s = useContext(Ctx); if (!s) throw Error("useJournal outside JournalProvider"); return s; }

/** Helpers views share. */
export const activeJournals = (s: P.JournalState) => s.journals.filter((j) => !j.archivedAt);
export const activeCompanions = (s: P.JournalState) => s.companions.filter((c) => !c.archivedAt);
export const tagsFor = (s: P.JournalState, conversationId: string) => s.entryTags.filter((t) => t.conversationId === conversationId).flatMap((l) => { const t = s.tags.find((x) => x.id === l.tagId); return t ? [{ ...t, source: l.source }] : []; });

/** The primary journal: the one chosen in preferences, else the first. */
export const primaryJournal = (s: P.JournalState) => activeJournals(s).find((j) => j.id === s.prefs.defaultJournalId) ?? activeJournals(s)[0] ?? null;
/** Which companion a journal uses by default: its own, else the primary journal's, else the first. */
export const defaultCompanionFor = (s: P.JournalState, journal: { defaultCompanionId: string | null } | null) => {
  const list = activeCompanions(s), primary = primaryJournal(s);
  return list.find((c) => c.id === journal?.defaultCompanionId) ?? list.find((c) => c.id === primary?.defaultCompanionId) ?? list[0] ?? null;
};
