/**
 * Rosebud's Markdown export (mapped from a real export, Nov 2026; see docs/JOURNAL_IMPORT.md). Its shape:
 *
 *   # 🌹 Rosebud data export            Generated: <ISO time>
 *   # 🌹 Rosebud entries                ### <first date> - <last date>
 *   ---
 *   ## <emoji> <title>                  ("## Untitled" when it had none)
 *   ### Monday, November 17th, 2025     (a date only: no time of day, no time zone)
 *   #### Tags                           **Emotions:** a, b   **People:** …   **Topics:** …   (each optional)
 *   #### Reflection                     Rosebud's own summary (optional)
 *   #### Entry                          **Rosebud:** … / **<your name>:** … alternating, each running until the next
 *   ---                                 speaker line; replies may contain their own Markdown (headings, rules, lists)
 *   …
 *   # Drafts / # Objectives / # Goals / # Preferences / # Weekly reports / # Ask Rosebud reports   (not entries)
 *
 * An entry starts only at a "## " line whose next non-blank line is a full weekday date, so headings inside replies
 * can't split an entry. Words are kept exactly (only the closing "---" separator and edge whitespace are removed).
 */
import type { TagKind } from "../model";
import type { ImportEntry, ImportProblem, ParsedImport } from "./model";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DATE = /^### (?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2})(?:st|nd|rd|th), (\d{4})\s*$/;
const TRAILING = new Set(["# Drafts", "# Objectives", "# Goals", "# Preferences", "# Weekly reports", "# Ask Rosebud reports"]);
const TRAILING_LABEL: Record<string, string> = { "# Drafts": "Drafts", "# Objectives": "Objectives", "# Goals": "Goals", "# Preferences": "Preferences", "# Weekly reports": "Weekly reports", "# Ask Rosebud reports": "Ask Rosebud reports" };
const TAGS: Record<string, TagKind> = { Emotions: "mood", People: "person", Topics: "topic" };

export const isRosebudExport = (text: string) => /^# 🌹 Rosebud (data export|entries)/m.test(text.slice(0, 4000));

/** Midday on that calendar day in the person's time zone (Rosebud exports no time), plus `minutes` to keep same-day order. */
export function middayIn(date: string, timeZone: string, minutes = 0): string {
  const guess = Date.parse(`${date}T12:00:00Z`) + minutes * 60000;
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
    const shown = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`);
    return new Date(guess - (shown - guess)).toISOString();
  } catch { return new Date(guess).toISOString(); }
}

export function fromRosebud(text: string, label: string, timeZone: string): ParsedImport {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const nextFilled = (i: number) => { let j = i + 1; while (j < lines.length && !lines[j].trim()) j++; return j; };
  const starts: number[] = [];
  for (let i = 0; i < lines.length; i++) if (lines[i].startsWith("## ") && DATE.test(lines[nextFilled(i)] ?? "")) starts.push(i);
  const trailing = lines.map((l, i) => (TRAILING.has(l.trim()) && i > (starts[starts.length - 1] ?? 0) ? i : -1)).filter((i) => i >= 0);
  const end = trailing[0] ?? lines.length;

  // Your speaker name: whoever answers Rosebud, most often (the export writes your account name).
  const names = new Map<string, number>();
  for (const s of starts) for (let i = s; i < Math.min(lines.length, s + 400); i++) {
    const m = /^\*\*([^*]{1,60}):\*\*/.exec(lines[i]);
    if (m && m[1] !== "Rosebud" && lines.slice(s, i).includes("#### Entry")) { names.set(m[1], (names.get(m[1]) ?? 0) + 1); break; }
  }
  const me = [...names.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  const speaker = new RegExp(`^\\*\\*(Rosebud|${me.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}):\\*\\* ?(.*)$`);

  const entries: ImportEntry[] = [], problems: ImportProblem[] = [];
  const perDay = new Map<string, number>(), seenOnDay = new Map<string, number>();
  const parsedDates = starts.map((s) => { const m = DATE.exec(lines[nextFilled(s)])!; return `${m[3]}-${String(MONTHS.indexOf(m[1]) + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`; });
  for (const d of parsedDates) perDay.set(d, (perDay.get(d) ?? 0) + 1);

  starts.forEach((s, index) => {
    const stop = index + 1 < starts.length ? starts[index + 1] : end;
    const block = lines.slice(s, stop), localDate = parsedDates[index];
    const rawTitle = block[0].slice(3).trim(), title = rawTitle === "Untitled" ? "" : rawTitle;
    const at = (h: string) => block.indexOf(h);
    const entryAt = at("#### Entry");
    if (entryAt < 0) { problems.push({ index, date: localDate, reason: "It has no conversation." }); return; }
    // Tags and reflection sit between the date and the conversation.
    const head = block.slice(0, entryAt);
    const tags: ImportEntry["tags"] = [], rawTags: Record<string, string> = {};
    for (const l of head) {
      const m = /^\*\*(Emotions|People|Topics):\*\*\s*(.*)$/.exec(l);
      if (m) { rawTags[m[1]] = m[2]; for (const name of m[2].split(",").map((x) => x.trim()).filter(Boolean)) tags.push({ kind: TAGS[m[1]], name, source: "ai" }); }
    }
    const reflAt = head.indexOf("#### Reflection");
    const reflection = reflAt >= 0 ? head.slice(reflAt + 1).join("\n").trim() : "";
    // The conversation: each speaker line runs until the next one; the closing "---" separator is not part of it.
    const messages: ImportEntry["messages"] = [];
    let before = false;
    for (const l of block.slice(entryAt + 1)) {
      const m = speaker.exec(l);
      if (m) messages.push({ role: m[1] === "Rosebud" ? "assistant" : "user", body: m[2], createdAt: null });
      else if (messages.length) messages[messages.length - 1].body += `\n${l}`;
      else if (l.trim()) before = true;
    }
    if (messages.length) messages[messages.length - 1].body = messages[messages.length - 1].body.replace(/\n\s*---\s*$/, "").replace(/\s+$/, "");
    if (before) { problems.push({ index, date: localDate, reason: "Some words come before the first speaker, so they can’t be attributed." }); return; }
    // Same-day entries keep their order (the export lists newest first): later in the file is earlier in the day.
    const n = perDay.get(localDate) ?? 1, p = seenOnDay.get(localDate) ?? 0; seenOnDay.set(localDate, p + 1);
    entries.push({
      index, sourceKey: null, journalName: "Rosebud", companionName: "Rosebud",
      title, summary: reflection.length <= 4000 ? reflection : "", localDate, timeZone, startedAt: middayIn(localDate, timeZone, n - 1 - p), completedAt: null,
      messages, tags,
      original: { source_title: rawTitle, date_text: lines[nextFilled(s)].slice(4).trim(), time_unknown: true, ...(reflection ? { analysis: { reflection } } : {}), ...(Object.keys(rawTags).length ? { tags: rawTags } : {}) },
    });
  });
  const extras = trailing.map((i, k) => { const stopAt = trailing[k + 1] ?? lines.length; return { label: TRAILING_LABEL[lines[i].trim()], lines: stopAt - i }; });
  return {
    source: "rosebud", label, entries, problems,
    unavailable: { times: "Rosebud exports dates only, so entries show their day without a time.", timeZone: "Not in the export; your Muse time zone is used.", attachments: "None in this export.", journal: "Rosebud doesn’t name journals in its export." },
    notImported: extras.map((e) => e.label),
  };
}
