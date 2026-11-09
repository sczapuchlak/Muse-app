"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { desktopGroups, isActiveDestination, isActiveItem, mobileMoreIds, mobilePrimaryIds, navigation, navItems, type NavItem } from "@/lib/navigation";
import {WellnessProvider} from "./WellnessStore";
import {todayInTimeZone} from "@/lib/dates";
import {DailyDataProvider,DailyDateSync} from "./daily/DailyData";
import type {DailyProfile} from "@/lib/data/daily-store";
import { MuseAtmosphere } from "./MuseAtmosphere";
import { MuseIcon } from "./MuseIcon";
import { MuseCelebrations } from "./MuseCelebrations";
import { ProfileNavIcon, ProfileNavLabel } from "./social/ProfileNavIcon";
import { useStreamNavigation } from "@/lib/stream/navigation-preference";
import { MuseStar } from "./MuseStar";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { GlassPopover } from "./GlassPopover";
import { NourishProvider } from "./NourishStore";
import {AccountPreferencesProvider,useAccountPreferences} from "./AccountPreferences";
import {ConstellationsProvider} from "./notes/ConstellationsStore";
import {AstrologyDataProvider} from './astrology/AstrologyData';
import {WhimsyDataProvider} from "./whimsy/WhimsyData";
import {CollectionsDataProvider} from "./collections/CollectionsData";
import {NotesProvider} from "./notes/NotesStore";
import { PlannerProvider } from "./PlannerStore";
import { MuseSessionProvider } from "./MuseSession";
import { RitualProvider } from "./rituals/RitualStore";
import { ConnectedRitualsProvider } from "./rituals/ConnectedRituals";
import { MoneyProvider } from "./money/MoneyStore";
import "./AppShell.css";
import { ThemeReviewBar } from "./ThemeReviewBar";
import {LogoutButton} from "./auth/LogoutButton";
import {MuseMagicBridge} from "./MuseMagic"
import {AppearanceBridge} from "./atelier/AppearanceBridge";

function NavDestination({ item, path, compact = false, onNavigate, userId }: { item: NavItem; path: string; compact?: boolean; onNavigate?: () => void; userId: string }) {
  const active = isActiveItem(path, item);
  return <Link href={item.href} className="muse-nav-link muse-edge" aria-current={active ? "page" : undefined}
    aria-label={compact ? item.label : undefined} title={compact ? item.label : undefined} onClick={onNavigate}>
    {item.id === "profile" ? <ProfileNavIcon userId={userId} /> : <MuseIcon name={item.icon} size={20} treatment="prismatic" />}<span className="muse-nav-label">{item.id === "profile" ? <ProfileNavLabel userId={userId} fallback={item.label} /> : item.label}</span>{active && <MuseStar size={17} className="muse-nav-active-star" />}
  </Link>;
}

