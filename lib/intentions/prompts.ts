/**
 * Intentions prompt library (#130). Written, not generated: every period has its own prompts, pitched at the
 * length of time it covers. A week is small and practical, a month is a chapter, a quarter is a season to steer,
 * a year is about who you are becoming. No prompt is shared between periods.
 *
 * A prompt becomes an ordinary Intentions section when it is added to a page (a writing section or a list
 * section that also remembers the question). The library itself stores nothing; favorites and the person's own
 * prompts live in `intention_prompts` (see prompt-store.ts).
 */
import type { IntentionPeriod } from "./periods";

export type PromptCategory = "feel" | "focus" | "body" | "heart" | "work" | "joy" | "grow" | "vision";
export const promptCategories: { id: PromptCategory; label: string; emoji: string; hint: string }[] = [
  { id: "feel", label: "Feel", emoji: "🌙", hint: "How you want it to feel" },
  { id: "focus", label: "Focus", emoji: "🎯", hint: "What gets your best energy" },
  { id: "body", label: "Body & rest", emoji: "🌿", hint: "Energy, rest and care" },
  { id: "heart", label: "People", emoji: "💗", hint: "Love, friends and family" },
  { id: "work", label: "Work & money", emoji: "💼", hint: "Craft, career and finances" },
  { id: "joy", label: "Joy & home", emoji: "🏡", hint: "Play, places and space" },
  { id: "grow", label: "Grow & release", emoji: "🪜", hint: "Learning and letting go" },
  { id: "vision", label: "Vision & values", emoji: "🔭", hint: "The bigger picture" },
];
export const isPromptCategory = (v: unknown): v is PromptCategory => promptCategories.some((c) => c.id === v);

/** How a prompt is answered: a few free sentences, or a short list. */
export type PromptKind = "writing" | "list";
export type LibraryPrompt = { id: string; period: IntentionPeriod; category: PromptCategory; kind: PromptKind; title: string; question: string };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const make = (period: IntentionPeriod) => (category: PromptCategory, kind: PromptKind, title: string, question: string): LibraryPrompt => ({ id: `${period[0]}-${category}-${slug(title)}`, period, category, kind, title, question });

const w = make("week");
const week: LibraryPrompt[] = [
  w("feel", "writing", "How I want it to feel", "By Sunday night, how do I want this week to have felt?"),
  w("feel", "writing", "A comfort to protect", "What small comfort will I protect, even when things get busy?"),
  w("feel", "writing", "Carrying in", "What from last week am I carrying in, and what can I put down at the door?"),
  w("focus", "writing", "The one thing", "If only one thing gets done this week, what should it be?"),
  w("focus", "list", "What can wait", "What is allowed to wait until next week?"),
  w("focus", "writing", "Monday's first step", "What is the very first step I'll take on Monday morning?"),
  w("focus", "writing", "Where my best hours go", "Which hours feel like my best this week, and what deserves them?"),
  w("body", "writing", "How I'll rest", "Where will rest actually fit this week? Name the when, not just the wish."),
  w("body", "writing", "One body-kind promise", "What one small thing for my body can I keep every day?"),
  w("heart", "list", "Who to reach out to", "Who would I love to check in with this week?"),
  w("heart", "writing", "A kindness to plan", "What's one kind thing I can plan for someone, or for myself?"),
  w("work", "writing", "The thing I'm avoiding", "What have I been avoiding, and what is the smallest way in?"),
  w("work", "writing", "A money check-in", "Is there one money thing to look at this week: a bill, a plan, a treat?"),
  w("joy", "list", "Little things to look forward to", "What small things are on the calendar that I'm happy about?"),
  w("joy", "writing", "A tiny adventure", "What's a small adventure I can fit into an ordinary day?"),
  w("joy", "writing", "A fifteen-minute reset", "Which corner of home would feel better after fifteen minutes?"),
  w("grow", "writing", "A gentle experiment", "What one little thing will I try differently this week?"),
  w("grow", "writing", "A boundary to hold", "Where do I want to say no, or not yet, this week?"),
];

