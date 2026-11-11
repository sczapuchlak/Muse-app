"use client";

import { useMuseDate } from "./MuseSession";
import { useMood } from "./mood/useMood";
import { MoodInfluences } from "./mood/MoodInfluences";
import { dailyEditSample } from "@/lib/daily-edit-data";

import { useMemo, useRef, useState } from "react";
import type { Emotion } from "@/lib/models";
import { MuseCard } from "./MuseCard";
import { CardHeading } from "./CardHeading";
import { MuseIcon } from "./MuseIcon";

import { EmotionPicker } from "./EmotionPicker";
import { useFeelingLibrary } from "./mood/useFeelingLibrary";
import { deselectFeeling, recordedFeeling, selectFeeling, unifiedFeelings, type FeelingSnapshot } from "@/lib/feelings";
import type { EmotionQuadrant } from "@/lib/models";
import { useMuseSpark } from "./MuseSpark";
import { MuseModal } from "./MuseModal";
import "./MoodCard.css";
import "./mood/Mood.css";

type MoodCardProps = { emotions: Emotion[] };

export function MoodCard({ emotions }: MoodCardProps) {
  const [date]=useMuseDate(dailyEditSample.date.iso);
  const {record:checkIn,update,period,setPeriod,state:moodState}=useMood(date),library=useFeelingLibrary();
  const [open, setOpen] = useState(false);
  const {trigger,spark}=useMuseSpark();
  const [pickerAnchor,setPickerAnchor]=useState<HTMLElement|null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  // The one library: shared vocabulary and the person's own feelings, resolved as this entry recorded them.
  const everything = useMemo(() => unifiedFeelings(emotions, library.custom), [emotions, library.custom]);
  const selectedEmotions = checkIn.emotionIds.flatMap((id) => recordedFeeling(id, checkIn.feelings, everything) ?? []);
  const selectedQuadrants = Object.fromEntries(selectedEmotions.map((e) => [e.id, e.quadrant])) as Record<string, EmotionQuadrant>;
  const recentIds = useMemo(() => [...new Set([...moodState.records].sort((a, b) => (b.updatedAt ?? b.date).localeCompare(a.updatedAt ?? a.date)).flatMap((r) => r.emotionIds))].slice(0, 12), [moodState.records]);

  function applyChoice(next: { emotionIds: string[]; feelings: FeelingSnapshot[] }, added: boolean) { update(next); if (added) trigger(); }
  /** One tap: add with the word's default quadrant, or remove. */
  function toggleEmotion(id: string) {
    if (checkIn.emotionIds.includes(id)) { applyChoice(deselectFeeling(checkIn, id), false); return; }
    const emotion = everything.find((e) => e.id === id); if (!emotion) return;
    applyChoice(selectFeeling(checkIn, emotion, emotion.quadrant, everything), true);
  }
  /** Add (or re-interpret) a feeling with the quadrant the person chose. Only this entry records it. */
  function chooseEmotion(id: string, quadrant: EmotionQuadrant, fresh?: Emotion) {
    const emotion = fresh ?? everything.find((e) => e.id === id); if (!emotion) return;
    applyChoice(selectFeeling(checkIn, emotion, quadrant, everything), !checkIn.emotionIds.includes(id));
  }

  function closePicker() { setOpen(false); addRef.current?.focus(); }

  return (
    <MuseCard id="mood" className="mood-card">
      <CardHeading id="mood" title="Mood" icon="mood"><div className="muse-mood-period" role="group" aria-label="Check-in period">{(["morning","evening"] as const).map((value)=><button type="button" key={value} aria-pressed={period===value} onClick={()=>setPeriod(value)}>{value}</button>)}</div></CardHeading>
      <div className="mood-content">
        <div>
          <p className="editor-label" id="selected-feelings-label">How are you feeling?</p>
          {!selectedEmotions.length&&<p className="muse-mood-empty-copy">Mixed feelings welcome. Start wherever you are.</p>}
          <div className="feeling-chips" role="group" aria-labelledby="selected-feelings-label">
            {selectedEmotions.map((emotion) => (
              <button type="button" key={emotion.id} className="choice-button feeling-chip" data-quadrant={emotion.quadrant}
                aria-label={`Remove feeling: ${emotion.name}`} title={emotion.definition}
                onClick={() => { toggleEmotion(emotion.id); addRef.current?.focus(); }}>
                <span aria-hidden="true">{emotion.emoji}</span>{emotion.name}<MuseIcon name="close" size={13} />
              </button>
            ))}
            <button ref={addRef} type="button" className="choice-button add-control muse-feedback-anchor" aria-haspopup="dialog" aria-expanded={open} aria-controls="feeling-picker"
              onClick={(event) => {setPickerAnchor(event.currentTarget);setOpen((value) => !value);}}><MuseIcon name="plus" size={14} />Add feeling{spark}</button>
          </div>
          {open&&<MuseModal size="tall" id="feeling-picker" label="Find a feeling" title="Find a feeling" returnFocus={pickerAnchor} onClose={closePicker}>
            <EmotionPicker emotions={everything} selectedIds={checkIn.emotionIds} onToggle={toggleEmotion} onClose={closePicker}
              selectedQuadrants={selectedQuadrants} onSelect={chooseEmotion} favoriteIds={library.favoriteIds} onFavorite={(id) => void library.toggleFavorite(id).catch(() => undefined)} recentIds={recentIds}
              onCreate={library.canCreate ? library.create : undefined} custom={library.custom} onUpdateCustom={library.canCreate ? library.update : undefined} onDeleteCustom={library.canCreate ? library.remove : undefined} libraryError={library.error} />
          </MuseModal>}
        </div>
        <MoodInfluences date={date}/>
      </div>
    </MuseCard>
  );
}
