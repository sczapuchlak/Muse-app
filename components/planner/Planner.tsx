"use client";
import { useTaskDensity } from "@/lib/task-density-preference";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { dateLabel, shiftDate } from "@/lib/dates";
import { dailyEditSample } from "@/lib/daily-edit-data";
import { parsePlannerTab, plannerTabs } from "@/lib/agenda";
import { Reflections } from "./reflections/Reflections";
import { Intentions } from "./intentions/Intentions";
import { Agenda } from "./Agenda";
import { MuseSectionNav } from "../MuseSectionNav";
import { PLANNING_WINDOW_DAYS, emptyPlannerFilters, filterPlannerTasks, formatPlannedMinutes, validDate, type PlannerFilters as Filters } from "@/lib/planner";
import type { PlannedTask } from "@/lib/models";
import { useMuseDate } from "../MuseSession";
import { PlannerCapture,PlannerPersistenceStatus,usePlanner } from "../PlannerStore";
import { MusePageHeader } from "../MusePageHeader";
import { PlannerUtilities } from "./PlannerUtilities";
import { MuseDrawer } from "../MuseDrawer";
import { useMuseToday } from "../useMuseToday";
import { PlannerRail } from "./PlannerRail";
import { RunningList } from "./RunningList";
import { parseTasksView, type TasksView } from "@/lib/running-list";
import { compactDateRange, weekDates } from "@/lib/dates";
import { PlanningDropZone } from "./PlanningDropZone";
import { MuseStar } from "../MuseStar";
import { WeekNavigator } from "../WeekNavigator";
import {useDailyData,useDailyRange} from "../daily/DailyData";
import { PlannerTaskCard, TASK_DRAG_TYPE } from "./PlannerTaskCard";
import { TaskQuickAdd } from "./TaskQuickAdd";
import { TaskDetails } from "./TaskDetails";
import "./Planner.css";
import {usePlannerHeight} from "./usePlannerHeight";
import { projectTasks } from "@/lib/planner-occurrences";
import {MuseMilestone} from "../MuseMilestone";

