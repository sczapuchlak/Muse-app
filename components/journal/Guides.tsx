"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { MuseSegmented } from "../design/MuseSegmented";
import { MuseIcon } from "../MuseIcon";
import { newId } from "./useJournal";
import { Thread, type ThreadMessage } from "./Thread";
import type { Guide, GuideQuestion, GuideSnapshot, GuideState } from "@/lib/journal/model";
import type { MuseTone } from "../design/MuseHeading";

const q = (text: string, optional = false): GuideQuestion => ({ id: newId(), text, optional });
/** Starting points the person can copy and change. None is built in or required. */
export const GUIDE_EXAMPLES: { key: string; make: () => Partial<Guide> }[] = [
  { key: "Tarot Reflection", make: () => ({ name: "Tarot Reflection", icon: "🔮", description: "For a reading.", questions: [q("What cards did you draw?"), q("Were any cards reversed?", true), q("What stood out in the reading?"), q("How does this connect to your life right now?"), q("What would you like to remember from this reading?", true)] }) },
  { key: "Travel Memories", make: () => ({ name: "Travel Memories", icon: "🧳", questions: [q("Where did you go?"), q("What did you experience?"), q("What surprised you?", true), q("What was your favorite moment?"), q("What do you want to remember?", true)] }) },
  { key: "Gratitude", make: () => ({ name: "Gratitude", icon: "🌱", mode: "all", questions: [q("What are you grateful for today?"), q("What made you smile?", true), q("Who or what supported you?", true), q("What do you want to carry forward?", true)] }) },
  { key: "Spanish Practice", make: () => ({ name: "Spanish Practice", icon: "💬", companion: true, intro: "Reply in Spanish. Only if I ask, point out one or two mistakes gently.", questions: [q("¿Qué hiciste hoy?"), q("¿Qué fue lo mejor de tu día?"), q("¿Qué te gustaría hacer mañana?", true)] }) },
];
export const blankGuide = (): Guide => ({ id: newId(), name: "", description: "", icon: "", intro: "", mode: "steps", companion: false, questions: [q("")], version: 1, archivedAt: null, revision: 1, createdAt: "" });

/**
 * The Guided prompts section of a journal's settings: one switch, then (when on) the questions in order, how they're
 * shown, an opening note and whether the companion may talk about answers. Turning it off keeps the questions.
 * Plain data, no AI. The questions live in the journal's one guide record (an implementation detail).
 */
