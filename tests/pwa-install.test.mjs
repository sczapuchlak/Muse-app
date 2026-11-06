import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {root,load} from './helpers.mjs';

const pwa=load('lib/pwa-install');
const read=file=>readFileSync(join(root,file),'utf8');
const UA={
 iphoneSafari:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
 iphoneChrome:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
 iphoneInstagram:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0',
 ipadAsMac:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
 androidChrome:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
 samsung:'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
 androidFirefox:'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
 macChrome:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
 winEdge:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
 macSafari17:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
 macSafari16:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
 macFirefox:'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:131.0) Gecko/20100101 Firefox/131.0',
};

test('install instructions follow the platform and browser',()=>{
 const d=(userAgent,extra={})=>pwa.detectInstallPlatform({userAgent,...extra});
 assert.equal(d(UA.iphoneSafari),'ios-safari');
 assert.equal(d(UA.iphoneChrome),'ios-other','other iOS browsers get their Share flow with a Safari fallback');
 assert.equal(d(UA.iphoneInstagram),'ios-other','in-app browsers fall back to Safari instructions');
 assert.equal(d(UA.ipadAsMac,{maxTouchPoints:5}),'ios-safari','iPadOS reports as a Mac but is a touch device');
 assert.equal(d(UA.androidChrome),'android-chrome');assert.equal(d(UA.samsung),'android-samsung');assert.equal(d(UA.androidFirefox),'android-firefox');
 assert.equal(d(UA.macChrome),'desktop-chromium');assert.equal(d(UA.winEdge),'desktop-chromium');
 assert.equal(d(UA.macSafari17),'desktop-safari');assert.equal(d(UA.macSafari16),'unsupported','desktop instructions only where the browser supports it');
 assert.equal(d(UA.macFirefox),'unsupported');
 assert.equal(d(UA.iphoneSafari,{standalone:true}),'installed','already installed: nothing to explain');
 assert.match(pwa.installSteps['ios-safari'].steps.join(' '),/Share.*Add to Home Screen.*Add/);
 assert.match(pwa.installSteps['ios-other'].note,/Safari/);
 assert.match(pwa.installSteps['android-chrome'].steps.join(' '),/Install app or Add to Home screen/);
});

test('the welcome install note is optional, honest and uses the real app icon',()=>{
 const component=read('components/auth/TakeMuseWithYou.tsx'),steps=read('lib/pwa-install.ts');
 assert.match(component,/A little magic, one tap away\./);assert.match(component,/no app store required/);
 assert.match(component,/<details className="muse-take-muse-how">/,'instructions sit in an expandable guide');
 assert.match(component,/src="\/apple-touch-icon\.png"/);assert.ok(existsSync(join(root,'public/apple-touch-icon.png')));
 assert.match(component,/Optional/);
 for(const text of [component,steps])assert.doesNotMatch(text.replace(/no service\s+worker|nothing here promises offline use/gi,''),/offline/i,'no offline claims');
 const welcome=read('components/auth/MuseWelcome.tsx');
 assert.ok(welcome.indexOf('<TakeMuseWithYou/>')>welcome.indexOf('step==="done"'),'only on the final step');
 assert.ok(welcome.indexOf('<TakeMuseWithYou/>')<welcome.indexOf('Enter Muse'),'Enter Muse stays available below it');
});

test('the manifest installs Muse at the address it was opened from',()=>{
 const manifest=read('app/manifest.ts');
 for(const [key,value] of [['start_url','/'],['scope','/'],['id','/'],['display','standalone']])assert.match(manifest,new RegExp(`${key}: "${value}"`),key);
 assert.doesNotMatch(manifest,/https?:\/\//,'relative URLs only: an installed app never jumps to another domain');
 for(const icon of ['icon-192.png','icon-512.png','icon-maskable-512.png'])assert.ok(existsSync(join(root,'public',icon)),icon);
 assert.match(manifest,/purpose: "maskable"/);
 assert.doesNotMatch(read('app/layout.tsx'),/serviceWorker/);
 assert.match(read('app/layout.tsx'),/apple-mobile-web-app-capable/);
});
