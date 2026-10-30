import { ThemeSwitcher } from "./ThemeSwitcher";
import { ProfileConstellation } from "./ProfileConstellation";
import { MuseStar } from "./MuseStar";
import { DateNavigator } from "./DateNavigator";
import { WeekNavigator } from "./WeekNavigator";
import { personalizedGreeting } from "@/lib/mock-profile";
import "./MuseHeader.css";

type Props = { date: { iso: string; label: string }; greeting: string; profile: { firstName: string; timeZone: string; zodiacSign?: string }; onDateChange: (date: string) => void };

export function MuseHeader({ date, greeting, profile, onDateChange }: Props) {
  return (
    <header className="muse-header muse-editorial-header">
      <ProfileConstellation zodiacSign={profile.zodiacSign} intensity="subtle" />
      <div className="muse-greeting-zone">
        <p className="muse-greeting whimsy">{personalizedGreeting(greeting, profile.firstName)}</p>
      </div>
      <div className="muse-temporal-zone">
        <div className="muse-hero-appearance"><div className="muse-stars" aria-hidden="true"><MuseStar size={24} color="aqua" /><MuseStar size={42} color="purple" /><MuseStar size={20} color="pink" /></div><ThemeSwitcher /></div>
        <DateNavigator date={date.iso} onChange={onDateChange} />
        <WeekNavigator selectedDate={date.iso} timeZone={profile.timeZone} onChange={onDateChange} />
      </div>
    </header>
  );
}
