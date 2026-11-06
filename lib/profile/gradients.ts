/**
 * Showcase border gradients. Twenty curated presets with a deliberate spread: dark and moody, light and dreamy,
 * bright and electric, rich and earthy; warm, cool, mono and multicolour. Showcases store only the stable id.
 */
export type GradientFamily='dark'|'light'|'bright'|'earthy';
export type GradientPreset={id:string;name:string;family:GradientFamily;stops:string[];angle:number};
export const gradientPresets:GradientPreset[]=[
 // Dark & moody
 {id:'nebula-kiss',name:'Nebula Kiss',family:'dark',stops:['#07060f','#33195f','#8b5cf6'],angle:135},
 {id:'midnight-prism',name:'Midnight Prism',family:'dark',stops:['#050b1f','#1e3a8a','#38bdf8'],angle:135},
 {id:'vampire-velvet',name:'Vampire Velvet',family:'dark',stops:['#1a0308','#7f1d1d','#e11d48'],angle:150},
 {id:'secret-garden',name:'Secret Garden',family:'dark',stops:['#03140b','#14532d','#4ade80'],angle:135},
 {id:'mermaid-lagoon',name:'Mermaid Lagoon',family:'dark',stops:['#021716','#0f766e','#5eead4'],angle:120},
 {id:'disco-fever',name:'Disco Fever',family:'dark',stops:['#111114','#f43f5e','#f59e0b','#22c55e','#3b82f6','#a855f7','#111114'],angle:90},
 // Light & dreamy
 {id:'moonstone',name:'Moonstone',family:'light',stops:['#f8fafc','#cbd5e1','#e2e8f0','#94a3b8'],angle:135},
 {id:'rosewater',name:'Rosewater',family:'light',stops:['#fff1f2','#fecdd3','#fb7185'],angle:135},
 {id:'blue-moon',name:'Blue Moon',family:'light',stops:['#f0f9ff','#bae6fd','#60a5fa'],angle:160},
 {id:'champagne-toast',name:'Champagne Toast',family:'light',stops:['#fffbeb','#fde68a','#d4a24c'],angle:135},
 {id:'cosmic-candy',name:'Cosmic Candy',family:'light',stops:['#fecaca','#fde68a','#bbf7d0','#bae6fd','#ddd6fe'],angle:90},
 // Bright & electric
 {id:'cherry-bomb',name:'Cherry Bomb',family:'bright',stops:['#ff0a54','#ff5c8a'],angle:135},
 {id:'electric-cobalt',name:'Electric Cobalt',family:'bright',stops:['#0038ff','#00b3ff'],angle:120},
 {id:'lime-wire',name:'Lime Wire',family:'bright',stops:['#d9f99d','#84cc16','#16a34a'],angle:135},
 {id:'solar-flare',name:'Solar Flare',family:'bright',stops:['#ff3d00','#ff8a00','#ffd600'],angle:120},
 {id:'rainbow-riot',name:'Rainbow Riot',family:'bright',stops:['#ff0055','#ff9900','#ffee00','#00d26a','#0099ff','#9b5cff'],angle:90},
 // Rich & earthy
 {id:'emerald-city',name:'Emerald City',family:'earthy',stops:['#022c22','#047857','#34d399'],angle:135},
 {id:'copper-kettle',name:'Copper Kettle',family:'earthy',stops:['#431407','#c2410c','#fdba74'],angle:135},
 {id:'olive-grove',name:'Olive Grove',family:'earthy',stops:['#1a2e05','#4d7c0f','#bef264'],angle:150},
 {id:'golden-hour',name:'Golden Hour',family:'earthy',stops:['#78350f','#d97706','#fcd34d'],angle:120},
];
export const familyLabels:Record<GradientFamily,string>={dark:'Dark & moody',light:'Light & dreamy',bright:'Bright & electric',earthy:'Rich & earthy'};
export const defaultGradient='nebula-kiss';
export const gradientById=(id:string|null|undefined)=>gradientPresets.find(preset=>preset.id===id)??gradientPresets[0];
export const gradientCss=(id:string|null|undefined)=>{const preset=gradientById(id);return `linear-gradient(${preset.angle}deg,${preset.stops.join(',')})`;};
