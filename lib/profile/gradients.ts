/**
 * Banner and Showcase border presets: art-directed, layered CSS (diffused colour fields, soft skies, subtle
 * starfields) across a wide, vivid colour range in two moods, Dreamy & luminous and Bold & electric. Every preset has
 * stars. No conic wheels and no visible radial origins: every glow is an oversized, off-centre field. Profiles and Showcases store only the stable id, so ids
 * never change; a retired preset stays resolvable for anyone who already chose it but is no longer offered.
 */
export type GradientFamily='soft'|'magic';
/** `stops` are the key colours (glow tint, checks); `layers` is the complete CSS background. */
export type GradientPreset={id:string;name:string;family:GradientFamily;stops:string[];angle:number;layers:string;retired?:boolean};

/** A diffused colour field: an oversized ellipse whose centre sits where it never reads as a point. */
const field=(x:number,y:number,w:number,h:number,color:string,reach=72)=>`radial-gradient(${Math.round(w*1.35)}% ${Math.round(h*1.35)}% at ${x}% ${y}%,${color} 0%,color-mix(in srgb,${color} 55%,transparent) ${Math.round(reach*.38)}%,color-mix(in srgb,${color} 18%,transparent) ${Math.round(reach*.7)}%,transparent ${reach}%)`;
const sky=(angle:number,...stops:string[])=>`linear-gradient(${angle}deg,${stops.join(',')})`;
/** A faint scatter of stars: tiny soft points, a few brighter, never a pattern. */
const stars=(...points:[number,number,number][])=>points.map(([x,y,a])=>`radial-gradient(1.7px 1.7px at ${x}% ${y}%,rgba(255,255,255,${Math.min(1,a+.1)}) 0%,transparent 100%)`).join(',');
const starfield=stars([5,48,.8],[29,12,.7],[62,84,.75],[87,8,.65],[8,22,.9],[17,64,.6],[26,34,.75],[38,78,.5],[47,16,.85],[58,52,.55],[66,28,.9],[74,70,.6],[83,40,.8],[91,18,.55],[95,62,.7],[33,52,.45],[12,86,.5],[79,88,.45]);
const preset=(id:string,name:string,family:GradientFamily,stops:string[],angle:number,layers:string[],retired=false):GradientPreset=>({id,name,family,stops,angle,layers:layers.join(','),...(retired?{retired}:{})});

