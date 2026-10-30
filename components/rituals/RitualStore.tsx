"use client";
import { createContext, useContext, type Dispatch, type ReactNode } from "react";
import { ritualReducer, type RitualAction, type RitualState } from "@/lib/rituals";
import { ritualsSample } from "@/lib/rituals-sample";
import { useMuseState } from "../MuseSession";
const RitualContext = createContext<{ state: RitualState; dispatch: Dispatch<RitualAction> } | null>(null);
export function RitualProvider({ children, initialState = ritualsSample }: { children: ReactNode; initialState?: RitualState }) {
  const [state, setState] = useMuseState("rituals", initialState, true);
  return <RitualContext.Provider value={{ state, dispatch: (action) => setState((previous) => ritualReducer(previous, action)) }}>{children}</RitualContext.Provider>;
}
export function useRituals() { const context = useContext(RitualContext); if (!context) throw new Error("Ritual surfaces require RitualProvider"); return context; }
