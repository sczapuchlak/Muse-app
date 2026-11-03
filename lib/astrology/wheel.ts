import type {Placement,PlanetId} from './models';
/** Separate glyphs around the largest empty arc; leader lines retain true longitudes. */
export function wheelLabels(placements:Pick<Placement,'body'|'longitude'>[]):Map<PlanetId,number>{
 if(!placements.length)return new Map();
 const sorted=[...placements].sort((a,b)=>a.longitude-b.longitude);
 let gap=-1,cut=0;
 sorted.forEach((p,i)=>{const next=sorted[(i+1)%sorted.length].longitude+(i===sorted.length-1?360:0),distance=next-p.longitude;if(distance>gap){gap=distance;cut=(i+1)%sorted.length;}});
 const ordered=[...sorted.slice(cut),...sorted.slice(0,cut)],angles=ordered.map((p,i)=>p.longitude+(i&&p.longitude<ordered[0].longitude?360:0));
 const labels=angles.map((angle,i)=>i?Math.max(angle,angles.slice(0,i).reduce((v,a,j)=>Math.max(v,a+(i-j)*16),angle)):angle);
 const offset=labels.reduce((sum,angle,i)=>sum+angle-angles[i],0)/labels.length;
 return new Map(ordered.map((p,i)=>[p.body,((labels[i]-offset)%360+360)%360]));
}
