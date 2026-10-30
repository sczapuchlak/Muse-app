"use client";

import { useMuseState } from "./MuseSession";

import { useRef, useState } from "react";
import type { ContextTag, Emotion, MoodCheckIn } from "@/lib/models";
import { toggleSelection } from "@/lib/selections";
import { MuseCard } from "./MuseCard";
import { CardHeading } from "./CardHeading";
import { MuseIcon } from "./MuseIcon";
import { TagSelector } from "./TagSelector";
import { EmotionPicker } from "./EmotionPicker";
import { MuseModal } from "./MuseModal";
import "./MoodCard.css";

type MoodCardProps = { emotions: Emotion[]; tags: ContextTag[]; initialCheckIn: MoodCheckIn };

export function MoodCard({ emotions, tags, initialCheckIn }: MoodCardProps) {
  const [checkIn, setCheckIn] = useMuseState("mood", initialCheckIn);
  const [open, setOpen] = useState(false);
  const [pickerAnchor,setPickerAnchor]=useState<HTMLElement|null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const selectedEmotions = emotions.filter((emotion) => checkIn.emotionIds.includes(emotion.id));

  function toggleEmotion(id: string) {
    setCheckIn((current) => ({ ...current, emotionIds: toggleSelection(current.emotionIds, id) }));
  }

  function closePicker() { setOpen(false); addRef.current?.focus(); }

  return (
    <MuseCard id="mood" className="mood-card">
      <CardHeading id="mood" title="Mood" icon="mood" />
      <div className="mood-content">
        <div>
          <p className="editor-label" id="selected-feelings-label">How are you feeling?</p>
          <div className="feeling-chips" role="group" aria-labelledby="selected-feelings-label">
            {selectedEmotions.map((emotion) => (
              <button type="button" key={emotion.id} className="choice-button feeling-chip" data-quadrant={emotion.quadrant}
                aria-label={`Remove feeling: ${emotion.name}`} title={emotion.definition}
                onClick={() => { toggleEmotion(emotion.id); addRef.current?.focus(); }}>
                <span aria-hidden="true">{emotion.emoji}</span>{emotion.name}<MuseIcon name="close" size={13} />
              </button>
            ))}
            <button ref={addRef} type="button" className="choice-button add-control" aria-haspopup="dialog" aria-expanded={open} aria-controls="feeling-picker"
              onClick={(event) => {setPickerAnchor(event.currentTarget);setOpen((value) => !value);}}><MuseIcon name="plus" size={14} />Add feeling</button>
          </div>
          {open&&<MuseModal id="feeling-picker" label="Find a feeling" returnFocus={pickerAnchor} onClose={closePicker}>
            <EmotionPicker emotions={emotions} selectedIds={checkIn.emotionIds} onToggle={toggleEmotion} onClose={closePicker} />
          </MuseModal>}
        </div>
        <TagSelector label="What’s influencing this?" tags={tags} selectedIds={checkIn.causeTagIds}
          onChange={(causeTagIds) => setCheckIn((current) => ({ ...current, causeTagIds }))} />
      </div>
    </MuseCard>
  );
}
