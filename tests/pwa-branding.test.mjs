import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {load,root} from './helpers.mjs';

const png=file=>{const b=readFileSync(resolve(root,file));assert.equal(b.toString('latin1',1,4),'PNG',file);return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),colorType:b[25]};};

test('standalone manifest keeps Muse identity, Disco Damage colors, and references real icons',()=>{
 const manifest=load('app/manifest').default();
 assert.equal(manifest.name,'Muse');assert.equal(manifest.short_name,'Muse');
 assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.display,'standalone');
 assert.equal(manifest.background_color,'#050507');assert.equal(manifest.theme_color,'#050507');
 const expected={'/icon-192.png':[192,'any'],'/icon-512.png':[512,'any'],'/icon-maskable-512.png':[512,'maskable']};
 assert.deepEqual(manifest.icons.map(icon=>icon.src).sort(),Object.keys(expected).sort());
 for(const icon of manifest.icons){const [size,purpose]=expected[icon.src],{width,height,colorType}=png('public'+icon.src);
  assert.equal(icon.sizes,`${size}x${size}`);assert.equal(icon.purpose,purpose);assert.deepEqual([width,height],[size,size]);assert.equal(colorType,2,`${icon.src} is opaque`);}
});

test('favicon and Apple touch assets exist at their declared sizes',()=>{
 assert.deepEqual(Object.values(png('public/apple-touch-icon.png')).slice(0,2),[180,180]);
 assert.deepEqual(Object.values(png('public/favicon-32x32.png')).slice(0,2),[32,32]);
 assert.deepEqual(Object.values(png('public/favicon-16x16.png')).slice(0,2),[16,16]);
 const ico=readFileSync(resolve(root,'app/favicon.ico'));assert.equal(ico.readUInt16LE(2),1);
 assert.deepEqual(Array.from({length:ico.readUInt16LE(4)},(_,i)=>ico[6+16*i]),[16,32,48]);
 assert.ok(!existsSync(resolve(root,'public/favicon.ico')),'one favicon.ico source');
});

test('root metadata declares icons, standalone Apple support, and no service worker',()=>{
 const layout=readFileSync(resolve(root,'app/layout.tsx'),'utf8');
 assert.match(layout,/apple: \[\{ url: "\/apple-touch-icon\.png", sizes: "180x180"/);
 assert.match(layout,/appleWebApp: \{ capable: true, title: "Muse", statusBarStyle: "default" \}/);
 assert.match(layout,/themeColor: pwaInk/);assert.match(layout,/<ThemeColorSync \/>/);
 assert.ok(!/viewportFit/.test(layout),'website viewport stays unchanged');
 const sources=dir=>readdirSync(resolve(root,dir),{recursive:true}).filter(file=>/\.(tsx?|mjs|js)$/.test(file)).map(file=>resolve(root,dir,file));
 for(const file of ['app','components','lib'].flatMap(sources))assert.ok(!/navigator\.serviceWorker|serviceWorker\.register/.test(readFileSync(file,'utf8')),file);
 assert.ok(!existsSync(resolve(root,'public/sw.js')));
});

test('proxy lets install assets through while private routes remain protected',()=>{
 const source=readFileSync(resolve(root,'proxy.ts'),'utf8'),pattern=source.match(/matcher:\["([^"]+)"\]/)[1].replace(/\\\\/g,'\\');
 const matched=path=>new RegExp(`^${pattern}$`).test(path);
 for(const path of ['/manifest.webmanifest','/icon-192.png','/icon-512.png','/icon-maskable-512.png','/apple-touch-icon.png','/favicon-16x16.png','/favicon-32x32.png','/favicon.ico'])assert.equal(matched(path),false,path);
 for(const path of ['/','/collections','/settings','/login','/icon-999.png','/apple-touch-icon.png.evil','/manifest.webmanifest/x'])assert.equal(matched(path),true,path);
});
