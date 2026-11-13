/**
 * Small teaching diagrams for Astro 101. Each one draws the idea its lesson explains (never decoration): the
 * strokes take the theme's chart inks, and the lesson's own words stay beside it as the accessible description.
 */
const r2=(n:number)=>Math.round(n*100)/100;
const A='var(--chart-1)',B='var(--chart-3)',C='var(--chart-5)',ink='currentColor';
const wheel=<><circle cx="60" cy="60" r="46" fill="none" stroke={ink} strokeOpacity=".35"/><circle cx="60" cy="60" r="32" fill="none" stroke={ink} strokeOpacity=".2"/>{Array.from({length:12},(_,i)=>{const a=Math.PI*2*i/12,x=Math.cos(a),y=Math.sin(a);return <path key={i} d={`M${r2(60+32*x)} ${r2(60+32*y)}L${r2(60+46*x)} ${r2(60+46*y)}`} stroke={ink} strokeOpacity=".3"/>;})}</>;
const dot=(a:number,r:number,fill:string,size=4.5)=><circle cx={r2(60+r*Math.cos(a))} cy={r2(60+r*Math.sin(a))} r={size} fill={fill}/>;
const diagrams=[
 // 1 A birth chart: the wheel with its horizon.
 <>{wheel}<path d="M8 60H112" stroke={A} strokeWidth="1.6"/><text x="6" y="54" fill={A} fontSize="8" fontWeight="700">ASC</text>{dot(-2.2,39,B)}{dot(-.7,39,C)}{dot(1.1,39,A)}{dot(2.6,39,B,3.5)}</>,
 // 2 The Big Three: Sun, Moon, and the sign rising on the eastern horizon.
 <><path d="M10 84H110" stroke={ink} strokeOpacity=".4"/><circle cx="60" cy="40" r="13" fill="none" stroke={A} strokeWidth="1.6"/><circle cx="60" cy="40" r="2.2" fill={A}/><path d="M96 30a11 11 0 1 0 8 19 9 9 0 0 1-8-19Z" fill={B}/><path d="M22 84V56m0 0-6 7m6-7 6 7" stroke={C} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/><text x="22" y="98" textAnchor="middle" fill={C} fontSize="8" fontWeight="700">RISING</text><text x="60" y="98" textAnchor="middle" fill={A} fontSize="8" fontWeight="700">SUN</text><text x="98" y="98" textAnchor="middle" fill={B} fontSize="8" fontWeight="700">MOON</text></>,
 // 3 A placement: a planet (what) inside a sign wedge (how) and a house (where).
 <>{wheel}<path d="M60 60 99.8 37 106 60Z" fill={B} fillOpacity=".22" stroke={B}/><path d="M60 60 87.7 44 92 60Z" fill={C} fillOpacity=".3" stroke={C}/>{dot(-.26,39,A,5.5)}<text x="60" y="112" textAnchor="middle" fill={ink} fillOpacity=".7" fontSize="7.5">planet · sign · house</text></>,
 // 4 An aspect: a measured angle between two positions (a trine, 120°).
 <><circle cx="60" cy="60" r="44" fill="none" stroke={ink} strokeOpacity=".35"/><path d={`M60 60 ${r2(60+44*Math.cos(-Math.PI/2))} ${r2(60+44*Math.sin(-Math.PI/2))}M60 60 ${r2(60+44*Math.cos(Math.PI/6))} ${r2(60+44*Math.sin(Math.PI/6))}`} stroke={ink} strokeOpacity=".35" strokeDasharray="3 3"/><path d={`M${r2(60+44*Math.cos(-Math.PI/2))} ${r2(60+44*Math.sin(-Math.PI/2))}L${r2(60+44*Math.cos(Math.PI/6))} ${r2(60+44*Math.sin(Math.PI/6))}`} stroke={A} strokeWidth="1.8"/><path d="M60 46a14 14 0 0 1 12.100 21" fill="none" stroke={B} strokeWidth="1.4"/><text x="76" y="50" fill={B} fontSize="9" fontWeight="700">120°</text>{dot(-Math.PI/2,44,C,5)}{dot(Math.PI/6,44,C,5)}</>,
 // 5 A transit: a fixed natal position and a later, moving one.
 <><circle cx="60" cy="60" r="30" fill="none" stroke={ink} strokeOpacity=".35"/><circle cx="60" cy="60" r="46" fill="none" stroke={ink} strokeOpacity=".2" strokeDasharray="2 4"/>{dot(-1,30,A,5)}{dot(.5,46,B,5)}<path d={`M${r2(60+46*Math.cos(-.9))} ${r2(60+46*Math.sin(-.9))}A46 46 0 0 1 ${r2(60+46*Math.cos(.25))} ${r2(60+46*Math.sin(.25))}`} fill="none" stroke={B} strokeWidth="1.4" strokeDasharray="1 4" strokeLinecap="round"/><text x="60" y="58" textAnchor="middle" fill={A} fontSize="7.5" fontWeight="700">NATAL</text><text x="60" y="68" textAnchor="middle" fill={B} fontSize="7.5" fontWeight="700">TRANSIT</text></>,
 // 6 Synastry: two charts kept distinct, with aspects measured between them.
 <><circle cx="42" cy="60" r="30" fill="none" stroke={A} strokeWidth="1.4"/><circle cx="78" cy="60" r="30" fill="none" stroke={B} strokeWidth="1.4"/><path d="M30 44 88 52M36 78 92 70M50 34 70 84" stroke={ink} strokeOpacity=".4" strokeDasharray="2 3"/><circle cx="30" cy="44" r="4" fill={A}/><circle cx="36" cy="78" r="4" fill={A}/><circle cx="50" cy="34" r="4" fill={A}/><circle cx="88" cy="52" r="4" fill={B}/><circle cx="92" cy="70" r="4" fill={B}/><circle cx="70" cy="84" r="4" fill={B}/></>,
 // 7 A composite: two positions and the constructed midpoint between them.
 <><circle cx="60" cy="60" r="44" fill="none" stroke={ink} strokeOpacity=".35"/><path d={`M${r2(60+44*Math.cos(-2.3))} ${r2(60+44*Math.sin(-2.3))}A44 44 0 0 1 ${r2(60+44*Math.cos(-.8))} ${r2(60+44*Math.sin(-.8))}`} fill="none" stroke={C} strokeWidth="2"/>{dot(-2.3,44,A,5)}{dot(-.8,44,B,5)}<path d={`M60 60 ${r2(60+44*Math.cos(-1.55))} ${r2(60+44*Math.sin(-1.55))}`} stroke={C} strokeDasharray="3 3"/>{dot(-1.55,44,C,6)}<text x="60" y="78" textAnchor="middle" fill={C} fontSize="8" fontWeight="700">MIDPOINT</text></>,
];
export function LessonDiagram({index,label}:{index:number;label:string}){
 return <svg className="muse-lesson-diagram" viewBox="0 0 120 120" role="img" aria-label={label} fontFamily="var(--font-ui)">{diagrams[index]??diagrams[0]}</svg>;
}
