import {redirect} from 'next/navigation';

type SearchParams=Record<string,string|string[]|undefined>;

export default async function MoodPage({searchParams}:{searchParams:Promise<SearchParams>}){
 const params=new URLSearchParams();
 for(const [key,value] of Object.entries(await searchParams)){
  if(Array.isArray(value))value.forEach(item=>params.append(key,item));
  else if(value!==undefined)params.set(key,value);
 }
 params.set('view','mood');
 redirect(`/nourish?${params.toString()}`);
}
