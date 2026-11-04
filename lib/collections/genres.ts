import type {MediaKind} from '@/lib/collections/models';

/** Curated genre choices shared by the Book and media editors and by book lookup genre mapping. */
export type GenreKind='book'|MediaKind;
const common=['Fantasy','Romance','Science Fiction','Mystery','Thriller','Horror','Adventure','Comedy','Drama','Historical','Nonfiction'];
export const genrePresets:Record<GenreKind,string[]>={
 book:[...common,'Romantasy','Contemporary Romance','Historical Romance','Historical Fiction','Literary Fiction','Contemporary Fiction','Young Adult','Biography','Memoir','History','Self-Help','Graphic Novel','Poetry'],
 movie:[...common,'Action','Animation','Documentary','Family','Musical','Crime','War','Western'],
 tv:[...common,'Animation','Documentary','Reality','Crime','Sitcom','Miniseries','Family'],
 game:['RPG','Action RPG','CRPG','Strategy','Turn-Based Strategy','Adventure','Action','Simulation','Puzzle','Survival','Horror','Platformer','Cozy','Open World','Roguelike','Visual Novel','Sports','Racing']
};
export const splitGenres=(value:string)=>[...new Set(value.split(',').map(part=>part.trim()).filter(Boolean))];
