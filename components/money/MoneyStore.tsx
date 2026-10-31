"use client";
import { createContext,useContext,useReducer,type ReactNode,type Dispatch } from "react";
import { moneyReducer,type MoneyState,type MoneyAction } from "@/lib/money";
import { moneySample } from "@/lib/money-sample";
const Context=createContext<{state:MoneyState;dispatch:Dispatch<MoneyAction>}|null>(null);
export function MoneyProvider({children,initialState=moneySample}:{children:ReactNode;initialState?:MoneyState}){const [state,dispatch]=useReducer(moneyReducer,initialState);return <Context.Provider value={{state,dispatch}}>{children}</Context.Provider>;}
export function useMoney(){const value=useContext(Context);if(!value)throw new Error("Money surfaces require MoneyProvider");return value;}
