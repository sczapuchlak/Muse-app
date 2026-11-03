import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load,root} from './helpers.mjs';
const {calculateNatal,planetLongitude,chartAngles,angularDistance,cosmicEvents,majorAspects}=load('lib/astrology/calculations');
const {civilTimeCandidates,resolveBirthInstant,birthDayBounds}=load('lib/astrology/time');
const profile={date:'2000-01-01',time:'12:00',accuracy:'exact',uncertaintyMinutes:0,place:{id:'synthetic',name:'Greenwich reference location',latitude:51.4779,longitude:0,timeZone:'UTC'},zodiac:'tropical',houseSystem:'whole-sign'};
test('twenty apparent longitudes agree with independent NASA/JPL Horizons references to one arcminute',()=>{
 const fixture=JSON.parse(readFileSync(root+'/content/astrology/jpl-reference.json','utf8'));assert.equal(fixture.cases.length,20);
 for(const row of fixture.cases){const actual=planetLongitude(row.body,new Date(row.instant)),error=angularDistance(actual,row.longitude);assert.ok(error<=1/60,`${row.body} at ${row.instant}: ${error*60} arcminutes`);}
});
test('real tropical signs, whole-sign houses, angular markers and major aspects are deterministic',()=>{
 const chart=calculateNatal(profile,new Date('2026-11-02T12:00:00Z'));
 assert.equal(chart.placements.length,10);assert.equal(chart.placements[0].sign,'capricorn');assert.equal(chart.placements[1].sign,'scorpio');
 assert.equal(chart.cusps.length,12);assert.deepEqual(chart.cusps,Array.from({length:12},(_,i)=>i*30));assert.equal(chart.ascendant.sign,'aries');
 assert.ok(Math.abs(chart.ascendant.longitude-24.2661)<.001);assert.ok(Math.abs(chart.midheaven-279.6111)<.001);
 // Independent spherical astronomy equation for the MC, using the documented GAST fixture.
 const A=load('node_modules/astronomy-engine/astronomy.js'),t=new Date(profile.date+'T12:00:00Z'),theta=A.SiderealTime(t)*15*Math.PI/180,eps=A.e_tilt(A.MakeTime(t)).tobl*Math.PI/180;
 const expected=((Math.atan2(Math.sin(theta)/Math.cos(eps),Math.cos(theta))*180/Math.PI)%360+360)%360;
 assert.ok(angularDistance(chart.midheaven,expected)<1e-8);assert.notEqual(chart.midheaven,chart.cusps[9]);
 assert.ok(chart.aspects.some(a=>a.a==='Sun'&&a.b==='Saturn'&&a.kind==='trine'));
 assert.equal(majorAspects([{body:'Sun',longitude:359,uncertain:false},{body:'Moon',longitude:1,uncertain:false}])[0].kind,'conjunction');
});
test('historical DST gaps, folds, half-hour offsets and pre-standard-time second offsets are explicit',()=>{
 assert.equal(civilTimeCandidates('2026-03-08','02:30','America/Los_Angeles').length,0);
 assert.equal(civilTimeCandidates('2026-11-01','01:30','America/Los_Angeles').length,2);
 assert.throws(()=>resolveBirthInstant('2026-11-01','01:30','America/Los_Angeles'),/twice/);
 assert.equal(resolveBirthInstant('2026-11-01','01:30','America/Los_Angeles','earlier'),'2026-11-01T08:30:00.000Z');
 assert.equal(resolveBirthInstant('2026-11-01','01:30','America/Los_Angeles','later'),'2026-11-01T09:30:00.000Z');
 assert.equal(resolveBirthInstant('2000-01-01','12:00','Asia/Kolkata'),'2000-01-01T06:30:00.000Z');
 assert.equal(resolveBirthInstant('1880-01-01','12:00','Europe/Paris'),'1880-01-01T11:50:39.000Z');
 const spring=birthDayBounds('2026-03-08','America/Los_Angeles'),fall=birthDayBounds('2026-11-01','America/Los_Angeles');
 assert.equal(spring.end-spring.start+1,23*3600000);assert.equal(fall.end-fall.start+1,25*3600000);
});
test('angles and Whole Sign cusps agree with documented independent northern/southern engine fixtures',()=>{
 // Published test values, not Muse-generated expectations:
 // https://raw.githubusercontent.com/0xStarcat/CircularNatalHoroscopeJS/master/tests/Horoscope.test.js
 for(const row of [{instant:'2019-07-20T17:10:00Z',lat:34.052235,lon:-118.243683,asc:169.4304,mc:78.4576},{instant:'2019-07-20T13:10:00Z',lat:-34.603722,lon:-58.381592,asc:160.2684,mc:78.1782}]){
  const actual=chartAngles(new Date(row.instant),row.lat,row.lon);assert.ok(angularDistance(actual.ascendant,row.asc)<1/60);assert.ok(angularDistance(actual.midheaven,row.mc)<1/60);
 }
 const chart=calculateNatal({...profile,date:'2019-07-20',time:'10:10',place:{id:'fixture-la',name:'Los Angeles reference case',latitude:34.052235,longitude:-118.243683,timeZone:'America/Los_Angeles'}});
 assert.deepEqual(chart.cusps,[150,180,210,240,270,300,330,0,30,60,90,120]);
});
test('unknown and approximate birth times never manufacture precise Rising or Moon certainty',()=>{
 const unknown=calculateNatal({...profile,date:'2000-01-02',accuracy:'unknown',time:''});
 assert.equal(unknown.ascendant,null);assert.equal(unknown.midheaven,null);assert.deepEqual(unknown.cusps,[]);assert.deepEqual(unknown.aspects,[]);
 assert.ok(unknown.placements.every(p=>p.house===null&&p.uncertain));assert.ok(unknown.placements.find(p=>p.body==='Moon').possibleSigns.length>1);
 const approximate=calculateNatal({...profile,accuracy:'approximate',uncertaintyMinutes:30});
 assert.equal(Date.parse(approximate.interval.end)-Date.parse(approximate.interval.start),3600000);assert.ok(approximate.placements.every(p=>p.uncertain));
 assert.equal(chartAngles(new Date(),90,0),null);assert.deepEqual(calculateNatal({...profile,place:{...profile.place,latitude:90}}).cusps,[]);
});
test('invalid input and locations are rejected; real lunar phases and seasons have ordered dated bases',()=>{
 assert.throws(()=>calculateNatal({...profile,date:'2000-02-30'}));assert.throws(()=>calculateNatal({...profile,place:{...profile.place,latitude:91}}));assert.throws(()=>calculateNatal({...profile,place:{...profile.place,timeZone:'Invented/Place'}}));
 const events=cosmicEvents('2024-04','UTC'),newMoon=events.find(e=>e.type==='new-moon');assert.ok(newMoon);assert.ok(Math.abs(Date.parse(newMoon.instant)-Date.parse('2024-04-08T18:21:00Z'))<120000,'NASA eclipse/new-moon reference: April 8 2024 around 18:21 UTC');
 assert.ok(events.every(e=>e.basis.includes('Astronomy Engine')&&e.instant.startsWith('2024-04')));
 assert.ok(cosmicEvents('2024-03','UTC').some(e=>e.title==='March Equinox'&&e.instant.startsWith('2024-03-20')));
});
test('unknown birthplace never assumes coordinates or timezone and covers global civil-date possibilities',()=>{
 const chart=calculateNatal({...profile,place:null,time:'12:00',accuracy:'exact'});assert.equal(chart.accuracy,'unknown');assert.equal(chart.instant,null);assert.equal(chart.ascendant,null);assert.equal(chart.midheaven,null);assert.deepEqual(chart.cusps,[]);assert.deepEqual(chart.aspects,[]);assert.ok(chart.placements.every(p=>p.house===null&&p.uncertain));assert.equal(Date.parse(chart.interval.end)-Date.parse(chart.interval.start)+1,52*3600000);assert.ok(chart.warnings.some(w=>w.includes('No coordinates or timezone are assumed')));
});
