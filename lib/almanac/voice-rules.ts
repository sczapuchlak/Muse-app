/**
 * The Observant Muse, as checkable rules (#53). docs/ALMANAC_VOICE.md is the guide for writers; this is the part a
 * validator can enforce. Shared with Muse's celebration copy so every line Muse says follows one list.
 */
import type {AlmanacFormat,Tone} from './types';

/** Phrases Muse never says. Each has the reason, so a failing line explains itself. */
export const bannedPhrases:{pattern:RegExp;why:string}[]=[
 {pattern:/great job|amazing job|good job|well done/i,why:'generic congratulation'},
 {pattern:/congratulations|congrats/i,why:'generic congratulation'},
 {pattern:/achievement unlocked|level(ed)? up|unlock(ed)? your/i,why:'game-ified cliché'},
 {pattern:/crush(ing|ed)? it|killing it|slay(ed|ing)?\b|you got this|you've got this|keep (it )?up/i,why:'motivational slogan'},
 {pattern:/proud of you|so proud/i,why:'Muse notices; it does not grade'},
 {pattern:/\byou (should|must|need to|ought to)\b|\bdon't forget\b|\bremember to\b|\bwhy not\b/i,why:'instruction, not observation'},
 {pattern:/\bbecause you\b|\bmakes? you\b|\bmade you\b|\bcaused?\b|\bdue to your\b|\bthanks to your\b/i,why:'claims a cause the data cannot show'},
 {pattern:/\byou seem\b|\byou must be\b|\byou('re| are) (avoiding|struggling|hiding|stressed|anxious|depressed)\b|\bdeep down\b/i,why:'psychological claim'},
 {pattern:/the universe (is telling|wants|has a plan|is sending)|\bmanifest(ing|ed)?\b|meant to be|everything happens for a reason|\bdestined\b/i,why:'faux-spiritual certainty'},
 {pattern:/\btapestry\b|testament to|\bdelve\b|\bembark\b|in the realm of|symphony of|\belevate\b|navigate the|worth noting|\bjourney\b|\bbest self\b|\bhustle\b|\bgrind\b/i,why:'AI-sounding or corporate filler'},
 {pattern:/!{2,}|\?!|!\?/,why:'stacked punctuation'},
];

/** Rendered length limits (characters). Long formats are measured per section and in total. */
export const formatLimits:Record<AlmanacFormat,{title?:number;body:number;total?:number;minVariants:number}>={
 whisper:{body:110,minVariants:3},
 revelation:{title:72,body:300,minVariants:3},
 'field-note':{title:72,body:520,total:1600,minVariants:2},
 constellation:{title:72,body:380,minVariants:2},
};

/** Exclamation points allowed across all variants of one entry. Most entries have none. */
export const maxExclamationsPerEntry=1;

/** Tones a sensitive entry may not use: no jokes about feelings, bodies or money. */
export const tonesBarredWhenSensitive:Tone[]=['playful','wry'];
/** Sensitive entries stay off the most public surfaces: no whispers (they appear in headers and empty states). */
export const formatsBarredWhenSensitive:AlmanacFormat[]=['whisper'];

export function voiceProblems(text:string){return bannedPhrases.filter(b=>b.pattern.test(text)).map(b=>`“${text.match(b.pattern)?.[0]}”: ${b.why}`);}
