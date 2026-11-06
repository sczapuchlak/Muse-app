/**
 * Muse avatars: thirty original illustrated characters, drawn in code. No photos are uploaded or stored; a person
 * picks one, and only its id ("muse-07") is saved. Artwork is static and identical for everyone.
 */
type Hair='bob'|'long'|'wavy'|'pigtails'|'bun'|'spacebuns'|'curly'|'ponytail'|'pixie'|'braids'|'sidepart'|'locs'|'spiky'|'none';
type Accessory='none'|'witch'|'crown'|'flowers'|'headphones'|'catears'|'halo'|'starclip'|'bow'|'beanie'|'tiara'|'horns'|'antennae'|'beret'|'glasses'|'chef'|'sweatband'|'dragon';
type Prop='book'|'tarot'|'crystal'|'mug'|'plant'|'star'|'moon'|'cat'|'gamepad'|'bouquet'|'potion'|'camera'|'dumbbell'|'pan'|'whisk'|'yarn'|'palette'|'watering'|'wand'|'music';
export type AvatarForm='gal'|'ghost'|'dragon';
export type Expression='smile'|'laugh'|'wink'|'smirk'|'sleepy';
export type AvatarSpec={id:string;name:string;group:'Magical'|'Everyday life'|'Creatures';form?:AvatarForm;expression?:Expression;eyeColor?:string;earrings?:string;choker?:boolean;bg:string;skin:string;hair:Hair;hairColor:string;outfit:string;trim:string;accessory:Accessory;accent:string;prop:Prop;propColor:string;wings?:string;freckles?:boolean;closedEyes?:boolean};

