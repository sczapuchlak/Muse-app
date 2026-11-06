/**
 * The Almanac selector (#53): pure and deterministic. Same signals, library, settings, history and local date give the
 * same result on every device. When nothing qualifies it returns nothing; there is no filler line.
 */
import type {AlmanacEntry,AlmanacFormat,AlmanacModule,Signal,Variant} from './types';
import {conditionsHold,renderVariant,type Rendered} from './render';

export type Quietness='quiet'|'balanced'|'chatty';
export type AlmanacPreferences={enabled:boolean;sensitive:boolean;crossModule:boolean;quietness:Quietness;mutedFamilies:string[]};
export const defaultAlmanacPreferences:AlmanacPreferences={enabled:true,sensitive:false,crossModule:true,quietness:'balanced',mutedFamilies:[]};

/** One stored impression: ids and dates only, never rendered text. */
export type Impression={entryId:string;version:number;variantId:string;signalKey:string;surface:string;shownOn:string;dismissedAt?:string|null};

export type Surface={
 id:string;
 formats:AlmanacFormat[];
 modules:AlmanacModule[];
 /** How many picks per day at each quietness. */
 budget:Record<Quietness,number>;
 /**
  * The module's own established view of its records (Insights cards). Sensitive entries show here whatever the
  * sensitive setting, because these cards existed before the Almanac; the setting governs new, proactive observations.
  */
 ownsSensitive?:boolean;
};

export const surfaces={
 bookshelf:{id:'bookshelf',formats:['whisper'],modules:['reading'],budget:{quiet:0,balanced:1,chatty:2}},
 rituals:{id:'rituals',formats:['whisper'],modules:['rituals'],budget:{quiet:0,balanced:1,chatty:2}},
 dreams:{id:'dreams',formats:['whisper'],modules:['dreams'],budget:{quiet:0,balanced:1,chatty:1}},
 tarot:{id:'tarot',formats:['whisper'],modules:['tarot'],budget:{quiet:0,balanced:1,chatty:1}},
 atlas:{id:'atlas',formats:['revelation'],modules:['reading'],budget:{quiet:0,balanced:1,chatty:2}},
 insightsCards:{id:'insights-cards',formats:['revelation'],modules:['planner','rituals','mood','money','nourish','wellness'],budget:{quiet:5,balanced:5,chatty:5},ownsSensitive:true},
 fieldNotes:{id:'field-notes',formats:['field-note'],modules:['recap'],budget:{quiet:1,balanced:2,chatty:2}},
 constellations:{id:'constellations',formats:['constellation'],modules:['cross'],budget:{quiet:0,balanced:1,chatty:2}},
} satisfies Record<string,Surface>;

/** Small, stable string hash (FNV-1a). */
export function hash(text:string){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
const daysBetween=(a:string,b:string)=>Math.round((Date.parse(`${b}T00:00:00Z`)-Date.parse(`${a}T00:00:00Z`))/86400000);

export type Pick={entry:AlmanacEntry;variant:Variant;signal:Signal;rendered:Rendered};

/** Every reason an entry is not eligible, for tests and debugging. Empty means eligible. */
export function exclusion(entry:AlmanacEntry,signal:Signal|undefined,{prefs,history,today,surface}:{prefs:AlmanacPreferences;history:Impression[];today:string;surface:Surface}):string|null{
 if(entry.status!=='published')return 'not published';
 if(!surface.formats.includes(entry.format))return 'format';
 if(!signal)return 'no signal';
 if(!surface.modules.includes(signal.module))return 'module';
 if(entry.sensitivity==='sensitive'&&!prefs.sensitive&&!surface.ownsSensitive)return 'sensitive off';
 if(signal.crossModule?.length&&!prefs.crossModule)return 'cross-module off';
 if(prefs.mutedFamilies.includes(entry.family))return 'family muted';
 if(history.some(h=>h.entryId===entry.id&&h.dismissedAt))return 'dismissed';
 if(!conditionsHold(entry.trigger.when,signal.facts))return 'conditions';
 // Cooldown: shown on an earlier day within the cooldown (today's own showing stays, so a day is stable).
 const earlier=history.filter(h=>h.entryId===entry.id&&h.shownOn<today).map(h=>h.shownOn).sort().at(-1);
 if(earlier&&daysBetween(earlier,today)<entry.cooldownDays)return 'cooling down';
 return null;
}

/** The variant for today: seeded by person, entry and date, never the one shown last time (on an earlier day). */
export function chooseVariant(entry:AlmanacEntry,{userId,today,history}:{userId:string;today:string;history:Impression[]}){
 const shownToday=history.find(h=>h.entryId===entry.id&&h.shownOn===today);
 if(shownToday){const same=entry.variants.find(v=>v.id===shownToday.variantId);if(same)return same;}
 const last=history.filter(h=>h.entryId===entry.id&&h.shownOn<today).sort((a,b)=>a.shownOn.localeCompare(b.shownOn)).at(-1)?.variantId;
 const pool=entry.variants.length>1?entry.variants.filter(v=>v.id!==last):entry.variants;
 return pool[hash(`${userId}|${entry.id}|${entry.version}|${today}`)%pool.length];
}

export function selectAlmanac({signals,library,prefs,history,today,surface,userId}:{signals:Signal[];library:AlmanacEntry[];prefs:AlmanacPreferences;history:Impression[];today:string;surface:Surface;userId:string}):Pick[]{
 if(!prefs.enabled)return [];
 const budget=surface.budget[prefs.quietness];if(budget<=0)return [];
 const bySignal=new Map(signals.map(s=>[s.key,s]));
 const candidates:Pick[]=[];
 for(const entry of library){
  const signal=bySignal.get(entry.trigger.signal);
  if(exclusion(entry,signal,{prefs,history,today,surface}))continue;
  const variant=chooseVariant(entry,{userId,today,history}),rendered=renderVariant(entry,variant,signal!.facts);
  if(rendered)candidates.push({entry,variant,signal:signal!,rendered});
 }
 const shownToday=(p:Pick)=>history.some(h=>h.entryId===p.entry.id&&h.surface===surface.id&&h.shownOn===today);
 // Today's picks first (stable day), then strength, freshness, then a seeded tiebreak so ties don't always favour the same entry.
 candidates.sort((a,b)=>Number(shownToday(b))-Number(shownToday(a))||b.signal.strength-a.signal.strength||b.signal.observedOn.localeCompare(a.signal.observedOn)
  ||hash(`${userId}|${today}|${a.entry.id}`)-hash(`${userId}|${today}|${b.entry.id}`));
 // One voice per signal, one entry per family on a surface.
 const signalsUsed=new Set<string>(),familiesUsed=new Set<string>(),out:Pick[]=[];
 for(const c of candidates){if(out.length>=budget)break;if(signalsUsed.has(c.signal.key)||(surface.formats.includes('whisper')&&familiesUsed.has(c.entry.family)))continue;
  signalsUsed.add(c.signal.key);familiesUsed.add(c.entry.family);out.push(c);}
 return out;
}
