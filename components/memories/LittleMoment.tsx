"use client";
import { useRef, useState } from "react";
import { EmojiGlyph, EmojiPicker } from "../EmojiPicker";
import { MuseIcon } from "../MuseIcon";
import { MuseStar } from "../MuseStar";
import { MEMORY_MAX } from "@/lib/memories";
import { useMemory } from "./useMemories";
import "./Memories.css";

/**
 * Little Moment (#105): the day's one memory. Saved on its own (never part of Day Pulse, Mood notes or Day in
 * Three), so either can be filled in without the other. Writing again for the same day edits that one memory.
 */
export function LittleMoment({ date, compact = false }: { date: string; compact?: boolean }) {
  const { memory, loaded, save, remove } = useMemory(date);
  const [draft, setDraft] = useState<{ body: string; emoji: string | null } | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [confirm, setConfirm] = useState(false), [picker, setPicker] = useState(false);
  const emojiAnchor = useRef<HTMLButtonElement>(null);
  const editing = draft !== null || (loaded && !memory);
  const body = draft?.body ?? "", emoji = draft ? draft.emoji : memory?.emoji ?? null;
  async function commit() { if (!draft || !draft.body.trim() || busy) return; setBusy(true); setError(""); try { await save(draft.body, draft.emoji); setDraft(null); } catch (e) { setError(e instanceof Error ? e.message : "That didn’t save. Your words are still here."); } finally { setBusy(false); } }
  async function erase() { setBusy(true); setError(""); try { await remove(); setDraft(null); setConfirm(false); } catch (e) { setError(e instanceof Error ? e.message : "That wasn’t deleted."); } finally { setBusy(false); } }
  return <section className="muse-little-moment" data-compact={compact || undefined} aria-label="Little Moment">
    <header><span className="muse-little-moment-mark" aria-hidden="true"><MuseStar size={13} /></span><h3>Little Moment</h3><span className="muse-little-moment-optional">optional</span></header>
    {!loaded ? <p className="muse-little-moment-quiet">…</p> : !editing && memory ? <div className="muse-little-moment-saved">
      {memory.emoji && <span className="muse-little-moment-emoji" aria-hidden="true"><EmojiGlyph value={memory.emoji} /></span>}
      <p>{memory.body}</p>
      <div className="muse-little-moment-tools">
        <button type="button" className="muse-little-moment-icon" aria-label="Edit today’s memory" onClick={() => setDraft({ body: memory.body, emoji: memory.emoji })}><MuseIcon name="edit" size={14} /></button>
        {confirm ? <span className="muse-little-moment-confirm" role="group" aria-label="Confirm delete">Delete this memory?<button type="button" className="muse-little-moment-pill" disabled={busy} onClick={() => void erase()}>Delete</button><button type="button" className="muse-little-moment-pill" onClick={() => setConfirm(false)}>Keep</button></span>
          : <button type="button" className="muse-little-moment-icon" aria-label="Delete today’s memory" onClick={() => setConfirm(true)}><MuseIcon name="trash" size={14} /></button>}
      </div>
    </div> : <form className="muse-little-moment-form" onSubmit={(e) => { e.preventDefault(); void commit(); }}>
      <button ref={emojiAnchor} type="button" className="muse-little-moment-emoji-pick" aria-label={emoji ? `Emoji ${emoji}. Change emoji` : "Add an emoji (optional)"} onClick={() => setPicker(true)}>{emoji ? <EmojiGlyph value={emoji} /> : <MuseIcon name="sparkle" size={16} />}</button>
      <label className="sr-only" htmlFor={`moment-${date}`}>What’s one thing you’ll remember about today?</label>
      <input id={`moment-${date}`} className="muse-little-moment-input" maxLength={MEMORY_MAX} value={body} placeholder="What’s one thing you’ll remember about today?" onChange={(e) => setDraft({ body: e.target.value, emoji })} onKeyDown={(e) => { if (e.key === "Escape" && memory) { e.preventDefault(); setDraft(null); } }} />
      <button type="submit" className="muse-little-moment-pill" data-primary disabled={busy || !body.trim()}>{busy ? "Saving…" : memory ? "Save" : "Keep it"}</button>
      {memory && <button type="button" className="muse-little-moment-pill" onClick={() => setDraft(null)}>Cancel</button>}
      {emoji && <button type="button" className="muse-little-moment-pill" onClick={() => setDraft({ body, emoji: null })}>No emoji</button>}
      <EmojiPicker open={picker} anchorRef={emojiAnchor} label="Little Moment emoji" onClose={() => setPicker(false)} onSelect={(e) => { setDraft({ body, emoji: e }); setPicker(false); }} />
    </form>}
    {error && <p className="muse-little-moment-error" role="alert">{error}</p>}
  </section>;
}