const skins={porcelain:'#fde4d4',peach:'#f7cdb0',golden:'#e8b48a',honey:'#d49a6a',caramel:'#b97a4f',bronze:'#9a5e3a',cocoa:'#7a4628',ebony:'#5a3220',mint:'#bfe9cf',lilac:'#d9c8f5'};
export const museAvatars:AvatarSpec[]=[
 // Magical
 {id:'moon-witch',name:'Moon Witch',group:'Magical',bg:'#c4b5fd',skin:skins.peach,hair:'long',hairColor:'#1d1a2b',outfit:'#4c2f86',trim:'#facc15',accessory:'witch',accent:'#2e1065',prop:'crystal',propColor:'#a5b4fc',choker:true,earrings:'#fde68a'},
 {id:'bookshelf-fairy',name:'Bookshelf Fairy',group:'Magical',bg:'#fde68a',skin:skins.golden,hair:'bun',hairColor:'#7c4a1e',outfit:'#16a34a',trim:'#bbf7d0',accessory:'flowers',accent:'#f472b6',prop:'book',propColor:'#dc2626',wings:'#ecfeff'},
 {id:'stargazer',name:'Stargazer',group:'Magical',bg:'#0f172a',skin:skins.porcelain,hair:'wavy',hairColor:'#f9a8d4',outfit:'#312e81',trim:'#fef08a',accessory:'starclip',accent:'#fde047',prop:'star',propColor:'#fde047',expression:'smile'},
 {id:'tarot-reader',name:'Tarot Reader',group:'Magical',bg:'#7e22ce',skin:skins.bronze,hair:'locs',hairColor:'#2a1a12',outfit:'#111827',trim:'#facc15',accessory:'tiara',accent:'#fde68a',prop:'tarot',propColor:'#fef3c7',earrings:'#facc15',expression:'smirk'},
 {id:'forest-witch',name:'Forest Witch',group:'Magical',bg:'#a7f3d0',skin:skins.honey,hair:'braids',hairColor:'#b45309',outfit:'#166534',trim:'#fde68a',accessory:'witch',accent:'#14532d',prop:'potion',propColor:'#a855f7'},
 {id:'kitty-witch',name:'Kitty Witch',group:'Magical',bg:'#fed7aa',skin:skins.golden,hair:'bob',hairColor:'#ea580c',outfit:'#1c1917',trim:'#fb923c',accessory:'witch',accent:'#1c1917',prop:'cat',propColor:'#1c1917',choker:true,expression:'wink'},
 {id:'little-angel',name:'Little Angel',group:'Magical',bg:'#e0f2fe',skin:skins.peach,hair:'curly',hairColor:'#fbbf24',outfit:'#f8fafc',trim:'#93c5fd',accessory:'halo',accent:'#facc15',prop:'book',propColor:'#f472b6',wings:'#ffffff'},
 {id:'little-devil',name:'Little Devil',group:'Magical',bg:'#fee2e2',skin:skins.golden,hair:'pigtails',hairColor:'#7f1d1d',outfit:'#dc2626',trim:'#111827',accessory:'horns',accent:'#b91c1c',prop:'potion',propColor:'#22c55e',expression:'smirk'},
 {id:'fairy-godmother',name:'Fairy Godmother',group:'Magical',bg:'#fae8ff',skin:skins.bronze,hair:'pixie',hairColor:'#e5e7eb',outfit:'#a21caf',trim:'#f5d0fe',accessory:'tiara',accent:'#fde68a',prop:'wand',propColor:'#fde047',wings:'#f5d0fe'},
 {id:'moon-child',name:'Moon Child',group:'Magical',bg:'#312e81',skin:skins.cocoa,hair:'locs',hairColor:'#c084fc',outfit:'#1e1b4b',trim:'#c4b5fd',accessory:'tiara',accent:'#e9d5ff',prop:'moon',propColor:'#fef3c7'},
 {id:'space-princess',name:'Space Princess',group:'Magical',bg:'#0b1026',skin:skins.peach,hair:'long',hairColor:'#fde68a',outfit:'#6d28d9',trim:'#f0abfc',accessory:'crown',accent:'#fbbf24',prop:'crystal',propColor:'#f0abfc'},
 {id:'mermaid-reader',name:'Mermaid Reader',group:'Magical',bg:'#99f6e4',skin:skins.caramel,hair:'wavy',hairColor:'#0d9488',outfit:'#0e7490',trim:'#5eead4',accessory:'starclip',accent:'#fde047',prop:'book',propColor:'#8b5cf6'},
 // Creatures
 {id:'reading-dragon',name:'Reading Dragon',group:'Creatures',form:'dragon',bg:'#fef3c7',skin:'#86efac',hair:'none',hairColor:'#16a34a',outfit:'#22c55e',trim:'#fde68a',accessory:'dragon',accent:'#f59e0b',prop:'book',propColor:'#7c3aed',wings:'#4ade80'},
 {id:'cocoa-dragon',name:'Cocoa Dragon',group:'Creatures',form:'dragon',bg:'#e9d5ff',skin:'#c4b5fd',hair:'none',hairColor:'#7c3aed',outfit:'#8b5cf6',trim:'#fbcfe8',accessory:'dragon',accent:'#f472b6',prop:'mug',propColor:'#f472b6',wings:'#a78bfa'},
 {id:'bookish-ghost',name:'Bookish Ghost',group:'Creatures',form:'ghost',bg:'#bae6fd',skin:'#ffffff',hair:'none',hairColor:'#ffffff',outfit:'#ffffff',trim:'#ffffff',accessory:'none',accent:'#94a3b8',prop:'book',propColor:'#ef4444'},
 {id:'alien-bestie',name:'Alien Bestie',group:'Creatures',bg:'#fef9c3',skin:skins.mint,hair:'bob',hairColor:'#7c3aed',outfit:'#0d9488',trim:'#a7f3d0',accessory:'antennae',accent:'#a3e635',prop:'star',propColor:'#a3e635'},
 // Everyday life
 {id:'gym-lifter',name:'Gym Gal',group:'Everyday life',bg:'#fecdd3',skin:skins.caramel,hair:'ponytail',hairColor:'#1c1410',outfit:'#e11d48',trim:'#fef2f2',accessory:'sweatband',accent:'#f8fafc',prop:'dumbbell',propColor:'#334155',earrings:'#fde68a',expression:'laugh'},
 {id:'home-chef',name:'Home Chef',group:'Everyday life',bg:'#fde68a',skin:skins.porcelain,hair:'bob',hairColor:'#7c2d12',outfit:'#f8fafc',trim:'#ef4444',accessory:'chef',accent:'#ffffff',prop:'pan',propColor:'#1f2937',expression:'laugh'},
 {id:'cottage-baker',name:'Cottage Baker',group:'Everyday life',bg:'#ffedd5',skin:skins.cocoa,hair:'ponytail',hairColor:'#1c1410',outfit:'#f43f5e',trim:'#ffe4e6',accessory:'bow',accent:'#fda4af',prop:'whisk',propColor:'#fef3c7'},
 {id:'night-owl',name:'Night Owl',group:'Everyday life',bg:'#1e3a8a',skin:skins.cocoa,hair:'curly',hairColor:'#1c1410',outfit:'#f59e0b',trim:'#fde68a',accessory:'glasses',accent:'#fbbf24',prop:'mug',propColor:'#f8fafc'},
 {id:'plant-parent',name:'Plant Parent',group:'Everyday life',bg:'#ecfccb',skin:skins.porcelain,hair:'sidepart',hairColor:'#c2410c',outfit:'#65a30d',trim:'#ecfccb',accessory:'none',accent:'#84cc16',prop:'watering',propColor:'#0ea5e9',freckles:true},
 {id:'punk-pixie',name:'Punk Pixie',group:'Everyday life',bg:'#7c3aed',skin:skins.golden,hair:'spiky',hairColor:'#fef3c7',outfit:'#111827',trim:'#111827',accessory:'none',accent:'#f472b6',prop:'music',propColor:'#f472b6',expression:'wink',choker:true,earrings:'#f8fafc',eyeColor:'#1f1530'},
 {id:'cozy-knitter',name:'Cozy Knitter',group:'Everyday life',bg:'#d9f99d',skin:skins.bronze,hair:'curly',hairColor:'#1c1917',outfit:'#c2410c',trim:'#fed7aa',accessory:'beanie',accent:'#0d9488',prop:'yarn',propColor:'#e11d48'},
 {id:'parisian-painter',name:'Parisian Painter',group:'Everyday life',bg:'#fed7aa',skin:skins.porcelain,hair:'sidepart',hairColor:'#92400e',outfit:'#1e3a8a',trim:'#f8fafc',accessory:'beret',accent:'#dc2626',prop:'palette',propColor:'#fef3c7'},
 {id:'gamer-girl',name:'Gamer Girl',group:'Everyday life',bg:'#c7d2fe',skin:skins.peach,hair:'pixie',hairColor:'#6366f1',outfit:'#0f172a',trim:'#22d3ee',accessory:'headphones',accent:'#ec4899',prop:'gamepad',propColor:'#334155'},
 {id:'music-lover',name:'Music Lover',group:'Everyday life',bg:'#99f6e4',skin:skins.honey,hair:'ponytail',hairColor:'#ea580c',outfit:'#1f2937',trim:'#f8fafc',accessory:'headphones',accent:'#8b5cf6',prop:'music',propColor:'#7c3aed',earrings:'#c4b5fd',expression:'laugh'},
 {id:'snap-happy',name:'Snap Happy',group:'Everyday life',bg:'#a5f3fc',skin:skins.golden,hair:'ponytail',hairColor:'#1e293b',outfit:'#ef4444',trim:'#fef2f2',accessory:'bow',accent:'#ef4444',prop:'camera',propColor:'#1f2937'},
 {id:'goth-librarian',name:'Goth Librarian',group:'Everyday life',bg:'#3f3f46',skin:skins.porcelain,hair:'long',hairColor:'#0a0a0a',outfit:'#18181b',trim:'#a1a1aa',accessory:'glasses',accent:'#e4e4e7',prop:'book',propColor:'#7f1d1d',choker:true,earrings:'#e5e7eb',expression:'smirk'},
 {id:'cat-cafe',name:'Cat Café Regular',group:'Everyday life',bg:'#fecaca',skin:skins.porcelain,hair:'bob',hairColor:'#111827',outfit:'#f1f5f9',trim:'#fb7185',accessory:'catears',accent:'#111827',prop:'cat',propColor:'#f97316'},
 {id:'sleepy-dreamer',name:'Sleepy Dreamer',group:'Everyday life',bg:'#c4b5fd',skin:skins.ebony,hair:'bun',hairColor:'#1f1611',outfit:'#a78bfa',trim:'#f5f3ff',accessory:'none',accent:'#fde68a',prop:'moon',propColor:'#fde68a',closedEyes:true},
];
export const defaultAvatar='moon-witch';
export const avatarById=(id:string|null|undefined)=>museAvatars.find(a=>a.id===id)??museAvatars[0];

