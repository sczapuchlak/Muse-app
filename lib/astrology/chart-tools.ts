import {planetIds,type BirthProfile,type NatalChart,type PlanetId,type Placement} from './models';
import {angularDistance,aspectDefinitions,calculateNatal,chartAngles,normalizeAngle,planetLongitude,signAt} from './calculations';

export type CrossAspect={one:PlanetId;two:PlanetId;kind:typeof aspectDefinitions[number]['id'];angle:number;orb:number};
export type SynastryResult={kind:'synastry';one:NatalChart;two:NatalChart;aspects:CrossAspect[];warnings:string[]};
export type CompositeResult={kind:'composite';method:'shortest-arc-midpoint';one:NatalChart;two:NatalChart;chart:NatalChart;warnings:string[]};
export type TransitResult={kind:'transit';natal:NatalChart;transit:NatalChart;aspects:CrossAspect[];selectedAt:string;warnings:string[]};

/** Midpoint on the shorter zodiac arc. Exactly opposite points have no unique midpoint. */
export function circularMidpoint(one:number,two:number):number|null{
 const delta=((normalizeAngle(two-one)+540)%360)-180;
 return Math.abs(delta)===180?null:normalizeAngle(one+delta/2);
}

function crossAspects(one:Placement[],two:Placement[]):CrossAspect[]{
 const result:CrossAspect[]=[];
 for(const a of one)for(const b of two){
  const angle=angularDistance(a.longitude,b.longitude);
  const match=aspectDefinitions.find(item=>Math.abs(angle-item.angle)<=item.orb);
  if(match)result.push({one:a.body,two:b.body,kind:match.id,angle,orb:Math.abs(angle-match.angle)});
 }
 return result.sort((a,b)=>a.orb-b.orb||a.one.localeCompare(b.one)||a.two.localeCompare(b.two));
}
function exact(chart:NatalChart){return chart.accuracy==='exact'&&!!chart.instant;}
export function calculateSynastry(one:BirthProfile,two:BirthProfile):SynastryResult{
 const a=calculateNatal(one),b=calculateNatal(two),canAspect=exact(a)&&exact(b);
 return {kind:'synastry',one:a,two:b,aspects:canAspect?crossAspects(a.placements,b.placements):[],warnings:canAspect?[]:['Inter-chart aspect orbs need two exact birth instants and confirmed locations. The placements below remain labeled with their uncertainty.']};
}
export function calculateComposite(one:BirthProfile,two:BirthProfile):CompositeResult{
 const a=calculateNatal(one),b=calculateNatal(two),allExact=exact(a)&&exact(b);
 const placements:Placement[]=planetIds.map((body):Placement|null=>{
  const first=a.placements.find(item=>item.body===body)!,second=b.placements.find(item=>item.body===body)!;
  const longitude=circularMidpoint(first.longitude,second.longitude);
  if(longitude===null)return null;
  return {body,longitude,sign:signAt(longitude),degree:longitude%30,retrograde:false,house:null,possibleSigns:[signAt(longitude)],uncertain:!allExact};
 }).filter((value):value is Placement=>value!==null);
 const ascendant=allExact&&a.ascendant&&b.ascendant?circularMidpoint(a.ascendant.longitude,b.ascendant.longitude):null;
 const midheaven=allExact&&a.midheaven!==null&&b.midheaven!==null?circularMidpoint(a.midheaven,b.midheaven):null;
 const warnings=['Composite positions are shortest-arc midpoints of two calculated natal longitudes; they are symbolic chart geometry, not positions of real celestial bodies.','A pair of exactly opposite points has no unique shorter-arc midpoint and is omitted.','Composite houses are omitted until a house method is separately validated. Composite retrograde motion is undefined.'];
 if(!allExact)warnings.push('With an unknown or approximate birth instant, composite angles and exact aspects are omitted; displayed position midpoints are provisional.');
 const chart:NatalChart={engine:'astronomy-engine',version:'2.1.19',zodiac:'tropical',houseSystem:'whole-sign',calculatedAt:new Date().toISOString(),instant:null,interval:{start:[a.interval.start,b.interval.start].sort()[0],end:[a.interval.end,b.interval.end].sort()[1]},accuracy:allExact?'exact':'unknown',precisionArcminutes:1,placements,ascendant:ascendant===null?null:{longitude:ascendant,sign:signAt(ascendant),possibleSigns:[signAt(ascendant)]},midheaven,cusps:[],aspects:allExact?crossAspects(placements,placements).filter(item=>planetIds.indexOf(item.one)<planetIds.indexOf(item.two)).map(item=>({a:item.one,b:item.two,kind:item.kind,angle:item.angle,orb:item.orb,uncertain:false})):[],warnings};
 return {kind:'composite',method:'shortest-arc-midpoint',one:a,two:b,chart,warnings};
}
export function calculateTransit(profile:BirthProfile,selectedAt:string):TransitResult{
 const instant=new Date(selectedAt);
 if(!Number.isFinite(instant.getTime())||instant.getUTCFullYear()<1800||instant.getUTCFullYear()>2200||instant.toISOString()!==selectedAt)throw Error('Choose a valid selected instant between 1800 and 2200.');
 const natal=calculateNatal(profile),positions=planetIds.map(body=>{
  const longitude=planetLongitude(body,instant);
  const before=planetLongitude(body,new Date(instant.getTime()-3600000)),after=planetLongitude(body,new Date(instant.getTime()+3600000));
  return {body,longitude,sign:signAt(longitude),degree:longitude%30,retrograde:normalizeAngle(after-before)>180,house:null,possibleSigns:[signAt(longitude)],uncertain:false} satisfies Placement;
 });
 const angles=profile.place?chartAngles(instant,profile.place.latitude,profile.place.longitude):null;
 const transit:NatalChart={engine:'astronomy-engine',version:'2.1.19',zodiac:'tropical',houseSystem:'whole-sign',calculatedAt:new Date().toISOString(),instant:selectedAt,interval:{start:selectedAt,end:selectedAt},accuracy:'exact',precisionArcminutes:1,placements:positions,ascendant:angles?{longitude:angles.ascendant,sign:signAt(angles.ascendant),possibleSigns:[signAt(angles.ascendant)]}:null,midheaven:angles?.midheaven??null,cusps:[],aspects:[],warnings:[]};
 return {kind:'transit',natal,transit,aspects:exact(natal)?crossAspects(natal.placements,positions):[],selectedAt,warnings:exact(natal)?[]:['Exact transit-to-natal aspect orbs need a reliable birth instant and confirmed location. Selected-date sky positions remain calculated.']};
}
