import { sparkle } from "@/components/design/MuseJournal";

export type DailyArtKind = "rituals" | "plan" | "priorities" | "forecast" | "three" | "bills" | "coins" | "scale";

/**
 * Small drawn scenes for cards with nothing in them yet (Daily Edit first, then every module: the Muse sky, Nov 15),
 * in the same drawing vocabulary as the journal heroes (app/journals.css; styles in app/sky.css). Each takes its card's
 * ink. Decorative: the card's own words carry the meaning.
 */
export function DailyArt({ kind }: { kind: DailyArtKind }) {
  return <span className="muse-daily-art" data-kind={kind} aria-hidden="true"><svg viewBox="0 0 120 76">{scenes[kind]}</svg></span>;
}

const twinkles = (points: [number, number, number][]) => points.map(([x, y, r], i) => <path key={i} className="muse-journal-art-twinkle" d={sparkle(x, y, r)} />);

const scenes: Record<DailyArtKind, React.ReactNode> = {
  /** A lit candle on a little dish; the flame breathes. */
  rituals: <>
    <ellipse className="muse-daily-art-glow" cx="60" cy="30" rx="22" ry="22" />
    <ellipse className="muse-journal-art-cloud" cx="60" cy="66" rx="28" ry="5" />
    <rect className="muse-journal-art-book" x="49" y="34" width="22" height="32" rx="4" />
    <path className="muse-journal-art-line" d="M53 42c4 2 10 2 14 0" />
    <path className="muse-journal-art-line" d="M60 34v-5" />
    <path className="muse-daily-art-flame" d="M60 8C66 16 68 22 60 29C52 22 54 16 60 8Z" />
    {twinkles([[26, 18, 5], [94, 22, 4], [100, 52, 3], [20, 50, 3]])}
  </>,
  /** The day as an arc: the sun rising on one side, a crescent waiting on the other. */
  plan: <>
    <path className="muse-journal-art-trail" d="M16 62C34 20 86 20 104 62" />
    <path className="muse-journal-art-line" d="M8 62H112" />
    <circle className="muse-daily-art-sun" cx="30" cy="40" r="9" />
    <path className="muse-daily-art-rays" d="M30 25v-5M30 60v-5M15 40h-5M50 40h-5M19.4 29.4l-3.5-3.5M44.1 54.1l-3.5-3.5M19.4 50.6l-3.5 3.5M44.1 25.9l-3.5 3.5" />
    <path className="muse-journal-art-moon" d="M90 26a12 12 0 1 0 10 18a10 10 0 1 1-10-18Z" />
    {twinkles([[64, 14, 4], [76, 30, 3], [112, 18, 3]])}
  </>,
  /** Three stars waiting to be joined: one for each thing that matters today. */
  priorities: <>
    <path className="muse-journal-art-trail" d="M22 50L60 22L98 44" />
    <path className="muse-daily-art-star" d={sparkle(22, 50, 10)} />
    <path className="muse-daily-art-star" data-main="" d={sparkle(60, 22, 14)} />
    <path className="muse-daily-art-star" d={sparkle(98, 44, 10)} />
    {twinkles([[40, 62, 3], [84, 14, 3], [110, 66, 2.5]])}
  </>,
  /** A small zodiac ring with a star at its heart. */
  forecast: <>
    <circle className="muse-journal-art-line" cx="60" cy="38" r="30" />
    <circle className="muse-journal-art-line" data-soft="" cx="60" cy="38" r="21" />
    <path className="muse-journal-art-line" data-soft="" d={Array.from({ length: 12 }, (_, k) => { const a = (Math.PI / 6) * k, c = Math.cos(a), s = Math.sin(a); return `M${(60 + 21 * c).toFixed(1)} ${(38 + 21 * s).toFixed(1)}L${(60 + 30 * c).toFixed(1)} ${(38 + 30 * s).toFixed(1)}`; }).join("")} />
    <path className="muse-daily-art-star" data-main="" d={sparkle(60, 38, 11)} />
    <circle className="muse-journal-art-dot" cx="86" cy="23" r="2.4" /><circle className="muse-journal-art-dot" cx="38" cy="58" r="2" />
    {twinkles([[12, 16, 4], [108, 62, 3]])}
  </>,
  /** An envelope with a little bell: bills and recurring payments, when they come. */
  bills: <>
    <rect className="muse-journal-art-book" x="30" y="26" width="60" height="40" rx="5" />
    <path className="muse-journal-art-line" d="M30 30l30 20l30-20" />
    <g className="muse-daily-art-swing"><path className="muse-daily-art-sun" d="M86 10c-7 0-11 5-11 12v6l-3 4h28l-3-4v-6c0-7-4-12-11-12Z" /><circle className="muse-daily-art-sun" cx="86" cy="35" r="2.6" /></g>
    {twinkles([[18, 18, 4], [110, 50, 3], [16, 60, 3]])}
  </>,
  /** A small stack of coins with one standing on its edge, catching the light. */
  coins: <>
    <ellipse className="muse-daily-art-coin" cx="46" cy="62" rx="20" ry="6" />
    <path className="muse-daily-art-coin" d="M26 62v-6c0 3.3 9 6 20 6s20-2.7 20-6v6c0 3.3-9 6-20 6s-20-2.7-20-6Z" />
    <ellipse className="muse-daily-art-coin" cx="46" cy="50" rx="20" ry="6" />
    <path className="muse-daily-art-coin" d="M26 50v-6c0 3.3 9 6 20 6s20-2.7 20-6v6c0 3.3-9 6-20 6s-20-2.7-20-6Z" />
    <ellipse className="muse-daily-art-coin" data-top="" cx="46" cy="44" rx="20" ry="6" />
    <g className="muse-journal-invite-float"><ellipse className="muse-daily-art-coin" data-top="" cx="86" cy="36" rx="12" ry="16" /><path className="muse-journal-art-line" d="M86 28v16M82 31c2-2 7-2 8 1c0 4-8 3-8 7c1 3 6 3 8 1" /></g>
    {twinkles([[104, 16, 5], [20, 22, 4], [112, 60, 3]])}
  </>,
  /** A balance scale, waiting for a plan on one side and what happened on the other. */
  scale: <>
    <path className="muse-journal-art-line" d="M60 14v52M44 68h32M24 26h72" />
    <circle className="muse-daily-art-sun" cx="60" cy="14" r="3.5" />
    <path className="muse-journal-art-line" data-soft="" d="M24 26l-10 22M24 26l10 22M96 26l-10 22M96 26l10 22" />
    <path className="muse-daily-art-bubble" d="M12 48h24a12 7 0 0 1-24 0Z" />
    <path className="muse-daily-art-bubble" data-i="1" d="M84 48h24a12 7 0 0 1-24 0Z" />
    {twinkles([[40, 10, 4], [84, 8, 3], [112, 70, 3]])}
  </>,
  /** Three soft bubbles, ready for three little emojis. */
  three: <>
    <circle className="muse-daily-art-bubble" cx="28" cy="44" r="15" />
    <circle className="muse-daily-art-bubble" data-i="1" cx="60" cy="34" r="17" />
    <circle className="muse-daily-art-bubble" data-i="2" cx="92" cy="44" r="15" />
    <path className="muse-daily-art-shine" d="M21 37a9 9 0 0 1 7-4M52 26a10 10 0 0 1 8-4M85 37a9 9 0 0 1 7-4" />
    {twinkles([[44, 12, 4], [110, 18, 3], [12, 66, 3]])}
  </>,
};
