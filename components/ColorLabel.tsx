import {MuseIcon,type MuseIconName} from './MuseIcon';
import type {ReactNode} from 'react';
import {accentStyle,type AccentColor} from '@/lib/appearance-values';
import './MuseControls.css';
export function ColorLabel({color,children,icon}:{color?:AccentColor;icon?:MuseIconName;children:ReactNode}){return <span className="muse-color-label" style={accentStyle(color)}>{color&&<i aria-hidden="true"/>}{icon&&<MuseIcon name={icon} size={16}/>}<span>{children}</span></span>;}
