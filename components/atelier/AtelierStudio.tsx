"use client";
/**
 * Theme Atelier studio. Edits live only here until an explicit Apply: the preview frames get the remix by message,
 * undo/redo keeps every step, and saving writes to the person's private theme library.
 */
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useCallback,useEffect,useMemo,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {isThemeId,type ThemeId} from '@/lib/themes';
import {officialTokenValues} from '@/lib/atelier/catalog.generated';
import {tokenInfo,tokensIn,type TokenSection} from '@/lib/atelier/tokens';
import {emptyDefinition,themeName,tokenValue,resolveToken,planeLayers,effectivePlaneLayers,planesFor,planeLabels,changeCount,isDirty,validateDefinition,MAX_CUSTOM_LAYERS,MAX_STOPS,blendModes,baseFingerprint,type BlendMode,type AtelierDefinition,type AtelierTheme,type LayerSpec,type PlaneId,type StarDensity} from '@/lib/atelier/model';
import {parseLinearGradient,formatLinearGradient,formatColorValue,parseRgba,formatRgba,isSafeCssValue,type Len} from '@/lib/atelier/css-values';
import {referenceableTokens} from '@/lib/atelier/tokens';
import {layerPresets,presetLayer,newGlow,withOriginalDiscoLight,withOriginalDiscoAtmosphere} from '@/lib/atelier/presets';
import {startHistory,record,undo,redo,type History} from '@/lib/atelier/history';
import {contrastLevel,type ContrastCheck} from '@/lib/atelier/contrast';
import {listAtelierThemes,saveAtelierTheme} from '@/lib/atelier/persistence';
import {applyAtelier,readApplied,serverApplied,subscribeApplied} from '@/lib/atelier/applied';
import {createMuseBrowserClient} from '@/lib/supabase/client';
import {MuseIcon} from '../MuseIcon';
import {MuseSearch} from '../design/MuseSearch';
import {ExportDialog} from './ExportDialog';
import {PreviewFrame,type Viewport,type FrameHandles} from './PreviewFrame';
import type {HandleLayer,HandlePatch} from './GlowHandles';
import {Slider,TokenColorField,StopColorEditor,StopBar,PositionPad,FieldGroup,RgbaPicker} from './controls';
import './Atelier.css';

type Section='atmosphere'|'stars'|'colours'|'surfaces'|'icons'|'readability'|'advanced';
const sections:{id:Section;label:string;icon:Parameters<typeof MuseIcon>[0]['name']}[]=[
 {id:'atmosphere',label:'Atmosphere',icon:'orbit'},{id:'stars',label:'Light & stars',icon:'sparkle'},{id:'colours',label:'Colours',icon:'themes'},{id:'surfaces',label:'Glass',icon:'panel'},{id:'icons',label:'Icons & gradients',icon:'wand'},{id:'readability',label:'Readability',icon:'focus'},{id:'advanced',label:'Advanced',icon:'gear'},
];
const sectionOf=(token:string):Section=>{const s=tokenInfo[token]?.section as TokenSection|undefined;return s==='atmosphere'?'atmosphere':s==='stars'?'stars':s==='surfaces'||s==='frosted'?'surfaces':s==='icons'||s==='progress'?'icons':s==='advanced'||!s?'advanced':'colours';};
const accentPalette=['--accent-aqua','--accent-purple','--accent-pink','--accent-cyan','--accent-teal','--accent-blue-violet','--accent-lavender','--accent-warm'];
const layerColorTokens=[...accentPalette,'--atmosphere-aqua','--atmosphere-lavender','--atmosphere-blush','--atmosphere-blue-violet','--haze-primary','--haze-secondary','--hero-glow',...Array.from({length:8},(_,i)=>`--chart-${i+1}`),'--star-color-1','--star-color-2','--star-color-3','--foreground','--background'];
type Selected={plane:PlaneId|'custom';id:string}|null;
type Meta={id:string|null;name:string;status:'draft'|'saved';saved:AtelierDefinition|null;savedName:string};
const newId=()=>crypto.randomUUID();

type Draft={definition:AtelierDefinition;name:string;savedAt:string};
function readDraft(key:string):Draft|null{try{const raw=window.localStorage.getItem(key);if(!raw)return null;const value=JSON.parse(raw) as Draft;const result=validateDefinition(value.definition);return result.ok&&typeof value.name==='string'?{definition:result.definition,name:value.name.slice(0,60),savedAt:String(value.savedAt)}:null;}catch{return null;}}
function writeDraft(key:string,draft:Draft){try{window.localStorage.setItem(key,JSON.stringify(draft));}catch{/* storage full or unavailable */}}
function clearDraft(key:string){try{window.localStorage.removeItem(key);}catch{/* nothing stored */}}