export function GuidedPrompts({ on, onToggle, g, set }: { on: boolean; onToggle: (v: boolean) => void; g: Guide; set: (p: Partial<Guide>) => void }) {
  const setQ = (i: number, p: Partial<GuideQuestion>) => set({ questions: g.questions.map((x, k) => (k === i ? { ...x, ...p } : x)) });
  const move = (i: number, by: number) => { const list = [...g.questions]; const [x] = list.splice(i, 1); list.splice(Math.max(0, Math.min(list.length, i + by)), 0, x); set({ questions: list }); };
  const empty = !g.questions.some((x) => x.text.trim());
  return <section className="mj-guided-prompts" aria-label="Guided prompts">
    <label className="mj-toggle muse-check-row mj-guided-switch"><input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} />
      <span><b>Use guided prompts</b><small>New entries in this journal start with your questions, one at a time or all together. Your companion stays the same.</small></span></label>
    {on && <div className="mj-guide-form">
      {empty && <div className="mj-guide-examples"><span className="type-meta">Start from an example</span>
        <ul className="mj-chip-list">{GUIDE_EXAMPLES.map((x) => <li key={x.key}><button type="button" className="mj-filter-chip" onClick={() => { const e = x.make(); set({ questions: e.questions ?? [], intro: e.intro ?? "", mode: e.mode ?? "steps", companion: e.companion ?? false }); }}>{x.key}</button></li>)}</ul></div>}
      <fieldset className="mj-guide-questions"><legend className="editor-label">Questions</legend>
        <ol>{g.questions.map((x, i) => <li key={x.id} className="mj-guide-q-row">
          <span className="mj-guide-num type-numeric">{i + 1}</span>
          <textarea rows={2} aria-label={`Question ${i + 1}`} value={x.text} maxLength={500} onChange={(e) => setQ(i, { text: e.target.value })} placeholder="Ask yourself something" />
          <div className="mj-guide-q-tools">
            <label className="mj-toggle muse-check-row"><input type="checkbox" checked={x.optional} onChange={(e) => setQ(i, { optional: e.target.checked })} /> Optional</label>
            <button type="button" className="mj-x" aria-label={`Move question ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
            <button type="button" className="mj-x" aria-label={`Move question ${i + 1} down`} disabled={i === g.questions.length - 1} onClick={() => move(i, 1)}>↓</button>
            <button type="button" className="mj-x" aria-label={`Duplicate question ${i + 1}`} onClick={() => set({ questions: [...g.questions.slice(0, i + 1), { ...x, id: newId() }, ...g.questions.slice(i + 1)] })}>⧉</button>
            <button type="button" className="mj-x" aria-label={`Delete question ${i + 1}`} disabled={g.questions.length === 1} onClick={() => set({ questions: g.questions.filter((_, k) => k !== i) })}>×</button>
          </div>
        </li>)}</ol>
        <button type="button" className="muse-button" disabled={g.questions.length >= 30} onClick={() => set({ questions: [...g.questions, q("")] })}><MuseIcon name="plus" size={15} />Add a question</button>
      </fieldset>
      <div className="editor-label">Show the questions<MuseSegmented label="Presentation" value={g.mode} onChange={(m) => set({ mode: m })} options={[{ id: "steps", label: "One at a time" }, { id: "all", label: "All together" }]} /></div>
      <label className="editor-label">Opening note (optional)<textarea rows={2} value={g.intro} maxLength={2000} onChange={(e) => set({ intro: e.target.value })} placeholder="Shown above the questions; your companion reads it too if it joins in" /></label>
      <label className="mj-toggle muse-check-row"><input type="checkbox" checked={g.companion} onChange={(e) => set({ companion: e.target.checked })} /> Let my companion talk about an answer when I ask (it never replies on its own)</label>
      <p className="mj-note">Changes apply to new entries. Entries you’ve already written keep the questions they were written with.</p>
    </div>}
  </section>;
}

function Grow({ value, onChange, label, placeholder, disabled }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string; disabled?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => { const el = ref.current; if (!el) return; el.style.height = "auto"; el.style.height = `${Math.max(el.scrollHeight, 96)}px`; }, [value]);
  return <textarea ref={ref} rows={3} aria-label={label} placeholder={placeholder} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
}

/**
 * A guided entry inside the normal workspace: the guide's questions one at a time or all at once, answers saved as you
 * write (like a draft), and, only when the guide allows it and you ask, a companion reply to one answer. Moving between
 * questions never calls AI. Finish entry turns every answer into a message under its question.
 */
export function GuidedEntry({ guide, state, onState, messages, stream, companion, canTalk, busy, dock, onTalk, onFinish, finishDisabled }: {
  guide: GuideSnapshot; state: GuideState; onState: (s: GuideState) => void; messages: ThreadMessage[]; stream: { text: string; messageId: string | null } | null;
  companion: { name: string; icon: string; tone: MuseTone } | null; canTalk: boolean; busy: boolean; dock: HTMLElement | null;
  onTalk: (question: GuideQuestion, text: string) => void; onFinish: () => void; finishDisabled: boolean;
}) {
  const qs = guide.questions, answers = state.answers ?? {}, sent = new Set(state.sent ?? []);
  const step = Math.min(Math.max(state.step ?? 0, 0), Math.max(qs.length - 1, 0));
  const setAnswer = (id: string, text: string) => onState({ ...state, answers: { ...answers, [id]: text } });
  const go = (n: number) => onState({ ...state, step: Math.min(Math.max(n, 0), qs.length - 1) });
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => { if (guide.mode === "steps") top.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [step, guide.mode]);
  const card = (x: GuideQuestion, i: number) => {
    const mine = messages.filter((m) => m.role === "user" && m.guideQuestionId === x.id);
    const exchange: ThreadMessage[] = messages.filter((m) => mine.some((u) => u.id === m.id) || (m.role === "assistant" && mine.some((u) => u.id === m.replyTo)));
    const live = stream && mine.some((u) => u.id === stream.messageId) ? [{ id: "streaming", role: "assistant" as const, body: stream.text || " ", createdAt: new Date().toISOString(), correctedAt: null, streaming: true }] : [];
    const text = answers[x.id] ?? "", isSent = sent.has(x.id) || mine.length > 0;
    return <section key={x.id} className="mj-guide-card" aria-labelledby={`gq-${x.id}`} style={{ "--i": i } as React.CSSProperties}>
      <h3 id={`gq-${x.id}`} className="mj-guide-question type-title"><span className="mj-guide-num type-numeric">{i + 1}</span>{x.text}{x.optional && <em className="mj-pill">Optional</em>}</h3>
      {isSent ? <Thread messages={[...exchange.map((m) => ({ ...m, guideQuestion: null })), ...live]} companion={companion} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone} />
        : <Grow value={text} onChange={(v) => setAnswer(x.id, v)} label={x.text} placeholder="Write or dictate…" />}
      {canTalk && !isSent && text.trim() && <button type="button" className="mj-link mj-guide-talk" disabled={busy} onClick={() => onTalk(x, text.trim())}>Talk about this with {companion?.name.replace(/^The /, "") ?? "your companion"} →</button>}
    </section>;
  };
  const answered = qs.filter((x) => (answers[x.id] ?? "").trim() || sent.has(x.id) || messages.some((m) => m.guideQuestionId === x.id)).length;
  const last = step === qs.length - 1, current = qs[step];
  const currentEmpty = current && !(answers[current.id] ?? "").trim() && !sent.has(current.id);
  return <div className="mj-guided" ref={top}>
    <header className="mj-guide-head">
      <p className="muse-kicker type-meta">Guided entry{guide.companion && canTalk ? ` · ${companion?.name ?? "companion"} can join in` : " · private"}</p>
      <h2 className="type-display mj-guide-title">{guide.icon && <span aria-hidden="true">{guide.icon} </span>}{guide.name}</h2>
      {guide.intro && <p className="mj-guide-intro type-quote">{guide.intro}</p>}
      {guide.mode === "steps" && qs.length > 1 && <ol className="mj-guide-progress" aria-label={`Question ${step + 1} of ${qs.length}`}>
        {qs.map((x, i) => <li key={x.id}><button type="button" aria-label={`Question ${i + 1}`} aria-current={i === step ? "step" : undefined} data-done={(answers[x.id] ?? "").trim() || sent.has(x.id) ? true : undefined} onClick={() => go(i)} /></li>)}
      </ol>}
    </header>
    {guide.mode === "steps" ? current && <div key={current.id} className="mj-guide-step"><p className="type-meta mj-guide-count">Question {step + 1} of {qs.length}</p>{card(current, step)}</div>
      : <div className="mj-guide-all">{qs.map(card)}</div>}
    {dock && createPortal(<div className="mj-composer-dock mj-guide-dock" data-paired>
      <div className="mj-composer-tools"><small className="mj-composer-hint" data-live>{answered} of {qs.length} answered · saved as you write</small></div>
      <div className="mj-composer-bar">
        {guide.mode === "steps" ? <>
          <span className="mj-guide-nav">
            <button type="button" className="muse-button" disabled={step === 0} onClick={() => go(step - 1)}>Back</button>
            {current?.optional && currentEmpty && !last && <button type="button" className="muse-button button-ghost" onClick={() => go(step + 1)}>Skip</button>}
          </span>
          {last ? <button type="button" className="muse-button button-primary" disabled={finishDisabled} onClick={onFinish}>Finish entry</button>
            : <button type="button" className="muse-button button-primary" disabled={!current?.optional && currentEmpty} onClick={() => go(step + 1)}>Next<MuseIcon name="arrow" size={16} /></button>}
        </> : <>
          <span />
          <button type="button" className="muse-button button-primary" disabled={finishDisabled} onClick={onFinish}>Finish entry</button>
        </>}
      </div>
    </div>, dock)}
  </div>;
}
