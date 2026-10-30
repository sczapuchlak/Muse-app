"use client";

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { plannerReducer, type PlannerAction, type PlannerState } from "@/lib/planner";
import { plannerSample } from "@/lib/planner-sample";

const PlannerContext = createContext<{ state: PlannerState; dispatch: Dispatch<PlannerAction> } | null>(null);

/** Canonical in-memory task/event source above both route views. No domain persistence. */
export function PlannerProvider({ children, initialState = plannerSample }: { children: ReactNode; initialState?: PlannerState }) {
  const [state, dispatch] = useReducer(plannerReducer, initialState);
  return <PlannerContext.Provider value={{ state, dispatch }}>{children}</PlannerContext.Provider>;
}
export function usePlanner() {
  const context = useContext(PlannerContext);
  if (!context) throw new Error("Planner surfaces require PlannerProvider");
  return context;
}
