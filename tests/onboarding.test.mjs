import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {load,root} from './helpers.mjs';

const onboarding=load('lib/onboarding'),{authMessages}=load('lib/auth/paths');
const read=path=>readFileSync(join(root,path),'utf8');

test('only profiles the server marks as not onboarded are sent to onboarding',()=>{
 assert.equal(onboarding.needsOnboarding({id:'a',first_name:'',onboarded_at:null}),true,'new invited account');
 assert.equal(onboarding.needsOnboarding({id:'a',first_name:'Stephanie',onboarded_at:'2026-11-05T00:00:00Z'}),false,'finished or pre-existing account');
 assert.equal(onboarding.needsOnboarding({id:'a',first_name:'',time_zone:'UTC'}),false,'database without the onboarding column never forces onboarding');
 assert.equal(onboarding.needsOnboarding(null),false);
 assert.equal(onboarding.supportsProfileSetup({onboarded_at:null}),true);assert.equal(onboarding.supportsProfileSetup({first_name:''}),false);
});

test('display names are required, trimmed and bounded',()=>{
 assert.match(onboarding.displayNameError('   '),/what to call you/);
 assert.equal(onboarding.displayNameError('  Ana  '),'');
 assert.match(onboarding.displayNameError('x'.repeat(81)),/80 characters/);
});

test('timezone choices are shared, sorted, include UTC and keep a saved zone',()=>{
 const ids=onboarding.timeZoneIds(['Etc/Custom']);
 assert.ok(ids.includes('UTC'));assert.ok(ids.includes('Etc/Custom'));
 assert.deepEqual([...ids].sort(),ids);
 assert.equal(new Set(ids).size,ids.length);
 const zone=onboarding.detectedTimeZone();assert.ok(onboarding.timeZoneIds().includes(zone),'detected zone is one Muse can save');
 assert.match(read('components/Settings.tsx'),/timeZoneOptions\(/,'Settings uses the shared timezone list');
});

test('routing: the app gate, the welcome page and invitation errors',()=>{
 const layout=read('app/(app)/layout.tsx');
 assert.match(layout,/select\("\*"\)/,'reads the whole row so a pre-migration database still loads');
 assert.match(layout,/if\(needsOnboarding\(profile\)\)redirect\("\/welcome"\)/);
 const welcome=read('app/welcome/page.tsx');
 assert.match(welcome,/requireUser\(\)/,'welcome requires a signed-in user');
 assert.match(welcome,/if\(!needsOnboarding\(profile\)\)redirect\("\/"\)/,'finished accounts never see onboarding again');
 assert.match(read('app/auth/confirm/route.ts'),/type==='invite'\?'invite-expired':'link-expired'/);
 assert.match(authMessages['invite-expired'],/send a new invitation/);
});

test('onboarding reuses existing appearance and preference infrastructure',()=>{
 const welcome=read('components/auth/MuseWelcome.tsx');
 assert.match(welcome,/<ThemeChoices\/>/);assert.match(welcome,/<MaterialChoices /);
 assert.match(welcome,/writePreferences\(createMuseBrowserClient\(\),profile\.revision,commandId,\{first_name:savedName,time_zone:timeZone,onboarded:true\}\)/,'one idempotent save at the end');
 assert.match(read('components/AppearanceSettings.tsx'),/<ThemeChoices\/>/,'Appearance uses the same picker');
 assert.match(read('components/WelcomeOrientation.tsx'),/query\.get\("welcome"\)!=="1"/,'orientation only right after setup');
 const migration=read('supabase/migrations/20261107000100_profile_onboarding.sql');
 assert.match(migration,/update public\.profiles set onboarded_at=coalesce\(time_zone_confirmed_at,created_at\) where onboarded_at is null/,'existing accounts are marked onboarded');
 assert.match(migration,/'first_name','onboarded'/);
});
