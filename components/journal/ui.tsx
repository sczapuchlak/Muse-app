"use client";
import { createContext, useContext } from "react";
import type { Journal } from "@/lib/journal/model";

/** What the workspace toolbar can open over the page (there are no management pages). Provided by Journal.tsx. */
export type JournalUi = { openSettings: () => void; openManager: () => void; editJournal: (j: Journal | "new") => void; openStudio: (companionId: string | "new") => void;
  /** Where the workspace puts its toolbar: the page header, in place of a separate Settings link. */
  toolbarSlot: HTMLElement | null };
export const JournalUiContext = createContext<JournalUi | null>(null);
export function useJournalUi(): JournalUi { const ui = useContext(JournalUiContext); if (!ui) throw Error("useJournalUi outside Journal"); return ui; }
