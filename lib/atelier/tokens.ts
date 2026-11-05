/**
 * Human-facing map of the theme tokens Theme Atelier may change. These are exactly the per-theme tokens in
 * app/themes.css (colour, gradient, glass and atmosphere values). Universal design-system tokens (radii, spacing,
 * typography, sizes, layout; #57) are deliberately absent, so no theme can change component structure.
 */
import {officialTokenValues} from './catalog.generated';

export type TokenSection='atmosphere'|'stars'|'accents'|'text'|'interaction'|'surfaces'|'frosted'|'icons'|'progress'|'charts'|'advanced';
export type TokenInfo={name:string;label:string;section:TokenSection;hint?:string};

const entries:[string,string,TokenSection,string?][]=[
 ['--background','Page background','atmosphere','The deepest colour behind everything.'],
 ['--atmosphere-aqua','Bloom one','atmosphere'],['--atmosphere-lavender','Bloom two','atmosphere'],['--atmosphere-blush','Bloom three','atmosphere'],['--atmosphere-blue-violet','Bloom four','atmosphere'],
 ['--haze-primary','Haze one','atmosphere'],['--haze-secondary','Haze two','atmosphere'],['--hero-glow','Header glow','atmosphere'],
 ['--star-color-1','Star colour one','stars'],['--star-color-2','Star colour two','stars'],['--star-color-3','Star colour three','stars'],
 ['--constellation-color-1','Constellation one','stars'],['--constellation-color-2','Constellation two','stars'],['--constellation-color-3','Constellation three','stars'],
 ['--accent-aqua','Aqua','accents'],['--accent-purple','Purple','accents'],['--accent-pink','Pink','accents'],['--accent-cyan','Cyan','accents'],['--accent-teal','Teal','accents'],['--accent-blue-violet','Blue violet','accents'],['--accent-lavender','Lavender','accents'],['--accent-warm','Warm accent','accents'],
 ['--accent-primary','Primary accent','accents','Leads headings, highlights and primary moments.'],['--accent-secondary','Secondary accent','accents','Kickers, filters and supporting highlights.'],['--accent-pop','Pop accent','accents','Small bright moments.'],
 ['--action-fill','Primary button fill','interaction'],['--on-accent','Text on primary buttons','interaction'],['--focus-ring','Focus ring','interaction','Must stay clearly visible on the background.'],
 ['--selected-background','Selected background','interaction'],['--selected-border','Selected border','interaction'],['--selected-text','Selected text','text'],
 ['--filter-selected-background','Selected filter background','interaction'],['--filter-selected-border','Selected filter border','interaction'],['--filter-selected-text','Selected filter text','text'],
 ['--navigation-background','Active navigation wash','interaction'],['--navigation-accent','Navigation accent','interaction'],['--nav-icon','Navigation icon','interaction'],
 ['--information-accent','Information accent','interaction'],['--timer-accent','Timer accent','interaction'],['--success-primary','Success','interaction'],['--success-secondary','Success companion','interaction'],
 ['--wash-aqua','Aqua wash','interaction'],['--wash-purple','Purple wash','interaction'],['--wash-pink','Pink wash','interaction'],
 ['--foreground','Text','text'],['--text-muted','Muted text','text'],['--link-ink','Links','text'],['--navigation-text','Navigation text','text'],['--urgency-ink','Urgent text','text'],
 ['--ink-aqua','Aqua ink','text'],['--ink-purple','Purple ink','text'],['--ink-pink','Pink ink','text'],
 ['--glass-background','Card glass','surfaces'],['--glass-border','Card border','surfaces'],['--glass-edge','Glass highlight edge','surfaces'],['--glass-aqua-edge','Glass tinted edge','surfaces'],
 ['--surface-subtle','Quiet surface','surfaces'],['--surface-control','Control surface','surfaces'],['--surface-hover','Hover surface','surfaces'],['--floating-background','Popovers and menus','surfaces'],
 ['--divider','Dividers','surfaces'],['--interactive-border','Control border','surfaces'],['--water-control-border','Water control border','surfaces'],
 ['--planning-container-background','Planner container','surfaces'],['--planning-rail-background','Planner rail','surfaces'],['--planning-task-background','Planner task','surfaces'],['--planning-task-border','Planner task border','surfaces'],['--planning-control-background','Planner controls','surfaces'],
 ['--frosted-glass-background','Frosted card glass','frosted'],['--frosted-floating-background','Frosted popovers','frosted'],['--frosted-surface-subtle','Frosted quiet surface','frosted'],['--frosted-surface-control','Frosted control surface','frosted'],['--frosted-surface-hover','Frosted hover surface','frosted'],
 ['--frosted-planning-container-background','Frosted planner container','frosted'],['--frosted-planning-rail-background','Frosted planner rail','frosted'],['--frosted-planning-task-background','Frosted planner task','frosted'],
 ['--icon-gradient-start','Icon gradient start','icons'],['--icon-gradient-middle','Icon gradient middle','icons'],['--icon-gradient-end','Icon gradient end','icons'],['--icon-gradient-highlight','Icon highlight','icons'],['--icon-edge','Icon glow','icons'],
 ['--hover-start','Hover gradient start','icons'],['--hover-middle','Hover gradient middle','icons'],['--hover-end','Hover gradient end','icons'],
 ['--water-gradient-start','Progress start','progress'],['--water-gradient-middle','Progress middle','progress'],['--water-gradient-end','Progress end','progress'],['--water-gradient-highlight','Progress highlight','progress'],['--water-glow','Progress glow','progress'],
 ['--completion-gradient','Completion gradient','progress'],['--completion-ink','Completion text','progress'],['--completion-badge','Completion badge','progress'],['--completion-highlight','Completion highlight','progress'],['--completion-shadow','Completion shadow','progress'],
 ...Array.from({length:8},(_,i)=>[`--chart-${i+1}`,`Chart colour ${i+1}`,'charts'] as [string,string,TokenSection]),
 ['--mood-red','Mood: red quadrant','advanced','Mood colours carry meaning in your check-ins. Keep each one recognisable.'],['--mood-blue','Mood: blue quadrant','advanced','Mood colours carry meaning in your check-ins. Keep each one recognisable.'],['--mood-green','Mood: green quadrant','advanced','Mood colours carry meaning in your check-ins. Keep each one recognisable.'],['--mood-yellow','Mood: yellow quadrant','advanced','Mood colours carry meaning in your check-ins. Keep each one recognisable.'],
];
const humanise=(name:string)=>name.replace(/^--/,'').replace(/-/g,' ').replace(/^./,c=>c.toUpperCase());

