import test from 'node:test';
import assert from 'node:assert/strict';
import {load} from './helpers.mjs';
const {dateLabel,weekDates,shiftDate,todayInTimeZone}=load('lib/dates');
const {shortDate}=load('lib/display-date');

test('a selected calendar date keeps its weekday in every device timezone',()=>{
 const previous=process.env.TZ;
 try{
  for(const zone of ['UTC','America/Los_Angeles','Pacific/Honolulu','Asia/Tokyo','Pacific/Kiritimati']){
   process.env.TZ=zone;
   assert.equal(dateLabel('2026-10-30'),'Friday, October 30',zone);
   assert.equal(dateLabel('2026-11-01'),'Sunday, November 1',zone);
   assert.equal(shortDate('2026-10-30'),'Oct 30',zone);
   const week=weekDates('2026-11-01');
   assert.deepEqual(week,['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']);
   assert.deepEqual(week.map(day=>dateLabel(day).split(',')[0]),['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']);
  }
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});

test('Today uses the intended profile zone rather than UTC or the travelling device zone',()=>{
 const now=new Date('2026-10-31T01:00:00Z'),previous=process.env.TZ;
 try{
  process.env.TZ='Asia/Tokyo';
  const local=todayInTimeZone('America/Los_Angeles',now);
  assert.equal(local,'2026-10-30');
  assert.equal(dateLabel(local),'Friday, October 30');
  assert.equal(dateLabel(todayInTimeZone('UTC',now)),'Saturday, October 31');
  assert.equal(todayInTimeZone('Pacific/Kiritimati',new Date('2026-12-31T12:30:00Z')),'2027-01-01');
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});

test('DST gaps and repeated hours do not change the day or Monday-first week',()=>{
 const cases=[['2026-03-08T07:59:59Z','2026-03-07','Saturday'],['2026-03-08T08:00:00Z','2026-03-08','Sunday'],['2026-03-08T09:59:59Z','2026-03-08','Sunday'],['2026-03-08T10:00:00Z','2026-03-08','Sunday'],['2026-11-01T06:59:59Z','2026-10-31','Saturday'],['2026-11-01T07:00:00Z','2026-11-01','Sunday'],['2026-11-01T08:30:00Z','2026-11-01','Sunday'],['2026-11-01T09:30:00Z','2026-11-01','Sunday']];
 for(const [timestamp,day,weekday]of cases){assert.equal(todayInTimeZone('America/Los_Angeles',new Date(timestamp)),day);assert.ok(dateLabel(day).startsWith(weekday));assert.ok(weekDates(day).includes(day));}
 assert.equal(dateLabel(shiftDate('2026-03-08',1)),'Monday, March 9');
 assert.equal(dateLabel(shiftDate('2026-11-01',1)),'Monday, November 2');
 assert.deepEqual(weekDates('2027-01-03'),['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
});
