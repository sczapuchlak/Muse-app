import {dreamSymbol} from '@/lib/whimsy/dreams';
import {DreamEncyclopediaEntry} from '@/components/whimsy/encyclopedia/DreamEncyclopediaEntry';
export default async function Page({params}:{params:Promise<{symbolId:string}>}){const {symbolId}=await params;return <DreamEncyclopediaEntry symbolId={symbolId} reference={dreamSymbol(symbolId)??null}/>;}
