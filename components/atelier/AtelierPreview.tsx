"use client";
/**
 * The Theme Atelier stage: a self-contained Muse page rendered in an iframe so it has its own <html> (own theme,
 * material and remix) and real responsive breakpoints. It shows real shared components with sample content; no
 * personal data is read and nothing is written. The studio sends the remix by postMessage (same origin only).
 */
import {useEffect,useLayoutEffect,useState,type CSSProperties} from 'react';
import {desktopGroups,navigation,navItems,mobilePrimaryIds} from '@/lib/navigation';
import {tarotCards} from '@/lib/whimsy/tarot';
import type {AtelierDefinition} from '@/lib/atelier/model';
import {contrastRatio,composite,type ContrastCheck} from '@/lib/atelier/contrast';
import type {Rgba} from '@/lib/atelier/css-values';
import {useAtelierStyle} from './AppearanceBridge';
import {GlowHandles,type HandleLayer} from './GlowHandles';
import {MuseAtmosphere} from '../MuseAtmosphere';
import {MuseIcon} from '../MuseIcon';
import {MuseStar} from '../MuseStar';
import {MusePageHeader} from '../MusePageHeader';
import {MuseCard} from '../MuseCard';
import {CardHeading} from '../CardHeading';
import {MuseProgressRing} from '../MuseProgressRing';
import {AchievementBadge} from '../AchievementStar';
import {MuseSearch} from '../design/MuseSearch';
import {MuseSegmented} from '../design/MuseSegmented';
import {MuseEmptyState} from '../design/MuseEmptyState';
import {MuseSectionIntro} from '../design/MuseSectionIntro';
import {TarotCardArt} from '../whimsy/TarotCardArt';
import {BookCover} from '../whimsy/Bookshelf';
import {ActivityBars} from '../whimsy/atlas/parts';
import {DreamTypeBadge} from '../whimsy/dreams/parts';
import '../AppShell.css';
import '../planner/Planner.css';
import '../rituals/Rituals.css';
import '../insights/Insights.css';
import '../whimsy/WhimsyFoundation.css';
import '../whimsy/Dreamscapes.css';
import '../whimsy/TarotExperience.css';
import '../whimsy/Bookshelf.css';
import './AtelierPreview.css';

export type PreviewMessage={type:'muse-atelier-state';definition:AtelierDefinition;material:'crystal'|'frosted';handles?:{layers:HandleLayer[];selected:string|null}|null};
const tarot=tarotCards.find(card=>card.id==='major-17')??tarotCards[0];

