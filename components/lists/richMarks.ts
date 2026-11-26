import { Mark, mergeAttributes } from "@tiptap/react";

/**
 * Theme-aware text colour and highlight for Spaces notes. They store a tone number (1–6), never a CSS colour, and the
 * stylesheet maps each tone to the theme's chart inks, so writing stays readable in every theme and nothing arbitrary
 * can be injected through a style attribute.
 */
export const tones = ["1", "2", "3", "4", "5", "6"] as const;
const clean = (v: string | null) => v && (tones as readonly string[]).includes(v) ? v : null;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    museTone: { setTone: (tone: string) => ReturnType; unsetTone: () => ReturnType };
    museGlow: { setGlow: (tone: string) => ReturnType; unsetGlow: () => ReturnType };
  }
}

export const Tone = Mark.create({
  name: "museTone",
  addAttributes() { return { tone: { default: null, parseHTML: (el) => clean(el.getAttribute("data-tone")), renderHTML: (a) => a.tone ? { "data-tone": a.tone } : {} } }; },
  parseHTML() { return [{ tag: "span[data-tone]" }]; },
  renderHTML({ HTMLAttributes }) { return ["span", mergeAttributes({ class: "muse-tone" }, HTMLAttributes), 0]; },
  addCommands() { return { setTone: (tone) => ({ commands }) => commands.setMark(this.name, { tone: clean(tone) }), unsetTone: () => ({ commands }) => commands.unsetMark(this.name) }; },
});

export const Glow = Mark.create({
  name: "museGlow",
  addAttributes() { return { tone: { default: "3", parseHTML: (el) => clean(el.getAttribute("data-glow")) ?? "3", renderHTML: (a) => ({ "data-glow": a.tone }) } }; },
  parseHTML() { return [{ tag: "mark[data-glow]" }, { tag: "mark" }]; },
  renderHTML({ HTMLAttributes }) { return ["mark", mergeAttributes({ class: "muse-glow" }, HTMLAttributes), 0]; },
  addCommands() { return { setGlow: (tone) => ({ commands }) => commands.setMark(this.name, { tone: clean(tone) ?? "3" }), unsetGlow: () => ({ commands }) => commands.unsetMark(this.name) }; },
});