export function AppShell({children,profile}:{children:ReactNode;profile:DailyProfile}){return <AccountPreferencesProvider userId={profile.id}><AppShellContent profile={profile}>{children}</AppShellContent></AccountPreferencesProvider>;}
function AppShellContent({ children, profile:initialProfile }: { children: ReactNode; profile:DailyProfile }) {
  const {status}=useAccountPreferences();
  const profile={...initialProfile,timeZone:status.saved?.profile.time_zone??initialProfile.timeZone};
  const path = usePathname() ?? "/";
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  // Stream can be hidden from navigation (a per-account preference); its page and posts are untouched.
  const showStream = useStreamNavigation(profile.id);
  const moreItems = navItems(mobileMoreIds).filter((item) => showStream || item.id !== "stream"), moreActive = moreItems.some((item) => isActiveItem(path, item));
  return (
    <MuseSessionProvider initialDate={todayInTimeZone(profile.timeZone)}><DailyDataProvider profile={profile}><DailyDateSync/>
      <AstrologyDataProvider key={profile.id} userId={profile.id}><WhimsyDataProvider userId={profile.id} timeZone={profile.timeZone}><CollectionsDataProvider userId={profile.id}><ConstellationsProvider profile={profile}><NotesProvider profile={profile}><PlannerProvider profile={profile}><WellnessProvider key={profile.id} userId={profile.id}><NourishProvider><MoneyProvider key={profile.id} userId={profile.id}><RitualProvider key={profile.id} userId={profile.id}><ConnectedRitualsProvider timeZone={profile.timeZone}><div className="muse-app-shell" data-rail={collapsed ? "collapsed" : "expanded"} data-module={path.split("/")[1]||"daily"}>
        <MuseMagicBridge/><AppearanceBridge userId={profile.id}/><MuseAtmosphere/><MuseCelebrations/>
        <a className="muse-skip-link" href="#muse-main-content">Skip to content</a>
        <aside className="muse-rail" aria-label="Muse app navigation">
          <div className="muse-rail-header"><Link className="muse-shell-brand" href="/" aria-label="Muse home"><span>muse</span><MuseStar size={28} /></Link>
            <button type="button" className="muse-rail-toggle muse-edge" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)}><span className={collapsed ? "chevron-right" : "chevron-left"}><MuseIcon name="chevron" size={16} /></span></button>
          </div>
          <div className="muse-sidebar-atmosphere" aria-hidden="true"><MuseStar size={12} color="aqua" /><MuseStar size={17} color="pink" /></div>
          <nav className="muse-rail-navigation" aria-label="Main navigation">
            {desktopGroups.map((group) => <div className="muse-nav-group" key={group}>
              <p className="muse-nav-group-label">{group}{group === "Whimsy" && <MuseStar size={11} className="muse-nav-group-star" />}</p>
              {navigation.filter((item) => item.group === group).map((item) => <NavDestination key={item.id} item={item} path={path} userId={profile.id} compact={collapsed} />)}
            </div>)}
          </nav>
          <div className="muse-rail-footer">
            <div className="muse-rail-utilities" aria-label="You">
              {navigation.filter((item) => (item.id === "stream" && showStream) || item.id === "profile").map((item) => <NavDestination key={item.id} item={item} path={path} userId={profile.id} compact={collapsed} />)}
            </div>
            {/* Themes, Settings and Sign out as a small dock of icons, so the account area breathes. */}
            <div className="muse-rail-dock" role="group" aria-label="Account controls" data-compact={collapsed||undefined}>
              <ThemeSwitcher variant="dock"/>
              <Link href="/settings" className="muse-dock-button muse-edge" aria-label="Settings" title="Settings" aria-current={isActiveItem(path, navigation.find((item) => item.id === "settings")!) ? "page" : undefined}><MuseIcon name="gear" size={19} treatment="prismatic"/></Link>
              <LogoutButton compact variant="dock"/>
            </div>
          </div>
        </aside>
        <div className="muse-app-main">
          <div className={`muse-global-bar${path === "/" ? " muse-global-bar-daily" : ""}`}>
            <Link className="muse-mobile-brand muse-logo" href="/" aria-label="Muse home">muse<MuseStar size={24} /></Link>
          </div>
          <div className="muse-app-content" id="muse-main-content" tabIndex={-1}>{children}</div><ThemeReviewBar />
        </div>
        <nav className="muse-bottom-navigation" aria-label="Mobile navigation">
          {navItems(mobilePrimaryIds).map((item) => <Link key={item.id} href={item.href} className="muse-bottom-link muse-edge" aria-current={isActiveDestination(path, item.href) ? "page" : undefined}>
            <MuseIcon name={item.icon} size={21} treatment="prismatic" /><span>{item.id === "daily" ? "Today" : item.label}</span>{isActiveDestination(path, item.href) && <MuseStar size={12} className="muse-bottom-glint" />}
          </Link>)}
          <button ref={moreRef} type="button" className="muse-bottom-link muse-edge" data-active={moreActive} aria-expanded={moreOpen} aria-controls="muse-more-navigation" onClick={() => setMoreOpen((value) => !value)}>
            <MuseIcon name="more" size={21} /><span>More</span>{moreActive && <MuseStar size={12} className="muse-bottom-glint" />}
          </button>
        </nav>
        <GlassPopover id="muse-more-navigation" label="More from Muse" open={moreOpen} anchorRef={moreRef} onClose={() => setMoreOpen(false)} width={340} align="end">
          <div className="muse-more-destinations">{[...desktopGroups, "Tools" as const].map((group) => { const items = moreItems.filter((item) => item.group === group); return items.length ? <div className="muse-more-group" key={group} role="group" aria-label={group === "Tools" ? "Account" : group}>{group !== "Tools" && <p className="muse-nav-group-label">{group}</p>}{items.map((item) => <NavDestination key={item.id} item={item} path={path} userId={profile.id} onNavigate={() => setMoreOpen(false)} />)}</div> : null; })}<LogoutButton/></div>
        </GlassPopover>
      </div></ConnectedRitualsProvider></RitualProvider></MoneyProvider></NourishProvider></WellnessProvider></PlannerProvider></NotesProvider></ConstellationsProvider></CollectionsDataProvider></WhimsyDataProvider></AstrologyDataProvider>
    </DailyDataProvider></MuseSessionProvider>
  );
}
