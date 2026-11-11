'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {MuseStar} from '@/components/MuseStar';
import {zodiacLabel,type ZodiacSign} from '@/lib/cosmic-forecast';
import {signInfo} from '@/lib/astrology/library';
import {observatoryForecasts,type ForecastCategory,type ForecastPeriod,type Horoscope,type HoroscopeResult} from '@/lib/astrology/forecast';
import {parseForecastContent,type ForecastEditorialBlock} from '@/lib/astrology/forecast-content';
import {shortDate} from '@/lib/display-date';
import './ForecastReading.css';

const titles:Record<ForecastPeriod,string>={daily:'Today’s cosmic forecast',weekly:'Your week in the stars',monthly:'Your month in the stars'};
function longDate(value:string,options:Intl.DateTimeFormatOptions={month:'long',day:'numeric',year:'numeric'}){return new Intl.DateTimeFormat('en-US',{...options,timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));}
function periodDate(forecast:Horoscope){
 const {start,end}=forecast.range;
 if(forecast.period==='daily')return longDate(start);
 if(forecast.period==='monthly')return longDate(start,{month:'long',year:'numeric'});
 return `${longDate(start,{month:'short',day:'numeric'})} – ${longDate(end,{month:'short',day:'numeric',year:'numeric'})}`;
}
function SourceWords({text}:{text:string}){return <>{text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/gu).map((part,index)=>part.startsWith('**')&&part.endsWith('**')?<strong key={index}>{part.slice(2,-2)}</strong>:part.startsWith('*')&&part.endsWith('*')?<em key={index}>{part.slice(1,-1)}</em>:part)}</>;}
function EditorialBlock({block,index}:{block:ForecastEditorialBlock;index:number}){
 if(block.kind==='dateline')return <p className="muse-forecast-dateline" key={index}>{block.raw}</p>;
 if(block.kind==='paragraph')return <section className="muse-forecast-editorial-intro" key={index}><p><SourceWords text={block.body}/></p></section>;
 const featured=index===1||/^Overview:$/iu.test(block.heading??'');
 return <section className="muse-forecast-editorial-section" data-featured={featured} key={index}>
  <h4><span aria-hidden="true">{block.icon}</span>{block.heading}</h4>
  <p><SourceWords text={block.body}/></p>
 </section>;
}
function Attribution({forecast,dailyWidget=false}:{forecast:Horoscope;dailyWidget?:boolean}){return <p className="muse-forecast-attribution">Forecast by <a href={forecast.sourceUrl} target="_blank" rel="noopener noreferrer">CosmyDay ↗</a>{!dailyWidget&&<> · {periodDate(forecast)}</>}</p>;}
function FullReading({forecast,dailyWidget=false,showAttribution=true}:{forecast:Horoscope;dailyWidget?:boolean;showAttribution?:boolean}){
 const blocks=forecast.sections??parseForecastContent(forecast.text);
 const dateline=blocks.filter(block=>block.kind==='dateline'),body=blocks.filter(block=>block.kind!=='dateline');
 return <article className="muse-forecast-editorial" aria-label={`${zodiacLabel(forecast.sign)} ${forecast.period} horoscope`}>
  <header className="muse-forecast-editorial-header"><span className="muse-forecast-sign-glyph" aria-hidden="true">{signInfo[forecast.sign].glyph}</span><div><p className="muse-forecast-sign-name">{zodiacLabel(forecast.sign)}</p><h3>{titles[forecast.period]}</h3><p className="muse-forecast-period-date"><time dateTime={forecast.range.start}>{periodDate(forecast)}</time></p></div><MuseStar size={19} prismatic/></header>
  {dateline.map((block,index)=><EditorialBlock block={block} index={index} key={index}/>)}
  <div className="muse-forecast-editorial-grid">{body.map((block,index)=><EditorialBlock block={block} index={index+dateline.length} key={index}/>)}</div>
  {!!forecast.keyDates?.length&&<section className="muse-forecast-key-dates"><h4><span aria-hidden="true">✧</span> Key dates</h4><div>{forecast.keyDates.map((item,index)=><div key={`${item.date}/${index}`}><time dateTime={item.date}>{longDate(item.date,{month:'short',day:'numeric'})}</time><div><strong>{item.title}</strong><p><SourceWords text={item.description}/></p></div></div>)}</div></section>}
  {forecast.closing&&<div className="muse-forecast-closing"><MuseStar size={16} prismatic/><p><SourceWords text={forecast.closing}/></p></div>}
  {showAttribution&&<Attribution forecast={forecast} dailyWidget={dailyWidget}/>}
 </article>;
}
/** Observatory detail shows the complete reading; Daily Edit starts with a compact source excerpt. */
export function ForecastReading({sign,date,timeZone,category='overview',period='daily',full=false,dailyWidget=false,service=observatoryForecasts,actions,footerStart}:{sign:ZodiacSign;date:string;timeZone:string;category?:ForecastCategory;period?:ForecastPeriod;full?:boolean;dailyWidget?:boolean;service?:typeof observatoryForecasts;actions?:ReactNode;footerStart?:ReactNode}){
 const [response,setResponse]=useState<{key:string;result:HoroscopeResult}|null>(null),[expanded,setExpanded]=useState(false),[attempt,setAttempt]=useState(0),key=JSON.stringify([sign,date,timeZone,category,period,attempt]);
 useEffect(()=>{let active=true;service.request({sign,date,timeZone,category,period,language:'en'}).then(value=>{if(active)setResponse({key,result:value});});return()=>{active=false;};},[sign,date,timeZone,category,period,attempt,key,service]);
 const result=response?.key===key?response.result:null,showFull=full||expanded;
 return <div className="muse-forecast-reading" data-full={showFull}>
  {!result?<div className="muse-forecast-state" role="status"><MuseStar size={17} prismatic/><p>Looking to the sky for your current reading…</p></div>:result.status==='ready'?showFull?<FullReading forecast={result.forecast} dailyWidget={dailyWidget} showAttribution={!footerStart}/>:<div className="muse-forecast-compact-reading">{!dailyWidget&&<p className="muse-forecast-compact-sign"><span aria-hidden="true">{signInfo[sign].glyph}</span>{zodiacLabel(sign)} · <time dateTime={date}>{shortDate(date)}</time></p>}<p className="muse-forecast-compact-excerpt"><SourceWords text={result.forecast.preview}/></p>{!footerStart&&<Attribution forecast={result.forecast} dailyWidget={dailyWidget}/>}</div>:<div className="muse-forecast-state" role={result.status==='error'?'alert':'status'}><MuseStar size={17} prismatic/><p>{result.message}</p></div>}
  <div className="muse-cosmic-forecast-actions">{result?.status==='ready'&&!full&&<button className="muse-button button-ghost" type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'Show preview':'Read full forecast'}</button>}{result?.status==='error'&&<button className="muse-button button-ghost" type="button" onClick={()=>setAttempt(value=>value+1)}>Try again</button>}{actions}</div>
  {footerStart&&<div className="muse-forecast-footer">{footerStart}{result?.status==='ready'&&<Attribution forecast={result.forecast} dailyWidget={dailyWidget}/>}</div>}
 </div>;
}
