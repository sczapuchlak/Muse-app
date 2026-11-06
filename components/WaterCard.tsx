"use client";

import {useWellness} from "./WellnessStore";

import { useRef, useState, type CSSProperties } from "react";
import { formatWaterAmount, type DailyWater, type WaterSettings } from "@/lib/water";
import { AchievementBadge } from "./AchievementStar";
import { useCelebrateOnCrossing } from "./useCelebrateOnCrossing";
import { celebrate } from "@/lib/celebrate";
import { pickLine } from "@/lib/celebration-copy";
import { allowsMagic } from "@/lib/magic-preference";
import { MuseCard } from "./MuseCard";
import { CardHeading } from "./CardHeading";
import { GlassPopover } from "./GlassPopover";
import { WaterManager } from "./WaterManager";
import "./WaterCard.css";
import { WaterAmountForm } from "./WaterAmountForm";

type WaterCardProps = { initialDay: DailyWater; settings: WaterSettings };
type EditorMode = "add" | "edit" | "goal" | "manage" | null;

export function WaterCard({ initialDay, settings }: WaterCardProps) {
  const {state,dispatch:send,status}=useWellness();
  const day=state.water.find(day=>day.date===initialDay.date);
  const defaults=state.waterSettings??settings;
  const total=day?.total??0;
  const hasRecordedDay=!!day;
  const [editor, setEditor] = useState<EditorMode>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const customRef = useRef<HTMLButtonElement>(null);
  const goalRef = useRef<HTMLButtonElement>(null);
  const unit=day?.unit??defaults.unit;
  const quickAdds=defaults.quickAdds;
  const manageRef = useRef<HTMLButtonElement>(null);
  const goal=day?.goal??defaults.goal;
  const currentSettings={goal,unit,quickAdds};
  const achieved = goal > 0 && total >= goal;
  const progress = Math.min(100, Math.max(0, (total / goal) * 100));
  // Hydration (#34): logging water ripples the bar with a few droplets (tactile, instant); reaching the goal, once
  // saved, adds a short moment and chime. The existing gold-star finish stays exactly as it was.
  const [ripple,setRipple]=useState(0);
  const settled=status.loaded&&!status.pending&&!status.saving&&!status.error;
  useCelebrateOnCrossing(achieved,settled,initialDay.date,()=>celebrate({kind:'starburst',message:pickLine('water'),detail:`${formatWaterAmount(total)} ${unit} today`,sound:'complete',key:`water:${initialDay.date}`}));
  const dispatch:typeof send=(action)=>{if(action.kind==='water'&&(action.mode==='add'||action.amount>total)&&allowsMagic())setRipple(n=>n+1);send(action);};

  function closeEditor() {
    const trigger = editor === "goal" ? goalRef : editor === "edit" ? editRef : customRef;
    setEditor(null);
    trigger.current?.focus();
  }

  function applyAmount(amount: number) {
    if (editor === "goal") {
      if (amount <= 0) return "Enter a goal greater than zero.";
      dispatch({kind:'water/settings',settings:{...defaults,goal:amount},date:hasRecordedDay?initialDay.date:undefined}); closeEditor(); return null;
    }
    // Keep the real quantity even above the goal; only the visual bar is capped.
    const next = editor === "edit" ? amount : total + amount;
    if (!Number.isFinite(next) || next > 1000000) return "Enter a smaller amount.";
    dispatch({kind:'water',date:initialDay.date,mode:editor==='edit'?'set':'add',amount,settings:currentSettings});
    closeEditor();
    return null;
  }

  return (
    <MuseCard id="water" className="water-card">
      <CardHeading id="water" title="Water" icon="water" manage={{ expanded: editor === "manage", controls: "water-manage", onClick: (event) => { manageRef.current = event.currentTarget; setEditor((mode) => mode === "manage" ? null : "manage"); } }}>
        <div className="water-summary">
          <p className="water-quantity" role="status" aria-label={`${formatWaterAmount(total)} of ${formatWaterAmount(goal)} ${unit}`}>
            <strong>{formatWaterAmount(total)} <span>{unit}</span></strong>
          </p>
          <button ref={goalRef} type="button" className="water-goal-button" aria-label={`Edit daily water goal: ${goal} ${unit}`} aria-expanded={editor === "goal"} aria-controls="water-editor" onClick={() => setEditor((mode) => mode === "goal" ? null : "goal")}>/ {formatWaterAmount(goal)} {unit}</button>
          <button
            ref={editRef}
            type="button"
            className="muse-button button-ghost"
            aria-label="Edit today’s water total"
            aria-expanded={editor === "edit"}
            aria-controls="water-editor"
            onClick={() => setEditor((mode) => mode === "edit" ? null : "edit")}
          >Edit</button>
        </div>
      </CardHeading>
      <div className="water-progress-goal" data-achieved={achieved}>
      <div
        className="water-progress"
        role="progressbar"
        aria-label="Water toward daily goal"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(total, goal)}
        aria-valuetext={`${formatWaterAmount(total)} of ${formatWaterAmount(goal)} ${unit}${total >= goal ? ", goal reached" : ""}`}
        style={{ "--water-progress": `${progress}%` } as CSSProperties}
      ><span /></div>
      {ripple>0&&<span key={ripple} className="water-ripple" style={{ "--water-progress": `${progress}%` } as CSSProperties} aria-hidden="true"><i/><i/><i/><i/><i/></span>}
      <span className="water-achievement-finish"><AchievementBadge achieved={achieved} label="Water goal achieved" size={28} replayOnReentry delay={220}/></span>
      <span className="sr-only" role="status">{achieved?'Water goal reached.':''}</span>
      </div>
      <div className="water-additions" role="group" aria-label="Add water">
        {quickAdds.map((amount) => (
          <button key={amount} type="button" className="muse-button water-add-button" onClick={() => dispatch({kind:'water',date:initialDay.date,mode:'add',amount,settings:currentSettings})}>
            {`+${amount} ${unit}`}
          </button>
        ))}
        <button
          ref={customRef}
          type="button"
          className="muse-button water-add-button"
          aria-expanded={editor === "add"}
          aria-controls="water-editor"
          onClick={() => setEditor((mode) => mode === "add" ? null : "add")}
        >Custom</button>
      </div>
      <div id="water-editor" hidden={editor === null || editor === "manage"}>
        {editor && editor !== "manage" && <WaterAmountForm key={editor} mode={editor} unit={unit} initialAmount={editor === "goal" ? goal : total} onApply={applyAmount} onCancel={closeEditor} />}
      </div>
      <GlassPopover id="water-manage" label="Manage water" open={editor === "manage"} anchorRef={manageRef} onClose={() => setEditor(null)} width={340}><WaterManager goal={goal} quickAdds={quickAdds} unit={unit} onClose={() => { setEditor(null); manageRef.current?.focus(); }} onSave={(nextGoal, amounts) => { dispatch({kind:'water/settings',settings:{goal:nextGoal,unit:defaults.unit,quickAdds:amounts},date:hasRecordedDay?initialDay.date:undefined}); setEditor(null); manageRef.current?.focus(); }} /></GlassPopover>
    </MuseCard>
  );
}
