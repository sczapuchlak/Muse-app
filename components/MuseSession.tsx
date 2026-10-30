"use client";

import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

type Records = Record<string, unknown>;
type Session = { date: string; setDate: Dispatch<SetStateAction<string>>; records: Records; setRecords: Dispatch<SetStateAction<Records>> };
const MuseSession = createContext<Session | null>(null);

export function MuseSessionProvider({ initialDate, children }: { initialDate: string; children: ReactNode }) {
  const [date, setDate] = useState(initialDate);
  const [records, setRecords] = useState<Records>({});
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
