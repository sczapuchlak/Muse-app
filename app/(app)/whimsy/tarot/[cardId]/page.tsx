import {notFound} from 'next/navigation';
import {grimoireById} from '@/lib/whimsy/grimoire';
import {TarotGrimoireEntry} from '@/components/whimsy/encyclopedia/TarotGrimoireEntry';
export default async function Page({params}:{params:Promise<{cardId:string}>}){const {cardId}=await params,entry=grimoireById(cardId);if(!entry)notFound();return <TarotGrimoireEntry entry={entry}/>;}
