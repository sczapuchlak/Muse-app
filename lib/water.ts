// Amounts use the unit declared by settings. Keep unit/goal configuration separate
// from the daily total so a future data source can supply settings and entries.
export type WaterUnit = "oz" | "mL";
export type DailyWater = { date: string; total: number; goal?:number; unit?:WaterUnit };
export type WaterSettings = {
  goal: number;
  unit: WaterUnit;
  quickAdds: readonly number[];
};

/** #104: the one default used everywhere until a person saves their own water settings. */
export const defaultWaterSettings: WaterSettings = { goal: 100, unit: "oz", quickAdds: [12, 24, 32, 40] };

export function parseWaterAmount(value: string, allowZero = false): number | null {
  if (value.trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && (allowZero ? amount >= 0 : amount > 0)
    ? amount
    : null;
}

export function formatWaterAmount(amount: number): string {
  return amount.toLocaleString("en-US", { maximumFractionDigits: 6 });
}
