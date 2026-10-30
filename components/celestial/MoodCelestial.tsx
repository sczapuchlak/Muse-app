import { MuseStar } from "../MuseStar";
/** Emotional light, without rendering quadrants or building the future Mood module. */
export function MoodCelestial() {
  return <div className="muse-mood-aurora"><i/><i/><i/><i/><MuseStar size={15} color="aqua"/><MuseStar size={9} color="pink"/></div>;
}