export function Planner() {
  const { state,status } = usePlanner();
  const {profile}=useDailyData();
  const workspaceRef=useRef<HTMLDivElement>(null);
  const [date, setDate] = useMuseDate(dailyEditSample.date.iso);
  const query = useSearchParams();
  const requestedDate = query.get("date");
  const tab = parsePlannerTab(query.get("view"));
  const router = useRouter();
  useEffect(() => { if (validDate(requestedDate)) setDate(requestedDate); }, [requestedDate, setDate]);
  const [workspaceId, setWorkspace] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyPlannerFilters);
  const [mobileView, setMobileView] = useState<"day" | "inbox">("day");
  const [inboxAnchor,setInboxAnchor]=useState<HTMLElement|null>(null);
  const today = useMuseToday(profile.timeZone);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  function changeDate(next: string) { setDate(next); router.replace(`/planner?${tab === "tasks" ? "" : `view=${tab}&`}date=${next}`, { scroll: false }); }
  const workspaceFilter = state.workspaces.some((entry) => entry.id === workspaceId) ? workspaceId : "";
  const groupFilter = state.groups.some((entry) => entry.id === filters.groupId && (!workspaceFilter || entry.workspaceId === workspaceFilter)) ? filters.groupId : "";
  const activeTags = filters.tagIds.filter((id) => state.tags.some((entry) => entry.id === id));
  const activeFilters = { ...filters, groupId: groupFilter, tagIds: activeTags };
  const days = Array.from({ length: PLANNING_WINDOW_DAYS }, (_, index) => shiftDate(date, index));
  // ★ comes from Dayview's three daily priorities (the only priority Muse has), for today and the visible days.
  const dailySnapshot = useDailyData().snapshot;
  const weekOfDate = weekDates(date), priorityStart = [today, date, weekOfDate[0]].filter(Boolean).sort()[0], priorityEnd = [days[days.length - 1], weekOfDate[6]].sort()[1];
  useDailyRange(priorityStart, priorityEnd);
  const priorityIds = new Set(Object.entries(dailySnapshot.days).filter(([d]) => d >= priorityStart && d <= priorityEnd).flatMap(([, day]) => day.priorities.map((p) => p.task_id)).filter((x): x is string => !!x));
  const filtered = filterPlannerTasks(state.tasks, workspaceFilter, activeFilters, search).filter((task) => !filters.priorityOnly || priorityIds.has(task.id));
  const [dragging, setDragging] = useState(false);
  // Scheduled Board | Running List (#81): two views of the same tasks, remembered per device.
  const [tasksView, setTasksView] = useState<TasksView>("board"), density = useTaskDensity();
  useEffect(() => { const t = window.setTimeout(() => { try { setTasksView(parseTasksView(window.localStorage.getItem("muse.planner.tasksView"))); } catch { /* default */ } }, 0); return () => window.clearTimeout(t); }, []);
  const chooseView = (v: TasksView) => { setTasksView(v); try { window.localStorage.setItem("muse.planner.tasksView", v); } catch { /* this device only */ } };
  const runningWeek = weekOfDate;
  usePlannerHeight(workspaceRef, tasksView);
  const fmtDay = (d: string, year = false) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  const boardTitle = tasksView === "running" ? `${fmtDay(runningWeek[0])} – ${fmtDay(runningWeek[6], true)}` : `${fmtDay(days[0])} – ${fmtDay(days[days.length - 1], true)}`;
  function openTask(task: PlannedTask, anchor: HTMLElement) { setDetail({ id: task.id, anchor }); }
  function taskList(tasks: PlannedTask[]) { return <ul className="muse-planner-task-list">{tasks.map((task) => <PlannerTaskCard key={task.id} task={task} onOpen={openTask} today={today} priority={priorityIds.has(task.id)} />)}</ul>; }
  const inbox = filtered.filter((task) => !task.plannedDate);
  // Recurrence 2.0 (#89): each board day shows the occurrences due that day (one per series per date).
  const boardTasks = projectTasks(filtered, state.occurrences, days[0], days[days.length - 1]), boardCanonical = projectTasks(state.tasks, state.occurrences, days[0], days[days.length - 1]);
  const compactTitle = tasksView === "running" ? compactDateRange(runningWeek[0], runningWeek[6], today) : compactDateRange(days[0], days[days.length - 1], today);
  const showingToday = tasksView === "running" ? runningWeek.includes(today) : date === today;
  function utilities(){return <PlannerUtilities date={date} onDate={changeDate} title={boardTitle} compactTitle={compactTitle} showingToday={showingToday} taskList={<div className="muse-planner-mobile-tabs"><button className="muse-button" type="button" aria-haspopup="dialog" aria-expanded={mobileView==="inbox"} onClick={(event)=>{setInboxAnchor(event.currentTarget);setMobileView("inbox");}}>Task List · {inbox.length}</button></div>} today={today} onToday={()=>{changeDate(today);setMobileView("day");}} onPrevious={()=>changeDate(tasksView==="running"?shiftDate(date,-7):shiftDate(date,-1))} onNext={()=>changeDate(tasksView==="running"?shiftDate(date,7):shiftDate(date,1))} view={tasksView} onView={chooseView}/>;}
  function rail(){return <PlannerRail workspaceId={workspaceFilter} onWorkspaceChange={(id)=>{setWorkspace(id);setFilters((current)=>({...current,groupId:""}));}} tasks={filtered} onOpen={openTask} groupId={groupFilter||undefined} tagIds={activeTags}
    today={today} boardDays={days} priorityIds={priorityIds} search={search} onSearch={setSearch} filters={activeFilters} onFilter={setFilters} onAnnounce={setAnnouncement}/>;}

  return <main className="muse-page muse-planner-page" data-task-density={density}>
    <MusePageHeader title="Planner"/>
    <MuseSectionNav label="Planner views" current={tab} items={plannerTabs.map((t) => ({ id: t.id, label: t.label, href: `/planner?${t.id === "tasks" ? "" : `view=${t.id}&`}date=${date}` }))}/>
    <PlannerCapture>{tab === "agenda" && <Agenda date={date} today={today} onDate={changeDate} onOpen={openTask} workspaceId={workspaceFilter || undefined}/>}
    {tab === "intentions" && <Intentions date={date} today={today} onDate={changeDate} requestedPeriod={query.get("period")} />}
    {tab === "reflections" && <Reflections date={date} today={today} onDate={changeDate} userId={profile.id} requestedPeriod={query.get("period")} />}
    {tab === "tasks" && <>{utilities()}
    {tasksView === "running" && <RunningList tasks={filtered} weekOf={date} today={today} timeZone={profile.timeZone} workspaceId={workspaceFilter} onWorkspaceChange={(id)=>{setWorkspace(id);setFilters((current)=>({...current,groupId:""}));}}
      search={search} onSearch={setSearch} filters={activeFilters} onFilter={setFilters} priorityIds={priorityIds} onOpen={openTask} onAnnounce={setAnnouncement}/>}
    {tasksView === "board" && <><div className="muse-planner-mobile-week"><WeekNavigator selectedDate={date} timeZone={profile.timeZone} onChange={(next) => { changeDate(next); setMobileView("day"); }} /></div>
    {state.activeTimer && <p className="muse-planner-timer-status" role="status">Timer running: {state.tasks.find((task) => task.id === state.activeTimer?.taskId)?.title}. <button className="text-button" type="button" onClick={(event) => { if (state.activeTimer) setDetail({ id: state.activeTimer.taskId, anchor: event.currentTarget }); }}>Open timer</button></p>}
    <div ref={workspaceRef} className="muse-planner-layout" data-dragging={dragging || undefined}
      onDragStartCapture={(e) => { if (e.dataTransfer.types.includes(TASK_DRAG_TYPE) || (e.target as Element).closest?.("[draggable=true]")) setDragging(true); }}
      onDragEndCapture={() => setDragging(false)} onDropCapture={() => setDragging(false)}>
      {rail()}
      <div className="muse-planning-canvas">
      <div className="muse-planner-board" id="planner-events" aria-label="Three-day rolling planning board">
        {days.map((day, index) => {
          const tasks = boardTasks.filter((task) => task.plannedDate === day);
          const canonicalTasks=boardCanonical.filter(task=>task.plannedDate===day);
          const events = state.events.filter((event) => event.date === day).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
          const estimated = tasks.reduce((total, task) => total + (task.estimatedMinutes ?? 0), 0);
          const label = dateLabel(day);
          return <section className="muse-planner-day" key={day} data-mobile-visible={index === 0} data-day-offset={index} aria-label={`${label}${index===0?", focused day":""}${day===today?", today":""}`} data-today={day === today}>
            <PlanningDropZone date={day} selected={index === 0} className={`muse-day-drop${day === today ? " muse-today-ring" : ""}`}><p className="muse-drop-hint" aria-hidden="true">Drop to plan for {new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}</p>
              <MuseMilestone achieved={canonicalTasks.length>0&&canonicalTasks.every(task=>task.complete)}/><header className="muse-planner-day-heading"><h2><time dateTime={day} aria-current={day===today?"date":undefined}>{new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}<strong>{Number(day.slice(8))}</strong></time>{(index === 0 || day === today) && <MuseStar size={30} color={day === today ? "aqua" : "purple"} />}</h2><p className="small-label">{tasks.length} {tasks.length === 1 ? "task" : "tasks"}{estimated > 0 ? ` · ${formatPlannedMinutes(estimated)} planned` : ""}{day===today?" · Today":index===0?" · Focused":""}</p>{canonicalTasks.length>0&&<p className="muse-planner-day-stars" aria-label={`${canonicalTasks.filter(task=>task.complete).length} of ${canonicalTasks.length} done`}>{canonicalTasks.slice(0,14).map((task,i)=><i key={task.id} data-done={task.complete||undefined} style={{"--i":i} as CSSProperties}/>)}{canonicalTasks.length>14&&<small>+{canonicalTasks.length-14}</small>}</p>}</header>
              <div className="muse-day-content">{events.length > 0 && <section className="muse-planner-events" aria-label={`Schedule for ${label}`}><h3>Schedule</h3>{events.map((event) => <p key={event.id}><time dateTime={event.dateTime}>{event.time}</time><span>{event.title}</span></p>)}</section>}
              <h3 className="muse-planner-task-label">Tasks</h3>{taskList(tasks)}
              {!tasks.length && <p className="muse-planner-empty">A little breathing room.</p>}
              </div><TaskQuickAdd date={day} workspaceId={workspaceFilter || undefined} groupId={groupFilter || undefined} tagIds={activeTags} />
            </PlanningDropZone>
          </section>;
        })}
      </div>
      </div>
    </div></>}</>}
    {mobileView==="inbox"&&<MuseDrawer title="Task List" returnFocus={inboxAnchor} onClose={()=>setMobileView("day")}><div className="muse-planner-sheet-body">{rail()}</div></MuseDrawer>}
    <div className="muse-sr-only" role="status">{announcement}</div>
    {detail && <TaskDetails key={`${detail.id}/${status?.discarded??0}`} taskId={detail.id} returnFocus={detail.anchor} onClose={() => { setDetail(null); setAnnouncement("Task details closed. Check the Planner save status for pending changes."); }} />}
  </PlannerCapture><footer className="muse-footer"><PlannerPersistenceStatus/></footer></main>;
}
