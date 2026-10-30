"use client";
import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { nourishReducer, type NourishAction, type NourishState } from "@/lib/nourish";
import { nourishSample } from "@/lib/nourish-sample";
const Context=createContext<{state:NourishState;dispatch:Dispatch<NourishAction>}|null>(null);
export function NourishProvider({children,initialState=nourishSample}:{children:ReactNode;initialState?:NourishState}) {
  const [state,dispatch]=useReducer(nourishReducer,initialState);
  return <Context.Provider value={{state,dispatch}}>{children}</Context.Provider>;
}
export function useNourish(){const value=useContext(Context);if(!value)throw new Error("Meal surfaces require NourishProvider");return value;}
