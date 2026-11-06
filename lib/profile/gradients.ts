/**
 * Banner and Showcase border presets: art-directed, layered CSS (diffused colour fields, soft skies, subtle
 * starfields) in two moods, Soft & understated and Magical & dramatic. No conic wheels and no visible radial
 * origins: every glow is an oversized, off-centre field. Profiles and Showcases store only the stable id, so ids
 * never change; a retired preset stays resolvable for anyone who already chose it but is no longer offered.
 */
export type GradientFamily='soft'|'magic';
/** `stops` are the key colours (glow tint, checks); `layers` is the complete CSS background. */
export type GradientPreset={id:string;name:string;family:GradientFamily;stops:string[];angle:number;layers:string;retired?:boolean};

/** A diffused colour field: an oversized ellipse whose centre sits where it never reads as a point. */
const field=(x:number,y:number,w:number,h:number,color:string,reach=70)=>`radial-gradient(${w}% ${h}% at ${x}% ${y}%,${color} 0%,transparent ${reach}%)`;
const sky=(angle:number,...stops:string[])=>`linear-gradient(${angle}deg,${stops.join(',')})`;
/** A faint scatter of stars: tiny soft points, a few brighter, never a pattern. */
const stars=(...points:[number,number,number][])=>points.map(([x,y,a])=>`radial-gradient(1.4px 1.4px at ${x}% ${y}%,rgba(255,255,255,${a}) 0%,transparent 100%)`).join(',');
const starfield=stars([8,22,.9],[17,64,.6],[26,34,.75],[38,78,.5],[47,16,.85],[58,52,.55],[66,28,.9],[74,70,.6],[83,40,.8],[91,18,.55],[95,62,.7],[33,52,.45],[12,86,.5],[79,88,.45]);
const preset=(id:string,name:string,family:GradientFamily,stops:string[],angle:number,layers:string[],retired=false):GradientPreset=>({id,name,family,stops,angle,layers:layers.join(','),...(retired?{retired}:{})});