export const gradientPresets:GradientPreset[]=[
 // Dreamy & luminous: saturated, light-filled blends (never washed out), each with a few stars.
 preset('copper-kettle','Desert Sunset','soft',['#2b1055','#d53369','#ff9a3c','#ffd36e'],180,[starfield,'radial-gradient(circle at 50% 95%,#ffd36eee 0%,transparent 35%)',sky(180,'#2b1055','#d53369 45%','#ff9a3c 80%','#ffd36e')]),
 preset('golden-hour','Golden Hour','soft',['#ffb347','#ff4f8b','#8f3fff'],135,[starfield,field(5,0,70,80,'#ffe066'),field(100,100,80,80,'#8f3fffcc'),sky(135,'#ffb347','#ff4f8b 55%','#b03fd8')]),
 preset('rosewater','Cotton Candy','soft',['#ff8fd8','#a78bfa','#7dd3fc'],135,[starfield,field(0,0,75,85,'#ff8fd8'),field(100,100,75,85,'#7dd3fc'),field(70,20,55,60,'#a78bfacc'),sky(135,'#ffb3e6','#b9a4ff')]),
 preset('blue-moon','Mermaidcore','soft',['#2ee6d6','#f9f871','#ff4fd8'],120,[starfield,field(15,25,55,65,'#f9f871dd'),field(95,85,60,70,'#ff4fd8dd'),field(55,60,60,60,'#4f8bffaa'),sky(120,'#40f0e0','#2ec8e6')]),
 preset('champagne-toast','Sherbet','soft',['#ffe45e','#ff9f43','#ff6fae'],120,[starfield,field(0,0,80,80,'#fff27a'),field(100,90,80,80,'#ff6faedd'),sky(120,'#ffd84a','#ff9f43 55%','#ff7aa8')]),
 preset('moonstone','Lavender Fizz','soft',['#b388ff','#ff9ecf','#8ec5ff'],150,[starfield,field(90,10,70,80,'#ff9ecfee'),field(10,95,70,80,'#8ec5ffee'),sky(150,'#c4a0ff','#a77bff')]),
 preset('cosmic-candy','Peach Fuzz','soft',['#ffb38a','#ff7eb3','#ffd56b'],135,[starfield,field(0,100,80,80,'#ffd56bee'),field(100,0,70,80,'#ff7eb3ee'),sky(135,'#ffc08f','#ff9a9e')]),
 preset('blue-hour','Landscape','soft',['#f78ca2','#ffc2d1','#5b3f9a','#1a1446'],180,[starfield,sky(180,'#f26f8f','#f78ca2 30%','#ffc2d1 46%','#b07ab8 56%','#5b3f9a 72%','#1a1446')]),
 preset('retro-prism','Retro Prism','soft',['#fff07a','#5ef2c0','#5b5bff','#ff4fa3'],120,[starfield,sky(120,'#fff07a','#ffd36e 14%','#5ef2c0 34%','#4fa6ff 54%','#5b3bff 72%','#ff4fa3')]),
 preset('lime-lagoon','Lime Lagoon','soft',['#c6ff4a','#2dd4bf','#ffe45e'],135,[starfield,field(0,0,70,80,'#ffe45eee'),field(100,100,80,90,'#2dd4bfee'),sky(135,'#c6ff4a','#6ee7b7')]),
 // Bold & electric: vivid colour clouds, deep night skies and neon, each with a scatter of stars.
 preset('nebula-kiss','Nebula Kiss','magic',['#2a0a5e','#ff2bd6','#2b5bff'],135,[starfield,field(15,30,60,80,'#ff2bd6dd'),field(85,75,65,85,'#2b5bffdd'),field(60,5,50,45,'#22d3ee88'),sky(135,'#2a0a5e','#1a0b44')]),
 preset('nebula-noir','Nebula Noir','magic',['#05040a','#2238c8','#c2281f','#e8c547'],140,[starfield,field(30,70,45,60,'#22d3ee77'),field(70,20,45,55,'#e8c547aa'),field(75,95,45,50,'#c2281fcc'),field(20,15,55,60,'#5b21b6aa'),sky(140,'#05040a','#0b0b1e')]),
 preset('milky-way','Milky Way','magic',['#0b0b3b','#ff6fae','#ffb347'],115,[starfield,stars([22,46,.9],[44,40,.8],[52,58,.9],[61,45,.7],[70,52,.85],[36,56,.75],[48,50,.9],[58,36,.7]),sky(115,'transparent 26%','rgba(255,111,174,.45) 42%','rgba(255,214,170,.6) 50%','rgba(140,120,255,.45) 60%','transparent 76%'),sky(160,'#0b0b3b','#1b1660')]),
 preset('aurora-dreams','Aurora Dreams','magic',['#071a3a','#7cffcb','#a855f7','#ff8a5b'],170,[starfield,sky(165,'transparent 14%','rgba(124,255,203,.75) 36%','transparent 58%'),sky(150,'transparent 38%','rgba(168,85,247,.7) 60%','transparent 82%'),field(90,100,60,50,'#ff8a5b99'),sky(180,'#071a3a','#0d2a52')]),
 preset('midnight-prism','Midnight Prism','magic',['#151233','#f0566f','#f6b26b','#4f46e5','#5eead4'],135,[starfield,field(25,55,55,70,'#f0566fdd'),field(55,95,50,50,'#f6b26bcc'),field(70,15,50,60,'#4f46e5dd'),field(100,40,35,60,'#5eead4bb'),sky(135,'#1d1a3d','#151233')]),
 preset('vampire-velvet','Blood Moon','magic',['#3b0a45','#e0115f','#ff7a29'],150,[starfield,field(80,20,65,80,'#e0115fee'),field(15,100,65,60,'#ff7a29cc'),sky(150,'#3b0a45','#6b0f3a')]),
 preset('mermaid-lagoon','Electric Lagoon','magic',['#1d4ed8','#5eead4','#f472b6'],120,[starfield,field(10,90,60,70,'#5eead4ee'),field(90,15,55,70,'#f472b6dd'),sky(120,'#1d4ed8','#3b2fd1')]),
 preset('emerald-city','Jade Dragon','magic',['#047857','#22d3a5','#d9f99d'],135,[starfield,field(85,15,60,70,'#d9f99dcc'),field(10,90,70,80,'#22d3a5cc'),sky(135,'#065f46','#0e7490')]),
 preset('disco-fever','Disco Haze','magic',['#7c3aed','#ff3ea5','#ffd23f','#22d3ee'],120,[starfield,field(10,20,50,70,'#ff3ea5ee'),field(55,100,55,55,'#ffd23fdd'),field(95,30,50,70,'#22d3eedd'),sky(120,'#5b21b6','#7c3aed')]),
 preset('rainbow-riot','Holographic','magic',['#40f5f0','#ff4fd8','#f9f871'],120,[starfield,field(20,25,55,60,'#f9f871ee'),field(85,70,55,65,'#ff4fd8ee'),field(40,90,50,50,'#8b5cf6aa'),sky(120,'#40f5f0','#5ee0ff')]),
 preset('electric-cobalt','Electric Dream','magic',['#1a12ff','#ff6ad5','#c6ff70'],120,[starfield,sky(165,'transparent 52%','rgba(255,106,213,.85) 70%','transparent 88%'),field(80,30,55,65,'#c6ff70cc'),sky(120,'#1a12ff','#3b1cff')]),
 preset('solar-flare','Solar Flare','magic',['#ff1e56','#ff7a00','#ffd600'],120,[starfield,field(15,100,70,70,'#ffd600ee'),field(100,0,65,75,'#ff1e56ee'),field(60,40,50,50,'#ff2bd688'),sky(120,'#ff4500','#ff8c00')]),
 // Retired: still shown for anyone who chose them, no longer offered (too close to the presets above).
 preset('secret-garden','Poison Ivy','magic',['#020f08','#22c55e','#06b6d4'],135,[field(20,80,80,80,'#22c55e99'),field(90,15,70,70,'#06b6d477'),sky(135,'#020f08','#0b3a24')],true),
 preset('cherry-bomb','Cherry Bomb','magic',['#ff0a54','#ff7a00'],135,[field(10,100,80,70,'#ff7a00cc'),sky(135,'#ff0a54','#ff3d6e')],true),
 preset('lime-wire','Acid Rave','magic',['#bef264','#22c55e','#06b6d4'],135,[field(0,0,80,80,'#bef264cc'),field(100,100,80,80,'#06b6d4cc'),sky(135,'#4ade80','#22c55e')],true),
 preset('olive-grove','Lava Lamp','magic',['#3a0a00','#ff4d00','#ffb800'],150,[field(20,30,60,70,'#ff4d00bb'),field(80,90,60,60,'#ffb80099'),sky(150,'#3a0a00','#6b1400')],true),
];
export const familyLabels:Record<GradientFamily,string>={soft:'Dreamy & luminous',magic:'Bold & electric'};
/** The presets offered in pickers (retired ones still render when already chosen). */
export const offeredGradients=gradientPresets.filter(preset=>!preset.retired);
export const defaultGradient='nebula-kiss';
export const gradientById=(id:string|null|undefined)=>gradientPresets.find(preset=>preset.id===id)??gradientPresets.find(preset=>preset.id===defaultGradient)!;
export const gradientCss=(id:string|null|undefined)=>gradientById(id).layers;
