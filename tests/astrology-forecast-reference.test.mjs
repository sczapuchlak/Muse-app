import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {load,root} from './helpers.mjs';
const ref=load('lib/astrology/forecast-reference');
const read=file=>readFileSync(`${root}/${file}`,'utf8');
const entry=(id,reference,updated='2026-11-13T10:00:00Z')=>({id,user_id:'u',date:'2026-11-13',time_zone:'UTC',title:'',text:`text ${id}`,reference,revision:1,created_at:updated,updated_at:updated});

test('a forecast has one stable identity per sign and period, anchored to the first day of that period',()=>{
 assert.equal(ref.forecastReferenceId('aries','daily','2026-11-13'),'forecast/aries/daily/2026-11-13');
 // Friday Nov 13 2026 belongs to the Monday–Sunday week that starts Nov 9, and to November.
 assert.equal(ref.forecastReferenceId('aries','weekly','2026-11-13'),'forecast/aries/weekly/2026-11-09');
 assert.equal(ref.forecastReferenceId('aries','weekly','2026-11-15'),'forecast/aries/weekly/2026-11-09');
 assert.equal(ref.forecastReferenceId('aries','monthly','2026-11-30'),'forecast/aries/monthly/2026-11-01');
 assert.deepEqual(ref.parseForecastReferenceId('forecast/leo/weekly/2026-11-09'),{sign:'leo',period:'weekly',start:'2026-11-09'});
});

test('only canonical, real forecast ids are accepted',()=>{
 for(const bad of [null,42,'','forecast/aries/daily','forecast/ophiuchus/daily/2026-11-13','forecast/aries/yearly/2026-11-13','forecast/aries/daily/2026-13-40','forecast/aries/weekly/2026-11-13','forecast/aries/monthly/2026-11-13','library/aries/daily/2026-11-13','forecast/aries/daily/2026-11-13/extra'])
  assert.equal(ref.parseForecastReferenceId(bad),null,String(bad));
});

test('the saved reference is rebuilt from the id and carries no forecast text',()=>{
 const reference=ref.forecastReference({sign:'aries',period:'daily',start:'2026-11-13'});
 assert.deepEqual(reference,{type:'forecast',id:'forecast/aries/daily/2026-11-13',title:'Aries · Daily horoscope',date:'2026-11-13'});
 assert.deepEqual(Object.keys(reference).sort(),['date','id','title','type']);
});

test('a forecast cannot be reflected on before its period begins',()=>{
 const parts={sign:'aries',period:'daily',start:'2026-11-13'};
 assert.equal(ref.forecastReferenceAllowed(parts,'2026-11-13'),true);
 assert.equal(ref.forecastReferenceAllowed(parts,'2026-11-20'),true,'a past forecast’s reflection can still be edited');
 assert.equal(ref.forecastReferenceAllowed(parts,'2026-11-12'),false);
 assert.equal(ref.forecastReferenceAllowed(parts,'not a date'),false);
});

test('repeated saves find the same reflection instead of creating another',()=>{
 const journal=[entry('a',ref.forecastReference({sign:'aries',period:'daily',start:'2026-11-13'})),entry('b',ref.forecastReference({sign:'aries',period:'weekly',start:'2026-11-09'})),entry('c',{type:'library',id:'sign-aries',title:'Aries'}),entry('d',null)];
 assert.equal(ref.forecastReflection(journal,'aries','daily','2026-11-13').id,'a');
 assert.equal(ref.forecastReflection(journal,'aries','weekly','2026-11-14').id,'b','any day in the week finds the week’s reflection');
 assert.equal(ref.forecastReflection(journal,'aries','daily','2026-11-12'),null,'another day is another forecast');
 assert.equal(ref.forecastReflection(journal,'leo','daily','2026-11-13'),null,'another sign is another forecast');
 assert.equal(ref.forecastReflection(journal,'aries','monthly','2026-11-13'),null);
});

test('a past day shows only reflections whose forecast period covered it, nearest period first',()=>{
 const journal=[entry('month',ref.forecastReference({sign:'aries',period:'monthly',start:'2026-11-01'})),entry('week',ref.forecastReference({sign:'aries',period:'weekly',start:'2026-11-09'})),entry('day',ref.forecastReference({sign:'aries',period:'daily',start:'2026-11-10'})),entry('other-day',ref.forecastReference({sign:'aries',period:'daily',start:'2026-11-11'})),entry('note',null)];
 assert.deepEqual(ref.forecastReflectionsCovering(journal,'2026-11-10').map(x=>x.entry.id),['day','week','month']);
 assert.deepEqual(ref.forecastReflectionsCovering(journal,'2026-11-05').map(x=>x.entry.id),['month']);
 assert.deepEqual(ref.forecastReflectionsCovering(journal,'2026-10-31'),[]);
 assert.deepEqual(ref.forecastReflectionsCovering(journal,'nope'),[]);
});

test('only the reader’s own today is "current"',()=>{
 assert.equal(ref.forecastDayState('2026-11-13','2026-11-13'),'current');
 assert.equal(ref.forecastDayState('2026-11-12','2026-11-13'),'past');
 assert.equal(ref.forecastDayState('2026-11-14','2026-11-13'),'future');
});

test('the Daily Edit never requests or shows a live forecast for a day that is not today',()=>{
 const card=read('components/CosmicForecast.tsx');
 assert.match(card,/date&&date!==today\?<ForecastHistory /,'another day renders the history state');
 assert.match(card,/<ForecastReading [^>]*date=\{today\}/,'the live reading is only ever asked for today');
 assert.doesNotMatch(card,/<ForecastReading [^>]*date=\{date\}/);
 assert.match(read('components/DailyEdit.tsx'),/<CosmicForecast compact date=\{selectedDate\} \/>/);
 const history=read('components/astrology/ForecastHistory.tsx');
 assert.doesNotMatch(history,/<ForecastReading|observatoryForecasts|\/api\/astrology\/forecast/,'the history state cannot fetch a forecast');
 assert.match(history,/Your cosmic forecast for this day wasn’t saved\./);
 // The server refuses any date but today, whatever the client asks.
 assert.match(read('app/api/astrology/forecast/route.ts'),/if\(query\.date!==todayInTimeZone\(query\.timeZone\)\)return reply\(unavailable\)/);
});

test('reflections reference the forecast and the server rebuilds that reference itself',()=>{
 const route=read('app/api/astrology/records/route.ts');
 assert.match(route,/r\.type==='forecast'\)\{const parts=parseForecastReferenceId\(r\.id\);if\(parts&&forecastReferenceAllowed\(parts,todayInTimeZone\(record\.time_zone\)\)\)reference=forecastReference\(parts\);/);
 const composer=read('components/astrology/ForecastReflection.tsx');
 assert.match(composer,/forecastReflection\(records\.journal,sign,period,date\)/,'an existing reflection is edited, not duplicated');
 assert.match(composer,/Did the stars say something worth keeping\?/);
 assert.doesNotMatch(composer,/forecast\.text|preview/,'no provider text is ever written into a reflection');
});
