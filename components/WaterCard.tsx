"use client";

import { useMuseState } from "./MuseSession";

import { useRef, useState, type CSSProperties } from "react";
import { formatWaterAmount, type DailyWater, type WaterSettings } from "@/lib/water";
import { MuseCard } from "./MuseCard";
import { CardHeading } from "./CardHeading";
import { GlassPopover } from "./GlassPopover";
import { WaterManager } from "./WaterManager";
import { WaterAmountForm } from "./WaterAmountForm";

type WaterCardProps = { initialDay: DailyWater; settings: WaterSettings };
type EditorMode = "add" | "edit" | "goal" | "manage" | null;

export function WaterCard({ initialDay, settings }: WaterCardProps) {
  const [day, setDay] = useMuseState("water", initialDay);
  const total = day.total;
  const [editor, setEditor] = useState<EditorMode>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const customRef = useRef<HTMLButtonElement>(null);
  const goalRef = useRef<HTMLButtonElement>(null);
  const { unit } = settings;
  const [quickAdds, setQuickAdds] = useMuseState("water-quick-adds", settings.quickAdds, true);
  const manageRef = useRef<HTMLButtonElement>(null);
  const [goal, setGoal] = useMuseState("water-goal", settings.goal, true);
  const progress = Math.min(100, Math.max(0, (total / goal) * 100));

  function closeEditor() {
    const trigger = editor === "goal" ? goalRef : editor === "edit" ? editRef : customRef;
    setEditor(null);
    trigger.current?.focus();
  }

  function applyAmount(amount: number) {
    if (editor === "goal") {
      if (amount <= 0) return "Enter a goal greater than zero.";
      setGoal(amount); closeEditor(); return null;
    }
    // Keep the real quantity even above the goal; only the visual bar is capped.
    const next = editor === "edit" ? amount : total + amount;
    if (!Number.isFinite(next)) return "Enter a smaller amount.";
    setDay((current) => ({ ...current, total: next }));
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
            className="text-button"
            aria-label="Edit today’s water total"
            aria-expanded={editor === "edit"}
            aria-controls="water-editor"
            onClick={() => setEditor((mode) => mode === "edit" ? null : "edit")}
          >Edit</button>
        </div>
      </CardHeading>
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
      <div className="water-additions" role="group" aria-label="Add water">
        {quickAdds.map((amount) => (
          <button key={amount} type="button" className="muse-button water-add-button" onClick={() => setDay((current) => ({ ...current, total: current.total + amount }))}>
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
      <GlassPopover id="water-manage" label="Manage water" open={editor === "manage"} anchorRef={manageRef} onClose={() => setEditor(null)} width={340}><WaterManager goal={goal} quickAdds={quickAdds} unit={unit} onClose={() => { setEditor(null); manageRef.current?.focus(); }} onSave={(nextGoal, amounts) => { setGoal(nextGoal); setQuickAdds(amounts); setEditor(null); manageRef.current?.focus(); }} /></GlassPopover>
    </MuseCard>
  );
}
