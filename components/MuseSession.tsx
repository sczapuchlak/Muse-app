"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

import {validDate} from "@/lib/dates";

type Records = Record<string, unknown>;
type Session = { date: string; setDate: Dispatch<SetStateAction<string>>; records: Records; setRecords: Dispatch<SetStateAction<Records>> };
const MuseSession = createContext<Session | null>(null);

export function MuseSessionProvider({ initialDate, initialRecords = {}, children }: { initialDate: string; initialRecords?: Records; children: ReactNode }) {
  const [date, setDateState] = useState(initialDate);
  const setDate:Dispatch<SetStateAction<string>>=(next)=>{
    const value=typeof next==='function'?next(date):next;
    if(!validDate(value))return;
    setDateState(value);
    if(typeof window!=='undefined'&&['/','/mood','/insights'].includes(window.location.pathname)){
      const url=new URL(window.location.href);url.searchParams.set('date',value);window.history.replaceState(null,'',url);
    }
  };
  const [records, setRecords] = useState<Records>(initialRecords);
  return <MuseSession.Provider value={{ date, setDate, records, setRecords }}>{children}</MuseSession.Provider>;
}

export function useMuseDate(initialDate: string): [string, Dispatch<SetStateAction<string>>] {
  const session = useContext(MuseSession);
  const fallback = useState(initialDate);
  return session ? [session.date, session.setDate] : fallback;
}

/** In-memory records survive day navigation. Nothing is written to browser storage. */
export function useMuseState<T>(name: string, initial: T | (() => T), shared = false): [T, Dispatch<SetStateAction<T>>] {
  const session = useContext(MuseSession);
  const [fallback, setFallback] = useState(initial);
  if (!session) return [fallback, setFallback];
  const key = shared ? `library/${name}` : `${session.date}/${name}`;
  const value = (session.records[key] === undefined ? fallback : session.records[key]) as T;
  const update: Dispatch<SetStateAction<T>> = (next) => session.setRecords((records) => {
    const current = (records[key] === undefined ? fallback : records[key]) as T;
    return { ...records, [key]: typeof next === "function" ? (next as (value: T) => T)(current) : next };
  });
  return [value, update];
}

/** Read existing dated/library records for cross-module analytics without creating another store. */
export function useMuseRecords(){return useContext(MuseSession)?.records??emptyRecords;}
const emptyRecords:Records={};
