"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { desktopGroups, isActiveDestination, mobileMoreIds, mobilePrimaryIds, navigation, navItems, type NavItem } from "@/lib/navigation";
import { dailySessionSeed } from "@/lib/daily-session-seed";
import {todayInTimeZone} from "@/lib/dates";
import {DailyDataProvider,DailyDateSync} from "./daily/DailyData";
import type {DailyProfile} from "@/lib/data/daily-store";
import { MuseAtmosphere } from "./MuseAtmosphere";
import { MuseIcon } from "./MuseIcon";
import { MuseStar } from "./MuseStar";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { GlassPopover } from "./GlassPopover";
import { NourishProvider } from "./NourishStore";
import { PlannerProvider } from "./PlannerStore";
import { MuseSessionProvider } from "./MuseSession";
import { RitualProvider } from "./rituals/RitualStore";
import { MoneyProvider } from "./money/MoneyStore";
import "./AppShell.css";
import {LogoutButton} from "./auth/LogoutButton";
import {MuseMagicBridge} from "./MuseMagic";

function NavDestination({ item, path, compact = false, onNavigate }: { item: NavItem; path: string; compact?: boolean; onNavigate?: () => void }) {
  const active = isActiveDestination(path, item.href);
  return <Link href={item.href} className="muse-nav-link muse-edge" aria-current={active ? "page" : undefined}
    aria-label={compact ? item.label : undefined} title={compact ? item.label : undefined} onClick={onNavigate}>
    <MuseIcon name={item.icon} size={20} treatment="prismatic" /><span className="muse-nav-label">{item.label}</span>{active && <MuseStar size={17} className="muse-nav-active-star" />}
  </Link>;
}

export function AppShell({ children, profile }: { children: ReactNode; profile:DailyProfile }) {
  const path = usePathname() ?? "/";
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const moreActive = navItems(mobileMoreIds).some((item) => isActiveDestination(path, item.href));
  return (
    <MuseSessionProvider initialDate={todayInTimeZone(profile.timeZone)} initialRecords={Object.fromEntries(Object.entries(dailySessionSeed).filter(([key])=>!key.endsWith("/intention")))}><DailyDataProvider profile={profile}><DailyDateSync/>
      <PlannerProvider><NourishProvider><MoneyProvider><RitualProvider><div className="muse-app-shell" data-rail={collapsed ? "collapsed" : "expanded"} data-module={path.split("/")[1]||"daily"}>
        <MuseMagicBridge/><MuseAtmosphere/>
        <a className="muse-skip-link" href="#muse-main-content">Skip to content</a>
        <aside className="muse-rail" aria-label="Muse app navigation">
          <Link className="muse-shell-brand" href="/" aria-label="Muse home"><span>muse</span><MuseStar size={28} /></Link>
          <button type="button" className="muse-rail-toggle muse-edge" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)}><span className={collapsed ? "chevron-right" : "chevron-left"}><MuseIcon name="chevron" size={16} /></span></button>
          <div className="muse-sidebar-atmosphere" aria-hidden="true"><MuseStar size={12} color="aqua" /><MuseStar size={17} color="pink" /></div>
          <nav className="muse-rail-navigation" aria-label="Main navigation">
            {desktopGroups.map((group) => <div className="muse-nav-group" key={group}>
              <p className="muse-nav-group-label">{group}</p>
              {navigation.filter((item) => item.group === group).map((item) => <NavDestination key={item.id} item={item} path={path} compact={collapsed} />)}
            </div>)}
          </nav>
          <div className="muse-rail-footer"><ThemeSwitcher compact={collapsed}/>
            {navigation.filter((item) => item.group === "Tools").map((item) => <NavDestination key={item.id} item={item} path={path} compact={collapsed} />)}
            <LogoutButton compact={collapsed}/>
          </div>
        </aside>
        <div className="muse-app-main">
          <div className={`muse-global-bar${path === "/" ? " muse-global-bar-daily" : ""}`}>
            <Link className="muse-mobile-brand muse-logo" href="/" aria-label="Muse home">muse<MuseStar size={24} /></Link>
          </div>
          <div className="muse-app-content" id="muse-main-content" tabIndex={-1}>{children}</div>
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
          <p className="editor-label">More from Muse</p>
          <div className="muse-more-destinations">{navItems(mobileMoreIds).map((item) => <NavDestination key={item.id} item={item} path={path} onNavigate={() => setMoreOpen(false)} />)}<LogoutButton/></div>
        </GlassPopover>
      </div></RitualProvider></MoneyProvider></NourishProvider></PlannerProvider>
    </DailyDataProvider></MuseSessionProvider>
  );
}
