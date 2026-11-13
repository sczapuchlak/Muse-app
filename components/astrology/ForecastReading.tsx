'use client';
import {useEffect,useState,type CSSProperties,type ReactNode} from 'react';
import {MuseMark,type MuseMarkIcon,type MuseTone} from '@/components/design/MuseHeading';
import {MuseStar} from '@/components/MuseStar';
import {zodiacLabel,zodiacSigns,type ZodiacSign} from '@/lib/cosmic-forecast';
import {signInfo} from '@/lib/astrology/library';
import {observatoryForecasts,type ForecastCategory,type ForecastPeriod,type Horoscope,type HoroscopeResult} from '@/lib/astrology/forecast';
import {parseForecastContent,type ForecastEditorialBlock} from '@/lib/astrology/forecast-content';
import {shortDate} from '@/lib/display-date';
import {ForecastReflection} from './ForecastReflection';
import {ZodiacGlyph,signStyle} from './ZodiacGlyph';
import './ForecastReading.css';
import './ForecastSky.css';

const titles:Record<ForecastPeriod,string>={daily:'Today’s cosmic forecast',weekly:'Your week in the stars',monthly:'Your month in the stars'};
function longDate(value:string,options:Intl.DateTimeFormatOptions={month:'long',day:'numeric',year:'numeric'}){return new Intl.DateTimeFormat('en-US',{...options,timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));}
function periodDate(forecast:Horoscope){
 const {start,end}=forecast.range;
 if(forecast.period==='daily')return longDate(start);
 if(forecast.period==='monthly')return longDate(start,{month:'long',year:'numeric'});
 return `${longDate(start,{month:'short',day:'numeric'})} – ${longDate(end,{month:'short',day:'numeric',year:'numeric'})}`;
}
function SourceWords({text}:{text:string}){return <>{text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/gu).map((part,index)=>part.startsWith('**')&&part.endsWith('**')?<strong key={index}>{part.slice(2,-2)}</strong>:part.startsWith('*')&&part.endsWith('*')?<em key={index}>{part.slice(1,-1)}</em>:part)}</>;}
/** Each forecast section gets a gradient tile, chosen by what the section is about. */
function sectionMark(heading:string):{icon:MuseMarkIcon;tone:MuseTone}{
 const h=heading.toLowerCase();
 if(/work|career|goal|money|financ/.test(h))return {icon:'briefcase',tone:4};
 if(/love|relation|romance|friend|partner|heart/.test(h))return {icon:'heart',tone:2};
 if(/energy|mood|health|body|well/.test(h))return {icon:'bolt',tone:3};
 if(/home|family/.test(h))return {icon:'home',tone:5};
 if(/creat|play|fun/.test(h))return {icon:'palette',tone:6};
 if(/spirit|soul|intuition/.test(h))return {icon:'crescent',tone:7};
 return {icon:'sparkle',tone:1};
}
function EditorialBlock({block,index}:{block:ForecastEditorialBlock;index:number}){
 if(block.kind==='dateline')return <p className="muse-forecast-dateline" key={index}>{block.raw}</p>;
 if(block.kind==='paragraph')return <section className="muse-forecast-editorial-intro" key={index}><p><SourceWords text={block.body}/></p></section>;
 const heading=(block.heading??"").replace(/:$/,"");
 const featured=index===1||/^Overview:$/iu.test(block.heading??'');
 if(featured)return <section className="muse-forecast-editorial-section muse-forecast-overview" data-featured="true" key={index}>
  <p className="muse-kicker">{heading||'Overview'}</p><blockquote><SourceWords text={block.body}/></blockquote></section>;
 const mark=sectionMark(heading);
 return <section className="muse-forecast-editorial-section muse-forecast-facet" data-featured="false" style={{'--mark-a':`var(--chart-${mark.tone})`} as CSSProperties} key={index}>
  <h4><MuseMark icon={mark.icon} tone={mark.tone} size="sm"/><b>{heading}</b></h4>
  <p><SourceWords text={block.body}/></p>
 </section>;
}
/** The sign's medallion: the whole zodiac on a ring, the reader's own sign glowing at the centre. */
function SignWheel({sign}:{sign:ZodiacSign}){
 const here=zodiacSigns.indexOf(sign);
 return <span className="muse-forecast-wheel" style={signStyle(sign)} aria-hidden="true">
  <svg viewBox="0 0 120 120" className="muse-forecast-wheel-ring">
   <circle cx="60" cy="60" r="56" className="muse-forecast-wheel-outer"/><circle cx="60" cy="60" r="41" className="muse-forecast-wheel-inner"/>
   {zodiacSigns.map((z,i)=>{const a=(i-here)*30-90,rad=a*Math.PI/180,x=60+48.5*Math.cos(rad),y=60+48.5*Math.sin(rad),tx=60+56*Math.cos(rad+Math.PI/12),ty=60+56*Math.sin(rad+Math.PI/12),ix=60+41*Math.cos(rad+Math.PI/12),iy=60+41*Math.sin(rad+Math.PI/12);
    return <g key={z} data-here={z===sign||undefined}><line x1={ix.toFixed(1)} y1={iy.toFixed(1)} x2={tx.toFixed(1)} y2={ty.toFixed(1)} className="muse-forecast-wheel-tick"/><text x={x.toFixed(1)} y={(y+2.6).toFixed(1)} textAnchor="middle" className="muse-forecast-wheel-glyph">{signInfo[z].glyph}</text></g>;})}
  </svg>
  <span className="muse-forecast-wheel-core"><ZodiacGlyph sign={sign} size={40}/></span>
 </span>;
}
function Attribution({forecast,dailyWidget=false}:{forecast:Horoscope;dailyWidget?:boolean}){return <p className="muse-forecast-attribution">Forecast by <a href={forecast.sourceUrl} target="_blank" rel="noopener noreferrer">CosmyDay ↗</a>{!dailyWidget&&<> · {periodDate(forecast)}</>}</p>;}
function FullReading({forecast,dailyWidget=false,showAttribution=true}:{forecast:Horoscope;dailyWidget?:boolean;showAttribution?:boolean}){
 const blocks=forecast.sections??parseForecastContent(forecast.text);
 const dateline=blocks.filter(block=>block.kind==='dateline'),body=blocks.filter(block=>block.kind!=='dateline');
 return <article className="muse-forecast-editorial" style={signStyle(forecast.sign)} aria-label={`${zodiacLabel(forecast.sign)} ${forecast.period} horoscope`}>
  <header className="muse-forecast-editorial-header muse-forecast-sky" style={signStyle(forecast.sign)}><SignWheel sign={forecast.sign}/><div className="muse-forecast-sky-copy"><p className="muse-forecast-sign-name">{zodiacLabel(forecast.sign)} · {signInfo[forecast.sign].symbol}</p><h3>{titles[forecast.period]}</h3><p className="muse-forecast-period-date"><time dateTime={forecast.range.start}>{periodDate(forecast)}</time></p><ul className="muse-forecast-sign-facts"><li>{signInfo[forecast.sign].element}</li><li>{signInfo[forecast.sign].modality}</li><li>Ruled by {signInfo[forecast.sign].traditional}</li></ul></div><span className="muse-forecast-sky-stars" aria-hidden="true"><i/><i/><i/><i/><i/><i/></span></header>
  {dateline.map((block,index)=><EditorialBlock block={block} index={index} key={index}/>)}
  <div className="muse-forecast-editorial-grid" style={{'--facets':Math.max(1,Math.min(4,body.filter((b,i)=>b.kind!=='paragraph'&&!(i+dateline.length===1||/^Overview:$/iu.test(b.heading??''))).length))} as CSSProperties}>{body.map((block,index)=><EditorialBlock block={block} index={index+dateline.length} key={index}/>)}</div>
  {!!forecast.keyDates?.length&&<section className="muse-forecast-key-dates"><h4><span aria-hidden="true">✧</span> Key dates</h4><div>{forecast.keyDates.map((item,index)=><div key={`${item.date}/${index}`}><time dateTime={item.date}>{longDate(item.date,{month:'short',day:'numeric'})}</time><div><strong>{item.title}</strong><p><SourceWords text={item.description}/></p></div></div>)}</div></section>}
  {forecast.closing&&<div className="muse-forecast-closing"><MuseStar size={16} prismatic/><p><SourceWords text={forecast.closing}/></p></div>}
  {showAttribution&&<Attribution forecast={forecast} dailyWidget={dailyWidget}/>}
 </article>;
}
/** Observatory detail shows the complete reading; Daily Edit starts with a compact source excerpt. */
/** `reflect` adds the private "worth keeping?" composer beneath a reading that is actually showing. */
export function ForecastReading({sign,date,timeZone,category='overview',period='daily',full=false,dailyWidget=false,reflect=false,service=observatoryForecasts,actions,footerStart}:{sign:ZodiacSign;date:string;timeZone:string;category?:ForecastCategory;period?:ForecastPeriod;full?:boolean;dailyWidget?:boolean;reflect?:boolean;service?:typeof observatoryForecasts;actions?:ReactNode;footerStart?:ReactNode}){
 const [response,setResponse]=useState<{key:string;result:HoroscopeResult}|null>(null),[expanded,setExpanded]=useState(false),[attempt,setAttempt]=useState(0),key=JSON.stringify([sign,date,timeZone,category,period,attempt]);
 useEffect(()=>{let active=true;service.request({sign,date,timeZone,category,period,language:'en'}).then(value=>{if(active)setResponse({key,result:value});});return()=>{active=false;};},[sign,date,timeZone,category,period,attempt,key,service]);
 const result=response?.key===key?response.result:null,showFull=full||expanded;
 return <div className="muse-forecast-reading" data-full={showFull}>
  {!result?<div className="muse-forecast-state" role="status"><MuseStar size={17} prismatic/><p>Looking to the sky for your current reading…</p></div>:result.status==='ready'?showFull?<FullReading forecast={result.forecast} dailyWidget={dailyWidget} showAttribution={!footerStart}/>:<div className="muse-forecast-compact-reading">{!dailyWidget&&<p className="muse-forecast-compact-sign"><span aria-hidden="true">{signInfo[sign].glyph}</span>{zodiacLabel(sign)} · <time dateTime={date}>{shortDate(date)}</time></p>}<p className="muse-forecast-compact-excerpt"><SourceWords text={result.forecast.preview}/></p>{!footerStart&&<Attribution forecast={result.forecast} dailyWidget={dailyWidget}/>}</div>:<div className="muse-forecast-state" role={result.status==='error'?'alert':'status'}><MuseStar size={17} prismatic/><p>{result.message}</p></div>}
  <div className="muse-cosmic-forecast-actions">{result?.status==='ready'&&!full&&<button className="muse-button button-ghost" type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Show preview':'Read full forecast'}</button>}{result?.status==='error'&&<button className="muse-button button-ghost" type="button" onClick={()=>setAttempt(value=>value+1)}>Try again</button>}{actions}</div>
  {reflect&&result?.status==='ready'&&<ForecastReflection sign={sign} period={period} date={date} timeZone={timeZone} today={date} compact={dailyWidget}/>}
  {footerStart&&<div className="muse-forecast-footer">{footerStart}{result?.status==='ready'&&<Attribution forecast={result.forecast} dailyWidget={dailyWidget}/>}</div>}
 </div>;
}
