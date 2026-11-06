/**
 * "Take Muse with you": add Muse to a home screen or dock. Muse is a web app (standalone manifest, no service
 * worker), so nothing here promises offline use. Detection only chooses which instructions to show first; every
 * path stays optional.
 */
export type InstallPlatform='installed'|'ios-safari'|'ios-other'|'android-chrome'|'android-samsung'|'android-firefox'|'android-other'|'desktop-chromium'|'desktop-safari'|'unsupported'|'unknown';

/** Pure, so it can be tested with any user agent. `maxTouchPoints` tells iPadOS (which reports as a Mac) apart. */
export function detectInstallPlatform({userAgent,maxTouchPoints=0,standalone=false}:{userAgent:string;maxTouchPoints?:number;standalone?:boolean}):InstallPlatform{
 if(standalone)return 'installed';
 const ua=userAgent;
 const ios=/iPad|iPhone|iPod/.test(ua)||(/Macintosh/.test(ua)&&maxTouchPoints>1);
 if(ios)return /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua)?'ios-other':/Safari\//.test(ua)?'ios-safari':'ios-other';
 if(/Android/.test(ua)){
  if(/SamsungBrowser/.test(ua))return 'android-samsung';
  if(/Firefox\//.test(ua))return 'android-firefox';
  if(/Chrome\//.test(ua)&&!/OPR\/|; wv\)/.test(ua))return 'android-chrome';
  return 'android-other';
 }
 if(/Edg\/|Chrome\//.test(ua)&&!/OPR\//.test(ua))return 'desktop-chromium';
 // Safari 17+ on macOS Sonoma can add a site to the Dock.
 const safari=/Macintosh/.test(ua)&&/Safari\//.test(ua)&&!/Chrome|Chromium|Firefox/.test(ua);
 if(safari){const version=Number(/Version\/(\d+)/.exec(ua)?.[1]??0);return version>=17?'desktop-safari':'unsupported';}
 return 'unsupported';
}

/** Steps per platform. Wording follows each browser's own menu labels. */
export const installSteps:Record<Exclude<InstallPlatform,'installed'|'unsupported'|'unknown'>,{label:string;steps:string[];note?:string}>={
 'ios-safari':{label:'iPhone or iPad (Safari)',steps:['Tap Share (the square with an arrow).','Scroll down and tap Add to Home Screen.','Tap Add.']},
 'ios-other':{label:'iPhone or iPad',steps:['Tap Share in the address bar or the browser menu.','Tap Add to Home Screen.','Tap Add.'],note:'Don’t see it? Open Muse in Safari, then tap Share → Add to Home Screen → Add.'},
 'android-chrome':{label:'Android (Chrome)',steps:['Tap the ⋮ menu.','Tap Install app or Add to Home screen, whichever appears.','Tap Install.']},
 'android-samsung':{label:'Android (Samsung Internet)',steps:['Tap the ≡ menu.','Tap Add page to → Home screen.']},
 'android-firefox':{label:'Android (Firefox)',steps:['Tap the ⋮ menu.','Tap Install or Add to Home screen.']},
 'android-other':{label:'Android',steps:['Open your browser’s menu.','Look for Install app or Add to Home screen.'],note:'Not there? Open Muse in Chrome and use ⋮ → Install app.'},
 'desktop-chromium':{label:'This computer (Chrome or Edge)',steps:['Click the install icon at the right end of the address bar.','Or open the browser menu and choose Install Muse (in Chrome: Cast, save and share → Install page as app).']},
 'desktop-safari':{label:'This Mac (Safari)',steps:['In the menu bar, choose File → Add to Dock.','Click Add.']},
};
/** The phone guides, offered on computers that can't install so people know where it works best. */
export const phoneGuides=['ios-safari','android-chrome'] as const;

// The browser's own install prompt (Chrome, Edge, Samsung Internet), when it offers one.
type InstallPromptEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
let deferred:InstallPromptEvent|null=null;let installed=false;const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(update=>update());
if(typeof window!=='undefined'){
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferred=event as InstallPromptEvent;emit();});
 window.addEventListener('appinstalled',()=>{installed=true;deferred=null;emit();});
}
export const subscribeInstall=(update:()=>void)=>{listeners.add(update);return()=>{listeners.delete(update);};};
export const readInstallState=()=>installed?'installed':deferred?'promptable':'none';
export const serverInstallState=()=>'none' as const;
/** Shows the browser's install dialog; resolves true when the person accepts. */
export async function promptInstall(){const event=deferred;if(!event)return false;deferred=null;emit();await event.prompt();const choice=await event.userChoice.catch(()=>({outcome:'dismissed' as const}));if(choice.outcome==='accepted'){installed=true;emit();}return choice.outcome==='accepted';}
