import { PrismaticSvg } from './PrismaticSvg';
export const MUSE_STAR_PATH="M12 0C13.7 15.8 15.5 17.8 24 20C15.5 22.2 13.7 24.2 12 40C10.3 24.2 8.5 22.2 0 20C8.5 17.8 10.3 15.8 12 0Z";
type MuseStarProps = {
  /** Height in pixels; the signature proportions stay fixed at every size. */
  size?: number;
  color?: "purple" | "pink" | "aqua";
  className?: string;
  prismatic?: boolean;
};

export function MuseStar({ size = 24, color = "purple", className = "", prismatic = false }: MuseStarProps) {
  if (prismatic) return <PrismaticSvg width={size * .6} height={size} viewBox="0 0 24 40" paint="fill" tone={color === 'aqua' ? 'secondary' : color === 'pink' ? 'tertiary' : 'primary'} className={`muse-star star-${color} ${className}`}><path d={MUSE_STAR_PATH}/></PrismaticSvg>;
  return (
    <svg width={size * 0.6} height={size} viewBox="0 0 24 40" fill="currentColor" className={`muse-star star-${color} ${className}`} aria-hidden="true" focusable="false">
      <path d={MUSE_STAR_PATH} />
    </svg>
  );
}
