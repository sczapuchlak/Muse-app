"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { parseWaterAmount, type WaterUnit } from "@/lib/water";

type WaterAmountFormProps = {
  mode: "add" | "edit" | "goal";
  unit: WaterUnit;
  initialAmount: number;
  onApply: (amount: number) => string | null;
  onCancel: () => void;
};

export function WaterAmountForm({ mode, unit, initialAmount, onApply, onCancel }: WaterAmountFormProps) {
  const [amount, setAmount] = useState(mode !== "add" ? String(initialAmount) : "");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const submitted=useRef(false);
  const editing = mode === "edit";
  const goal = mode === "goal";

  useEffect(() => { inputRef.current?.focus(); }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(submitted.current)return;
    const parsed = parseWaterAmount(amount, editing);
    if (parsed === null) {
      setError(editing ? "Enter a total of zero or more." : "Enter an amount greater than zero.");
      return;
    }
    submitted.current=true;
    const failure=onApply(parsed);
    if(failure)submitted.current=false;
    setError(failure ?? "");
  }

  return (
    <form className="water-amount-form" onSubmit={submit} onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); onCancel(); }
    }}>
      <label htmlFor="water-amount">{goal ? "Daily goal" : editing ? "Today’s total" : "Custom amount"}</label>
      <div className="amount-form-controls">
        <div className="quantity-field">
          <input
            ref={inputRef}
            id="water-amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            required
            value={amount}
            placeholder="0"
            aria-label={goal ? `Daily goal in ${unit}` : editing ? `Today’s total in ${unit}` : `Custom amount in ${unit}`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "water-amount-error" : undefined}
            onChange={(event) => { setAmount(event.target.value); setError(""); }}
          />
          <span className="quantity-unit" aria-hidden="true">{unit}</span>
        </div>
        <button className="muse-button button-primary" type="submit">{goal ? "Save goal" : editing ? "Save total" : "Add"}</button>
        <button className="muse-button button-ghost" type="button" onClick={onCancel}>Cancel</button>
      </div>
      {error && <p className="input-error" id="water-amount-error" role="alert">{error}</p>}
    </form>
  );
}