/** Every official theme defines the same token set; the reference theme supplies the list. */
export const themeTokenNames:readonly string[]=Object.keys(officialTokenValues.iridescent);
export const themeTokenSet:ReadonlySet<string>=new Set(themeTokenNames);
/** Tokens that may be referenced through var() in values (theme tokens plus the atmosphere and material roles). */
export const referenceableTokens:ReadonlySet<string>=new Set([...themeTokenNames,'--frosted-glass-background']);
/** Not editable at all: the light/dark scheme follows the base theme so native controls stay correct. */
export const lockedTokens=new Set(['--color-scheme']);
const known=new Map(entries.map(([name,label,section,hint])=>[name,{name,label,section,hint}]));
export const tokenInfo:Record<string,TokenInfo>=Object.fromEntries(themeTokenNames.filter(name=>!lockedTokens.has(name)).map(name=>[name,known.get(name)??{name,label:humanise(name),section:'advanced' as TokenSection}]));
export const tokensIn=(section:TokenSection)=>Object.values(tokenInfo).filter(info=>info.section===section);
/** Material swaps these to their frosted counterparts (app/materials.css); a remix must keep that mapping. */
export const frostedMapped:Record<string,string>={'--glass-background':'--frosted-glass-background','--floating-background':'--frosted-floating-background','--surface-subtle':'--frosted-surface-subtle','--surface-hover':'--frosted-surface-hover','--surface-control':'--frosted-surface-control','--planning-control-background':'--frosted-surface-control','--planning-container-background':'--frosted-planning-container-background','--planning-rail-background':'--frosted-planning-rail-background','--planning-task-background':'--frosted-planning-task-background'};
