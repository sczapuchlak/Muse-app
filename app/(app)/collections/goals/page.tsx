import {redirect} from 'next/navigation';

/** Goals live in Reading Plan since Nov 26 (one place to plan books and set intentions). Old links land there. */
export default async function Page({searchParams}:{searchParams:Promise<{[key:string]:string|string[]|undefined}>}){
 const view=(await searchParams).view;
 redirect(view==='year'?'/collections/plans?kind=year':'/collections/plans');
}
