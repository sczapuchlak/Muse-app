/** The Almanac library, bundled at build time from content/almanac (#53). No runtime network or database. */
import type {AlmanacEntry,AlmanacFile} from './types';
import aspirations from '@/content/almanac/aspirations.json';
import constellations from '@/content/almanac/constellations.json';
import dreamsAndTarot from '@/content/almanac/dreams-and-tarot.json';
import fieldNotes from '@/content/almanac/field-notes.json';
import littleRevelations from '@/content/almanac/little-revelations.json';
import readingMoments from '@/content/almanac/reading-moments.json';
import readingTraits from '@/content/almanac/reading-traits.json';
import rituals from '@/content/almanac/rituals.json';

export const almanacFiles=[aspirations,constellations,dreamsAndTarot,fieldNotes,littleRevelations,readingMoments,readingTraits,rituals] as unknown as AlmanacFile[];
/** Only published entries are ever selectable. */
export const almanacLibrary:AlmanacEntry[]=almanacFiles.flatMap(f=>f.entries).filter(e=>e.status==='published');
