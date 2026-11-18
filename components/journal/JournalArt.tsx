import { sparkle } from "../design/MuseJournal";

/** Hero drawing: an open journal under a crescent, two speech lines drifting up from the page like a conversation. */
export function JournalHeroArt() {
  return <svg viewBox="0 0 300 220" role="img" aria-label="An open journal under the moon, with a conversation rising from its pages">
    <path className="muse-journal-art-trail" d="M70 150C60 104 92 70 140 66s90 8 110-30" />
    <circle className="muse-journal-art-moon" cx="238" cy="44" r="18" />
    <circle cx="246" cy="38" r="15" fill="var(--glass-background)" opacity=".92" />
    {[[42, 40, 5], [96, 28, 3.5], [196, 92, 4], [268, 112, 3], [30, 112, 3]].map(([x, y, r], i) => <path key={i} className="muse-journal-art-twinkle mj-twinkle" style={{ animationDelay: `${i * 0.7}s` }} d={sparkle(x, y, r)} />)}
    <g className="mj-float">
      <rect className="muse-journal-art-cloud" x="112" y="74" width="92" height="30" rx="15" />
      <path className="muse-journal-art-line" d="M126 89h46M126 89" />
      <rect className="muse-journal-art-cloud" data-back x="150" y="34" width="74" height="26" rx="13" />
      <path className="muse-journal-art-line" d="M162 47h40" />
    </g>
    <path className="muse-journal-art-book" d="M40 150c34-10 68-8 108 8v48c-40-16-74-18-108-8Z" />
    <path className="muse-journal-art-book" d="M256 150c-34-10-68-8-108 8v48c40-16 74-18 108-8Z" />
    <path className="muse-journal-art-line" d="M58 166c22-5 46-3 72 5M58 178c22-5 46-3 72 5M168 171c26-8 50-10 72-5M168 183c26-8 50-10 72-5" />
    <path d="M148 158v48" stroke="color-mix(in srgb,var(--journal-a) 70%,var(--foreground))" strokeWidth="1.4" />
  </svg>;
}

/** A small drawn page for empty states. */
export function EmptyPageArt() {
  return <svg viewBox="0 0 120 80" aria-hidden="true" width="120" height="80">
    <path className="muse-journal-art-book" d="M14 56c16-5 30-4 46 3V22c-16-7-30-8-46-3Z" /><path className="muse-journal-art-book" d="M106 56c-16-5-30-4-46 3V22c16-7 30-8 46-3Z" />
    <path className="muse-journal-art-line" d="M22 30c10-2 20-1 30 3M22 38c10-2 20-1 30 3M68 33c10-4 20-5 30-3M68 41c10-4 20-5 30-3" />
    <path className="muse-journal-art-twinkle" d={sparkle(98, 10, 5)} /><path className="muse-journal-art-twinkle" d={sparkle(18, 8, 3)} />
  </svg>;
}
