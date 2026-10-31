"use client";
import { createContext, useContext, type Dispatch, type ReactNode } from "react";
import { type NourishAction, type NourishState } from "@/lib/nourish";
import {useWellness} from "./WellnessStore";
const Context=createContext<{state:NourishState;dispatch:Dispatch<NourishAction>}|null>(null);
export function NourishProvider({children}:{children:ReactNode;initialState?:NourishState}) {
  const wellness=useWellness();
  const state=wellness.state;
  const dispatch:Dispatch<NourishAction>=(action)=>wellness.dispatch({kind:'meal',action});
  return <Context.Provider value={{state,dispatch}}>{children}</Context.Provider>;
}
export function useNourish(){const value=useContext(Context);if(!value)throw new Error("Meal surfaces require NourishProvider");return value;}
