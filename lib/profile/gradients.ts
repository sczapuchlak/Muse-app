/**
 * Banner and Showcase border gradients. Twenty layered "mesh" presets (glowing colour blooms over a base wash) with a
 * deliberate spread: night magic, holographic, neon and sunset; warm, cool and multicolour. Profiles and Showcases
 * store only the stable id, so ids never change even when a preset is redesigned or renamed.
 */
export type GradientFamily='dark'|'light'|'bright'|'earthy';
/** `stops` are the preset's key colours (glow tint, accessibility checks); `layers` is the full CSS background. */
export type GradientPreset={id:string;name:string;family:GradientFamily;stops:string[];angle:number;layers:string};
const bloom=(x:number,y:number,color:string,size=55)=>`radial-gradient(circle at ${x}% ${y}%,${color} 0%,transparent ${size}%)`;
const wash=(angle:number,...stops:string[])=>`linear-gradient(${angle}deg,${stops.join(',')})`;
const preset=(id:string,name:string,family:GradientFamily,stops:string[],angle:number,...layers:string[]):GradientPreset=>({id,name,family,stops,angle,layers:layers.join(',')});
export const gradientPresets:GradientPreset[]=[
 // Night magic
 preset('nebula-kiss','Nebula Kiss','dark',['#0b0620','#ff3cac','#2b86ff'],135,bloom(18,28,'#ff3cacdd',48),bloom(82,72,'#2b86ffdd',52),bloom(62,8,'#a855f7aa',38),wash(135,'#0b0620','#1a0b3d')),
 preset('midnight-prism','Midnight Prism','dark',['#030718','#3b5bff','#00f0ff'],135,bloom(14,86,'#00f0ffcc',46),bloom(86,18,'#3b5bffdd',55),bloom(55,55,'#9b5cff55',40),wash(135,'#030718','#0a1a4a')),
 preset('vampire-velvet','Blood Moon','dark',['#12020a','#ff2a4d','#ff8a00'],150,bloom(72,30,'#ff2a4dee',42),bloom(22,82,'#ff8a0088',38),bloom(50,50,'#7f1d1d99',70),wash(150,'#12020a','#4a0414')),
 preset('secret-garden','Poison Ivy','dark',['#020f08','#39ff14','#00e5ff'],135,bloom(24,76,'#39ff14bb',44),bloom(80,24,'#00e5ff99',46),wash(135,'#020f08','#0b3a24')),
 preset('mermaid-lagoon','Abyss Glow','dark',['#00121a','#00ffd5','#7a5cff'],120,bloom(30,20,'#00ffd5cc',46),bloom(76,86,'#7a5cffcc',50),bloom(90,30,'#00b3ff66',30),wash(120,'#00121a','#003a4a')),
 preset('disco-fever','Disco Fever','dark',['#111114','#f43f5e','#f59e0b','#22c55e','#3b82f6','#a855f7','#111114'],90,'radial-gradient(circle at 50% 50%,transparent 20%,#0a0a10cc 85%)','conic-gradient(from 200deg at 50% 50%,#f43f5e,#f59e0b,#facc15,#22c55e,#06b6d4,#3b82f6,#a855f7,#f43f5e)'),
 // Holographic & dreamy
 preset('moonstone','Holo Foil','light',['#e0f7ff','#f5d0ff','#fff6c8','#d0fff0','#c8d8ff'],115,bloom(30,25,'#ffffffcc',35),wash(115,'#e0f7ff','#f5d0ff 22%','#fff6c8 42%','#d0fff0 62%','#c8d8ff 80%','#f5d0ff')),
 preset('rosewater','Cotton Candy Sky','light',['#fff0f8','#ff9ad5','#9ad8ff'],135,bloom(20,30,'#ff9ad5ee',50),bloom(80,65,'#9ad8ffee',52),bloom(55,95,'#fff3b0aa',35),wash(135,'#fff0f8','#e8f4ff')),
 preset('blue-moon','Opal','light',['#f0fdff','#a5f3fc','#fbcfe8'],160,bloom(20,70,'#a5f3fcee',45),bloom(75,25,'#fbcfe8ee',45),bloom(85,85,'#ddd6feee',40),bloom(40,20,'#d9f99daa',30),wash(160,'#f8fafc','#f0fdff')),
 preset('champagne-toast','Champagne Pop','light',['#fff7e0','#ffd36e','#d4a24c'],135,bloom(70,20,'#fffdf2',30),bloom(28,72,'#ffd36eee',48),bloom(90,90,'#d4a24ccc',45),wash(135,'#fde9b8','#e9c27a')),
 preset('cosmic-candy','Unicorn Milk','light',['#fecaca','#fde68a','#bbf7d0','#bae6fd','#ddd6fe'],90,bloom(50,40,'#ffffffaa',40),wash(100,'#fecaca','#fde68a 25%','#bbf7d0 50%','#bae6fd 75%','#ddd6fe')),
 // Neon & electric
 preset('cherry-bomb','Cherry Bomb','bright',['#ff0a54','#ff7a00'],135,bloom(80,20,'#ffd1e0aa',30),bloom(20,85,'#ff7a00ee',50),wash(135,'#ff0a54','#ff3d6e')),
 preset('electric-cobalt','Electric Dream','bright',['#0038ff','#00f0ff'],120,bloom(85,25,'#00f0ffee',45),bloom(10,90,'#6a00ffcc',45),wash(120,'#0038ff','#0066ff')),
 preset('lime-wire','Acid Rave','bright',['#d4ff00','#00ffa3','#00c2ff'],135,bloom(20,25,'#d4ff00ee',45),bloom(80,80,'#00c2ffee',48),wash(135,'#7dff3a','#00ffa3')),
 preset('solar-flare','Solar Flare','bright',['#ff3d00','#ff8a00','#fff200'],120,bloom(20,82,'#fff200ee',40),bloom(82,18,'#ff3d00ee',48),wash(120,'#ff6a00','#ffb000')),
 preset('rainbow-riot','Rainbow Riot','bright',['#ff0055','#ff9900','#ffee00','#00d26a','#0099ff','#9b5cff'],90,bloom(50,50,'#ffffff55',30),'conic-gradient(from 90deg at 30% 60%,#ff0055,#ff9900,#ffee00,#00d26a,#0099ff,#9b5cff,#ff0055)'),
 // Sunset & ember
 preset('emerald-city','Jade Dragon','earthy',['#022c22','#34d399','#fbbf24'],135,bloom(25,70,'#34d399dd',48),bloom(85,20,'#fbbf24aa',30),wash(135,'#022c22','#065f46')),
 preset('copper-kettle','Desert Sunset','earthy',['#2b1055','#d53369','#ff9a3c','#ffd36e'],180,bloom(50,95,'#ffd36eee',35),wash(180,'#2b1055','#d53369 45%','#ff9a3c 80%','#ffd36e')),
 preset('olive-grove','Lava Lamp','earthy',['#3a0a00','#ff4d00','#ffb800'],150,bloom(25,30,'#ff4d00ee',38),bloom(70,75,'#ffb800dd',36),bloom(85,15,'#ff006655',30),wash(150,'#3a0a00','#6b1400')),
 preset('golden-hour','Golden Hour','earthy',['#6a3093','#ff7e5f','#feb47b','#ffe29f'],120,bloom(75,80,'#ffe29fee',40),wash(170,'#6a3093','#ff7e5f 45%','#feb47b 80%')),
];
export const familyLabels:Record<GradientFamily,string>={dark:'Night magic',light:'Holographic & dreamy',bright:'Neon & electric',earthy:'Sunset & ember'};
export const defaultGradient='nebula-kiss';
export const gradientById=(id:string|null|undefined)=>gradientPresets.find(preset=>preset.id===id)??gradientPresets[0];
export const gradientCss=(id:string|null|undefined)=>gradientById(id).layers;
