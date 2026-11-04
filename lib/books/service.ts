import {createBookLookup} from './lookup';
/** One process-wide lookup so its short-lived cache is shared across requests. Server-only. */
export const bookLookup=createBookLookup();
