"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { dateLabel, shiftDate } from "@/lib/dates";
import { dailyEditSample } from "@/lib/daily-edit-data";
import { PLANNING_WINDOW_DAYS, emptyPlannerFilters, filterPlannerTasks, formatPlannedMinutes, validDate, type PlannerFilters as Filters } from "@/lib/planner";
import type { PlannedTask } from "@/lib/models";
import { useMuseDate } from "../MuseSession";
import { usePlanner } from "../PlannerStore";
import { MusePageHeader } from "../MusePageHeader";
import { PlannerUtilities } from "./PlannerUtilities";
import { MuseDrawer } from "../MuseDrawer";
import { useMuseToday } from "../useMuseToday";
import { PlannerRail } from "./PlannerRail";
import { PlanningDropZone } from "./PlanningDropZone";
import { MuseStar } from "../MuseStar";
import { DateNavigator } from "../DateNavigator";
import { WeekNavigator } from "../WeekNavigator";
import { mockProfile } from "@/lib/mock-profile";
import { PlannerTaskCard } from "./PlannerTaskCard";
import { TaskQuickAdd } from "./TaskQuickAdd";
import { TaskDetails } from "./TaskDetails";
import "./Planner.css";

export function Planner() {
  const { state } = usePlanner();
  const [date, setDate] = useMuseDate(dailyEditSample.date.iso);
  const query = useSearchParams();
  const requestedDate = query.get("date");
  const router = useRouter();
  useEffect(() => { if (validDate(requestedDate)) setDate(requestedDate); }, [requestedDate, setDate]);
  const [workspaceId, setWorkspace] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyPlannerFilters);
  const [mobileView, setMobileView] = useState<"day" | "inbox">("day");
  const [inboxAnchor,setInboxAnchor]=useState<HTMLElement|null>(null);
  const today = useMuseToday(mockProfile.timeZone);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  function changeDate(next: string) { setDate(next); router.replace(`/planner?date=${next}`, { scroll: false }); }
  const workspaceFilter = state.workspaces.some((entry) => entry.id === workspaceId) ? workspaceId : "";
  const groupFilter = state.groups.some((entry) => entry.id === filters.groupId && (!workspaceFilter || entry.workspaceId === workspaceFilter)) ? filters.groupId : "";
  const activeTags = filters.tagIds.filter((id) => state.tags.some((entry) => entry.id === id));
  const activeFilters = { ...filters, groupId: groupFilter, tagIds: activeTags };
  const filtered = filterPlannerTasks(state.tasks, workspaceFilter, activeFilters, search);
  const days = Array.from({ length: PLANNING_WINDOW_DAYS }, (_, index) => shiftDate(date, index));
  function openTask(task: PlannedTask, anchor: HTMLElement) { setDetail({ id: task.id, anchor }); }
  function taskList(tasks: PlannedTask[]) { return <ul className="muse-planner-task-list">{tasks.map((task) => <PlannerTaskCard key={task.id} task={task} onOpen={openTask} />)}</ul>; }
  const inbox = filtered.filter((task) => !task.plannedDate);
  function utilities(){return <PlannerUtilities search={search} onSearch={setSearch} filters={activeFilters} onFilter={setFilters} workspaceId={workspaceFilter} today={today} onToday={()=>{changeDate(today);setMobileView("day");}} onPrevious={()=>changeDate(shiftDate(date,-1))} onNext={()=>changeDate(shiftDate(date,1))}/>;}
  function rail(){return <PlannerRail workspaceId={workspaceFilter} onWorkspaceChange={(id)=>{setWorkspace(id);setFilters((current)=>({...current,groupId:""}));}} tasks={inbox} onOpen={openTask} groupId={groupFilter||undefined} tagIds={activeTags}/>;}

  return <main className="muse-page muse-planner-page">
    <MusePageHeader eyebrow="Make space for what matters" title="Planner" description="Make a plan that can move with you." celestial="path"><div className="muse-planner-hero-controls"><DateNavigator date={date} onChange={changeDate}/>{utilities()}</div></MusePageHeader>
    <div className="muse-planner-mobile-tabs"><button className="muse-button" type="button" aria-haspopup="dialog" aria-expanded={mobileView==="inbox"} onClick={(event)=>{setInboxAnchor(event.currentTarget);setMobileView("inbox");}}>Task List · {inbox.length}</button></div>
    <div className="muse-planner-mobile-week"><WeekNavigator selectedDate={date} timeZone={mockProfile.timeZone} onChange={(next) => { changeDate(next); setMobileView("day"); }} /></div>
    {state.activeTimer && <p className="muse-planner-timer-status" role="status">Timer running: {state.tasks.find((task) => task.id === state.activeTimer?.taskId)?.title}. <button className="text-button" type="button" onClick={(event) => { if (state.activeTimer) setDetail({ id: state.activeTimer.taskId, anchor: event.currentTarget }); }}>Open timer</button></p>}
    <div className="muse-planner-layout">
      {rail()}
      <div className="muse-planning-canvas">
      <div className="muse-planner-board" id="planner-events" aria-label="Three-day rolling planning board">
        {days.map((day, index) => {
          const tasks = filtered.filter((task) => task.plannedDate === day);
          const events = state.events.filter((event) => event.date === day).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
          const estimated = tasks.reduce((total, task) => total + (task.estimatedMinutes ?? 0), 0);
          const label = dateLabel(day);
          return <section className="muse-planner-day" key={day} data-mobile-visible={index === 0} data-day-offset={index} aria-label={`${label}${index===0?", focused day":""}${day===today?", today":""}`} data-today={day === today}>
            <PlanningDropZone date={day} selected={index === 0} className="muse-day-drop">
              <header className="muse-planner-day-heading"><h2><time dateTime={day} aria-current={day===today?"date":undefined}>{new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}<strong>{Number(day.slice(8))}</strong></time>{(index === 0 || day === today) && <MuseStar size={30} color={day === today ? "aqua" : "purple"} />}</h2><p className="small-label">{tasks.length} {tasks.length === 1 ? "task" : "tasks"}{estimated > 0 ? ` · ${formatPlannedMinutes(estimated)} planned` : ""}{day===today?" · Today":index===0?" · Focused":""}</p></header>
              {events.length > 0 && <section className="muse-planner-events" aria-label={`Schedule for ${label}`}><h3>Schedule</h3>{events.map((event) => <p key={event.id}><time dateTime={event.dateTime}>{event.time}</time><span>{event.title}</span></p>)}</section>}
              <h3 className="muse-planner-task-label">Tasks</h3>{taskList(tasks)}
              {!tasks.length && <p className="muse-planner-empty">A little breathing room.</p>}
              <TaskQuickAdd date={day} workspaceId={workspaceFilter || undefined} groupId={groupFilter || undefined} tagIds={activeTags} />
            </PlanningDropZone>
          </section>;
        })}
      </div>
      </div>
    </div>
    {mobileView==="inbox"&&<MuseDrawer title="Task List" returnFocus={inboxAnchor} onClose={()=>setMobileView("day")}><div className="muse-planner-sheet-body">{rail()}</div></MuseDrawer>}
    <p className="small-label muse-planner-count">{state.tasks.length} tasks in your plan</p>
    <p className="muse-planner-help small-label">Move tasks with Move or drag the handle between days or above another task to reorder. Due dates stay put.</p>
    <div className="muse-sr-only" role="status">{announcement}</div>
    {detail && <TaskDetails key={detail.id} taskId={detail.id} returnFocus={detail.anchor} onClose={() => { setDetail(null); setAnnouncement("Task details closed. Changes are saved for this session."); }} />}
    <footer className="muse-footer">Local planning · Changes reset on refresh</footer>
  </main>;
}