function parseComputed(value:string):Rgba|null{
 const rgb=value.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);if(rgb)return {r:+rgb[1],g:+rgb[2],b:+rgb[3],a:rgb[4]===undefined?1:+rgb[4]};
 const srgb=value.match(/color\(srgb\s+([-\d.e]+)\s+([-\d.e]+)\s+([-\d.e]+)(?:\s*\/\s*([\d.e]+))?\)/);if(srgb)return {r:+srgb[1]*255,g:+srgb[2]*255,b:+srgb[3]*255,a:srgb[4]===undefined?1:+srgb[4]};
 return null;
}
/** Measures the theme as rendered: tokens resolved by the browser, translucent layers composited. */
function measure():ContrastCheck[]{
 const probe=document.createElement('span');probe.style.position='absolute';probe.style.visibility='hidden';document.body.appendChild(probe);
 const color=(expr:string)=>{probe.style.color='';probe.style.color=expr;return parseComputed(getComputedStyle(probe).color)??{r:0,g:0,b:0,a:1};};
 const gradient=(expr:string)=>{probe.style.backgroundImage='';probe.style.backgroundImage=expr;const text=getComputedStyle(probe).backgroundImage;const found=[...text.matchAll(/rgba?\([^)]*\)|color\(srgb[^)]*\)/g)].map(m=>parseComputed(m[0])).filter((c):c is Rgba=>!!c);return found.length?found:[color(expr)];};
 const bg={...color('var(--background)'),a:1},glass=composite(color('var(--glass-background)'),bg),floating=composite(color('var(--floating-background)'),bg);
 const over=(fg:Rgba,back:Rgba)=>contrastRatio(composite(fg,back),back);
 const worst=(fg:Rgba,backs:Rgba[],under:Rgba)=>Math.min(...backs.map(back=>over(fg,composite(back,under))));
 const checks:ContrastCheck[]=[
  {id:'text-bg',label:'Text on the page background',ratio:over(color('var(--foreground)'),bg),minimum:4.5,token:'--foreground',kind:'text'},
  {id:'muted-bg',label:'Muted text on the page background',ratio:over(color('var(--text-muted)'),bg),minimum:4.5,token:'--text-muted',kind:'text'},
  {id:'text-glass',label:'Text on card glass',ratio:over(color('var(--foreground)'),glass),minimum:4.5,token:'--glass-background',kind:'text'},
  {id:'muted-glass',label:'Muted text on card glass',ratio:over(color('var(--text-muted)'),glass),minimum:4.5,token:'--text-muted',kind:'text'},
  {id:'kicker-glass',label:'Small kickers (secondary accent) on glass',ratio:over(color('var(--accent-secondary)'),glass),minimum:4.5,token:'--accent-secondary',kind:'text'},
  {id:'link-glass',label:'Links on card glass',ratio:over(color('var(--link-ink)'),glass),minimum:4.5,token:'--link-ink',kind:'text'},
  {id:'button',label:'Primary button label',ratio:over(color('var(--on-accent)'),composite(color('var(--action-fill)'),glass)),minimum:4.5,token:'--on-accent',kind:'text'},
  {id:'selected',label:'Selected text on its highlight',ratio:worst(color('var(--selected-text)'),gradient('var(--selected-background)'),glass),minimum:4.5,token:'--selected-text',kind:'text'},
  {id:'filter',label:'Selected filter text',ratio:worst(color('var(--filter-selected-text)'),gradient('var(--filter-selected-background)'),glass),minimum:4.5,token:'--filter-selected-text',kind:'text'},
  {id:'nav',label:'Navigation text',ratio:over(color('var(--navigation-text)'),bg),minimum:4.5,token:'--navigation-text',kind:'text'},
  {id:'popover',label:'Text in menus and popovers',ratio:over(color('var(--foreground)'),floating),minimum:4.5,token:'--floating-background',kind:'text'},
  {id:'focus',label:'Focus ring against the background',ratio:over(color('var(--focus-ring)'),bg),minimum:3,token:'--focus-ring',kind:'graphic'},
  {id:'icons',label:'Icon gradient against the background',ratio:Math.min(...['start','middle','end'].map(stop=>over(color(`var(--icon-gradient-${stop})`),bg))),minimum:3,token:'--icon-gradient-start',kind:'graphic'},
 ];
 probe.remove();return checks;
}

