"use client";
import { useEffect, useRef, useState } from "react";
import type { Emotion, EmotionQuadrant } from "@/lib/models";
import { cleanFeelingName, findFeelingByName, MAX_FEELING_NAME, type CustomFeeling } from "@/lib/feelings";
import { MuseIcon } from "../MuseIcon";
import { FeelingQuadrantPicker } from "./FeelingQuadrantPicker";

type Back = () => void;
const Back = ({ onClick }: { onClick: Back }) => <button type="button" className="text-button muse-feeling-back" onClick={onClick}><MuseIcon name="chevron" size={14} />Back to feelings</button>;

/** Adding a feeling that isn't in the library: name it, then say how it feels. Replaces the list in place, no extra screens. */
export function FeelingCreator({ initialName, library, onCreate, onUse, onBack }: { initialName: string; library: readonly Emotion[]; onCreate: (draft: { name: string; quadrant: EmotionQuadrant }) => Promise<void>; onUse: (existing: Emotion) => void; onBack: Back }) {
  const [name, setName] = useState(cleanFeelingName(initialName)), [quadrant, setQuadrant] = useState<EmotionQuadrant | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  const clean = cleanFeelingName(name), existing = clean ? findFeelingByName(clean, library) : undefined;
  async function save() { if (!clean || !quadrant || existing || busy) return; setBusy(true); setError(""); try { await onCreate({ name: clean, quadrant }); } catch (e) { setError(e instanceof Error ? e.message : "That didn’t save. Try again."); setBusy(false); } }
  return <form className="muse-feeling-panel" onSubmit={(e) => { e.preventDefault(); void save(); }}>
    <Back onClick={onBack} />
    <label className="editor-label" htmlFor="new-feeling-name">Name this feeling</label>
    <input id="new-feeling-name" ref={ref} className="muse-feeling-name" value={name} maxLength={MAX_FEELING_NAME} autoComplete="off" onChange={(e) => setName(e.target.value)} />
    {existing ? <p className="muse-feeling-note" role="status">“{existing.name}” is already in your feelings. <button type="button" className="text-button" onClick={() => onUse(existing)}>Use it</button> or choose another name.</p>
      : <FeelingQuadrantPicker value={quadrant} onChange={setQuadrant} />}
    {error && <p className="muse-feeling-error" role="alert">{error}</p>}
    <div className="muse-feeling-actions"><button type="submit" className="muse-button button-primary" disabled={!clean || !quadrant || !!existing || busy}>Add feeling</button></div>
  </form>;
}

/** "How does this feel to you?" for a word people feel differently. Applies to this entry only; the shared word never changes. */
export function FeelingInterpreter({ emotion, current, onChoose, onBack }: { emotion: Emotion; current: EmotionQuadrant; onChoose: (q: EmotionQuadrant) => void; onBack: Back }) {
  const [quadrant, setQuadrant] = useState<EmotionQuadrant>(current);
  return <div className="muse-feeling-panel">
    <Back onClick={onBack} />
    <h3 className="muse-feeling-title"><span aria-hidden="true">{emotion.emoji}</span>{emotion.name}</h3>
    {emotion.definition && <p className="muse-feeling-note">{emotion.definition}</p>}
    <FeelingQuadrantPicker value={quadrant} onChange={setQuadrant} label={`How does “${emotion.name}” feel to you?`} />
    <p className="muse-feeling-note">There’s no single right way to feel a word. This choice is saved with this entry only.</p>
    <div className="muse-feeling-actions"><button type="button" className="muse-button button-primary" onClick={() => onChoose(quadrant)}>Use this</button></div>
  </div>;
}

/** The person's own feelings: rename, change the default quadrant, delete. Recorded entries keep what they recorded. */
export function FeelingManager({ custom, onUpdate, onDelete, onBack, error }: { custom: readonly CustomFeeling[]; onUpdate: (id: string, patch: { name?: string; quadrant?: EmotionQuadrant }) => Promise<void>; onDelete: (id: string) => Promise<void>; onBack: Back; error?: string }) {
  const [editing, setEditing] = useState<string | null>(null), [name, setName] = useState(""), [quadrant, setQuadrant] = useState<EmotionQuadrant | null>(null), [confirm, setConfirm] = useState<string | null>(null), [problem, setProblem] = useState("");
  const open = (c: CustomFeeling) => { setEditing(c.id); setName(c.name); setQuadrant(c.quadrant); setConfirm(null); setProblem(""); };
  async function save(c: CustomFeeling) { const clean = cleanFeelingName(name); if (!clean || !quadrant) return; try { await onUpdate(c.id, { ...(clean !== c.name ? { name: clean } : {}), ...(quadrant !== c.quadrant ? { quadrant } : {}) }); setEditing(null); } catch (e) { setProblem(e instanceof Error ? e.message : "That didn’t save."); } }
  return <div className="muse-feeling-panel">
    <Back onClick={onBack} />
    <h3 className="muse-feeling-title">Your own feelings</h3>
    <p className="muse-feeling-note">Changing or deleting one here never changes the entries you’ve already recorded.</p>
    {error && <p className="muse-feeling-error" role="alert">{error}</p>}
    {!custom.length && <p className="muse-feeling-note">Feelings you add will appear here.</p>}
    <ul className="muse-feeling-list">{custom.map((c) => <li key={c.id} data-quadrant={c.quadrant}>
      {editing === c.id ? <form onSubmit={(e) => { e.preventDefault(); void save(c); }}>
        <input className="muse-feeling-name" aria-label={`Rename ${c.name}`} value={name} maxLength={MAX_FEELING_NAME} onChange={(e) => setName(e.target.value)} />
        <FeelingQuadrantPicker value={quadrant} onChange={setQuadrant} label="Where it usually belongs" />
        {problem && <p className="muse-feeling-error" role="alert">{problem}</p>}
        <div className="muse-feeling-actions"><button type="submit" className="muse-button button-primary" disabled={!cleanFeelingName(name) || !quadrant}>Save</button><button type="button" className="text-button" onClick={() => setEditing(null)}>Cancel</button></div>
      </form> : confirm === c.id ? <div role="alertdialog" aria-label={`Delete ${c.name}`}>
        <p><strong>Delete “{c.name}”?</strong> Entries that used it keep it exactly as recorded.</p>
        <div className="muse-feeling-actions"><button type="button" className="muse-button" data-destructive onClick={() => void onDelete(c.id).then(() => setConfirm(null)).catch(() => undefined)}>Delete feeling</button><button type="button" className="text-button" onClick={() => setConfirm(null)}>Keep it</button></div>
      </div> : <div className="muse-feeling-row"><span className="muse-feeling-chip"><i className="quadrant-dot" aria-hidden="true" />{c.name}</span>
        <span className="muse-feeling-row-actions"><button type="button" className="muse-reflections-icon" aria-label={`Edit ${c.name}`} onClick={() => open(c)}><MuseIcon name="edit" size={14} /></button><button type="button" className="muse-reflections-icon" aria-label={`Delete ${c.name}`} onClick={() => { setConfirm(c.id); setEditing(null); }}><MuseIcon name="trash" size={14} /></button></span></div>}
    </li>)}</ul>
  </div>;
}
