"use client";

import { useMuseState } from "./MuseSession";
import type { Priority } from "@/lib/daily-edit-data";
import { MuseCard } from "./MuseCard";
import { CardHeading } from "./CardHeading";
import { MuseIcon } from "./MuseIcon";
import { EditableText } from "./EditableText";
import { useMuseSpark } from "./MuseSpark";

import {EmojiButton} from "./EmojiPicker";
import {MuseMilestone} from "./MuseMilestone";

type Props = { initialPriorities: Priority[]; initialIntention: string };

function PriorityItem({ priority, index, onToggle, onEdit }: { priority: Priority; index: number; onToggle: () => void; onEdit: (title: string) => void }) {
  const { trigger, spark } = useMuseSpark();
  return <li><div className={`priority-item${priority.complete ? " is-complete" : ""}`}>
    <label className="priority-completion">
      <input type="checkbox" className="check-input" checked={priority.complete} aria-label={`Complete priority: ${priority.title}`}
        onChange={(event) => { if (event.target.checked) trigger(); onToggle(); }} />
      <span className="priority-check" aria-hidden="true">{priority.complete && <MuseIcon name="check" size={15} />}{spark}</span>
    </label>
    <EditableText value={priority.title} label="Edit priority" className="priority-text" onSave={onEdit} />
    <span className="priority-number" aria-hidden="true">0{index + 1}</span>
  </div></li>;
}

export function PrioritiesCard({ initialPriorities, initialIntention }: Props) {
  const [priorities, setPriorities] = useMuseState("priorities", () => initialPriorities.slice(0, 3));
  const [intention, setIntention] = useMuseState("intention", initialIntention);
  const [intentionEmoji,setIntentionEmoji]=useMuseState<string|null>("intention-emoji",null);
  const completed = priorities.filter((priority) => priority.complete).length;
  return (
    <MuseCard id="priorities" className="card-full priorities-card">
      <MuseMilestone achieved={priorities.length===3&&completed===3} kind="shooting"/>
      <CardHeading id="priorities" title="Today’s priorities">
        <span className="priority-count" role="status" aria-label={`${completed} of ${priorities.length} priorities complete`}><strong>{completed}</strong> / {priorities.length}<span className="count-label">complete</span></span>
      </CardHeading>
      <div className="daily-intention"><span className="editor-label">Today’s intention</span><EmojiButton value={intentionEmoji} label="Intention emoji" onChange={setIntentionEmoji}/><input aria-label="Today’s intention" type="text" value={intention} onChange={(event) => setIntention(event.target.value)} placeholder="What matters today?" /></div>
      <ul className="priority-list">
        {priorities.map((priority, index) => <PriorityItem key={priority.id} priority={priority} index={index}
          onToggle={() => setPriorities((items) => items.map((item) => item.id === priority.id ? { ...item, complete: !item.complete } : item))}
          onEdit={(title) => setPriorities((items) => items.map((item) => item.id === priority.id ? { ...item, title } : item))} />)}
      </ul>
      {!priorities.length && <p className="card-description">No priorities for this day.</p>}
    </MuseCard>
  );
}