export function AtelierPreview(){
 const [state,setState]=useState<PreviewMessage|null>(null);
 useAtelierStyle('preview',state?.definition??null);
 useLayoutEffect(()=>{if(!state)return;const root=document.documentElement;root.setAttribute('data-theme',state.definition.base);root.setAttribute('data-material',state.material);root.setAttribute('data-magic','magical');},[state]);
 useEffect(()=>{
  const receive=(event:MessageEvent)=>{if(event.origin!==window.location.origin||event.source!==window.parent)return;const data=event.data as PreviewMessage;if(data?.type==='muse-atelier-state'&&data.definition)setState(data);
   // Show what is being edited. window.scrollTo moves only this frame, never the studio around it.
   const focus=(event.data as {type?:string;target?:string});if(focus?.type==='muse-atelier-focus'&&typeof focus.target==='string'){const target=focus.target==='top'?null:document.getElementById(focus.target);window.scrollTo({top:target?target.getBoundingClientRect().top+window.scrollY-24:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}};
  const block=(event:MouseEvent)=>{const target=event.target as Element|null;if(target?.closest('a,form button[type=submit]'))event.preventDefault();};
  window.addEventListener('message',receive);document.addEventListener('click',block,true);
  window.parent.postMessage({type:'muse-atelier-ready'},window.location.origin);
  // Where the person is looking, so + Add Glow lands in view.
  let frame=0;const report=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const atmosphere=document.querySelector('.muse-atmosphere')?.getBoundingClientRect();window.parent.postMessage({type:'muse-atelier-viewport',centerY:window.scrollY+window.innerHeight/2-((atmosphere?.top??0)+window.scrollY)},window.location.origin);});};
  report();window.addEventListener('scroll',report,{passive:true});window.addEventListener('resize',report);
  return()=>{window.removeEventListener('message',receive);document.removeEventListener('click',block,true);window.removeEventListener('scroll',report);window.removeEventListener('resize',report);cancelAnimationFrame(frame);};
 },[]);
 useEffect(()=>{if(!state)return;let frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>window.parent.postMessage({type:'muse-atelier-contrast',checks:measure()},window.location.origin));});return()=>cancelAnimationFrame(frame);},[state]);
 const [view,setView]=useState('week');const [chip,setChip]=useState('lucid');const [search,setSearch]=useState('moon');
 const post=(message:object)=>window.parent.postMessage(message,window.location.origin);
 return <div className="muse-app-shell muse-atelier-stage" data-rail="expanded" data-ready={!!state||undefined}>
  <MuseAtmosphere/>
  {state?.handles&&state.handles.layers.length>0&&<GlowHandles layers={state.handles.layers} selected={state.handles.selected} onPatch={patch=>post({type:'muse-atelier-layer-patch',...patch})} onSelect={(plane,id)=>post({type:'muse-atelier-select',plane,id})}/>}
  <aside className="muse-rail" aria-label="Muse app navigation (preview)">
   <div className="muse-rail-header"><a className="muse-shell-brand" href="#top"><span>muse</span><MuseStar size={28}/></a></div>
   <div className="muse-sidebar-atmosphere" aria-hidden="true"><MuseStar size={12} color="aqua"/><MuseStar size={17} color="pink"/></div>
   <nav className="muse-rail-navigation" aria-label="Main navigation (preview)">{desktopGroups.map(group=><div className="muse-nav-group" key={group}><p className="muse-nav-group-label">{group}{group==='Whimsy'&&<MuseStar size={11} className="muse-nav-group-star"/>}</p>
    {navigation.filter(item=>item.group===group).map(item=><a key={item.id} href={item.href} className="muse-nav-link muse-edge" aria-current={item.id==='daily'?'page':undefined}><MuseIcon name={item.icon} size={20} treatment="prismatic"/><span className="muse-nav-label">{item.label}</span>{item.id==='daily'&&<MuseStar size={17} className="muse-nav-active-star"/>}</a>)}</div>)}</nav>
   <div className="muse-rail-footer"><div className="muse-theme-root" data-variant="nav"><button type="button" className="muse-theme-trigger muse-edge"><MuseIcon name="themes" size={20} treatment="prismatic"/><span className="muse-theme-active-name">Themes</span></button></div></div>
  </aside>
  <div className="muse-app-main"><div className="muse-app-content" id="top">
   <MusePageHeader title="Daily Edit" description="A gentle plan for a bright day."/>
   <section id="atelier-icons" className="muse-panel muse-atelier-icon-strip" aria-label="Prismatic icons">{(['home','calendar','rituals','heart-pulse','insights','money','notes','tarot','dreams','bookshelf','sparkle','wand'] as const).map((name,i)=><span key={name} data-active={i===0||undefined}><MuseIcon name={name} size={34} treatment="prismatic" tone={(['primary','secondary','tertiary'] as const)[i%3]}/></span>)}</section>
   <div className="muse-atelier-stage-grid">
    <MuseCard id="atelier-priorities" className="muse-atelier-stage-card"><CardHeading id="atelier-priorities" title="Today's priorities" icon="home"/>
     <ul className="muse-planner-task-list">{[['Finish the newsletter intro',false],['Water the monstera',true],['Call Mom back',false]].map(([title,done],i)=><li key={i} className="muse-planner-task" data-complete={done as boolean} data-accent={['primary','secondary','pop'][i]}><div className="muse-task-title-row"><label className="muse-task-completion"><input className="check-input" type="checkbox" defaultChecked={done as boolean} aria-label={`Complete task: ${title}`}/><span className="priority-check" aria-hidden="true">{done&&<MuseIcon name="check" size={13}/>}</span></label><button className="muse-task-title muse-edge" type="button">{title as string}</button></div></li>)}</ul>
    </MuseCard>
    <MuseCard id="atelier-rituals" className="muse-atelier-stage-card"><CardHeading id="atelier-rituals" title="Little rituals" icon="rituals"/>
     <ul className="muse-atelier-rituals">{[['Morning pages',3,3],['Stretch',1,2],['Read 20 pages',12,20]].map(([name,value,goal])=><li key={name as string}><MuseProgressRing value={value as number} goal={goal as number}><span>{value as number}</span></MuseProgressRing><span><strong>{name as string}</strong><small>{value as number} of {goal as number}</small></span>{value===goal?<AchievementBadge achieved label={`${name} complete`} size={22}/>:<button type="button" className="choice-button">Log</button>}</li>)}</ul>
     <div className="muse-atelier-progress" role="img" aria-label="Water: 6 of 8 glasses"><span style={{width:'75%'}}/></div>
    </MuseCard>
   </div>

   <MuseSectionIntro kicker="Dreamscapes" title="The night library" id="atelier-dreams">Editorial panels, quotes and filters, exactly as the Whimsy modules use them.</MuseSectionIntro>
   <div className="muse-atelier-stage-grid">
    <article className="muse-hero muse-atelier-dream"><p className="muse-kicker">Last night</p><h3 className="type-display">A library beneath a violet sky</h3><p className="type-quote">“Shelves without ceilings, and a librarian who only spoke in questions.”</p><div className="muse-chip-row">{['lucid','vivid','recurring'].map(type=><button key={type} type="button" aria-pressed={chip===type} onClick={()=>setChip(type)}><DreamTypeBadge type={type==='lucid'?'Lucid':type==='vivid'?'Vivid':'Recurring'} compact/></button>)}</div></article>
    <article className="muse-panel muse-atelier-tarot"><TarotCardArt card={tarot} small/><div><p className="muse-kicker">Today&apos;s card</p><h3 className="type-title">{tarot.name}</h3><p>Hope returns quietly. Pour some of what you have back into the well.</p><span className="muse-tone-pill">Upright</span></div></article>
   </div>

   <MuseSectionIntro kicker="Bookshelf" title="Currently reading" id="atelier-books">Covers, titles and progress.</MuseSectionIntro>
   <div className="muse-atelier-books">{[['A Wizard of Earthsea',62],['The Night Circus',100],['Piranesi',18]].map(([title,progress])=><div key={title as string} className="muse-atelier-book"><BookCover book={{title:title as string,coverUrl:undefined}}/><strong className="type-title">{title as string}</strong><div className="muse-atelier-progress"><span style={{width:`${progress}%`}}/></div></div>)}</div>

   <MuseSectionIntro kicker="Controls" title="Buttons, inputs and choices" id="atelier-controls" tone="practical">Every interactive state, in your colours.</MuseSectionIntro>
   <div className="muse-panel muse-atelier-gallery-controls">
    <div className="muse-atelier-row"><button type="button" className="muse-button button-primary muse-edge"><MuseIcon name="plus" size={16}/>Add a task</button><button type="button" className="muse-button muse-edge">Secondary</button><button type="button" className="choice-button" aria-pressed="true">Selected</button><button type="button" className="choice-button" aria-pressed="false">Unselected</button><span className="muse-atelier-focus-sample">Focus ring</span></div>
    <MuseSegmented label="Planner view" value={view} onChange={setView} options={[{id:'day',label:'Day'},{id:'week',label:'Week'},{id:'month',label:'Month'}]}/>
    <div className="muse-chip-row">{['All','Work','Home','Creative'].map((label,i)=><button key={label} type="button" aria-pressed={i===1}>{label}</button>)}</div>
    <MuseSearch label="Search dreams" value={search} onChange={setSearch} placeholder="Search symbols" count={3} noun={['symbol','symbols']}/>
    <div className="muse-atelier-row"><label className="muse-field-label"><span className="small-label">Intention</span><input type="text" defaultValue="Be gentle with myself"/></label><label className="muse-field-label"><span className="small-label">Energy</span><select defaultValue="bright"><option value="bright">Bright</option><option value="calm">Calm</option></select></label></div>
   </div>

   <MuseSectionIntro kicker="Insights" title="Statistics and charts" id="atelier-insights" tone="practical">Numbers in Plus Jakarta Sans with your chart colours.</MuseSectionIntro>
   <div className="muse-atelier-stage-grid">
    <div className="muse-panel"><dl className="muse-stat-grid">{[['Rituals kept','86%'],['Pages read','412'],['Dreams logged','18'],['Focus hours','23.5']].map(([label,value])=><div key={label} className="muse-stat"><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>
    <div className="muse-panel"><ActivityBars title="This week" note="Pages read each day" items={['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day,i)=>({key:day,label:day,short:day[0],value:[12,30,8,44,20,52,26][i],text:`${[12,30,8,44,20,52,26][i]} pages`}))}/>
     <div className="muse-atelier-chart" aria-hidden="true">{[1,2,3,4,5,6,7,8].map(i=><span key={i} style={{'--h':`${30+((i*37)%60)}%`,'--c':`var(--chart-${i})`} as CSSProperties}/>)}</div></div>
   </div>

   <MuseSectionIntro kicker="Layers" title="Menus, dialogs and empty states" id="atelier-layers" tone="practical">Floating glass and quiet moments.</MuseSectionIntro>
   <div className="muse-atelier-stage-grid">
    <div className="muse-popover-panel muse-atelier-static-popover" role="menu" aria-label="Sample menu"><p className="muse-popover-title">Sort tasks</p>{['By priority','By due date','Recently added'].map((label,i)=><button key={label} type="button" role="menuitemradio" aria-checked={i===0} className="muse-theme-option muse-edge"><span>{label}</span>{i===0&&<MuseIcon name="check" size={16}/>}</button>)}</div>
    <div className="muse-atelier-static-modal muse-modal" role="dialog" aria-label="Sample dialog"><h3 className="type-heading">Save this reading?</h3><p>Your spread and notes will be kept in your Reading Journal.</p><div className="muse-atelier-row"><button type="button" className="muse-button button-primary muse-edge">Save reading</button><button type="button" className="muse-button muse-edge">Not now</button></div></div>
    <MuseEmptyState title="Your shelves are ready for a first story" glyph={<MuseStar size={22} prismatic/>} headingLevel={3}>Add a book and it will appear here, cover and all.</MuseEmptyState>
    <MuseEmptyState variant="quiet" title="No notes in this space yet" headingLevel={3}>Capture a thought and it will land here.</MuseEmptyState>
   </div>

   <MuseSectionIntro kicker="Typography" title="Fraunces Soft and Plus Jakarta Sans" id="atelier-type">The type never changes between themes; only its colour does.</MuseSectionIntro>
   <div className="muse-panel muse-atelier-type"><p className="type-display">The stars kept the light on for me</p><p className="type-quote">“Hope returns quietly.”</p><p className="type-title">A Wizard of Earthsea</p><p className="type-heading">Weekly planning</p><p className="type-body">Body copy stays clear and readable on every surface, so long reflections are comfortable.</p><p className="type-meta muse-atelier-muted">Updated 2 minutes ago · 3 tags</p><p className="type-numeric">1,284 · 86% · 23.5 h</p><p><a href="#top">A link in your link colour</a></p></div>
  </div></div>
  <nav className="muse-bottom-navigation" aria-label="Mobile navigation (preview)">{navItems(mobilePrimaryIds).map(item=><a key={item.id} href={item.href} className="muse-bottom-link muse-edge" aria-current={item.id==='daily'?'page':undefined}><MuseIcon name={item.icon} size={21} treatment="prismatic"/><span>{item.id==='daily'?'Today':item.label}</span>{item.id==='daily'&&<MuseStar size={12} className="muse-bottom-glint"/>}</a>)}<button type="button" className="muse-bottom-link muse-edge"><MuseIcon name="more" size={21}/><span>More</span></button></nav>
 </div>;
}
