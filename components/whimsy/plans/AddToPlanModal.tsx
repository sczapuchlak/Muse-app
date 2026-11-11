'use client';
import {useState} from 'react';
import type {Book} from '@/lib/whimsy/models';
import {periodLabel,periodOf,plansForBook,type PlanEntry} from '@/lib/books/reading-plans';
import {PlacePicker} from './PlacePicker';
import {useReadingPlans} from '@/lib/books/use-reading-plans';

/** Book Detail / Library: put a book (or several) in a monthly or yearly plan, and see which plans it is already in. */
export function AddToPlanModal({books,today,onClose}:{books:Pick<Book,'id'|'title'>[];today:string;onClose:()=>void}){
 const plans=useReadingPlans(),[done,setDone]=useState('');
 const single=books.length===1?books[0]:null,mine:PlanEntry[]=single?plansForBook(plans.entries,single.id):[];
 const taken=new Set(mine.map(e=>`${e.kind}:${e.period}`));
 const footer=plans.error?<span role="alert">{plans.error}</span>:done||(mine.length?`In ${mine.length} ${mine.length===1?'plan':'plans'}: ${mine.map(e=>periodLabel(e.kind,e.period)).join(', ')}`:null);
 return <PlacePicker title={single?`Plan “${single.title.length>34?single.title.slice(0,33)+'…':single.title}”`:`Plan ${books.length} books`} kind="month" start={periodOf('month',today)} today={today} taken={taken} takenLabel="Already planned here" footer={footer} onPick={(kind,period)=>{void plans.add(kind,period,books.map(b=>b.id)).then(()=>setDone(`Added to ${periodLabel(kind,period)}.`));}} onClose={onClose}/>;
}
