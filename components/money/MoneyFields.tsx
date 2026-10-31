import type { ReactNode } from "react";
import { MuseColorPicker } from "../MuseColorPicker";
import { type MoneyAccent } from "@/lib/money";
import { MuseChoiceMenu } from "../MuseChoiceMenu";
export function MoneyField({label,children}:{label:string;children:ReactNode}){return <label className="muse-money-field">{label}{children}</label>;}
export function MoneyChoice({label,value,options,onChange}:{label:string;value:string;options:{id:string;label:string}[];onChange:(id:string)=>void}){return <div className="muse-money-field"><span>{label}</span><MuseChoiceMenu label={label} valueLabel={options.find((item)=>item.id===value)?.label??"Choose…"} options={options} selectedIds={[value]} onSelect={onChange}/></div>;}
export function MoneyColor({value,onChange}:{value:MoneyAccent;onChange:(color:MoneyAccent)=>void}){return <MuseColorPicker value={value} onChange={onChange}/>;}
