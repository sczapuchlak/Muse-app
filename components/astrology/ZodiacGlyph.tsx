import type {CSSProperties} from 'react';
import {zodiacSigns,type ZodiacSign} from '@/lib/cosmic-forecast';
import './ZodiacGlyph.css';

/**
 * Muse's own zodiac glyphs: drawn on the same 24px grid and rounded 1.7 stroke as every Muse icon, instead of the
 * system font's dated symbols. Each sign has its own colour from the theme's inks, ordered so neighbouring signs
 * never share a hue (colour is decoration here; the sign name always appears in text).
 */
const paths:Record<ZodiacSign,string>={
 aries:'M12 20V10M12 10c0-3.6-1.9-6-4.6-6C5.2 4 4 5.7 4 7.6 4 9.9 5.8 11.4 7.6 11.2M12 10c0-3.6 1.9-6 4.6-6C18.8 4 20 5.7 20 7.6c0 2.3-1.8 3.8-3.6 3.6',
 taurus:'M5 4.2c1.2 3.6 3.9 5.6 7 5.6s5.8-2 7-5.6M12 9.8a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
 gemini:'M5 4.5c4.3 1.6 9.7 1.6 14 0M5 19.5c4.3-1.6 9.7-1.6 14 0M9 6v12M15 6v12',
 cancer:'M19 9.2c-2.2-3-6.3-4.1-10.2-3M5 14.8c2.2 3 6.3 4.1 10.2 3M9 9.2a2.2 2.2 0 1 1-4.4 0 2.2 2.2 0 0 1 4.4 0ZM19.4 14.8a2.2 2.2 0 1 1-4.4 0 2.2 2.2 0 0 1 4.4 0Z',
 leo:'M11 15.2a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM11 15.2c0-6.2 1.3-10.2 5-10.2 2.6 0 3.8 2.2 3 4.6-.9 2.6-3.4 4.6-2.4 7.2.6 1.6 2.4 1.9 3.4.6',
 virgo:'M4 8v10M4 9c0-2.4 3.4-2.4 3.4 0v9M7.4 9c0-2.4 3.4-2.4 3.4 0v8.4c0 2.4 2.6 3.6 5 1.8M10.8 12.6c1.8-2.4 6.4-2.6 6.6.6.1 2.4-2.6 4.4-6.6 5.4',
 libra:'M4 20h16M4 15.6h4.6a3.4 3.4 0 1 1 6.8 0H20',
 scorpio:'M4 8v10M4 9c0-2.4 3.2-2.4 3.2 0v9M7.2 9c0-2.4 3.2-2.4 3.2 0v9M10.4 9c0-2.4 3.2-2.4 3.2 0v8.2c0 1.6 1.2 2.8 2.8 2.8H20m-2.2-2.2L20 20l-2.2 2.2',
 sagittarius:'M5 19 19 5M12.4 5H19v6.6M7.6 11.6l4.8 4.8',
 capricorn:'M4 6.4c2 .1 3.2 2.8 3.2 6V18M7.2 10.4c0-3.2 1.9-5.4 4-5.4 2.2 0 3.4 2.6 3.4 5.6v4.2c0 2.6 1.6 4.4 3.4 4.4a2.8 2.8 0 0 0 0-5.6c-1.8 0-3.4 1.4-3.4 3.4',
 aquarius:'M3.5 10.2 6.3 8l2.8 2.2L11.9 8l2.8 2.2L17.5 8l2.8 2.2M3.5 16.2 6.3 14l2.8 2.2 2.8-2.2 2.8 2.2 2.8-2.2 2.8 2.2',
 pisces:'M6.4 4c3.2 3.4 3.2 12.6 0 16M17.6 4c-3.2 3.4-3.2 12.6 0 16M5 12h14',
};
/** Twelve hues from the theme's eight inks: the inks themselves plus four blends, in an order with no repeats nearby. */
const signHue=['var(--chart-2)','var(--chart-1)','var(--chart-4)','var(--chart-5)','var(--chart-3)','var(--chart-7)','var(--chart-6)','color-mix(in srgb,var(--chart-4) 55%,var(--chart-2))','color-mix(in srgb,var(--chart-1) 55%,var(--chart-3))','color-mix(in srgb,var(--chart-5) 55%,var(--chart-2))','color-mix(in srgb,var(--chart-4) 50%,var(--chart-3))','color-mix(in srgb,var(--chart-6) 50%,var(--chart-1))'];
export const signColor=(sign:ZodiacSign)=>signHue[zodiacSigns.indexOf(sign)];
export const signStyle=(sign:ZodiacSign|null|undefined)=>(sign?{'--sign':signColor(sign)}:{}) as CSSProperties;

export function ZodiacGlyph({sign,size=22}:{sign:ZodiacSign;size?:number}){
 return <svg className="muse-zodiac-glyph" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[sign]}/></svg>;
}
/** A sign's tile: the glyph on a flat tinted square in the sign's colour. */
export function ZodiacTile({sign,size='md'}:{sign:ZodiacSign|null|undefined;size?:'sm'|'md'|'lg'}){
 const px=size==='sm'?18:size==='lg'?30:24;
 return <span className="muse-zodiac-tile" data-size={size} style={signStyle(sign)} aria-hidden="true">{sign?<ZodiacGlyph sign={sign} size={px}/>:<svg width={px} height={px} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round"><path d="M12 4v4M12 16v4M4 12h4M16 12h4"/></svg>}</span>;
}
