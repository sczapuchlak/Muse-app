"use client";
import { useSyncExternalStore } from "react";

// Matches the shared phone breakpoint (#101): content ≤640px wide. On phones the rail is hidden, so content width is
// the viewport width.
const query = "(max-width: 640px)";
function subscribe(update: () => void) { const list = window.matchMedia(query); list.addEventListener("change", update); return () => list.removeEventListener("change", update); }
/** True while the phone layout is showing; false on the server and on wider screens. */
export function usePhoneLayout() { return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false); }
