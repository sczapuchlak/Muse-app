import type { Emotion } from "@/lib/models";
import { MoodCard } from "../MoodCard";
import { DayInThreeCard } from "../DayInThree";
import { DayPulseCard } from "../DayPulseCard";
import "./MoodCheckInLayout.css";

/** Existing capture cards with an explicit page-level composition, never new data owners. */
export function MoodCheckInLayout({ date, emotions, layout="check-in" }: { date: string; emotions: Emotion[]; layout?:"check-in"|"reflection" }) {
  if(layout==="reflection")return <div className="muse-mood-checkin-layout" data-layout="reflection"><MoodCard emotions={emotions}/><DayPulseCard date={date}/><DayInThreeCard/></div>;
  return <div className="muse-mood-checkin-layout">
    <div className="muse-mood-checkin-stack">
      <MoodCard emotions={emotions} />
      <DayInThreeCard />
    </div>
    <DayPulseCard date={date} />
  </div>;
}
