import { MuseIcon, type MuseIconName } from './MuseIcon';
import type { PrismaticTone } from './PrismaticSvg';

/** Compatibility entry point: standalone identity icons have no decorative tile. */
export function GlassIcon({name,iconSize=20,tone='primary'}:{name:MuseIconName;size?:number;iconSize?:number;tone?:PrismaticTone}) {
  return <MuseIcon name={name} size={iconSize} treatment="prismatic" tone={tone}/>;
}
