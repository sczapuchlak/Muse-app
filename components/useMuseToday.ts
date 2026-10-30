"use client";
import { useSyncExternalStore } from "react";
import { todayInTimeZone } from "@/lib/dates";
function subscribe(update: () => void) {
  const interval = window.setInterval(update, 60_000);
  document.addEventListener("visibilitychange", update);
  return () => { clearInterval(interval); document.removeEventListener("visibilitychange", update); };
}
export function useMuseToday(timeZone: string) { return useSyncExternalStore(subscribe, () => todayInTimeZone(timeZone), () => ""); }