const shade=(hex:string,amount:number)=>{const n=parseInt(hex.slice(1),16),c=[n>>16,(n>>8)&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(v+amount*(amount<0?v:255-v)))));return `#${c.map(v=>v.toString(16).padStart(2,'0')).join('')}`;};

function hairBack(a:AvatarSpec){const c=a.hairColor;switch(a.hair){
 case 'long':return `<path d="M28 44c-2 20 0 36 6 42h32c6-6 8-22 6-42z" fill="${c}"/>`;
 case 'wavy':return `<path d="M28 44c-4 12 2 18-2 26s4 16 8 16h32c4 0 12-8 8-16s2-14-2-26z" fill="${c}"/>`;
 case 'bob':return `<path d="M27 44c-1 12 1 20 6 23h34c5-3 7-11 6-23z" fill="${c}"/>`;
 case 'sidepart':return `<path d="M28 44c-1 14 1 24 5 28h34c4-4 6-14 5-28z" fill="${c}"/>`;
 case 'curly':return [[30,34],[50,24],[70,34],[26,50],[74,50],[32,62],[68,62],[50,28],[38,26],[62,26]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="11" fill="${c}"/>`).join('');
 case 'locs':return `<path d="M29 40c-3 18-2 34 2 46h38c4-12 5-28 2-46z" fill="${c}"/>`+[34,40,46,54,60,66].map(x=>`<path d="M${x} 60v24" stroke="${shade(c,.25)}" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>`).join('');
 case 'pigtails':return `<ellipse cx="25" cy="54" rx="7" ry="11" fill="${c}"/><ellipse cx="75" cy="54" rx="7" ry="11" fill="${c}"/>`;
 case 'ponytail':return `<path d="M68 34c12 4 14 22 6 34-2-12-6-20-10-26z" fill="${c}"/>`;
 case 'braids':return [[29,58],[29,66],[29,74],[71,58],[71,66],[71,74]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="4.6" ry="5" fill="${c}"/>`).join('');
 default:return '';}}
