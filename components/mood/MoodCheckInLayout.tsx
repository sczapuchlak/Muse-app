import type { Emotion } from "@/lib/models";
import { MoodCard } from "../MoodCard";
import { DayInThreeCard } from "../DayInThree";
import { DayPulseCard } from "../DayPulseCard";
import "./MoodCheckInLayout.css";

/** Two natural-height capture cards determine the shared desktop row height. */
export function MoodCheckInLayout({ date, emotions }: { date: string; emotions: Emotion[] }) {
  return <div className="muse-mood-checkin-layout">
    <div className="muse-mood-checkin-stack">
      <MoodCard emotions={emotions} />
      <DayInThreeCard />
    </div>
    <DayPulseCard date={date} />
  </div>;
}
