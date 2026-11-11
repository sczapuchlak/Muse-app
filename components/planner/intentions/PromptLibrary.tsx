"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { createMuseBrowserClient } from "@/lib/supabase/client";
import { intentionPeriods, type IntentionPeriod } from "@/lib/intentions/periods";
import { featuredPromptIds, filterPrompts, libraryPrompt, promptCategories, promptLibrary, type LibraryPrompt, type PromptCategory, type PromptKind } from "@/lib/intentions/prompts";
import { addFavorite, emptyPromptState, MAX_CUSTOM_PROMPTS, readPromptState, removeRow, saveCustom, setCustomFavorite, updateCustom, validCustom, type CustomInput, type CustomPrompt, type PromptState } from "@/lib/intentions/prompt-store";
import { missingTable } from "@/lib/intentions/persistence";
import { MuseChoiceMenu } from "../../MuseChoiceMenu";
import { MuseDrawer } from "../../MuseDrawer";
import { MuseIcon } from "../../MuseIcon";
import { MuseStar } from "../../MuseStar";
import "./PromptLibrary.css";

type Client = ReturnType<typeof createMuseBrowserClient>;
export type AddablePrompt = { kind: PromptKind; title: string; question: string };
type Tab = "explore" | "favorites" | "mine";

const intro: Record<IntentionPeriod, string> = {
  week: "Small, practical questions for the days just ahead.",
  month: "Questions for a chapter: rhythms, projects and what to carry in.",
  quarter: "Questions for a season: what to steer, finish and let go of.",
  year: "Questions for who you are becoming, and the life you want to be living.",
};
const category = (id: PromptCategory | null) => promptCategories.find((c) => c.id === id);
const periodName = (id: IntentionPeriod) => intentionPeriods.find((p) => p.id === id)?.label ?? id;

/** Favorites and the person's own prompts, loaded once per open. A server without the table still gets the library. */
function usePromptState(client: () => Client) {
  const [state, setState] = useState<PromptState>(emptyPromptState), [phase, setPhase] = useState<"loading" | "ready" | "unavailable">("loading"), [error, setError] = useState("");
  useEffect(() => { let live = true;
    readPromptState(client()).then((s) => { if (live) { setState(s); setPhase("ready"); } })
      .catch((e) => { if (live) { setPhase(missingTable(e) ? "unavailable" : "ready"); if (!missingTable(e)) setError("Your saved prompts couldn’t load. The library below still works."); } });
    return () => { live = false; }; }, [client]);
  const run = useCallback(async (job: () => Promise<void>) => { setError(""); try { await job(); } catch (e) { setError(e instanceof Error ? e.message : "That didn’t save. Try again."); } }, []);
  return { state, setState, phase, error, setError, run };
}