const m = make("month");
const month: LibraryPrompt[] = [
  m("feel", "writing", "The feel of this month", "If this month had a mood, a color and a pace, what would they be?"),
  m("feel", "writing", "What I'm coming in with", "What am I carrying in from last month, and what do I want to set down?"),
  m("feel", "writing", "A theme for the weeks ahead", "What one idea do I want to keep returning to when things get noisy?"),
  m("focus", "writing", "What deserves my best energy", "Where do I want my best energy to go this month, and what gets the leftovers?"),
  m("focus", "list", "Wins I'd love by month's end", "What three to five wins would make me glad I planned this month?"),
  m("focus", "writing", "The thing I keep postponing", "What have I put off the longest, and what would help me begin?"),
  m("focus", "list", "My non-negotiables", "What are the few things I will protect this month, whatever else happens?"),
  m("body", "writing", "A rhythm to build", "What daily or weekly rhythm would make this month feel supported?"),
  m("body", "writing", "Rest I'm scheduling", "Where in this month's calendar can rest, quiet or slow time be written in?"),
  m("body", "writing", "Moving and nourishing kindly", "What would a kind, realistic way of moving and eating look like for me this month?"),
  m("heart", "list", "People I want more time with", "Who do I want to see or call this month, and what would we do?"),
  m("heart", "writing", "A conversation to have", "Is there a conversation I've been meaning to have? What do I want to say?"),
  m("heart", "writing", "How I'll show up", "How do I want to show up for the people in my life this month?"),
  m("work", "writing", "One project to move forward", "Which one project gets real progress this month, and what does 'moved forward' mean?"),
  m("work", "writing", "A money intention", "What is my money intention for this month, and what's one number I'll watch?"),
  m("work", "writing", "A skill to practice", "What craft or skill do I want to practice a little each week?"),
  m("joy", "list", "Small joys to collect", "What small joys do I want to gather this month?"),
  m("joy", "writing", "A place to go, a thing to make", "What's somewhere I'd like to go, or something I'd like to make, before the month ends?"),
  m("joy", "writing", "A space to tend", "Which room, drawer or corner would change how my days feel if I tended it?"),
  m("grow", "writing", "A thirty-day trial", "What one habit or change will I try for thirty days, and how will I know it's working?"),
  m("grow", "writing", "What I'm learning", "What am I curious about right now, and how can I feed that?"),
  m("grow", "list", "What to say no to", "What will I decline, pause or simplify to make room?"),
];

const q = make("quarter");
const quarter: LibraryPrompt[] = [
  q("feel", "writing", "The season I'm in", "If this season of my life had a name, what would it be?"),
  q("feel", "writing", "What I'm ready for", "What am I genuinely ready for this season that I wasn't before?"),
  q("focus", "list", "The three bets", "If I could make real progress on three things this season, what are they?"),
  q("focus", "writing", "What success looks like", "What one outcome would make me say this season was well spent?"),
  q("focus", "list", "What I'll stop starting", "What projects or commitments will I finish or release instead of adding more?"),
  q("body", "writing", "Health in this season", "What does taking care of my health look like across these months, not just this week?"),
  q("body", "writing", "My energy budget", "Where does my energy really go, and where do I want it to go instead?"),
  q("heart", "writing", "Relationships to invest in", "Which relationships deserve deliberate time this season, and what will I do about it?"),
  q("heart", "writing", "Home and family rhythm", "What rhythm would make shared life at home feel easier and warmer?"),
  q("work", "writing", "A project to finish", "What is the one project I want to carry over the finish line before this season ends?"),
  q("work", "writing", "A money milestone", "What money milestone do I want to reach by the end of the quarter, and what are the steps?"),
  q("work", "writing", "A stretch at work or in my craft", "Where do I want to stretch, and what would be a good stretch rather than a strain?"),
  q("joy", "list", "Experiences for the season", "What experiences do I want this season to hold?"),
  q("joy", "writing", "Time away", "When will I truly step away this season, and what will I do with the time?"),
  q("grow", "writing", "A skill to deepen", "Which skill do I want to be noticeably better at by the end of the quarter?"),
  q("grow", "writing", "What I'm outgrowing", "What am I outgrowing, and how can I leave it gracefully?"),
  q("grow", "writing", "A fear to approach gently", "What fear is worth meeting a little closer this season, and what is a gentle first step?"),
  q("grow", "list", "Signs of progress", "What signs will tell me I'm on track at the halfway point?"),
  q("vision", "writing", "Where this fits in my year", "How does this season move me toward where I want to be in a year?"),
  q("vision", "writing", "Values I want to steer by", "Which values should decide hard choices this season?"),
];