function hairFront(a:AvatarSpec){const c=a.hairColor,h=shade(c,.28);switch(a.hair){
 case 'bob':return `<path d="M29 47c-2-17 9-26 21-26s23 9 21 26l-2-6c-6-3-11-4-19-4s-14 1-19 4z" fill="${c}"/><path d="M38 28c4-2 8-3 12-3" stroke="${h}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
 case 'spiky':return `<path d="M29 46c-1-14 6-22 14-24l-3-8 8 6 4-9 4 9 8-5-2 9c7 4 10 11 9 22-4-8-9-12-16-12l4-6-8 5c-9 1-17 5-22 13z" fill="${c}"/><path d="M40 24q5-4 10-4" stroke="${h}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
 case 'pixie':return `<path d="M29 44c-1-14 9-23 21-23 13 0 23 9 21 23-4-7-10-9-16-8 3-2 4-4 4-6-6 5-17 6-26 9z" fill="${c}"/>`;
 case 'sidepart':return `<path d="M29 46c-2-16 9-25 21-25s23 9 21 25c-3-8-8-12-14-13-8 5-18 8-28 13z" fill="${c}"/>`;
 case 'curly':return [[36,30],[46,26],[56,26],[65,31],[31,38],[69,38]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="7" fill="${c}"/>`).join('')+`<circle cx="44" cy="25" r="2" fill="${h}" opacity=".6"/>`;
 case 'locs':return `<path d="M30 44c-1-15 9-23 20-23s21 8 20 23c-5-6-12-9-20-9s-15 3-20 9z" fill="${c}"/>`+[38,46,54,62].map(x=>`<path d="M${x} 26c-1 4-1 7 0 10" stroke="${h}" stroke-width="1.3" stroke-linecap="round" fill="none" opacity=".6"/>`).join('');
 default:return `<path d="M29 46c-2-17 9-25 21-25s23 8 21 25c-4-8-11-11-21-11s-17 3-21 11z" fill="${c}"/><path d="M40 26c3-1.5 7-2 10-2" stroke="${h}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;}}
/** Glossy streaks give the hair a cel-shaded shine. */
function hairShine(a:AvatarSpec){if(a.hair==='none'||a.hair==='curly')return '';const h=shade(a.hairColor,.5);return `<path d="M36 31q6-5 13-5.6" stroke="${h}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".55"/><path d="M55 26q5 .6 9 4" stroke="${h}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".45"/>`;}
function hairTop(a:AvatarSpec){const c=a.hairColor;switch(a.hair){
 case 'bun':return `<circle cx="50" cy="19" r="8" fill="${c}"/><path d="M45 17c3-2 7-2 10 0" stroke="${shade(c,.28)}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
 case 'spacebuns':return `<circle cx="32" cy="25" r="7.5" fill="${c}"/><circle cx="68" cy="25" r="7.5" fill="${c}"/>`;
 case 'pigtails':return `<circle cx="29" cy="40" r="3" fill="${a.accent}"/><circle cx="71" cy="40" r="3" fill="${a.accent}"/>`;
 default:return '';}}
const line='#2a1a2e';
const expressionCycle:Expression[]=['laugh','smile','wink','smile','smirk','laugh','wink'];
const eyeCycle=['#3b2a4a','#6d28d9','#0e7490','#3b2a4a','#a16207','#be185d'];
function face(a:AvatarSpec,index=0){
 const expr=a.closedEyes?'sleepy':a.expression??expressionCycle[index%expressionCycle.length];
 const iris=a.eyeColor??eyeCycle[index%eyeCycle.length];
 // Brows follow the hair, but very light hair still gets a visible brow.
 const hairLight=parseInt(a.hairColor.slice(1,3),16)+parseInt(a.hairColor.slice(3,5),16)+parseInt(a.hairColor.slice(5,7),16)>560;
 const brow=a.hair==='none'||a.form==='ghost'?shade(a.skin,-.45):hairLight?shade(a.skin,-.4):shade(a.hairColor,-.25);
 const openEye=(cx:number,flip:number)=>`<ellipse cx="${cx}" cy="48.4" rx="3.5" ry="4.3" fill="${iris}"/><ellipse cx="${cx}" cy="48.9" rx="1.9" ry="2.6" fill="#140b1c"/><circle cx="${cx+1.2*flip}" cy="46.6" r="1.35" fill="#fff"/><circle cx="${cx-1.1*flip}" cy="50.6" r=".6" fill="#fff" opacity=".85"/><path d="M${cx-4.1} 45.6q4.1-3.6 8.2-.2" stroke="${line}" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M${cx+4.1*flip} 45.4l${1.8*flip}-1.2" stroke="${line}" stroke-width="1.3" stroke-linecap="round"/>`;
 const closedEye=(cx:number,flip:number,up=true)=>up?`<path d="M${cx-3.6} 48.6q3.6-3.4 7.2 0" stroke="${line}" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M${cx+3.6*flip} 48.6l${1.6*flip}-.9" stroke="${line}" stroke-width="1.2" stroke-linecap="round"/>`:`<path d="M${cx-3.4} 47.6q3.4 3 6.8 0" stroke="${line}" stroke-width="1.7" fill="none" stroke-linecap="round"/>`;
 const eyes=expr==='sleepy'?closedEye(42,-1,false)+closedEye(58,1,false):expr==='wink'?openEye(42,-1)+closedEye(58,1):openEye(42,-1)+openEye(58,1);
 const brows=expr==='smirk'?`<path d="M37.6 41.4q4.4-2.2 8.6-.2" stroke="${brow}" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M53.6 40.2q4.6-1.6 8.8 1.2" stroke="${brow}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`:`<path d="M37.6 41q4.4-2.6 8.6-.4" stroke="${brow}" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M53.8 40.6q4.4-2.2 8.6.4" stroke="${brow}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
 const mouth=expr==='laugh'?`<path d="M45.6 53.8h8.8q-.5 6.2-4.4 6.2t-4.4-6.2z" fill="#7a1f35" stroke="${line}" stroke-width="1" stroke-linejoin="round"/><ellipse cx="50" cy="58.2" rx="2.4" ry="1.4" fill="#ff8fa3"/><path d="M46.4 54.2h7.2" stroke="#fff" stroke-width=".9" opacity=".8"/>`
  :expr==='smirk'?`<path d="M46.4 55.6q3.6 1.8 7.4-1.4" stroke="${line}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`
  :expr==='sleepy'?`<ellipse cx="50" cy="56" rx="1.6" ry="1.2" fill="#7a1f35"/>`
  :`<path d="M46 54.6q4 4 8 0" stroke="${line}" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
 const blush=[36.5,63.5].map(x=>`<ellipse cx="${x}" cy="53.4" rx="3.6" ry="2" fill="#ff6f8f" opacity=".42"/><path d="M${x-2.2} 54.2l1-1.8M${x-.4} 54.2l1-1.8M${x+1.4} 54.2l1-1.8" stroke="#ff4d7a" stroke-width=".7" opacity=".7" stroke-linecap="round"/>`).join('');
 const freckles=a.freckles?[[37,51.6],[39,53.6],[35.5,53.6],[63,51.6],[61,53.6],[64.5,53.6]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".6" fill="${shade(a.skin,-.4)}"/>`).join(''):'';
 const nose=`<path d="M49.6 51.2l.8 1" stroke="${shade(a.skin,-.32)}" stroke-width="1" stroke-linecap="round"/>`;
 return `${brows}${eyes}${blush}${freckles}${nose}${mouth}`;
}
function accessory(a:AvatarSpec){const x=a.accent;switch(a.accessory){
 case 'witch':return `<path d="M33 27 55 -2c2 6 6 18 12 29z" fill="${x}"/><path d="M38 24h26" stroke="${a.trim}" stroke-width="3"/><ellipse cx="50" cy="27" rx="26" ry="5" fill="${x}"/><path d="M50 25l1.4 2.8 3 .4-2.2 2 .5 3-2.7-1.4-2.7 1.4.5-3-2.2-2 3-.4z" fill="#fde047" transform="translate(6 -11) scale(.8)"/>`;
 case 'crown':return `<path d="M37 26 39 14l6 6 5-9 5 9 6-6 2 12z" fill="${x}" stroke="${shade(x,-.3)}" stroke-width=".8"/><circle cx="50" cy="20" r="1.6" fill="${a.trim}"/>`;
 case 'tiara':return `<path d="M38 26q12-8 24 0" stroke="${x}" stroke-width="2.2" fill="none"/><path d="M50 15l1.8 3.6 4 .6-2.9 2.8.7 4L50 24l-3.6 2 .7-4-2.9-2.8 4-.6z" fill="${x}"/>`;
 case 'flowers':return [[33,29,'#f472b6'],[41,24,x],[50,22,'#fb7185'],[59,24,x],[67,29,'#c084fc']].map(([cx,cy,f])=>`<circle cx="${cx}" cy="${cy}" r="3.6" fill="${f}"/><circle cx="${cx}" cy="${cy}" r="1.2" fill="#fef3c7"/>`).join('');
 case 'headphones':return `<path d="M27 48c0-19 10-28 23-28s23 9 23 28" stroke="${x}" stroke-width="3.4" fill="none" stroke-linecap="round"/><rect x="22" y="42" width="9" height="14" rx="4" fill="${x}"/><rect x="69" y="42" width="9" height="14" rx="4" fill="${x}"/>`;
 case 'catears':return `<path d="M31 32 33 16l11 9z" fill="${x}"/><path d="M69 32 67 16l-11 9z" fill="${x}"/><path d="M34 27l.8-6 4 3.4z" fill="#fda4af"/><path d="M66 27l-.8-6-4 3.4z" fill="#fda4af"/>`;
 case 'halo':return `<ellipse cx="50" cy="14" rx="13" ry="3.6" fill="none" stroke="${x}" stroke-width="2.4"/>`;
 case 'starclip':return `<path d="M66 28l1.6 3.3 3.7.5-2.7 2.6.7 3.6-3.3-1.7-3.3 1.7.7-3.6-2.7-2.6 3.7-.5z" fill="${x}"/>`;
 case 'bow':return `<path d="M62 27l-7-5v10zM62 27l7-5v10z" fill="${x}"/><circle cx="62" cy="27" r="2" fill="${shade(x,-.25)}"/>`;
 case 'beanie':return `<path d="M28 38c0-14 10-20 22-20s22 6 22 20z" fill="${x}"/><path d="M27 37h46v5H27z" fill="${shade(x,-.2)}"/><circle cx="50" cy="16" r="4" fill="${a.trim}"/>`;
 case 'horns':return `<path d="M34 28c-4-5-3-11 0-13 0 5 3 8 6 9z" fill="${x}"/><path d="M66 28c4-5 3-11 0-13 0 5-3 8-6 9z" fill="${x}"/>`;
 case 'antennae':return `<path d="M42 24 37 10M58 24l5-14" stroke="${a.skin}" stroke-width="2" stroke-linecap="round"/><circle cx="37" cy="9" r="3" fill="${x}"/><circle cx="63" cy="9" r="3" fill="${x}"/>`;
 case 'beret':return `<path d="M28 33c2-9 12-13 24-12s20 5 20 11c-12-3-28-3-44 1z" fill="${x}"/><path d="M50 21v-4" stroke="${x}" stroke-width="2" stroke-linecap="round"/>`;
 case 'chef':return `<path d="M35 28c-6-1-7-10 0-11 1-6 9-8 13-4 4-5 13-3 14 3 7 0 8 10 1 12z" fill="#fff" stroke="#e2e8f0" stroke-width=".8"/><rect x="35" y="24" width="30" height="6" rx="2" fill="#fff" stroke="#e2e8f0" stroke-width=".8"/>`;
 case 'sweatband':return `<path d="M30 37q20-9 40 0" stroke="${x}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M30 37q20-9 40 0" stroke="${a.outfit}" stroke-width="1.2" fill="none" stroke-dasharray="2 3"/>`;
 case 'dragon':return `<path d="M36 28c-6-4-8-11-5-15 1 6 5 9 9 10z" fill="${x}"/><path d="M64 28c6-4 8-11 5-15-1 6-5 9-9 10z" fill="${x}"/><path d="M44 25l3-5 3 5 3-5 3 5" fill="${a.hairColor}"/>`;
 case 'glasses':return `<circle cx="42" cy="47.5" r="5.6" fill="none" stroke="${x}" stroke-width="1.6"/><circle cx="58" cy="47.5" r="5.6" fill="none" stroke="${x}" stroke-width="1.6"/><path d="M47.6 47h4.8" stroke="${x}" stroke-width="1.6"/>`;
 default:return '';}}
function prop(a:AvatarSpec){const p=a.propColor,hand=`<circle cx="37" cy="86" r="4" fill="${a.skin}"/><circle cx="63" cy="86" r="4" fill="${a.skin}"/>`;switch(a.prop){
 case 'book':return `<path d="M50 80 33 77v15l17 3z" fill="${p}"/><path d="M50 80l17-3v15l-17 3z" fill="${shade(p,-.15)}"/><path d="M50 81 36 78.5v11L50 92zM50 81l14-2.5v11L50 92z" fill="#fff8ec"/><path d="M39 82.5l8 1.4M39 85.5l8 1.4M53 83.9l8-1.4M53 86.9l8-1.4" stroke="${shade(p,-.1)}" stroke-width=".7" opacity=".6"/>${hand}`;
 case 'tarot':return `<rect x="41" y="72" width="18" height="25" rx="2.4" fill="${p}" stroke="${a.trim}" stroke-width="1.2"/><path d="M50 78l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="${a.accent}"/><circle cx="50" cy="92" r="1.4" fill="${a.accent}"/>${hand}`;
 case 'crystal':return `<path d="M42 92h16l-2 4H44z" fill="#a16207"/><circle cx="50" cy="82" r="10" fill="${p}" opacity=".9"/><circle cx="46" cy="78" r="3" fill="#fff" opacity=".7"/><circle cx="54" cy="85" r="1.2" fill="#fff" opacity=".8"/>${hand}`;
 case 'mug':return `<path d="M42 79h14v12a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3z" fill="${p}"/><path d="M56 82h3a3 3 0 0 1 0 6h-3" stroke="${p}" stroke-width="2" fill="none"/><path d="M46 75c-2-2 2-3 0-5M51 75c-2-2 2-3 0-5" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".8"/>${hand}`;
 case 'plant':return `<path d="M43 85h14l-2 11H45z" fill="#c2410c"/><path d="M50 85c0-6-6-10-10-9 1 5 5 8 10 9zM50 85c0-7 5-12 10-11-1 6-5 10-10 11zM50 84c0-6 0-10 1-13" stroke="${p}" stroke-width="1.2" fill="${p}"/>${hand}`;
 case 'star':return `<path d="M50 72l3.6 7.4 8.1 1.2-5.9 5.7 1.4 8-7.2-3.8-7.2 3.8 1.4-8-5.9-5.7 8.1-1.2z" fill="${p}"/><circle cx="50" cy="84" r="13" fill="${p}" opacity=".18"/>${hand}`;
 case 'moon':return `<path d="M54 72a12 12 0 1 0 6 20 10 10 0 1 1-6-20z" fill="${p}"/><circle cx="62" cy="76" r="1.2" fill="#fff"/>${hand}`;
 case 'cat':return `<ellipse cx="50" cy="88" rx="11" ry="8" fill="${p}"/><circle cx="50" cy="80" r="7" fill="${p}"/><path d="M44 76l1-6 4 4zM56 76l-1-6-4 4z" fill="${p}"/><circle cx="47.5" cy="80" r="1.1" fill="#fde047"/><circle cx="52.5" cy="80" r="1.1" fill="#fde047"/><path d="M49 83q1 1 2 0" stroke="#fda4af" stroke-width=".9" fill="none"/>${hand}`;
 case 'gamepad':return `<rect x="36" y="80" width="28" height="13" rx="6.5" fill="${p}"/><path d="M42 86.5h5M44.5 84v5" stroke="#f8fafc" stroke-width="1.6" stroke-linecap="round"/><circle cx="56" cy="85" r="1.5" fill="${a.accent}"/><circle cx="59.5" cy="88" r="1.5" fill="${a.trim}"/>${hand}`;
 case 'bouquet':return `<path d="M45 96l5-14 5 14z" fill="#86efac"/>${[[44,80,p],[50,77,a.accent],[56,80,p],[47,84,a.trim],[53,84,a.accent]].map(([x,y,f])=>`<circle cx="${x}" cy="${y}" r="3.6" fill="${f}"/>`).join('')}${hand}`;
 case 'potion':return `<path d="M47 74h6v5l6 10a5 5 0 0 1-4.4 7h-9.2A5 5 0 0 1 41 89l6-10z" fill="#f8fafc" opacity=".85"/><path d="M43.5 87h13l1.6 3a4 4 0 0 1-3.5 5h-9.2a4 4 0 0 1-3.5-5z" fill="${p}"/><rect x="46" y="71" width="8" height="3.4" rx="1" fill="#a16207"/><circle cx="48" cy="90" r="1" fill="#fff" opacity=".8"/>${hand}`;
 case 'dumbbell':return `<rect x="36" y="84" width="28" height="3.4" rx="1.4" fill="#94a3b8"/><rect x="32" y="78" width="7" height="15" rx="2" fill="${p}"/><rect x="61" y="78" width="7" height="15" rx="2" fill="${p}"/><circle cx="37" cy="86" r="4" fill="${a.skin}"/><circle cx="63" cy="86" r="4" fill="${a.skin}"/>`;
 case 'pan':return `<ellipse cx="46" cy="86" rx="12" ry="6" fill="${p}"/><ellipse cx="46" cy="85" rx="9.5" ry="4.2" fill="#fef3c7"/><circle cx="46" cy="85" r="2.4" fill="#f59e0b"/><path d="M57 84l12-4" stroke="${p}" stroke-width="3" stroke-linecap="round"/><path d="M43 78c-1-2 1-3 0-5M48 78c-1-2 1-3 0-5" stroke="#fff" stroke-width="1.1" fill="none" stroke-linecap="round" opacity=".8"/>${hand}`;
 case 'whisk':return `<path d="M38 84h24l-3 10H41z" fill="${p}" stroke="#e7cfa4" stroke-width=".8"/><ellipse cx="50" cy="84" rx="12" ry="3" fill="#fffbeb"/><path d="M56 74l-5 10M54 73c-4 2-4 7-3 11M58 75c0 4-3 7-7 9" stroke="#94a3b8" stroke-width="1.1" fill="none"/>${hand}`;
 case 'yarn':return `<circle cx="50" cy="85" r="9" fill="${p}"/><path d="M43 80q7 3 14 0M42 85q8 4 16 0M44 90q6 2 12 0" stroke="${shade(p,.35)}" stroke-width="1" fill="none"/><path d="M40 76l10 8M60 76l-10 8" stroke="#d6b98a" stroke-width="1.6" stroke-linecap="round"/>${hand}`;
 case 'palette':return `<path d="M50 76c-12 0-16 9-12 15 3 4 7 1 8 3 1 3 4 4 7 3 9-2 10-21-3-21z" fill="${p}" stroke="#d6b98a" stroke-width=".8"/><circle cx="44" cy="81" r="1.8" fill="#ef4444"/><circle cx="50" cy="79.5" r="1.8" fill="#3b82f6"/><circle cx="56" cy="81.5" r="1.8" fill="#facc15"/><circle cx="56" cy="87" r="1.8" fill="#22c55e"/>${hand}`;
 case 'watering':return `<path d="M40 82h16v10a2 2 0 0 1-2 2H42a2 2 0 0 1-2-2z" fill="${p}"/><path d="M56 84l9-6" stroke="${p}" stroke-width="2.6" stroke-linecap="round"/><path d="M42 82c0-5 12-5 12 0" stroke="${shade(p,-.25)}" stroke-width="1.8" fill="none"/><path d="M66 79l2 3M68 77l3 2M67 81l3 3" stroke="#7dd3fc" stroke-width="1" stroke-linecap="round"/>${hand}`;
 case 'wand':return `<path d="M42 92 58 76" stroke="#a16207" stroke-width="2.2" stroke-linecap="round"/><path d="M60 70l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6z" fill="${p}"/><circle cx="66" cy="84" r="1" fill="${p}"/><circle cx="52" cy="70" r=".9" fill="${p}"/>${hand}`;
 case 'music':return `<path d="M46 92V78l12-3v13" stroke="${p}" stroke-width="2" fill="none"/><ellipse cx="43.5" cy="92" rx="3.4" ry="2.6" fill="${p}"/><ellipse cx="55.5" cy="88" rx="3.4" ry="2.6" fill="${p}"/><path d="M64 74v6" stroke="${p}" stroke-width="1.4"/><circle cx="62.6" cy="80" r="1.8" fill="${p}"/>${hand}`;
 case 'camera':return `<rect x="37" y="79" width="26" height="16" rx="3" fill="${p}"/><circle cx="50" cy="87" r="5" fill="#94a3b8"/><circle cx="50" cy="87" r="3" fill="#0f172a"/><rect x="40" y="76" width="7" height="3.4" rx="1" fill="${p}"/><circle cx="58.5" cy="82.5" r="1.1" fill="${a.accent}"/>${hand}`;
 }}
function ghostSvg(a:AvatarSpec,clip:string,title?:string,index=0){
 const body=`<path d="M28 50c0-16 10-26 22-26s22 10 22 26v40c-4 4-7-3-11 0s-7 4-11 0-7-3-11 0-7 4-11 0z" fill="#fff" stroke="#e2e8f0" stroke-width="1"/>`;
 const shadow=`<ellipse cx="50" cy="96" rx="18" ry="3" fill="#0f172a" opacity=".12"/>`;
 return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${(title??a.name).replace(/[<>&"]/g,'')}"><defs><clipPath id="${clip}"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#${clip})"><rect width="100" height="100" fill="${a.bg}"/><circle cx="50" cy="50" r="38" fill="#fff" opacity=".1"/>${shadow}<g stroke="${line}" stroke-width="1.25">${body.replace(' stroke="#e2e8f0" stroke-width="1"','')}</g>${face({...a,skin:'#ffffff',hair:'none'},index)}<g stroke="${line}" stroke-width="1">${prop({...a,skin:'#ffffff'})}</g></g></svg>`;
}
/** The full illustration as an SVG string (static artwork, no user input). A bust: big chibi head, bold outlines. */
export function avatarSvg(id:string,{title}:{title?:string}={}){
 const index=Math.max(0,museAvatars.findIndex(x=>x.id===id)),a=avatarById(id),clip=`clip-${a.id}`;
 if(a.form==='ghost')return ghostSvg(a,clip,title,index);
 // Head art is drawn on a 20-radius head and enlarged 1.15× around the face for chibi proportions.
 const head=(inner:string)=>`<g transform="matrix(1.15 0 0 1.15 -7.5 -8.75)">${inner}</g>`;
 const outline=(inner:string,width=1.25)=>`<g stroke="${line}" stroke-width="${width}" stroke-linejoin="round">${inner}</g>`;
 const wings=a.wings&&a.form==='dragon'?`<path d="M30 76 8 58l5 16-9 5 14 7z" fill="${a.wings}"/><path d="M70 76l22-18-5 16 9 5-14 7z" fill="${a.wings}"/>`:a.wings?`<ellipse cx="25" cy="74" rx="13" ry="19" transform="rotate(-28 25 74)" fill="${a.wings}" opacity=".9"/><ellipse cx="75" cy="74" rx="13" ry="19" transform="rotate(28 75 74)" fill="${a.wings}" opacity=".9"/>`:'';
 const tail=a.form==='dragon'?`<path d="M72 96c11 1 16-6 12-13-1 5-6 7-10 5" fill="${a.outfit}"/>`:'';
 const body=`<path d="M19 106c0-21 13-31 31-31s31 10 31 31z" fill="${a.outfit}"/><path d="M40 76q10 8 20 0" fill="none" stroke="${a.trim}" stroke-width="2.6" stroke-linecap="round"/>`;
 const neck=`<path d="M44.5 64h11v11.5q-5.5 3-11 0z" fill="${shade(a.skin,-.1)}"/>`;
 const choker=a.choker?`<path d="M44.4 70.5q5.6 2.4 11.2 0" stroke="#1c1917" stroke-width="2.4" fill="none"/><circle cx="50" cy="73.4" r="1.4" fill="${a.accent}" stroke="${line}" stroke-width=".6"/>`:'';
 const ears=`<circle cx="31" cy="48" r="3.6" fill="${a.skin}"/><circle cx="69" cy="48" r="3.6" fill="${a.skin}"/>`;
 const earrings=a.earrings?`<circle cx="30.4" cy="52.6" r="1.7" fill="${a.earrings}" stroke="${line}" stroke-width=".6"/><circle cx="69.6" cy="52.6" r="1.7" fill="${a.earrings}" stroke="${line}" stroke-width=".6"/>`:'';
 const faceShape=`<circle cx="50" cy="45" r="20" fill="${a.skin}"/>`;
 const backHair=hairBack(a),frontHair=hairFront(a),topHair=hairTop(a);
 return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${(title??a.name).replace(/[<>&"]/g,'')}"><defs><clipPath id="${clip}"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#${clip})"><rect width="100" height="100" fill="${a.bg}"/><circle cx="50" cy="46" r="40" fill="#fff" opacity=".08"/>${outline(wings+tail)}${head(outline(backHair))}${outline(body+neck)}${choker}${head(outline(ears+faceShape)+earrings+face(a,index)+outline(frontHair+topHair)+hairShine(a)+outline(accessory(a),1))}${outline(prop(a),1)}</g></svg>`;
}

