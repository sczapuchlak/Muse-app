import Link from 'next/link';
import {MuseStar} from '../MuseStar';
import {shortDate} from '@/lib/display-date';
import type {Revelation} from '@/lib/insights/revelations';
const names={daily:'Daily Edit',nourish:'Wellness',planner:'Planner',rituals:'Rituals',mood:'Mood',money:'Money'};
export function RevelationList({items}:{items:Revelation[]}){
 return <ol className="muse-insight-revelations">{items.map(item=><li key={item.type}><MuseStar size={18} color={item.module==='money'?'pink':item.module==='rituals'?'aqua':'purple'}/><div className="muse-revelation-copy"><h3>{item.title}</h3><p>{item.explanation}</p><details className="muse-insight-basis"><summary>What this is based on</summary><p>{item.basis} · Based on {item.sampleSize} recorded observations or opportunities · {shortDate(item.range.start)}, {item.range.start.slice(0,4)} – {shortDate(item.range.end)}, {item.range.end.slice(0,4)}.</p></details><Link className="muse-button button-ghost muse-insight-action" href={item.href}>Open {names[item.module]} →</Link></div></li>)}</ol>;
}