export function AtelierStudio({userId,themeId,base}:{userId:string;themeId?:string;base?:string}){
 const router=useRouter();const client=useMemo(()=>createMuseBrowserClient(),[]);
 const startBase:ThemeId=base&&isThemeId(base)?base:'disco-damage';
 const [history,setHistory]=useState<History<AtelierDefinition>>(()=>startHistory(emptyDefinition(startBase)));
 const [meta,setMeta]=useState<Meta>({id:null,name:`${themeName(startBase)} Remix`,status:'draft',saved:null,savedName:''});
 const [library,setLibrary]=useState<AtelierTheme[]>([]);
 const [loadState,setLoadState]=useState<'loading'|'ready'|'missing'>(themeId?'loading':'ready');
 const [section,setSection]=useState<Section>('atmosphere');const [highlight,setHighlight]=useState<string|null>(null);
 const [viewport,setViewport]=useState<Viewport>('desktop');const [material,setMaterial]=useState<'crystal'|'frosted'>('crystal');
 const [compare,setCompare]=useState<string>('off');const [checks,setChecks]=useState<ContrastCheck[]>([]);
 const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);const [confirmLeave,setConfirmLeave]=useState(false);
 const [selected,setSelected]=useState<Selected>(null);const [exporting,setExporting]=useState(false);const [restored,setRestored]=useState<string|null>(null);
 const draftKey=`muse.atelier.draft.${themeId??`new-${startBase}`}`;
 const [showHandles,setShowHandles]=useState(true);const viewCenter=useRef(420);
 const applied=useSyncExternalStore(subscribeApplied,readApplied,serverApplied);
 const definition=history.present;
 const change=useCallback((next:AtelierDefinition,key:string|null=null)=>setHistory(h=>record(h,next,key)),[]);

 useEffect(()=>{let cancelled=false;listAtelierThemes(client,userId).then(list=>{if(cancelled)return;setLibrary(list);
  let saved:AtelierDefinition=emptyDefinition(startBase),name=`${themeName(startBase)} Remix`;
  if(themeId){const found=list.find(theme=>theme.id===themeId);if(!found){setLoadState('missing');return;}saved=found.definition;name=found.name;setMeta({id:found.id,name:found.name,status:found.status,saved:found.definition,savedName:found.name});setLoadState('ready');}
  // Unsaved work survives reloads: restore this browser's draft on top of the saved version, as one undoable step.
  const draft=readDraft(draftKey);
  if(draft&&(isDirty(draft.definition,saved)||draft.name!==name)){setHistory(record(startHistory(saved),draft.definition,null));setMeta(m=>({...m,name:draft.name}));setRestored(draft.savedAt);}
  else setHistory(startHistory(saved));
 }).catch(()=>{if(!cancelled){if(themeId)setLoadState('missing');setStatus('Your saved themes could not be loaded right now.');}});return()=>{cancelled=true;};},[client,userId,themeId,draftKey,startBase]);

 const dirty=meta.saved?isDirty(definition,meta.saved)||meta.name!==meta.savedName:changeCount(definition)>0;
 useEffect(()=>{if(loadState!=='ready')return;const timer=setTimeout(()=>{if(dirty)writeDraft(draftKey,{definition,name:meta.name,savedAt:new Date().toISOString()});else clearDraft(draftKey);},400);return()=>clearTimeout(timer);});
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 useEffect(()=>{const key=(event:KeyboardEvent)=>{const target=event.target as HTMLElement;if(target.closest('input[type=text],input[type=number],textarea,select'))return;const mod=event.metaKey||event.ctrlKey;if(!mod)return;if(event.key.toLowerCase()==='z'){event.preventDefault();setHistory(h=>event.shiftKey?redo(h):undo(h));}else if(event.key.toLowerCase()==='y'){event.preventDefault();setHistory(redo);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);

 // ---- edit helpers -------------------------------------------------------------------------------------------
 const resolve=useCallback((name:string)=>resolveToken(definition,name),[definition]);
 const setToken=(name:string,value:string|null)=>{const tokens={...definition.tokens};const base=officialTokenValues[definition.base][name];if(value===null||value===base)delete tokens[name];else tokens[name]=value;change({...definition,tokens},`token:${name}`);};
 const setEffects=(patch:Partial<AtelierDefinition['effects']>,key:string)=>change({...definition,effects:{...definition.effects,...patch}},`effect:${key}`);
 const layersOf=(plane:PlaneId|'custom')=>plane==='custom'?definition.custom:planeLayers(plane,definition);
 const writeLayers=(plane:PlaneId|'custom',layers:LayerSpec[],key:string|null)=>change(plane==='custom'?{...definition,custom:layers}:{...definition,planes:{...definition.planes,[plane]:layers}},key);
 const updateLayer=(plane:PlaneId|'custom',id:string,patch:Partial<LayerSpec>,key:string)=>writeLayers(plane,layersOf(plane).map(layer=>layer.id===id?{...layer,...patch}:layer),`layer:${plane}:${id}:${key}`);
 const resetPlane=(plane:PlaneId)=>{const planes={...definition.planes};delete planes[plane];change({...definition,planes});};
 const addLayer=(layer:LayerSpec)=>{if(definition.custom.length>=MAX_CUSTOM_LAYERS)return;change({...definition,custom:[layer,...definition.custom]});setSelected({plane:'custom',id:layer.id});};
 const addGlow=()=>{if(definition.custom.length>=MAX_CUSTOM_LAYERS)return;const index=definition.custom.filter(l=>/^Glow \d+$/.test(l.name)).length+1;addLayer(newGlow(definition,{x:42+((index*13)%24),y:viewCenter.current,index}));setShowHandles(true);setSection('atmosphere');};
 const colourOf=(layer:LayerSpec)=>{const c=layer.stops.find(stop=>stop.c.k!=='none')?.c;if(!c)return 'transparent';if(c.k==='token'){const rgba=parseRgba(resolveToken(definition,c.t));return rgba?formatRgba({...rgba,a:1}):'#fff';}return c.k==='rgba'?formatRgba({...c,a:1}):'#fff';};
 // Every light gets a handle while handles are on: the person's own glows and every built-in bloom, pool and spill.
 const handles:FrameHandles=useMemo(()=>{if(!showHandles)return null;
  const toHandle=(plane:string,builtIn:boolean)=>(layer:LayerSpec):HandleLayer=>({plane,id:layer.id,name:layer.name,type:layer.type,shape:layer.shape,x:layer.x,y:layer.y,w:layer.w,h:layer.h,color:colourOf(layer),builtIn});
  const list=definition.custom.filter(l=>l.on&&l.type!=='linear').map(toHandle('custom',false));
  for(const plane of planesFor(definition.base).filter(p=>p!=='haze'&&p!=='discoReflection'&&p!=='discoCaustic'))list.push(...effectivePlaneLayers(plane,definition).filter(l=>l.on&&l.type==='radial').map(toHandle(plane,true)));
  return {layers:list,selected:selected?.id??null};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[showHandles,definition,selected]);
 /** Built-in layers are drawn at the overall glow size; dragged sizes are converted back to the layer's own size. */
 const onHandlePatch=({plane,id,patch}:HandlePatch)=>{if(plane!=='custom'&&!(plane in planeLabels))return;const k=plane==='custom'?1:(definition.effects.glowSize??100)/100;const unscale=(len?:Len)=>len&&{...len,v:Math.round(len.v/k*10)/10};updateLayer(plane as PlaneId|'custom',id,{...patch,...(patch.w?{w:unscale(patch.w)}:{}),...(patch.h?{h:unscale(patch.h)}:{})},'drag');};

 // ---- saving ------------------------------------------------------------------------------------------------
 async function save(nextStatus:'draft'|'saved',asNew=false){
  setBusy(true);setStatus('');
  // Remember what the base looked like, so the library can warn if the official theme changes later.
  const definition={...history.present,baseFingerprint:history.present.frozen?history.present.baseFingerprint:baseFingerprint(history.present.base)};
  setHistory(h=>({...h,present:definition}));
  const id=asNew||!meta.id?newId():meta.id;const name=asNew&&meta.id?`${meta.name} variation`.slice(0,60):meta.name.trim()||'Untitled theme';
  try{await saveAtelierTheme(client,userId,{id,name,status:nextStatus,definition});
   clearDraft(draftKey);setRestored(null);
   setMeta({id,name,status:nextStatus,saved:definition,savedName:name});setLibrary(list=>[{id,name,status:nextStatus,definition},...list.filter(t=>t.id!==id)]);
   if(id!==themeId)router.replace(`/atelier?theme=${id}`,{scroll:false});
   setStatus(nextStatus==='draft'?`Saved ${name} as a draft.`:asNew?`Saved a new theme, ${name}.`:`Saved ${name}.`);return {id,name,definition};
  }catch(cause){setStatus(cause instanceof Error&&cause.message.includes('200 themes')?cause.message:'That did not save. Your changes are still here; please try again.');return null;}finally{setBusy(false);}
 }
 async function apply(){const result=dirty||!meta.id||meta.status!=='saved'?await save('saved'):{id:meta.id!,name:meta.name,definition};if(!result)return;applyAtelier({id:result.id,name:result.name,definition:result.definition});setStatus(`${result.name} is now your Muse theme.`);}
 const isApplied=!!applied&&applied.id===meta.id&&!dirty&&!isDirty(applied.definition,definition);

 const compareDefinition=compare==='original'?emptyDefinition(definition.base):compare==='saved'?meta.saved:compare.startsWith('theme:')?library.find(t=>`theme:${t.id}`===compare)?.definition??null:null;
 const compareLabel=compare==='original'?`Original ${themeName(definition.base)}`:compare==='saved'?'Last saved version':library.find(t=>`theme:${t.id}`===compare)?.name??'';
 const jump=(token:string)=>{setSection(sectionOf(token));setHighlight(token);setTimeout(()=>document.getElementById(`token-${token.slice(2)}`)?.scrollIntoView({block:'center',behavior:'smooth'}),60);setTimeout(()=>setHighlight(null),2400);};
 const warnings=checks.filter(check=>contrastLevel(check)!=='pass').length;

 if(loadState==='missing')return <main className="muse-atelier-studio muse-atelier-missing"><div className="muse-empty-state" data-variant="editorial"><h2>That theme is not in your atelier</h2><p>It may have been deleted, or it belongs to another account.</p><Link className="muse-button button-primary muse-edge" href="/appearance/atelier">Back to Theme Atelier</Link></div></main>;
 const tokenField=(name:string,linkOptions?:string[])=><TokenColorField key={name} name={name} value={tokenValue(definition,name)} baseValue={officialTokenValues[definition.base][name]} resolve={resolve} onChange={value=>setToken(name,value)} onReset={()=>setToken(name,null)} linkOptions={linkOptions} highlight={highlight===name}/>;
 const colorTokens=(section:TokenSection)=>tokensIn(section).filter(info=>!!parseRgba(resolve(info.name))).map(info=>tokenField(info.name,info.name.startsWith('--accent-')&&!accentPalette.includes(info.name)?accentPalette:undefined));

 return <main className="muse-atelier-studio" aria-busy={loadState==='loading'}>
  <header className="muse-atelier-topbar">
   <div className="muse-atelier-topbar-start">
    {dirty&&confirmLeave?<span className="muse-atelier-leave" role="group" aria-label="Leave without saving?"><span>Leave without saving?</span><Link className="muse-button muse-edge" href="/appearance/atelier">Leave</Link><button type="button" className="muse-button muse-edge" onClick={()=>setConfirmLeave(false)}>Stay</button></span>
    :<Link className="muse-button muse-edge muse-atelier-back" href="/appearance/atelier" onClick={event=>{if(dirty){event.preventDefault();setConfirmLeave(true);}}}><MuseIcon name="arrow" size={16}/><span>Library</span></Link>}
    <label className="muse-atelier-name"><span className="sr-only">Theme name</span><input type="text" value={meta.name} maxLength={60} onChange={event=>setMeta(m=>({...m,name:event.target.value}))}/></label>
    <span className="muse-tone-pill" title="Base theme">{themeName(definition.base)}</span>
    <span className="muse-atelier-dirty" aria-live="polite">{dirty?<><i aria-hidden="true"/>Unsaved changes</>:meta.id?'All changes saved':''}</span>
   </div>
   <div className="muse-atelier-topbar-tools">
    <button type="button" className="muse-button muse-edge muse-atelier-icon-button" onClick={()=>setHistory(undo)} disabled={!history.past.length} aria-label="Undo" title="Undo (⌘Z)"><MuseIcon name="undo" size={16}/></button>
    <button type="button" className="muse-button muse-edge muse-atelier-icon-button muse-atelier-redo" onClick={()=>setHistory(redo)} disabled={!history.future.length} aria-label="Redo" title="Redo (⇧⌘Z)"><MuseIcon name="undo" size={16}/></button>
    <details className="muse-atelier-more"><summary className="muse-button muse-edge">Reset</summary><div className="muse-atelier-more-menu">
     <button type="button" disabled={!dirty||!meta.saved} onClick={()=>meta.saved&&change(meta.saved)}>Back to last save</button>
     <button type="button" disabled={!changeCount(definition)} onClick={()=>change(emptyDefinition(definition.base))}>Back to original {themeName(definition.base)}</button>
    </div></details>
   </div>
   <div className="muse-atelier-topbar-actions">
    <details className="muse-atelier-more"><summary className="muse-button muse-edge" aria-label="More save options"><MuseIcon name="more" size={16}/></summary><div className="muse-atelier-more-menu">
     <button type="button" disabled={busy} onClick={()=>save('saved',true)}>Save as a new theme</button>
     <button type="button" onClick={()=>setExporting(true)}>Export theme file…</button>
    </div></details>
    <button type="button" className="muse-button muse-edge" disabled={busy} onClick={()=>save('draft')}>Save draft</button>
    <button type="button" className="muse-button muse-edge" disabled={busy||(!dirty&&meta.status==='saved')} onClick={()=>save('saved')}>Save theme</button>
    <button type="button" className="muse-button button-primary muse-edge" disabled={busy||isApplied} onClick={apply}>{isApplied?'Applied':dirty||!meta.id?'Save & apply':'Apply'}</button>
   </div>
   <p className="muse-atelier-status" role="status">{status}</p>
   {restored&&<p className="muse-accent-note muse-atelier-restored">Restored your unsaved changes from {new Date(restored).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}. <button type="button" className="muse-atelier-link" onClick={()=>{setRestored(null);setHistory(h=>h.past.length?startHistory(h.past[0]):h);}}>Discard them</button> <button type="button" className="muse-atelier-link" onClick={()=>setRestored(null)}>Keep</button></p>}
  </header>

  <div className="muse-atelier-workspace">
   <aside className="muse-atelier-panel" aria-label="Theme controls">
    <nav className="muse-atelier-sections" aria-label="Editor sections">{sections.map(item=><button key={item.id} type="button" aria-current={section===item.id?'true':undefined} onClick={()=>setSection(item.id)}><MuseIcon name={item.icon} size={16}/><span>{item.label}</span>{item.id==='readability'&&warnings>0&&<small className="muse-atelier-badge" aria-label={`${warnings} warnings`}>{warnings}</small>}</button>)}</nav>
    <div className="muse-atelier-controls" key={section}>
     {section==='atmosphere'&&<>
      {definition.base==='disco-damage'&&<FieldGroup title="Disco, as it first shipped" description="Bring back the original light. These change only this remix; Disco itself stays as it is.">
       <div className="muse-atelier-row"><button type="button" className="muse-button muse-edge" onClick={()=>change(withOriginalDiscoLight(definition))}>Restore prismatic streaks and light spill</button><button type="button" className="muse-button muse-edge" onClick={()=>change(withOriginalDiscoAtmosphere(definition))}>Restore violet depth and big blooms</button></div>
      </FieldGroup>}
      <FieldGroup title="Overall glow" description="The quickest way to change the mood: these act on every built-in light at once.">
       <Slider label="Glow strength" value={definition.effects.glowStrength} min={0} max={400} unit="%" onChange={v=>setEffects({glowStrength:v},'glow-strength')} hint="Above 100% the light grows more intense than the original."/>
       <Slider label="Glow size" value={definition.effects.glowSize} min={25} max={300} unit="%" onChange={v=>setEffects({glowSize:v},'glow-size')}/>
       <Slider label="Vividness" value={definition.effects.saturation} min={0} max={220} unit="%" onChange={v=>setEffects({saturation:v},'saturation')}/>
       <Slider label="Brightness" value={definition.effects.brightness} min={40} max={180} unit="%" onChange={v=>setEffects({brightness:v},'brightness')}/>
      </FieldGroup>
      {definition.frozen&&<p className="muse-accent-note">This is a frozen snapshot: changes to the official {themeName(definition.base)} won&apos;t move it. Back to original unfreezes it.</p>}
      <FieldGroup title="Base colour">{tokenField('--background')}</FieldGroup>
      <FieldGroup title="Atmosphere colours" description={definition.base==='disco-damage'?'On Disco these tint the small edge blooms and fine haze. Most of Disco\u2019s light comes from its own light spill and pools: use Overall glow above, or select a light in the preview to recolour it.':'Blooms and haze use these. Change one and every layer that follows it changes too.'}>{tokensIn('atmosphere').filter(info=>info.name!=='--background').map(info=>tokenField(info.name))}</FieldGroup>
      <LayerStudio definition={definition} selected={selected} setSelected={setSelected} layersOf={layersOf} writeLayers={writeLayers} updateLayer={updateLayer} resetPlane={resetPlane} addLayer={addLayer} resolve={resolve}/>
      <FieldGroup title="Vignette">
       <Slider label="Vignette" value={definition.effects.vignette?.strength??0} min={0} max={100} unit="%" onChange={v=>setEffects({vignette:v?{strength:v,color:definition.effects.vignette?.color??'#000000'}:null},'vignette')}/>
       {definition.effects.vignette&&<RgbaPicker label="Vignette colour" value={{...(parseRgba(definition.effects.vignette.color)??{r:0,g:0,b:0,a:1}),a:1}} onChange={c=>setEffects({vignette:{strength:definition.effects.vignette!.strength,color:formatRgba({...c,a:1})}},'vignette-colour')}/>}
      </FieldGroup>
     </>}
     {section==='stars'&&<>
      <FieldGroup title="Stars">
       <div className="muse-segmented" role="group" aria-label="Star density">{(['none','sparse','normal','rich'] as StarDensity[]).map(value=><button key={value} type="button" aria-pressed={definition.effects.stars===value} onClick={()=>setEffects({stars:value},'stars')}>{value==='none'?'None':value==='sparse'?'Sparse':value==='normal'?'As designed':'Rich'}</button>)}</div>
       <Slider label="Star brightness" value={definition.effects.starOpacity} min={0} max={300} unit="%" onChange={v=>setEffects({starOpacity:v},'star-opacity')}/>
       <Slider label="Star glow" value={definition.effects.starGlow} min={0} max={400} unit="%" onChange={v=>setEffects({starGlow:v},'star-glow')} hint="Muse Magic levels still apply on top, and stars never animate when motion is reduced."/>
       {colorTokens('stars')}
      </FieldGroup>
      <FieldGroup title="Header glow">{tokenField('--hero-glow')}</FieldGroup>
     </>}
     {section==='colours'&&<>
      <FieldGroup title="Accent roles" description="Which palette colour leads, supports and pops.">{['--accent-primary','--accent-secondary','--accent-pop'].map(name=>tokenField(name,accentPalette))}</FieldGroup>
      <FieldGroup title="Palette">{accentPalette.map(name=>tokenField(name))}</FieldGroup>
      <FieldGroup title="Text">{colorTokens('text')}</FieldGroup>
      <FieldGroup title="Buttons, selection and focus">{colorTokens('interaction')}</FieldGroup>
      <FieldGroup title="Charts">{colorTokens('charts')}</FieldGroup>
     </>}
     {section==='surfaces'&&<>
      <FieldGroup title="Preview glass" description="Only the preview changes; your saved glass preference stays as it is."><div className="muse-segmented" role="group" aria-label="Preview glass"><button type="button" aria-pressed={material==='crystal'} onClick={()=>setMaterial('crystal')}>Crystal</button><button type="button" aria-pressed={material==='frosted'} onClick={()=>setMaterial('frosted')}>Frosted</button></div></FieldGroup>
      <FieldGroup title="Crystal glass and surfaces" description="Shapes, borders widths and spacing are shared by every theme; here you change their colour and transparency.">{colorTokens('surfaces')}</FieldGroup>
      <FieldGroup title="Frosted glass">{colorTokens('frosted')}</FieldGroup>
     </>}
     {section==='icons'&&<>
      <FieldGroup title="Icon gradient" description="Every prismatic icon, from the sidebar to buttons, paints with these.">
       {['--icon-gradient-start','--icon-gradient-middle','--icon-gradient-end','--icon-gradient-highlight','--icon-edge'].map(name=>tokenField(name))}
       <Slider label="Gradient angle" value={definition.effects.iconAngle} min={0} max={359} unit="°" onChange={v=>setEffects({iconAngle:v},'icon-angle')}/>
       <Slider label="Middle colour position" value={definition.effects.iconMiddle} min={5} max={95} unit="%" onChange={v=>setEffects({iconMiddle:v},'icon-middle')}/>
       <Slider label="Icon glow" value={definition.effects.iconGlow} min={0} max={400} unit="%" onChange={v=>setEffects({iconGlow:v},'icon-glow')}/>
      </FieldGroup>
      <FieldGroup title="Hover shimmer">{['--hover-start','--hover-middle','--hover-end'].map(name=>tokenField(name))}</FieldGroup>
      <FieldGroup title="Gradients">{['--selected-background','--navigation-background','--completion-gradient'].map(name=><GradientTokenField key={name} name={name} definition={definition} resolve={resolve} onChange={value=>setToken(name,value)} highlight={highlight===name}/>)}</FieldGroup>
      <FieldGroup title="Progress and completion">{colorTokens('progress')}</FieldGroup>
     </>}
     {section==='readability'&&<FieldGroup title="Readability" description="Measured live in the preview, with glass composited over the background. These are warnings only; nothing changes unless you change it.">
      {checks.length===0?<p className="muse-atelier-hint" role="status">Measuring…</p>:<ul className="muse-atelier-checks">{checks.map(check=>{const level=contrastLevel(check);return <li key={check.id} data-level={level}><span className="muse-atelier-check-mark" aria-hidden="true">{level==='pass'?'✓':'!'}</span><span><strong>{check.label}</strong><small>{check.ratio.toFixed(2)}:1 · needs {check.minimum}:1{check.kind==='graphic'?' for shapes and outlines':''}</small></span>{level!=='pass'&&<button type="button" className="muse-atelier-link" onClick={()=>jump(check.token)}>Adjust</button>}</li>;})}</ul>}
     </FieldGroup>}
     {section==='advanced'&&<AdvancedTokens definition={definition} setToken={setToken} highlight={highlight}/>}
    </div>
   </aside>
   <section className="muse-atelier-stage-area" aria-label="Live preview" data-compare={compareDefinition?'on':undefined} data-viewport={viewport}>
    <div className="muse-atelier-stage-tools">
     <button type="button" className="muse-button button-primary muse-edge" onClick={addGlow} disabled={definition.custom.length>=MAX_CUSTOM_LAYERS}><MuseIcon name="plus" size={16}/>Add glow</button>
     <button type="button" className="muse-button muse-edge" aria-pressed={showHandles} onClick={()=>setShowHandles(value=>!value)}>{showHandles?'Hide handles':'Show handles'}</button>
     <span className="muse-atelier-stage-views">
    <div className="muse-segmented" role="group" aria-label="Preview size"><button type="button" aria-pressed={viewport==='desktop'} onClick={()=>setViewport('desktop')}>Desktop</button><button type="button" aria-pressed={viewport==='mobile'} onClick={()=>setViewport('mobile')}>Mobile</button></div>
      <div className="muse-segmented" role="group" aria-label="Preview glass"><button type="button" aria-pressed={material==='crystal'} onClick={()=>setMaterial('crystal')}>Crystal</button><button type="button" aria-pressed={material==='frosted'} onClick={()=>setMaterial('frosted')}>Frosted</button></div>
      <label className="muse-atelier-select muse-atelier-compare"><span className="sr-only">Compare with</span><select value={compare} onChange={event=>setCompare(event.target.value)}><option value="off">No comparison</option><option value="original">Compare: original {themeName(definition.base)}</option>{meta.saved&&<option value="saved">Compare: last saved</option>}{library.filter(t=>t.id!==meta.id).map(t=><option key={t.id} value={`theme:${t.id}`}>Compare: {t.name}</option>)}</select></label>
     </span>
     <small className="muse-atelier-hint">{showHandles?'Drag a glow’s centre to move it and its edge to resize it. Arrow keys nudge.':'Handles are hidden: this is exactly how the theme will look.'}</small>
    </div>
    <figure><figcaption>{meta.name}{dirty?' · unsaved':''}</figcaption><PreviewFrame definition={definition} material={material} viewport={viewport} label={`Live preview of ${meta.name}`} onContrast={setChecks} focus={({atmosphere:'top',stars:'top',colours:'atelier-controls',surfaces:'atelier-priorities',icons:'atelier-icons'} as Record<string,string>)[section]} handles={handles} onPatch={onHandlePatch} onSelect={(plane,id)=>{setSelected({plane:plane as PlaneId|'custom',id});setSection('atmosphere');}} onViewport={y=>{viewCenter.current=Math.round(y);}}/></figure>
    {compareDefinition&&<figure><figcaption>{compareLabel}</figcaption><PreviewFrame definition={compareDefinition} material={material} viewport={viewport} label={`Comparison preview: ${compareLabel}`} focus={({atmosphere:'top',stars:'top',colours:'atelier-controls',surfaces:'atelier-priorities',icons:'atelier-icons'} as Record<string,string>)[section]}/></figure>}
   </section>
  </div>
  {exporting&&<ExportDialog name={meta.name} definition={definition} currentId={meta.id} library={library} saveFrozen={async theme=>{await saveAtelierTheme(client,userId,theme);setLibrary(list=>list.map(t=>t.id===theme.id?{...t,definition:theme.definition}:t).concat(list.some(t=>t.id===theme.id)?[]:[{...theme}]));}} onClose={message=>{setExporting(false);if(message)setStatus(message);}}/>}
 </main>;
}

function GradientTokenField({name,definition,resolve,onChange,highlight}:{name:string;definition:AtelierDefinition;resolve:(name:string)=>string;onChange:(value:string|null)=>void;highlight:boolean}){
 const value=tokenValue(definition,name),base=officialTokenValues[definition.base][name];const gradient=parseLinearGradient(resolve(name));const [stop,setStop]=useState(0);
 if(!gradient)return <div className="muse-atelier-field" id={`token-${name.slice(2)}`}><span className="muse-atelier-field-label">{tokenInfo[name]?.label}</span><code className="muse-atelier-code">{value}</code><small className="muse-atelier-hint">Edit this one in Advanced.</small></div>;
 const write=(next:typeof gradient)=>onChange(formatLinearGradient(next));const current=gradient.stops[Math.min(stop,gradient.stops.length-1)];
 return <div className="muse-atelier-field" data-changed={value!==base||undefined} data-highlight={highlight||undefined} id={`token-${name.slice(2)}`}>
  <div className="muse-atelier-field-head"><span className="muse-atelier-field-label">{tokenInfo[name]?.label}</span>{value!==base&&<button type="button" className="muse-atelier-link" onClick={()=>onChange(null)}>Reset</button>}</div>
  <StopBar stops={gradient.stops} selected={stop} onSelect={setStop} resolve={resolve} onMove={(i,p)=>write({...gradient,stops:gradient.stops.map((s,j)=>j===i?{...s,p:[p]}:s)})}/>
  <StopColorEditor value={current.c} resolve={resolve} tokenOptions={layerColorTokens} onChange={c=>write({...gradient,stops:gradient.stops.map((s,j)=>j===stop?{...s,c}:s)})}/>
  <Slider label="Angle" value={gradient.angle} min={0} max={360} unit="°" onChange={angle=>write({...gradient,angle})}/>
 </div>;
}

function LayerStudio({definition,selected,setSelected,layersOf,writeLayers,updateLayer,resetPlane,addLayer,resolve}:{definition:AtelierDefinition;selected:Selected;setSelected:(s:Selected)=>void;layersOf:(p:PlaneId|'custom')=>LayerSpec[];writeLayers:(p:PlaneId|'custom',l:LayerSpec[],key:string|null)=>void;updateLayer:(p:PlaneId|'custom',id:string,patch:Partial<LayerSpec>,key:string)=>void;resetPlane:(p:PlaneId)=>void;addLayer:(l:LayerSpec)=>void;resolve:(n:string)=>string}){
 const [preset,setPreset]=useState(layerPresets[0].id);
 const groups:(PlaneId|'custom')[]=['custom',...planesFor(definition.base)];
 const layer=selected?layersOf(selected.plane).find(l=>l.id===selected.id)??null:null;
 const swatch=(l:LayerSpec)=>{const c=l.stops.find(s=>s.c.k!=='none')?.c;if(!c)return 'transparent';if(c.k==='token'){const rgba=parseRgba(resolve(c.t));return rgba?formatRgba({...rgba,a:Math.max(.35,rgba.a)}):'transparent';}return formatColorValue(c.k==='rgba'?{...c,a:Math.max(.35,c.a)}:c);};
 const move=(plane:PlaneId|'custom',id:string,by:number)=>{const list=[...layersOf(plane)];const i=list.findIndex(l=>l.id===id),j=i+by;if(j<0||j>=list.length)return;[list[i],list[j]]=[list[j],list[i]];writeLayers(plane,list,null);};
 return <FieldGroup title="Layers" description="Top of the list paints on top. Built-in layers can be edited or hidden and always reset to the original.">
  <div className="muse-atelier-add-layer">
   <label className="muse-atelier-select"><span>New layer</span><select value={preset} onChange={event=>setPreset(event.target.value)}>{layerPresets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <button type="button" className="muse-button muse-edge" disabled={definition.custom.length>=MAX_CUSTOM_LAYERS} onClick={()=>addLayer(presetLayer(definition,layerPresets.find(p=>p.id===preset)!))}><MuseIcon name="plus" size={14}/>Add</button>
   <small className="muse-atelier-hint">{definition.custom.length} of {MAX_CUSTOM_LAYERS} of your own layers. {layerPresets.find(p=>p.id===preset)?.description}</small>
  </div>
  {groups.map(plane=>{const list=layersOf(plane);const edited=plane!=='custom'&&!!definition.planes[plane];if(plane==='custom'&&!list.length)return null;
   return <details key={plane} className="muse-atelier-layer-group" open={plane==='custom'||selected?.plane===plane}>
    <summary><span>{plane==='custom'?'Your layers':planeLabels[plane]}</span><small>{list.filter(l=>l.on).length}/{list.length}</small>{edited&&<button type="button" className="muse-atelier-link" onClick={event=>{event.preventDefault();resetPlane(plane as PlaneId);}}>Reset</button>}</summary>
    <ul className="muse-atelier-layers">{list.map((l,i)=><li key={l.id} aria-current={selected?.id===l.id&&selected.plane===plane?'true':undefined}>
     <button type="button" className="muse-atelier-eye" aria-pressed={l.on} aria-label={`${l.on?'Hide':'Show'} ${l.name}`} onClick={()=>updateLayer(plane,l.id,{on:!l.on},'visible')}><span aria-hidden="true">{l.on?'◉':'○'}</span></button>
     <button type="button" className="muse-atelier-layer-name" onClick={()=>setSelected({plane,id:l.id})}><i style={{background:swatch(l)}} aria-hidden="true"/>{l.name}</button>
     {plane==='custom'&&<span className="muse-atelier-layer-order"><button type="button" aria-label={`Move ${l.name} up`} disabled={i===0} onClick={()=>move(plane,l.id,-1)}>↑</button><button type="button" aria-label={`Move ${l.name} down`} disabled={i===list.length-1} onClick={()=>move(plane,l.id,1)}>↓</button></span>}
    </li>)}</ul>
   </details>;})}
  {layer&&selected&&<LayerEditor key={`${selected.plane}:${layer.id}`} layer={layer} plane={selected.plane} siblings={layersOf(selected.plane)} resolve={resolve} canCopy={definition.custom.length<MAX_CUSTOM_LAYERS}
   onChange={(patch,key)=>updateLayer(selected.plane,layer.id,patch,key)} onSelect={id=>setSelected({plane:selected.plane,id})}
   onMoveSibling={(id,x,y)=>updateLayer(selected.plane,id,{x:{...layersOf(selected.plane).find(l=>l.id===id)!.x,v:x},y:{...layersOf(selected.plane).find(l=>l.id===id)!.y,v:y}},'position')}
   onDuplicate={()=>addLayer({...layer,id:`custom-${Date.now().toString(36)}`,name:`${layer.name} copy`.slice(0,40),on:true})}
   onDelete={selected.plane==='custom'?()=>{writeLayers('custom',definition.custom.filter(l=>l.id!==layer.id),null);setSelected(null);}:undefined}/>}
 </FieldGroup>;
}

function LayerEditor({layer,plane,siblings,resolve,canCopy,onChange,onSelect,onMoveSibling,onDuplicate,onDelete}:{layer:LayerSpec;plane:PlaneId|'custom';siblings:LayerSpec[];resolve:(n:string)=>string;canCopy:boolean;onChange:(patch:Partial<LayerSpec>,key:string)=>void;onSelect:(id:string)=>void;onMoveSibling:(id:string,x:number,y:number)=>void;onDuplicate:()=>void;onDelete?:()=>void}){
 const [stop,setStop]=useState(Math.min(1,layer.stops.length-1));const current=layer.stops[Math.min(stop,layer.stops.length-1)];
 const lenSlider=(label:string,key:'w'|'h'|'x'|'y',units:Len['u'][])=>{const len=layer[key];const range=len.u==='px'?[0,1800]:len.u==='svh'?[-20,200]:key==='w'||key==='h'?[1,160]:[-30,130];
  return <div className="muse-atelier-len"><Slider label={label} value={len.v} min={range[0]} max={range[1]} step={len.u==='px'?5:.5} unit={len.u} onChange={v=>onChange({[key]:{...len,v}},key)}/>{units.length>1&&<label className="muse-atelier-unit"><span className="sr-only">{label} unit</span><select value={len.u} onChange={event=>onChange({[key]:{v:len.v,u:event.target.value as Len['u']}},`${key}-unit`)}>{units.map(u=><option key={u} value={u}>{u==='svh'?'screen':u}</option>)}</select></label>}</div>;};
 const points=siblings.filter(l=>l.on&&l.type!=='linear').map(l=>({id:l.id,x:l.x,y:l.y,label:l.name,color:formatColorValue(l.stops.find(s=>s.c.k!=='none')?.c??{k:'none'})}));
 return <div className="muse-atelier-layer-editor" aria-label={`Editing ${layer.name}`} role="group">
  <div className="muse-atelier-field-head">{plane==='custom'?<label className="muse-atelier-layer-title"><span className="sr-only">Layer name</span><input type="text" value={layer.name} maxLength={40} onChange={event=>onChange({name:event.target.value},'name')}/></label>:<strong>{layer.name}</strong>}
   <span className="muse-atelier-row">{canCopy&&<button type="button" className="muse-atelier-link" onClick={onDuplicate}>Duplicate</button>}{onDelete&&<button type="button" className="muse-atelier-link muse-atelier-danger" onClick={onDelete}>Delete</button>}</span></div>
  {plane==='custom'&&<div className="muse-segmented" role="group" aria-label="Gradient type">{(['radial','linear','conic'] as const).map(type=><button key={type} type="button" aria-pressed={layer.type===type} onClick={()=>onChange({type},'type')}>{type[0].toUpperCase()+type.slice(1)}</button>)}</div>}
  {layer.type==='radial'&&<GlowControls layer={layer} plane={plane} onChange={onChange}/>}
  {layer.type!=='radial'&&plane==='custom'&&<small className="muse-atelier-hint">Linear and conic layers can be angled; radial glows are always upright, because CSS cannot rotate them.</small>}
  {layer.type!=='linear'&&<PositionPad points={points} selected={layer.id} onSelect={onSelect} onMove={(id,x,y)=>id===layer.id?onChange({x:{...layer.x,v:x},y:{...layer.y,v:y}},'position'):onMoveSibling(id,x,y)}/>}
  {layer.type!=='linear'&&<>{lenSlider('Across','x',['%','px'])}{lenSlider('Down','y',['%','svh','px'])}</>}
  {layer.type==='radial'&&<>{lenSlider('Width','w',['%','px'])}{lenSlider('Height','h',['%','px','svh'])}</>}
  {layer.type!=='radial'&&<Slider label={layer.type==='conic'?'Rotation':'Angle'} value={layer.angle} min={0} max={360} unit="°" onChange={angle=>onChange({angle},'angle')}/>}
  <Slider label="Layer opacity" value={layer.opacity} min={0} max={100} unit="%" onChange={opacity=>onChange({opacity},'opacity')}/>
  <div className="muse-atelier-stops"><span className="muse-atelier-field-label">Colour stops</span>
   <StopBar stops={layer.stops} selected={stop} onSelect={setStop} resolve={resolve} onMove={(i,p)=>onChange({stops:layer.stops.map((s,j)=>j===i?{...s,p:[p]}:s)},`stop-${i}-move`)}/>
   <StopColorEditor value={current.c} resolve={resolve} tokenOptions={layerColorTokens} onChange={c=>onChange({stops:layer.stops.map((s,j)=>j===stop?{...s,c}:s)},`stop-${stop}-colour`)}/>
   <div className="muse-atelier-row">
    <button type="button" className="muse-atelier-link" disabled={layer.stops.length>=MAX_STOPS} onClick={()=>{const at=current.p[0]??50;const stops=[...layer.stops];stops.splice(stop+1,0,{c:current.c,p:[Math.min(100,at+8)]});onChange({stops},'stop-add');setStop(stop+1);}}>Add stop</button>
    <button type="button" className="muse-atelier-link" disabled={layer.stops.length<=2} onClick={()=>{onChange({stops:layer.stops.filter((_,j)=>j!==stop)},'stop-remove');setStop(Math.max(0,stop-1));}}>Remove stop</button>
   </div>
  </div>
 </div>;
}

/** The glow-shaped controls: shape, how far the light reaches, how soft its edge is, and how it mixes with other glows. */
function GlowControls({layer,plane,onChange}:{layer:LayerSpec;plane:PlaneId|'custom';onChange:(patch:Partial<LayerSpec>,key:string)=>void}){
 const lit=layer.stops.findIndex(stop=>stop.c.k!=='none'),fade=layer.stops.length-1;
 const simple=layer.stops.length===2&&lit===0&&layer.stops[fade].c.k==='none';
 const reach=simple?(layer.stops[fade].p[layer.stops[fade].p.length-1]??100):100,core=simple?(layer.stops[0].p[0]??0):0;
 const softness=simple?Math.round((1-core/Math.max(1,reach))*100):100;
 const setStops=(nextReach:number,nextSoftness:number)=>onChange({stops:[{...layer.stops[0],p:[Math.round(nextReach*(1-nextSoftness/100))]},{...layer.stops[fade],p:[Math.round(nextReach)]}]},'glow-shape');
 return <div className="muse-atelier-glow-controls">
  <div className="muse-segmented" role="group" aria-label="Glow shape"><button type="button" aria-pressed={layer.shape==='circle'} onClick={()=>onChange({shape:'circle'},'shape')}>Circle</button><button type="button" aria-pressed={layer.shape==='ellipse'} onClick={()=>onChange({shape:'ellipse'},'shape')}>Ellipse</button></div>
  {simple?<><Slider label="Reach" value={reach} min={10} max={100} unit="%" onChange={v=>setStops(v,softness)} hint="How far the light travels before it fades out."/><Slider label="Softness" value={softness} min={0} max={100} unit="%" onChange={v=>setStops(reach,v)} hint="0 is a crisp disc; 100 fades from the very centre."/></>
  :<small className="muse-atelier-hint">This layer has several colour stops; shape its falloff with the stops below.</small>}
  {plane==='custom'&&<label className="muse-atelier-select"><span>Blend with other glows</span><select value={layer.blend??'normal'} onChange={event=>onChange({blend:event.target.value as BlendMode},'blend')}>{blendModes.map(mode=><option key={mode} value={mode}>{mode==='normal'?'Normal (layered)':mode==='screen'?'Screen (light adds up)':mode==='lighten'?'Lighten (brightest wins)':'Colour dodge (intense)'}</option>)}</select></label>}
 </div>;
}

function AdvancedTokens({definition,setToken,highlight}:{definition:AtelierDefinition;setToken:(n:string,v:string|null)=>void;highlight:string|null}){
 const [query,setQuery]=useState('');const [onlyChanged,setOnlyChanged]=useState(false);
 const rows=Object.values(tokenInfo).filter(info=>(!onlyChanged||info.name in definition.tokens)&&(`${info.label} ${info.name}`.toLowerCase().includes(query.toLowerCase())));
 return <FieldGroup title="Every theme token" description="The raw values behind the friendly controls. Values are checked before use: colours, gradients, numbers and theme tokens only.">
  <MuseSearch label="Search tokens" value={query} onChange={setQuery} placeholder="Search by name" count={rows.length} noun={['token','tokens']}/>
  <label className="muse-atelier-check"><input type="checkbox" checked={onlyChanged} onChange={event=>setOnlyChanged(event.target.checked)}/>Only what I changed</label>
  <ul className="muse-atelier-advanced">{rows.map(info=><AdvancedRow key={info.name} name={info.name} label={info.label} hint={info.hint} value={tokenValue(definition,info.name)} base={officialTokenValues[definition.base][info.name]} onChange={v=>setToken(info.name,v)} highlight={highlight===info.name}/>)}</ul>
 </FieldGroup>;
}
function AdvancedRow({name,label,hint,value,base,onChange,highlight}:{name:string;label:string;hint?:string;value:string;base:string;onChange:(v:string|null)=>void;highlight:boolean}){
 const [draft,setDraft]=useState<string|null>(null);const invalid=draft!==null&&!isSafeCssValue(draft,referenceableTokens);
 const commit=()=>{if(draft===null)return;if(!invalid)onChange(draft.trim());setDraft(null);};
 return <li id={`token-${name.slice(2)}`} data-changed={value!==base||undefined} data-highlight={highlight||undefined}>
  <div className="muse-atelier-field-head"><span><strong>{label}</strong> <code>{name}</code></span>{value!==base&&<button type="button" className="muse-atelier-link" onClick={()=>onChange(null)}>Reset</button>}</div>
  <input type="text" aria-label={`${label} value`} aria-invalid={invalid||undefined} spellCheck={false} value={draft??value} onChange={event=>setDraft(event.target.value)} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter')commit();if(event.key==='Escape')setDraft(null);}}/>
  {invalid&&<small className="field-error">Use colours, gradients, numbers or theme tokens only.</small>}
  {hint&&<small className="muse-atelier-hint">{hint}</small>}
  {value!==base&&<small className="muse-atelier-hint">Original: <code>{base}</code></small>}
 </li>;
}
export type {ReactNode};
