import { CosmicSettings } from '@/components/CosmicSettings';
import { MusePageHeader } from '@/components/MusePageHeader';
import '@/components/CosmicForecast.css';
export default function Page(){return <main className="muse-page muse-module-page"><MusePageHeader title="Settings" description="A few things, just the way you like them."/>{process.env.NODE_ENV==='development'&&<p className="small-label" role="note">Development preview · domain records reset on refresh. Browser appearance preferences remain local.</p>}<CosmicSettings/></main>;}
