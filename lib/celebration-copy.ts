/**
 * Muse's celebration voice (#34): warm, witty, occasionally absurd; never "Great job!" or "Achievement unlocked!".
 * Lines rotate and never repeat back to back, so daily moments don't wear thin.
 */
export const celebrationCopy={
 book:['Another universe explored.','The final page. The story stays.','Your bookshelf has another little victory.','One more story among your stars.','The final page. A new constellation.','Closed the book. Kept the magic.'],
 priorities:['Your stars aligned today.','Three for three. Suspiciously powerful.','Look at you, making things happen.','Three priorities. One very accomplished human.'],
 habit:['A little consistency looks good on you.','Small rituals. Remarkable results.','Showing up, beautifully.'],
 streak3:['Three days in rhythm.','Three little days. A pattern is forming.'],
 streak7:['Seven days. Seven little victories.','A whole week of showing up.'],
 streak14:['Two weeks of quiet magic.','Fourteen days. The stars noticed.'],
 streak30:['Look what your consistency created.','You made a constellation out of persistence.'],
 streak100:['One hundred days. That deserves a little cosmic celebration.','A hundred little promises, kept.'],
 streak365:['A whole year of you showing up for you.','365 days. A universe of your own making.'],
 water:['Fully hydrated. Glowing, frankly.','Your water goal, beautifully met.','Hydration achieved. Very main character.'],
 readingGoal:['Your literary universe just got bigger.','Every page, accounted for. Challenge complete.','A whole year’s worth of worlds, explored.'],
 quest:['Fate has been thoroughly entertained.','Quest complete. Chaos approved.','The universe acknowledges your nonsense.'],
 milestone:['Another star in your universe.','That deserves a little cosmic celebration.','You made something extraordinary happen.'],
 aspirationMilestone:['One step closer, and it counts.','A milestone, crossed off and kept.','Another stone on the path.','That one took doing. Done.'],
 aspirationProgress:['Look how far this has come.','A quarter more of the way there.','The distance is starting to show.'],
 bucket:['One for the list. Crossed off in color.','Someday turned up. It was today.','A dream, now a memory.','Highlight it. You really did that.'],
 aspiration:['You said you would. You did.','A grand ambition, now a thing you did.','Finished. Let it be a big deal.','From someday to done.'],
} as const;
export type CopyContext=keyof typeof celebrationCopy;

const last=new Map<CopyContext,number>();
/** A line for this moment, never the same one twice in a row (per device, per session). */
export function pickLine(context:CopyContext,random=Math.random):string{
 const lines=celebrationCopy[context];let previous=last.get(context);
 if(previous===undefined&&typeof window!=='undefined'){try{const stored=window.sessionStorage.getItem(`muse.copy.${context}`);previous=stored===null?undefined:Number(stored);}catch{/* ignore */}}
 let index=Math.floor(random()*lines.length);if(lines.length>1&&index===previous)index=(index+1)%lines.length;
 last.set(context,index);try{window.sessionStorage.setItem(`muse.copy.${context}`,String(index));}catch{/* ignore */}
 return lines[index];
}
