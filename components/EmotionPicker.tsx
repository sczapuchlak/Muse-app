"use client";

import { useState } from "react";
import { findEmotions } from "@/lib/emotions";
import { moodQuadrants, type Emotion, type EmotionQuadrant } from "@/lib/models";
import { MuseIcon } from "./MuseIcon";

type Props = { emotions: Emotion[]; selectedIds: string[]; onToggle: (id: string) => void; onClose: () => void };
export function EmotionPicker({ emotions, selectedIds, onToggle, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [activeId,setActiveId]=useState<string|null>(null);
  const [quadrant, setQuadrant] = useState<EmotionQuadrant | null>(null);
  const results = (!query.trim() ? emotions : findEmotions(emotions, query)).filter((emotion) => !quadrant || emotion.quadrant === quadrant);
  const focusId=results.some((emotion)=>emotion.id===activeId)?activeId:results[0]?.id;
  return (
    <div className="emotion-picker">
      <div className="emotion-picker-header">
        <label htmlFor="emotion-search" className="editor-label">Find a feeling</label>
        <div className="emotion-search-field"><MuseIcon name="search" size={18} />
          <input id="emotion-search" type="search" value={query} placeholder="Search feelings" data-popover-autofocus autoComplete="off" onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="quadrant-filters" role="group" aria-label="Browse by quadrant">
          <button type="button" aria-pressed={quadrant === null} onClick={() => setQuadrant(null)}>All</button>
          {(Object.keys(moodQuadrants) as EmotionQuadrant[]).map((key) => <button key={key} type="button" data-quadrant={key} aria-pressed={quadrant === key}
            title={`${moodQuadrants[key].energy} energy, ${moodQuadrants[key].pleasantness}`} onClick={() => setQuadrant((value) => value === key ? null : key)}>
            <span className="quadrant-dot" aria-hidden="true" />{moodQuadrants[key].label}
          </button>)}
        </div>
        <p className="emotion-results-status" role="status">{quadrant ? `${moodQuadrants[quadrant].energy} energy · ${moodQuadrants[quadrant].pleasantness}` : query.trim() ? `${results.length} feelings found` : `Browse ${emotions.length} feelings`}</p>
      </div>
      <p className="sr-only" id="feeling-keyboard-help">Use arrow keys to browse feelings. Tab moves to Done.</p>
      <div className="emotion-options" role="group" aria-label="Feelings" aria-describedby="feeling-keyboard-help" onKeyDown={(event)=>{
        if(!["ArrowDown","ArrowUp","ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
        const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(".emotion-option"));if(!buttons.length)return;
        event.preventDefault();const index=buttons.indexOf(document.activeElement as HTMLButtonElement);
        const columns=getComputedStyle(event.currentTarget).gridTemplateColumns.split(" ").length;
        const step=event.key==="ArrowDown"?columns:event.key==="ArrowUp"?-columns:event.key==="ArrowLeft"?-1:1;
        const next=event.key==="Home"?0:event.key==="End"?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+step));buttons[next]?.focus();
      }}>
        {results.map((emotion) => <button type="button" key={emotion.id} className="emotion-option" tabIndex={emotion.id===focusId?0:-1} onFocus={()=>setActiveId(emotion.id)} aria-pressed={selectedIds.includes(emotion.id)} title={emotion.definition} onClick={() => onToggle(emotion.id)}>
          <span aria-hidden="true">{emotion.emoji}</span><span className="emotion-name">{emotion.name}</span>{selectedIds.includes(emotion.id) && <MuseIcon name="check" size={15} />}
        </button>)}
        {!results.length && <p className="emotion-empty">No matching feelings.</p>}
      </div>
      <footer className="emotion-picker-footer"><button type="button" className="muse-button" onClick={onClose}>Done</button></footer>
    </div>
  );
}