export function PromptLibrary({ period, client, usedQuestions, onAdd, onClose, returnFocus }: { period: IntentionPeriod; client: () => Client; usedQuestions: Set<string>; onAdd: (p: AddablePrompt) => void; onClose: () => void; returnFocus?: HTMLElement | null }) {
  const [tab, setTab] = useState<Tab>("explore"), [query, setQuery] = useState(""), [cat, setCat] = useState<PromptCategory | "all">("all"), [notice, setNotice] = useState("");
  const { state, setState, phase, error, run } = usePromptState(client);
  const canSave = phase === "ready";
  const list = promptLibrary[period];
  const customForPeriod = useMemo(() => state.custom.filter((c) => !c.periods.length || c.periods.includes(period)), [state.custom, period]);
  const add = (p: AddablePrompt) => { onAdd(p); setNotice(`Added “${p.title}” to your page.`); };

  const toggleFavorite = (key: string) => void run(async () => {
    const existing = state.favorites.get(key);
    if (existing) { await removeRow(client(), existing); setState((s) => { const favorites = new Map(s.favorites); favorites.delete(key); return { ...s, favorites }; }); }
    else { const id = await addFavorite(client(), key); setState((s) => ({ ...s, favorites: new Map(s.favorites).set(key, id) })); }
  });
  const toggleCustomFavorite = (c: CustomPrompt) => void run(async () => { await setCustomFavorite(client(), c.id, !c.favorite); setState((s) => ({ ...s, custom: s.custom.map((x) => x.id === c.id ? { ...x, favorite: !c.favorite } : x) })); });

  const searching = query.trim() !== "" || cat !== "all";
  const results = useMemo(() => {
    const lib = filterPrompts(list, cat, query);
    const mine = customForPeriod.filter((c) => (cat === "all" || c.category === cat) && query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => `${c.title} ${c.question}`.toLowerCase().includes(w)));
    return { lib, mine };
  }, [list, cat, query, customForPeriod]);
  const counts = useMemo(() => Object.fromEntries(promptCategories.map((c) => [c.id, list.filter((p) => p.category === c.id).length])) as Record<PromptCategory, number>, [list]);
  const featured = featuredPromptIds[period].map(libraryPrompt).filter((p): p is LibraryPrompt => !!p);
  const favoriteLibrary = [...state.favorites.keys()].map(libraryPrompt).filter((p): p is LibraryPrompt => !!p);
  const favoriteCustom = state.custom.filter((c) => c.favorite);

  const libCard = (p: LibraryPrompt, withPeriod = false) => <PromptCard key={p.id} emoji={category(p.category)?.emoji ?? "✨"} title={p.title} question={p.question} kind={p.kind} tag={withPeriod ? periodName(p.period) : undefined}
    used={usedQuestions.has(p.question)} favorite={state.favorites.has(p.id)} canFavorite={canSave} onFavorite={() => toggleFavorite(p.id)} onAdd={() => add({ kind: p.kind, title: p.title, question: p.question })} />;
  const customCard = (c: CustomPrompt, extra?: React.ReactNode) => <PromptCard key={c.id} emoji={category(c.category)?.emoji ?? "✍️"} title={c.title} question={c.question} kind={c.kind} tag="Mine"
    used={usedQuestions.has(c.question)} favorite={c.favorite} canFavorite={canSave} onFavorite={() => toggleCustomFavorite(c)} onAdd={() => add({ kind: c.kind, title: c.title, question: c.question })} extra={extra} />;

  return <MuseDrawer title={`Prompts for your ${period}`} onClose={onClose} returnFocus={returnFocus}>
    <div className="muse-prompts" data-period={period}>
      <p className="muse-prompts-intro"><MuseStar size={13} prismatic /> {intro[period]}</p>
      <div className="muse-segmented muse-prompts-tabs" role="tablist" aria-label="Prompt library">
        {([["explore", "Explore"], ["favorites", `Favorites${state.favorites.size + favoriteCustom.length ? ` · ${state.favorites.size + favoriteCustom.length}` : ""}`], ["mine", `My prompts${state.custom.length ? ` · ${state.custom.length}` : ""}`]] as [Tab, string][]).map(([id, label]) =>
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      <p className="muse-prompts-notice" role="status" aria-live="polite">{notice}</p>
      {error && <p className="muse-prompts-error" role="alert">{error}</p>}
      {phase === "unavailable" && tab !== "explore" ? <p className="muse-prompts-quiet">Saving favorites and your own prompts isn’t available on this server yet. The library still works, and anything you add goes onto your page.</p>
        : tab === "explore" ? <>
          <div className="muse-prompts-search"><MuseIcon name="search" size={15} /><input type="search" aria-label="Search prompts" placeholder={`Search ${list.length} ${period} prompts`} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <div className="muse-prompts-chips" role="group" aria-label="Prompt category">
            <button type="button" aria-pressed={cat === "all"} onClick={() => setCat("all")}>All</button>
            {promptCategories.filter((c) => counts[c.id] > 0).map((c) => <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? "all" : c.id)}><span aria-hidden="true">{c.emoji}</span>{c.label}<small>{counts[c.id]}</small></button>)}
          </div>
          {!searching ? <section aria-label="Good places to start"><h3 className="muse-prompts-heading">Good places to start</h3><div className="muse-prompts-grid">{featured.map((p) => libCard(p))}</div>
              <p className="muse-prompts-quiet">Pick a category or search to see all {list.length} prompts for a {period}.</p></section>
            : <section aria-label="Prompts"><h3 className="muse-prompts-heading">{results.lib.length + results.mine.length} {results.lib.length + results.mine.length === 1 ? "prompt" : "prompts"}</h3>
              {results.lib.length + results.mine.length === 0 ? <p className="muse-prompts-quiet">Nothing matches. Try another word, or <button type="button" className="text-button" onClick={() => setTab("mine")}>write your own</button>.</p>
                : <div className="muse-prompts-grid">{results.mine.map((c) => customCard(c))}{results.lib.map((p) => libCard(p))}</div>}</section>}
        </> : tab === "favorites" ? <section aria-label="Favorites">
          {!favoriteLibrary.length && !favoriteCustom.length ? <p className="muse-prompts-quiet">No favorites yet. Tap the heart on any prompt to keep it here for next time.</p>
            : <div className="muse-prompts-grid">{favoriteCustom.map((c) => customCard(c))}{favoriteLibrary.map((p) => libCard(p, p.period !== period))}</div>}
        </section> : <MyPrompts period={period} client={client} state={state} setState={setState} canSave={canSave} run={run} renderCard={customCard} onAdd={add} />}
    </div>
  </MuseDrawer>;
}

