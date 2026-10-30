type MuseStarProps = {
  /** Height in pixels; the signature proportions stay fixed at every size. */
  size?: number;
  color?: "purple" | "pink" | "aqua";
  className?: string;
};

export function MuseStar({ size = 24, color = "purple", className = "" }: MuseStarProps) {
  return (
    <svg width={size * 0.6} height={size} viewBox="0 0 24 40" fill="currentColor" className={`muse-star star-${color} ${className}`} aria-hidden="true" focusable="false">
      <path d="M12 0C13.7 15.8 15.5 17.8 24 20C15.5 22.2 13.7 24.2 12 40C10.3 24.2 8.5 22.2 0 20C8.5 17.8 10.3 15.8 12 0Z" />
    </svg>
  );
}
