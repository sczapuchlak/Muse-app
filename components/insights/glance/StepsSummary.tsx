"use client";
import { useEffect, useState } from "react";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { readStepRange, stepsUnavailable } from "@/lib/steps-store";
import { formatSteps, summarizeSteps, type StepDay } from "@/lib/steps";
import { Empty, GlanceCard, plural } from "./GlanceSections";

/** Manually entered steps for the period (#130). Only days with an entry count; a missing day is never zero. */
export function StepsSummary({ start, end, area }: { start: string; end: string; area?: string }) {
  const key = `${start}/${end}`;
  const [loaded, setLoaded] = useState<{ key: string; days: StepDay[] | "unavailable" | "error" } | null>(null);
  useEffect(() => { let live = true;
    readStepRange(createMuseBrowserClient(), start, end).then((days) => { if (live) setLoaded({ key, days }); }).catch((e) => { if (live) setLoaded({ key, days: stepsUnavailable(e) ? "unavailable" : "error" }); });
    return () => { live = false; }; }, [key, start, end]);
  if (loaded?.key === key && loaded.days === "unavailable") return null;
  const days = loaded?.key === key && Array.isArray(loaded.days) ? loaded.days : null, s = days ? summarizeSteps(days) : null;
  return <GlanceCard id="glance-steps" title="Steps" icon="movement" area={area} tone="cool" note={s?.days ? `Average of ${plural(s.days, "recorded day")}; days without an entry are left out.` : undefined}>
    {!loaded || loaded.key !== key ? <Empty>Loading…</Empty> : loaded.days === "error" ? <Empty>Steps couldn’t load.</Empty> : !s?.days ? <Empty emoji="👟">No steps recorded.</Empty> : <div className="muse-glance-water">
      <p className="muse-glance-hero"><strong>{formatSteps(s.average ?? 0)}</strong><small>steps a day</small></p>
      <p className="muse-glance-sub">Goal reached on {s.goalDays} of {plural(s.days, "recorded day")}{s.best ? ` · best ${formatSteps(s.best.steps)}` : ""}</p>
    </div>}
  </GlanceCard>;
}