function PromptCard({ emoji, title, question, kind, tag, used, favorite, canFavorite, onFavorite, onAdd, extra }: { emoji: string; title: string; question: string; kind: PromptKind; tag?: string; used: boolean; favorite: boolean; canFavorite: boolean; onFavorite: () => void; onAdd: () => void; extra?: React.ReactNode }) {
  return <article className="muse-prompt-card" data-used={used || undefined}>
    <header><span className="muse-prompt-emoji" aria-hidden="true">{emoji}</span><h4>{title}</h4>
      {canFavorite && <button type="button" className="muse-reflections-icon" aria-pressed={favorite} aria-label={favorite ? `Remove ${title} from favorites` : `Favorite ${title}`} onClick={onFavorite}><MuseIcon name="heart" size={15} /></button>}</header>
    <p>{question}</p>
    <footer><span className="muse-prompt-meta">{kind === "list" ? "A short list" : "Free writing"}{tag ? ` · ${tag}` : ""}</span>
      <span className="muse-prompt-actions">{extra}<button type="button" className="muse-reflections-pill" disabled={used} onClick={onAdd}>{used ? <>On your page</> : <><MuseIcon name="plus" size={13} />Add to page</>}</button></span></footer>
  </article>;
}

function MyPrompts({ period, client, state, setState, canSave, run, renderCard, onAdd }: { period: IntentionPeriod; client: () => Client; state: PromptState; setState: React.Dispatch<React.SetStateAction<PromptState>>; canSave: boolean; run: (job: () => Promise<void>) => Promise<void>; renderCard: (c: CustomPrompt, extra?: React.ReactNode) => React.ReactNode; onAdd: (p: AddablePrompt) => void }) {
  const blank = (): CustomInput => ({ title: "", question: "", kind: "writing", category: null, periods: [period] });
  const [editing, setEditing] = useState<string | "new" | null>(state.custom.length ? null : "new"), [draft, setDraft] = useState<CustomInput>(blank), [confirm, setConfirm] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) titleRef.current?.focus(); }, [editing]);
  const open = (c?: CustomPrompt) => { setDraft(c ? { title: c.title, question: c.question, kind: c.kind, category: c.category, periods: c.periods } : blank()); setEditing(c?.id ?? "new"); };
  const save = (addToPage: boolean) => void run(async () => {
    if (editing === "new") { if (state.custom.length >= MAX_CUSTOM_PROMPTS) throw Error(`You can keep up to ${MAX_CUSTOM_PROMPTS} prompts of your own.`); const c = await saveCustom(client(), draft); setState((s) => ({ ...s, custom: [c, ...s.custom] })); if (addToPage) onAdd({ kind: c.kind, title: c.title, question: c.question }); }
    else if (editing) { const c = await updateCustom(client(), editing, draft); setState((s) => ({ ...s, custom: s.custom.map((x) => x.id === c.id ? c : x) })); }
    setEditing(null);
  });
  const remove = (id: string) => void run(async () => { await removeRow(client(), id); setState((s) => ({ ...s, custom: s.custom.filter((x) => x.id !== id) })); setConfirm(null); });
  const togglePeriod = (p: IntentionPeriod) => setDraft((d) => ({ ...d, periods: d.periods.includes(p) ? d.periods.filter((x) => x !== p) : [...d.periods, p] }));
  return <section aria-label="My prompts" className="muse-prompts-mine">
    {editing ? <form className="muse-prompts-form" onSubmit={(e) => { e.preventDefault(); if (validCustom(draft)) save(editing === "new"); }}>
      <h3 className="muse-prompts-heading">{editing === "new" ? "Write your own prompt" : "Edit prompt"}</h3>
      <label>Short title<input ref={titleRef} maxLength={60} value={draft.title} placeholder="e.g. What I’m grateful for" onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
      <label>The question<textarea maxLength={280} rows={3} value={draft.question} placeholder="What do you want to ask yourself?" onChange={(e) => setDraft({ ...draft, question: e.target.value })} /></label>
      <div className="muse-prompts-form-row">
        <div className="muse-segmented" role="group" aria-label="How you’ll answer">{(["writing", "list"] as PromptKind[]).map((k) => <button key={k} type="button" aria-pressed={draft.kind === k} onClick={() => setDraft({ ...draft, kind: k })}>{k === "writing" ? "Free writing" : "A short list"}</button>)}</div>
        <MuseChoiceMenu label="Category" valueLabel={category(draft.category)?.label ?? "No category"} options={[{ id: "", label: "No category" }, ...promptCategories.map((c) => ({ id: c.id, label: `${c.emoji} ${c.label}` }))]} selectedIds={[draft.category ?? ""]} onSelect={(id) => setDraft({ ...draft, category: (id || null) as PromptCategory | null })} />
      </div>
      <fieldset className="muse-prompts-periods"><legend>Show it for</legend>{intentionPeriods.map((p) => <button key={p.id} type="button" aria-pressed={draft.periods.includes(p.id)} onClick={() => togglePeriod(p.id)}>{p.label}</button>)}<small>{draft.periods.length ? "" : "Every period"}</small></fieldset>
      {!canSave && <p className="muse-prompts-quiet">Saving prompts isn’t available on this server yet.</p>}
      <div className="muse-reflections-actions">
        {editing === "new" && <button type="submit" className="muse-button button-primary" disabled={!canSave || !validCustom(draft)}>Save and add to page</button>}
        <button type="button" className={editing === "new" ? "muse-reflections-pill" : "muse-button button-primary"} disabled={!canSave || !validCustom(draft)} onClick={() => save(false)}>{editing === "new" ? "Just save it" : "Save changes"}</button>
        {(state.custom.length > 0 || editing !== "new") && <button type="button" className="text-button" onClick={() => setEditing(null)}>Cancel</button>}
      </div>
    </form> : <>
      <button type="button" className="muse-reflections-add-trigger" disabled={!canSave} onClick={() => open()}><MuseIcon name="plus" size={16} />Write your own prompt</button>
      <div className="muse-prompts-grid">{state.custom.map((c) => confirm === c.id
        ? <article key={c.id} className="muse-prompt-card" role="alertdialog" aria-label={`Delete ${c.title}`}><p><strong>Delete “{c.title}”?</strong> Pages that already used it keep their section.</p><footer><span className="muse-prompt-actions"><button type="button" className="muse-button" data-destructive onClick={() => remove(c.id)}>Delete prompt</button><button type="button" className="muse-reflections-pill" onClick={() => setConfirm(null)}>Keep it</button></span></footer></article>
        : renderCard(c, <><button type="button" className="muse-reflections-icon" aria-label={`Edit ${c.title}`} onClick={() => open(c)}><MuseIcon name="edit" size={14} /></button><button type="button" className="muse-reflections-icon" aria-label={`Delete ${c.title}`} onClick={() => setConfirm(c.id)}><MuseIcon name="trash" size={14} /></button></>))}</div>
      {!state.custom.length && <p className="muse-prompts-quiet">Your own prompts live here, ready to add to any page.</p>}
    </>}
  </section>;
}

