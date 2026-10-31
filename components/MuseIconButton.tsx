import type {ButtonHTMLAttributes} from 'react';
import {MuseIcon,type MuseIconName} from './MuseIcon';
import './MuseControls.css';
export function MuseIconButton({icon,label,variant='quiet',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{icon:MuseIconName;label:string;variant?:'quiet'|'glass'}){return <button {...props} type={props.type??'button'} className={`muse-icon-button ${variant==='glass'?'muse-icon-button-glass':''} ${props.className??''}`} aria-label={label} title={props.title??label}><MuseIcon name={icon} size={17} treatment="plain"/></button>;}
export function MuseCloseButton({onClose,label='Close'}:{onClose:()=>void;label?:string}){return <MuseIconButton icon="close" variant="glass" label={label} onClick={onClose}/>;}