const y = make("year");
const year: LibraryPrompt[] = [
  y("feel", "writing", "How I want to feel in my life", "What do I want to feel most days, and what would make that more likely?"),
  y("feel", "writing", "This year's through-line", "If this year were a story, what would its through-line be?"),
  y("focus", "list", "The few big things", "What three to five things would make this year feel meaningful, whatever else happens?"),
  y("focus", "writing", "What I'm done pretending", "What am I ready to stop pretending about, to others or to myself?"),
  y("body", "writing", "My relationship with my body", "What would a kinder, more trusting relationship with my body look like by December?"),
  y("body", "writing", "Rest as a practice", "What would it mean to treat rest as part of the work this year?"),
  y("heart", "writing", "Who I'm becoming with the people I love", "How do I want to be with my family and closest people by the end of the year?"),
  y("heart", "writing", "Where I want to belong", "What community or circle do I want to be more a part of?"),
  y("work", "writing", "My work and craft vision", "What do I want my work or craft to look like by the end of the year?"),
  y("work", "writing", "My money story", "What do I want my relationship with money to feel like by December?"),
  y("work", "writing", "A financial milestone", "What is one meaningful financial milestone for this year, and why does it matter?"),
  y("joy", "list", "Places, adventures and firsts", "What places, adventures or first-times do I want this year to include?"),
  y("joy", "writing", "What makes a year feel alive", "Looking back at past years, what made one feel full of life? How can I plan for more of it?"),
  y("joy", "writing", "The home I'm building", "What do I want my home and daily surroundings to feel like a year from now?"),
  y("grow", "writing", "What I'm leaving behind", "What am I ready to leave in the old year: habits, stories, obligations?"),
  y("grow", "writing", "Who I'm becoming", "Who do I want to be by the end of this year, in three or four honest sentences?"),
  y("grow", "writing", "A year-long practice", "What one practice could I return to all year, however small?"),
  y("grow", "writing", "A risk worth taking", "What risk would I regret not taking?"),
  y("vision", "writing", "An ordinary Tuesday in December", "Describe an ordinary Tuesday in December, one that tells me the year went well."),
  y("vision", "list", "My values, in order", "Which values do I want to live by most, in the order I'd defend them?"),
  y("vision", "writing", "A letter from December", "Write a few lines from next December's me to the me starting this year."),
  y("vision", "writing", "Words to live by", "What words, a phrase or mantra could I come back to when I lose the thread?"),
];

export const promptLibrary: Record<IntentionPeriod, LibraryPrompt[]> = { week, month, quarter, year };
export const allLibraryPrompts: LibraryPrompt[] = [...week, ...month, ...quarter, ...year];
export const libraryPrompt = (id: string) => allLibraryPrompts.find((p) => p.id === id);

/** A few to show first, so the library opens as a short set, not one long list. */
export const featuredPromptIds: Record<IntentionPeriod, string[]> = {
  week: [week[0].id, week[3].id, week[7].id, week[9].id],
  month: [month[0].id, month[3].id, month[7].id, month[19].id],
  quarter: [quarter[0].id, quarter[2].id, quarter[3].id, quarter[14].id],
  year: [year[0].id, year[2].id, year[18].id, year[16].id],
};

/** Prompts for a period, filtered by category and search words. Pure, so it is testable. */
export function filterPrompts(list: LibraryPrompt[], category: PromptCategory | "all", query: string): LibraryPrompt[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter((p) => (category === "all" || p.category === category) && words.every((word) => `${p.title} ${p.question}`.toLowerCase().includes(word)));
}