export const gradientPresets:GradientPreset[]=[
 // Soft & understated: skies, pastel sunrises and sunsets, golden hour.
 preset('copper-kettle','Desert Sunset','soft',['#2b1055','#d53369','#ff9a3c','#ffd36e'],180,['radial-gradient(circle at 50% 95%,#ffd36eee 0%,transparent 35%)',sky(180,'#2b1055','#d53369 45%','#ff9a3c 80%','#ffd36e')]),
 preset('golden-hour','Golden Hour','soft',['#6a3093','#ff7e5f','#feb47b','#ffe29f'],170,[field(80,110,90,70,'#ffe29fcc'),field(10,-10,80,60,'#8e44ad66'),sky(170,'#6a3093','#ff7e5f 48%','#feb47b 78%','#ffd9a0')]),
 preset('blue-hour','Blue Hour','soft',['#1e2a4a','#5b6ea8','#e9a6b5','#f7c8a0'],180,[field(70,105,110,55,'#f7c8a0aa'),field(15,0,90,60,'#26345e99'),sky(180,'#1e2a4a','#4b5d96 38%','#9b8fc4 62%','#e9a6b5 82%','#f7c8a0')]),
 preset('rosewater','Cotton Candy Sky','soft',['#c9d6ff','#fbd3e9','#ffe5ec'],180,[field(15,20,85,70,'#fbd3e9cc'),field(90,85,90,70,'#c9d6ffcc'),sky(165,'#dfe6ff','#fbd3e9 55%','#ffe5ec')]),
 preset('blue-moon','Opal Morning','soft',['#e0f2fe','#ddd6fe','#d1fae5'],160,[field(0,100,90,80,'#d1fae5bb'),field(100,0,90,80,'#ddd6febb'),field(60,60,70,60,'#fde2f3aa'),sky(160,'#e0f2fe','#f5f3ff')]),
 preset('champagne-toast','Champagne Sunrise','soft',['#fde2e4','#ffd6a5','#fff1c1'],180,[field(50,115,120,70,'#fff1c1dd'),field(0,0,80,70,'#fde2e4cc'),sky(180,'#fbe0ea','#ffd6a5 65%','#fff1c1')]),
 preset('moonstone','Lavender Haze','soft',['#e6e0ff','#c3b1e1','#f7d9e3'],150,[field(85,15,80,70,'#f7d9e3cc'),field(10,90,90,70,'#b9a6e0aa'),sky(150,'#ece8ff','#d7caf0 55%','#f3dcea')]),
 preset('cosmic-candy','Peach Sorbet','soft',['#ffecd2','#fcb69f','#ffc3d0'],135,[field(100,100,90,80,'#ffc3d0cc'),field(0,0,80,70,'#fff4e0cc'),sky(135,'#ffecd2','#fcb69f')]),
 // Magical & dramatic: nebulae, auroras, holographic shine, neon and jewel tones.
 preset('nebula-kiss','Nebula Kiss','magic',['#0b0620','#d9468f','#3b6fe0'],135,[starfield,field(20,30,70,90,'#d9468fbb'),field(85,75,80,90,'#3b6fe0bb'),field(55,0,70,50,'#7c3aed88'),sky(135,'#0b0620','#170b33')]),
 preset('nebula-noir','Nebula Noir','magic',['#05040a','#5b2a86','#0f766e','#be185d'],140,[starfield,field(25,70,70,80,'#5b2a8699'),field(80,25,60,70,'#0f766e88'),field(60,90,55,50,'#be185d55'),sky(140,'#05040a','#0d0a18')]),
 preset('milky-way','Milky Way','magic',['#070b1f','#3a2f6b','#f5d6c6'],115,[starfield,stars([22,46,.8],[44,40,.7],[52,58,.85],[61,45,.6],[70,52,.75],[36,56,.65]),sky(115,'transparent 28%','rgba(245,214,198,.22) 45%','rgba(255,240,230,.32) 52%','rgba(186,170,255,.2) 60%','transparent 74%'),field(80,20,70,70,'#3a2f6b99'),sky(160,'#070b1f','#141a3d')]),
 preset('aurora-dreams','Aurora Dreams','magic',['#041320','#2af5b0','#7c5cff'],170,[starfield,sky(165,'transparent 18%','rgba(42,245,176,.45) 38%','transparent 58%'),sky(150,'transparent 40%','rgba(124,92,255,.45) 62%','transparent 82%'),field(30,10,90,60,'#22d3ee55'),sky(180,'#041320','#0a2333')]),
 preset('midnight-prism','Midnight Prism','magic',['#030718','#3b5bff','#22d3ee'],135,[field(5,95,80,80,'#22d3eeaa'),field(95,10,90,90,'#3b5bffcc'),field(55,55,60,50,'#9b5cff44'),sky(135,'#030718','#0a1a4a')]),
 preset('vampire-velvet','Blood Moon','magic',['#12020a','#c81d3d','#f97316'],150,[field(80,25,70,90,'#c81d3dcc'),field(10,100,70,60,'#f9731666'),sky(150,'#12020a','#3d0613')]),
 preset('mermaid-lagoon','Abyss Glow','magic',['#00121a','#14d9c0','#6d5cff'],120,[field(20,10,80,80,'#14d9c0aa'),field(90,95,80,80,'#6d5cffaa'),sky(120,'#00121a','#00303d')]),
 preset('emerald-city','Jade Dragon','magic',['#02241c','#10b981','#e8b64a'],135,[field(15,85,80,80,'#10b981bb'),field(100,0,60,60,'#e8b64a77'),sky(135,'#02241c','#064e3b')]),
 preset('disco-fever','Disco Haze','magic',['#0d0b14','#ec4899','#f59e0b','#22d3ee'],120,[field(10,20,60,80,'#ec4899aa'),field(55,100,70,60,'#f59e0b88'),field(95,30,60,80,'#22d3ee99'),sky(120,'#0d0b14','#1a1326')]),
 preset('rainbow-riot','Holographic','magic',['#ffc8dd','#bde0fe','#caffbf','#fdffb6','#d0bfff'],120,[sky(100,'transparent 30%','rgba(255,255,255,.45) 46%','transparent 60%'),field(0,0,80,80,'#ffafcc99'),field(100,100,80,80,'#a2d2ffaa'),sky(120,'#ffc8dd','#d0bfff 25%','#bde0fe 45%','#caffbf 70%','#fdffb6')]),
 preset('electric-cobalt','Electric Dream','magic',['#0a1aff','#22d3ee','#a855f7'],120,[field(100,10,70,80,'#22d3eecc'),field(0,100,70,80,'#a855f7bb'),sky(120,'#0a1aff','#1d4ed8')]),
 preset('solar-flare','Solar Flare','magic',['#7f1d1d','#ff5a1f','#ffc93c'],120,[field(15,100,80,70,'#ffc93ccc'),field(100,0,80,80,'#ff5a1fcc'),sky(120,'#7f1d1d','#e8441a 55%','#ff9f1c')]),
 // Retired: still shown for anyone who chose them, no longer offered (too close to the presets above).
 preset('secret-garden','Poison Ivy','magic',['#020f08','#22c55e','#06b6d4'],135,[field(20,80,80,80,'#22c55e99'),field(90,15,70,70,'#06b6d477'),sky(135,'#020f08','#0b3a24')],true),
 preset('cherry-bomb','Cherry Bomb','magic',['#ff0a54','#ff7a00'],135,[field(10,100,80,70,'#ff7a00cc'),sky(135,'#ff0a54','#ff3d6e')],true),
 preset('lime-wire','Acid Rave','magic',['#bef264','#22c55e','#06b6d4'],135,[field(0,0,80,80,'#bef264cc'),field(100,100,80,80,'#06b6d4cc'),sky(135,'#4ade80','#22c55e')],true),
 preset('olive-grove','Lava Lamp','magic',['#3a0a00','#ff4d00','#ffb800'],150,[field(20,30,60,70,'#ff4d00bb'),field(80,90,60,60,'#ffb80099'),sky(150,'#3a0a00','#6b1400')],true),
];
export const familyLabels:Record<GradientFamily,string>={soft:'Soft & understated',magic:'Magical & dramatic'};
/** The presets offered in pickers (retired ones still render when already chosen). */
export const offeredGradients=gradientPresets.filter(preset=>!preset.retired);
export const defaultGradient='nebula-kiss';
export const gradientById=(id:string|null|undefined)=>gradientPresets.find(preset=>preset.id===id)??gradientPresets.find(preset=>preset.id===defaultGradient)!;
export const gradientCss=(id:string|null|undefined)=>gradientById(id).layers;
