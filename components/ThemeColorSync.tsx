"use client";
import { useEffect } from "react";

/** Keeps the browser/standalone status-bar color in step with the active Muse theme's background. */
export function ThemeColorSync() {
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const color = getComputedStyle(root).getPropertyValue("--background").trim();
      if (!color) return;
      for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = color;
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return null;
}
