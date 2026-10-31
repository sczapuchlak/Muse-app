import {MusePageHeader} from '@/components/MusePageHeader';
import {MuseCard} from '@/components/MuseCard';
import {GlassIcon} from '@/components/GlassIcon';
import './Whimsy.css';
const previews=[{id:'horoscopes',title:'Horoscopes',icon:'sparkle',description:'Cosmic forecasts, celestial curiosities, and personal daily discoveries.'},{id:'dreams',title:'Dream Diary',icon:'moon',description:'A place to remember what happened after the lights went out.'},{id:'tarot',title:'Tarot Journal',icon:'notes',description:'Draw a card, find a question, follow a thought.'}] as const;
export default function Page(){return <main className="muse-page"><MusePageHeader title="Whimsy"/><div className="muse-whimsy-previews">{previews.map(item=><MuseCard id={item.id} key={item.id}><GlassIcon name={item.icon} size={22}/><h2 id={`${item.id}-title`}>{item.title}</h2><p className="card-description">{item.description}</p><span className="muse-whimsy-soon">Coming soon</span></MuseCard>)}</div></main>;}
