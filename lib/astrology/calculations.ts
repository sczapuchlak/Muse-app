import {Body,Ecliptic,GeoVector,MakeTime,SiderealTime,e_tilt,SearchMoonPhase,Seasons} from 'astronomy-engine';
import {zodiacSigns} from '@/lib/cosmic-forecast';
import {validDate,validTimeZone,todayInTimeZone,shiftDate} from '@/lib/dates';
import {birthDayBounds,resolveBirthInstant} from './time';
import {planetIds,type BirthProfile,type NatalChart,type Placement,type NatalAspect,type PlanetId} from './models';
export const normalizeAngle=(angle:number)=>((angle%360)+360)%360;
export const angularDistance=(a:number,b:number)=>Math.abs(((a-b+540)%360)-180);
export const signAt=(longitude:number)=>zodiacSigns[Math.floor(normalizeAngle(longitude)/30)];
export const planetLongitude=(body:PlanetId,instant:Date)=>normalizeAngle(Ecliptic(GeoVector(Body[body],instant,true)).elon);
const radians=Math.PI/180;
/** Horizon/ecliptic intersection chosen by positive altitude derivative (rising). */
export function chartAngles(instant:Date,latitude:number,longitude:number){
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>=90||Math.abs(longitude)>180)return null;
 const theta=(SiderealTime(instant)*15+longitude)*radians,epsilon=e_tilt(MakeTime(instant)).tobl*radians,phi=latitude*radians;
 const n=[0,-Math.sin(epsilon),Math.cos(epsilon)],z=[Math.cos(phi)*Math.cos(theta),Math.cos(phi)*Math.sin(theta),Math.sin(phi)];
 let v=[n[1]*z[2]-n[2]*z[1],n[2]*z[0]-n[0]*z[2],n[0]*z[1]-n[1]*z[0]];
 const rate=Math.cos(phi)*(-v[0]*Math.sin(theta)+v[1]*Math.cos(theta));
 if(Math.hypot(...v)<1e-10||Math.abs(rate)<1e-10)return null;
 if(rate<0)v=v.map(value=>-value);
 const ascendant=normalizeAngle(Math.atan2(v[1]*Math.cos(epsilon)+v[2]*Math.sin(epsilon),v[0])/radians);
 const midheaven=normalizeAngle(Math.atan2(Math.sin(theta),Math.cos(theta)*Math.cos(epsilon))/radians);
 return {ascendant,midheaven};
}
export const aspectDefinitions=[{id:'conjunction',angle:0,orb:8},{id:'sextile',angle:60,orb:4},{id:'square',angle:90,orb:6},{id:'trine',angle:120,orb:6},{id:'opposition',angle:180,orb:8}] as const;
export function majorAspects(placements:Placement[]):NatalAspect[]{const result:NatalAspect[]=[];for(let i=0;i<placements.length;i++)for(let j=i+1;j<placements.length;j++){const a=placements[i],b=placements[j],angle=angularDistance(a.longitude,b.longitude),match=aspectDefinitions.find(item=>Math.abs(angle-item.angle)<=item.orb);if(match)result.push({a:a.body,b:b.body,kind:match.id,angle,orb:Math.abs(angle-match.angle),uncertain:a.uncertain||b.uncertain});}return result;}
export function validateBirthProfile(profile:BirthProfile){
 if(!profile||!validDate(profile.date)||profile.date<'1800-01-01'||profile.date>todayInTimeZone('UTC')||!['exact','approximate','unknown'].includes(profile.accuracy)||profile.zodiac!=='tropical'||profile.houseSystem!=='whole-sign')throw Error('Choose a valid past birth date (1800 onward), time accuracy, tropical zodiac and Whole Sign houses.');
 const place=profile.place;if(place&&(typeof place.name!=='string'||!place.name.trim()||place.name.length>200||!Number.isFinite(place.latitude)||Math.abs(place.latitude)>90||!Number.isFinite(place.longitude)||Math.abs(place.longitude)>180||!validTimeZone(place.timeZone)))throw Error('Confirm a birthplace with valid coordinates and an IANA timezone.');
 if(profile.accuracy!=='unknown'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(profile.time))throw Error('Enter the local birth time, or select Unknown.');
 if(profile.accuracy==='approximate'&&(!Number.isInteger(profile.uncertaintyMinutes)||profile.uncertaintyMinutes<1||profile.uncertaintyMinutes>720))throw Error('Set the approximate time uncertainty between 1 and 720 minutes.');
 if(profile.fold!==undefined&&!['earlier','later'].includes(profile.fold))throw Error('Choose a valid clock-change occurrence.');
}
/** No noon chart is represented as exact: unknown/approximate inputs carry an interval. */
export function calculateNatal(profile:BirthProfile,now=new Date()):NatalChart{
 validateBirthProfile(profile);const unknown=profile.accuracy==='unknown'||!profile.place,exact=profile.accuracy==='exact'&&!!profile.place;
 const resolved=unknown?null:resolveBirthInstant(profile.date,profile.time,profile.place!.timeZone,profile.fold);
 const bounds=unknown?(profile.place?birthDayBounds(profile.date,profile.place.timeZone):{start:Date.parse(profile.date+'T00:00:00Z')-14*3600000,end:Date.parse(profile.date+'T00:00:00Z')+38*3600000-1}):{start:Date.parse(resolved!)-(exact?0:profile.uncertaintyMinutes*60000),end:Date.parse(resolved!)+(exact?0:profile.uncertaintyMinutes*60000)};
 const midpoint=new Date((bounds.start+bounds.end)/2),angles=unknown?null:chartAngles(midpoint,profile.place!.latitude,profile.place!.longitude);
 const samples:number[]=[];for(let stamp=bounds.start;stamp<bounds.end;stamp+=15*60000)samples.push(stamp);samples.push(bounds.end);
 const startCusp=angles?Math.floor(angles.ascendant/30)*30:null;
 const placements=planetIds.map(body=>{
  const longitude=planetLongitude(body,midpoint),possibilities=new Set(samples.map(stamp=>signAt(planetLongitude(body,new Date(stamp)))));
  // Respect the engine's stated ±1 arcminute accuracy at a sign boundary as well.
  for(const stamp of samples){const lon=planetLongitude(body,new Date(stamp));possibilities.add(signAt(lon-1/60));possibilities.add(signAt(lon+1/60));}
  const before=planetLongitude(body,new Date(midpoint.getTime()-3600000)),after=planetLongitude(body,new Date(midpoint.getTime()+3600000));
  return {body,longitude,sign:signAt(longitude),degree:longitude%30,retrograde:normalizeAngle(after-before)>180,house:startCusp===null?null:Math.floor(normalizeAngle(longitude-startCusp)/30)+1,possibleSigns:[...possibilities],uncertain:!exact||possibilities.size>1} satisfies Placement;
 });
 const ascSigns=angles?[...new Set(samples.flatMap(stamp=>{const value=chartAngles(new Date(stamp),profile.place!.latitude,profile.place!.longitude);return value?[signAt(value.ascendant)]:[];}))]:[];
 const warnings=['Astrological meanings are interpretive traditions, not scientific personality measures or predictions.','Positions use a geocentric tropical ecliptic of date; house system: Whole Sign.'];
 if(!profile.place)warnings.push('Birthplace is unknown. No coordinates or timezone are assumed; the interval covers the birth date across UTC−14 through UTC+14. Rising and houses are unavailable.');
 if(unknown)warnings.push('Birth instant is unresolved. Degrees use a labeled interval midpoint; sign possibilities cover the local day. Rising, houses and exact aspects are unavailable.');
 if(!exact&&!unknown)warnings.push('Approximate time: degrees, angles, houses and aspects are provisional within your stated interval.');
 if(profile.date<'1970-01-01')warnings.push('Historical timezone coverage before 1970 may be incomplete. Check the resolved offset against the birth record.');
 if(!unknown&&!angles)warnings.push('Rising and houses cannot be resolved reliably for this geometry; no alternative house system was substituted.');
 return {engine:'astronomy-engine',version:'2.1.19',zodiac:'tropical',houseSystem:'whole-sign',calculatedAt:now.toISOString(),instant:resolved,interval:{start:new Date(bounds.start).toISOString(),end:new Date(bounds.end).toISOString()},accuracy:unknown?'unknown':profile.accuracy,precisionArcminutes:1,placements,ascendant:angles?{longitude:angles.ascendant,sign:signAt(angles.ascendant),possibleSigns:ascSigns}:null,midheaven:angles?.midheaven??null,cusps:startCusp===null?[]:Array.from({length:12},(_,i)=>normalizeAngle(startCusp+i*30)),aspects:unknown?[]:majorAspects(placements),warnings};
}
export type CosmicEvent={id:string;type:'new-moon'|'first-quarter'|'full-moon'|'last-quarter'|'equinox'|'solstice';title:string;instant:string;basis:string;libraryId:string};
export function cosmicEvents(month:string,timeZone:string):CosmicEvent[]{
 if(!/^\d{4}-\d{2}$/.test(month)||!validDate(month+'-01')||!validTimeZone(timeZone))throw Error('Choose a valid month and timezone.');
 const year=Number(month.slice(0,4));if(year<1800||year>2200)throw Error('Calendar calculations cover 1800–2200.');
 const first=month+'-01',next=new Date(first+'T12:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);const last=shiftDate(next.toISOString().slice(0,10),-1),start=new Date(shiftDate(first,-2)+'T00:00:00Z'),events:CosmicEvent[]=[];
 for(const [angle,type,title] of [[0,'new-moon','New Moon'],[90,'first-quarter','First Quarter'],[180,'full-moon','Full Moon'],[270,'last-quarter','Last Quarter']] as const){let from=start;for(let i=0;i<3;i++){const found=SearchMoonPhase(angle,from,40);if(!found)break;events.push({id:`${type}/${found.date.toISOString()}`,type,title,instant:found.date.toISOString(),basis:'Astronomy Engine 2.1.19 · geocentric Sun–Moon ecliptic separation',libraryId:'concept-lunar-phases'});from=new Date(found.date.getTime()+86400000);}}
 const seasons=Seasons(year);for(const [event,title,type] of [[seasons.mar_equinox,'March Equinox','equinox'],[seasons.jun_solstice,'June Solstice','solstice'],[seasons.sep_equinox,'September Equinox','equinox'],[seasons.dec_solstice,'December Solstice','solstice']] as const)events.push({id:`${type}/${event.date.toISOString()}`,type,title,instant:event.date.toISOString(),basis:'Astronomy Engine 2.1.19 · apparent solar ecliptic longitude',libraryId:'concept-transits'});
 return events.filter(event=>{const day=todayInTimeZone(timeZone,new Date(event.instant));return day>=first&&day<=last;}).sort((a,b)=>a.instant.localeCompare(b.instant));
}
