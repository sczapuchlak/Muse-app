"use client";
import { recordedFeeling } from "@/lib/feelings";
import Link from "next/link";
import type { CSSProperties } from "react";
import { MuseStar } from "../../MuseStar";
import { uniqueMoodRecords, type EmotionalCheckIn } from "@/lib/mood";
import { emotionCatalog } from "@/lib/emotions";
import type { ContextTag } from "@/lib/models";
import type { DayData } from "@/lib/data/daily";
import type { DailyWater } from "@/lib/water";
import { formatWaterAmount } from "@/lib/water";
import type { DailyMemory } from "@/lib/memories";
import { Ring, TipBox, longDay } from "./GlanceSections";

/**
 * The Dayprint in Insights (#97 polish): the day's portrait in the same colorful language as the week's mini
 * Dayprints. Read-only; every piece links back to where it is edited (Mood, Daily Edit). Shows only what was recorded.
 */
export function DayPortrait({ date, day, checkIns, influences, water, activities, waterLoaded, memory }: {
  memory?: DailyMemory | null; date: string; day?: DayData; checkIns: EmotionalCheckIn[]; influences: ContextTag[]; water?: DailyWater; activities: string[]; waterLoaded: boolean;
}) {
  const r = day?.record, three = r?.day_in_three ?? [], sessions = uniqueMoodRecords(checkIns.filter((c) => c.date === date));
  const pulse = { overall: r?.overall_day ?? null, energy: r?.energy ?? null, stress: r?.stress ?? null };
  const waterPct = water?.goal ? Math.min(100, (water.total / water.goal) * 100) : null;
  return <article className="muse-card muse-glance-portrait" aria-label={`Dayprint for ${longDay(date)}`}>
    <header className="muse-glance-portrait-head">
      <div><p className="muse-glance-eyebrow">Dayprint <MuseStar size={14} prismatic /></p><h2>{longDay(date)}</h2></div>
      <div className="muse-glance-actions">
        <Link className="muse-glance-pill" href={`/?date=${date}`}>✎ Daily Edit</Link>
        <Link className="muse-glance-pill" href={`/mood?date=${date}`}>💭 Edit in Mood</Link>
      </div>
    </header>

    <div className="muse-glance-portrait-grid">
      <section className="muse-glance-portrait-three" aria-label={three.length ? `Day in Three: ${three.join(" ")}` : "Day in Three not recorded"}>
        <h3>Day in Three</h3>
        <div className="muse-glance-bubbles">{[0, 1, 2].map((i) => <span key={i} className="muse-glance-bubble" data-empty={!three[i] || undefined} aria-hidden="true">{three[i] ?? "·"}</span>)}</div>
        {!three.length && <p className="muse-glance-sub">Not recorded</p>}
      </section>

      <section className="muse-glance-portrait-pulse" aria-label="Day Pulse">
        <h3>Day Pulse</h3>
        <div className="muse-glance-pulse">
          <Ring value={pulse.overall} size="lg" label={pulse.overall === null ? "Overall Day not rated" : `Overall Day ${pulse.overall} of 10`} />
          <div className="muse-glance-capsules">
            {([["⚡", "Energy", pulse.energy, "energy"], ["🌀", "Stress", pulse.stress, "stress"]] as const).map(([emoji, label, value, kind]) =>
              <div key={label} className="muse-glance-capsule" data-kind={kind} tabIndex={0} aria-label={value === null ? `${label} not recorded` : `${label} ${value} of 10`}>
                <span className="muse-glance-capsule-label">{emoji} {label}</span>
                <span className="muse-glance-capsule-track" data-missing={value === null || undefined}><i style={{ width: `${(value ?? 0) * 10}%` } as CSSProperties} /></span>
                <b>{value ?? "—"}<small>{value === null ? "" : "/10"}</small></b>
                <TipBox>{value === null ? `${label} wasn’t recorded` : `${label} ${value} out of 10, from Day Pulse`}</TipBox>
              </div>)}
          </div>
        </div>
      </section>

      {/* #104: Little Moment is its own tile, the same size as Day in Three, so the top row has no gap. */}
      <section className="muse-glance-portrait-moment" aria-label="Little Moment">
        <h3>✦ Little Moment</h3>
        {memory ? <p>{memory.emoji && <span aria-hidden="true">{memory.emoji} </span>}{memory.body}</p> : <p className="muse-glance-sub">No little moment saved. Add one in Day Pulse.</p>}
      </section>

      <section className="muse-glance-portrait-intention" aria-label="Intention">
        <h3>Intention</h3>
        {r?.intention_text || r?.intention_emoji
          ? <blockquote><span aria-hidden="true">{r.intention_emoji ?? "✦"}</span><p>{r.intention_text}</p></blockquote>
          : <p className="muse-glance-empty"><span aria-hidden="true">🌱</span>No intention set.</p>}
        <div className="muse-glance-portrait-body">
          <div className="muse-glance-waterline" tabIndex={0} aria-label={!waterLoaded ? "Water loading" : water ? `Water ${water.total} ${water.unit ?? ""}${water.goal ? ` of ${water.goal} goal` : ""}` : "No water logged"}>
            <span aria-hidden="true">💧</span>
            {!waterLoaded ? <small>Loading…</small> : water ? <><b>{formatWaterAmount(water.total)}<small> {water.unit}</small></b>
              {waterPct !== null && <span className="muse-glance-capsule-track" data-kind="water"><i style={{ width: `${waterPct}%` }} /></span>}
              {water.goal !== undefined && <small>of {formatWaterAmount(water.goal)}</small>}</> : <small>No water logged</small>}
          </div>
          <div className="muse-glance-moves" aria-label={activities.length ? `Movement recorded: ${activities.join(", ")}` : "No movement recorded"}>
            <span aria-hidden="true">🏃</span>{activities.length ? <ul className="muse-glance-chips">{activities.map((a, i) => <li key={`${a}-${i}`}>{a}</li>)}</ul> : <small>No movement recorded</small>}
          </div>
        </div>
      </section>

      <section className="muse-glance-portrait-moods" aria-label="Mood check-ins">
        {(["morning", "evening"] as const).map((period) => { const rec = sessions.find((s) => s.period === period);
          return <div key={period} className="muse-glance-moodcard" data-period={period} data-empty={!rec || undefined}>
            <h3><span aria-hidden="true">{period === "morning" ? "☀️" : "🌙"}</span>{period === "morning" ? "Morning" : "Evening"}</h3>
            {!rec ? <p className="muse-glance-sub">No check-in recorded.</p> : <>
              {rec.emotionIds.length > 0 && <div className="feeling-chips">{rec.emotionIds.map((id) => { const e = recordedFeeling(id, rec.feelings, emotionCatalog); return e && <span key={id} className="muse-mood-history-feeling" data-quadrant={e.quadrant}>{e.emoji} {e.name}</span>; })}</div>}
              {rec.causeTagIds.length > 0 && <ul className="muse-glance-chips" aria-label="Alongside">{rec.causeTagIds.map((id) => influences.find((t) => t.id === id)?.name).filter(Boolean).map((n) => <li key={n}>✦ {n}</li>)}</ul>}
              {rec.reflection && <blockquote className="muse-glance-reflection">{rec.reflection.length > 260 ? <>{rec.reflection.slice(0, 260)}… <details><summary>Read more</summary>{rec.reflection.slice(260)}</details></> : rec.reflection}</blockquote>}
            </>}
          </div>; })}
      </section>
    </div>
  </article>;
}
