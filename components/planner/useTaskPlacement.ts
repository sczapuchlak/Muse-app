"use client";
import { placementChanges } from "@/lib/planner";
import { usePlanner } from "../PlannerStore";

export function useTaskPlacement(onSuccess: () => void) {
  const { state, dispatch } = usePlanner();
  return (id: string, date?: string, beforeId?: string) => {
    const action = { type: "task/place" as const, id, date, beforeId };
    const changed = placementChanges(state, action);
    dispatch(action);
    if (changed) onSuccess();
    return changed;
  };
}
