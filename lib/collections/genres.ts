import type {MediaKind} from '@/lib/collections/models';

/** Curated genre choices shared by the Book and media editors and by book lookup genre mapping. */
export type GenreKind='book'|MediaKind;
const common=['Fantasy','Romance','Science Fiction','Mystery','Thriller','Horror','Adventure','Comedy','Drama','Historical','Nonfiction'];
export const genrePresets:Record<GenreKind,string[]>={
 book:[...common,'Romantasy','Contemporary Romance','Historical Romance','Historical Fiction','Literary Fiction','Contemporary Fiction','Young Adult','Biography','Memoir','History','Self-Help','Graphic Novel','Poetry'],
 movie:[...common,'Action','Animation','Documentary','Family','Musical','Crime','War','Western'],
 tv:[...common,'Animation','Documentary','Reality','Crime','Sitcom','Miniseries','Family'],
 album:['Pop','Rock','Indie','Alternative','Hip-Hop','R&B','Country','Folk','Electronic','Dance','Jazz','Classical','Soundtrack','Metal','Punk','Soul','K-Pop','Latin','Singer-Songwriter'],
 game:['RPG','Action RPG','CRPG','Strategy','Turn-Based Strategy','Adventure','Action','Simulation','Puzzle','Survival','Horror','Platformer','Cozy','Open World','Roguelike','Visual Novel','Sports','Racing']
};
export const splitGenres=(value:string)=>[...new Set(value.split(',').map(part=>part.trim()).filter(Boolean))];

/**
 * Genre aliases (#50): spelling variants and common shorthands that mean the same genre, mapped to the curated preset
 * label above. Used for statistics only; what people typed is never rewritten. Genuinely different genres (High
 * Fantasy, Dark Fantasy, Cozy Mystery…) are deliberately not merged.
 */
const aliasTable:Record<string,string[]>={
 'Science Fiction':['sci-fi','scifi','sci fi','sf','science-fiction','science fiction','sciencefiction','sci-fi fiction'],
 'Fantasy':['fantasy','fantasy fiction'],
 'Romance':['romance','romance novel','romance novels'],
 'Romantasy':['romantasy','romantic fantasy','fantasy romance'],
 'Mystery':['mystery','mysteries','mystery fiction'],
 'Thriller':['thriller','thrillers','suspense thriller'],
 'Horror':['horror','horror fiction'],
 'Nonfiction':['nonfiction','non-fiction','non fiction'],
 'Young Adult':['young adult','ya','ya fiction','young-adult'],
 'Literary Fiction':['literary fiction','lit fic','litfic','literary'],
 'Historical Fiction':['historical fiction','hist fic','histfic','historical novel'],
 'Graphic Novel':['graphic novel','graphic novels','comics','comic'],
 'Self-Help':['self-help','self help','selfhelp'],
 'Biography':['biography','biographies','bio'],
 'Memoir':['memoir','memoirs'],
 'Poetry':['poetry','poems'],
};
const aliasIndex=new Map(Object.entries(aliasTable).flatMap(([label,aliases])=>[[label.toLocaleLowerCase('en'),label],...aliases.map(a=>[a,label] as [string,string])]));
for(const label of genrePresets.book)aliasIndex.set(label.toLocaleLowerCase('en'),label);
/** The canonical label for statistics: a known alias or preset becomes its preset label; anything else keeps its own words. */
export function canonicalGenre(value:string){const clean=value.trim().replace(/\s+/g,' ');return aliasIndex.get(clean.toLocaleLowerCase('en'))??clean;}
