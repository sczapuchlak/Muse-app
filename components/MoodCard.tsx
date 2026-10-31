"use client";

import { useMuseDate } from "./MuseSession";
import { useMood } from "./mood/useMood";
import { MoodInfluences } from "./mood/MoodInfluences";
import { dailyEditSample } from "@/lib/daily-edit-data";

import { useRef, useState } from "react";
import type { Emotion } from "@/lib/models";
import { toggleSelection } from "@/lib/selections";
import { MuseCard } from "./MuseCard";
import { CardHeading } from "./CardHeading";
import { MuseIcon } from "./MuseIcon";

import { EmotionPicker } from "./EmotionPicker";
import { useMuseSpark } from "./MuseSpark";
import { MuseModal } from "./MuseModal";
import "./MoodCard.css";
import "./mood/Mood.css";

type MoodCardProps = { emotions: Emotion[] };

export function MoodCard({ emotions }: MoodCardProps) {
  const [date]=useMuseDate(dailyEditSample.date.iso);
  const {record:checkIn,update,period,setPeriod}=useMood(date);
  const [open, setOpen] = useState(false);
  const {trigger,spark}=useMuseSpark();
  const [pickerAnchor,setPickerAnchor]=useState<HTMLElement|null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const selectedEmotions = emotions.filter((emotion) => checkIn.emotionIds.includes(emotion.id));

  function toggleEmotion(id: string) {
    update({ emotionIds: toggleSelection(checkIn.emotionIds, id) });
    if(!checkIn.emotionIds.includes(id))trigger();
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
          {open&&<MuseModal id="feeling-picker" label="Find a feeling" title="Find a feeling" returnFocus={pickerAnchor} onClose={closePicker}>
            <EmotionPicker emotions={emotions} selectedIds={checkIn.emotionIds} onToggle={toggleEmotion} onClose={closePicker} />
          </MuseModal>}
        </div>
        <MoodInfluences date={date}/>
      </div>
    </MuseCard>
  );
}
