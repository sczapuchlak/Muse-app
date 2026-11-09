"use client";
/**
 * Optional Lists summaries elsewhere in Muse (#110). Every one is opt-in per list and compact: a single line in
 * Daily Edit, a small count on an Agenda day, the supporting lists on an aspiration. Items linked to a Planner task
 * are left out — the task already shows there, so nothing appears twice.
 */
import Link from "next/link";
import { useMemo } from "react";
import { plannedOn, scheduleState } from "@/lib/lists/schedule";
import { usePlanner } from "../PlannerStore";
import { useLists } from "./ListsStore";
import { effectiveEvents } from "./taskLink";
import "./Lists.css";

function useDue(date: string, flag: "showInDaily" | "showInAgenda") {
  const s = useLists(), { state: planner } = usePlanner();
  return useMemo(() => {
    const lists = s.lists.filter((l) => l[flag] && !l.archivedAt && !l.isTemplate);
    return lists.map((l) => {
      const items = s.items.filter((i) => i.listId === l.id && i.linkKind !== "task");
      const due = items.filter((i) => {
        if (!i.schedule) return !i.completedAt && !!i.dueDate && (flag === "showInAgenda" ? i.dueDate === date : i.dueDate <= date);
        const ev = effectiveEvents(i, s.events, planner);
        if (flag === "showInAgenda") return plannedOn(i.schedule, ev, date) && !["completed", "skipped"].includes(scheduleState(i.schedule, ev, date).status);
        return scheduleState(i.schedule, ev, date).due;
      });
      return { list: l, count: due.length };
    }).filter((x) => x.count > 0);
  }, [s, planner, date, flag]);
}

/** Daily Edit → Today's plan: one line, never a list of items. */
export function ListsDailyLine({ date }: { date: string }) {
  const due = useDue(date, "showInDaily");
  if (!due.length) return null;
  const total = due.reduce((n, d) => n + d.count, 0);
  const href = due.length === 1 ? `/notes?view=lists&list=${due[0].list.id}` : "/notes?view=lists";
  return <Link className="muse-lists-daily" href={href}><span aria-hidden="true">✦</span> Lists · {total} due <small>{due.slice(0, 2).map((d) => `${d.list.title} ${d.count}`).join(" · ")}{due.length > 2 ? ` · +${due.length - 2}` : ""}</small></Link>;
}

/** Agenda day header: a tiny count of list items planned that day. */
export function ListsAgendaChip({ day }: { day: string }) {
  const due = useDue(day, "showInAgenda");
  if (!due.length) return null;
  const total = due.reduce((n, d) => n + d.count, 0);
  return <Link className="muse-lists-agenda-chip" href={due.length === 1 ? `/notes?view=lists&list=${due[0].list.id}` : "/notes?view=lists"} title={due.map((d) => `${d.list.title}: ${d.count}`).join("\n")} aria-label={`${total} list item${total === 1 ? "" : "s"} planned`}>☰ {total}</Link>;
}

/** Aspiration detail: lists that support it (read-only links; nothing is copied). */
export function AspirationLists({ aspirationId }: { aspirationId: string }) {
  const s = useLists();
  const lists = s.lists.filter((l) => l.aspirationId === aspirationId && !l.isTemplate);
  if (!lists.length) return null;
  return <p className="small-label muse-lists-aspiration">Supporting lists: {lists.map((l, i) => <span key={l.id}>{i ? ", " : ""}<Link href={`/notes?view=lists&list=${l.id}`}>{l.icon ? `${l.icon} ` : ""}{l.title}</Link></span>)}</p>;
}
