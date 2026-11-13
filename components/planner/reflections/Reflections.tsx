"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { MuseMark, type MuseMarkIcon, type MuseTone } from "@/components/design/MuseHeading";
import { createMuseBrowserClient } from "@/lib/supabase/client";
import { boardImageUrl, removeBoardImages, uploadBoardImage } from "@/lib/data/constellation-images";
import { glanceRange, glanceTitle, shiftGlance } from "@/lib/insights/glance";
import { canAddItem, guidedPrompts, hasContent, layoutById, layoutsFor, moduleType, periods, seedModules, switchLayout,
  type GuidedPrompt, type LayoutId, type LifeArea, type LifeRating, type ModuleContent, type ModuleType, type ReflectionImage, type ReflectionModule, type ReflectionPeriod } from "@/lib/reflections/model";
import { clearRating, readLifeAreas, readRatings, readReview, saveLifeArea, saveRating, saveReview, type Review } from "@/lib/reflections/persistence";
import Link from "next/link";
import { hasIntentions } from "@/lib/intentions/persistence";
import { intentionName, intentionRange } from "@/lib/intentions/periods";
import { MuseIcon } from "../../MuseIcon";
import "../intentions/Intentions.css";
import { MuseStar } from "../../MuseStar";
import { MuseChoiceMenu } from "../../MuseChoiceMenu";
import { PeriodTitle } from "../PeriodTitle";
import "./Reflections.css";

type Client = ReturnType<typeof createMuseBrowserClient>;
const uid = () => crypto.randomUUID();
const periodKey = "muse.reflections.period";
const isPeriod = (v: unknown): v is ReflectionPeriod => periods.some((p) => p.id === v);

/**
 * Planner → Reflections (#99): a modular memory book for a week, month or year. Starts from one of two layouts per
 * period; every section is the person's own words and pictures. Autosaves; nothing here touches other modules.
 */
export function Reflections({ date, today, onDate, userId, requestedPeriod }: { date: string; today: string; onDate: (d: string) => void; userId: string; requestedPeriod?: string | null }) {
  const clientRef = useRef<Client | null>(null), client = useCallback(() => clientRef.current ??= createMuseBrowserClient(), []);
  const [period, setPeriodState] = useState<ReflectionPeriod>(isPeriod(requestedPeriod) ? requestedPeriod : "week");
  // #117: a link's ?period= (from Intentions) wins; otherwise the last period used on this device.
  useEffect(() => { const t = window.setTimeout(() => { try { if (isPeriod(requestedPeriod)) { setPeriodState(requestedPeriod); localStorage.setItem(periodKey, requestedPeriod); return; } const v = localStorage.getItem(periodKey); if (isPeriod(v)) setPeriodState(v); } catch { /* defaults */ } }, 0); return () => window.clearTimeout(t); }, [requestedPeriod]);
  const setPeriod = (p: ReflectionPeriod) => { setPeriodState(p); try { localStorage.setItem(periodKey, p); } catch { /* this device */ } };
  const range = useMemo(() => glanceRange(period, date || today), [period, date, today]);
  const upload = useCallback(async (file: File, reviewId: string): Promise<ReflectionImage> => { const img = await uploadBoardImage(userId, reviewId, file, { allowJpeg: true }); return { id: img.id, path: img.path, thumbnailPath: img.thumbnailPath, alt: "", width: img.width, height: img.height }; }, [userId]);
  return <section className="muse-reflections" data-period={period} aria-label="Reflections">
    <div className="muse-reflections-toolbar">
      <PeriodTitle title={glanceTitle(range)} date={date || today} onChange={onDate} />
      <div className="muse-reflections-tools">
        <div className="muse-segmented" role="group" aria-label="Reflection period">{periods.map((p) => <button key={p.id} type="button" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>{p.label}</button>)}</div>
        <div className="muse-reflections-nav" role="group" aria-label={`Move by ${period}`}>
          <button type="button" className="muse-button" aria-label={`Previous ${period}`} onClick={() => onDate(shiftGlance(period, date || today, -1))}>‹</button>
          <button type="button" className="muse-button" onClick={() => onDate(today)}>Today</button>
          <button type="button" className="muse-button" aria-label={`Next ${period}`} onClick={() => onDate(shiftGlance(period, date || today, 1))}>›</button>
        </div>
      </div>
    </div>
    <PeriodBook key={`${period}/${range.start}`} period={period} start={range.start} end={range.end} today={today} client={client} upload={upload} />
    <IntentionsLink period={period} start={range.start} client={client} />
  </section>;
}

/** #117: the same period's Intentions (the "before" to this "after"). Neither page needs the other to exist. */
function IntentionsLink({ period, start, client }: { period: ReflectionPeriod; start: string; client: () => Client }) {
  const [exists, setExists] = useState<boolean | null>(null);
  useEffect(() => { let live = true; hasIntentions(client(), period, start).then((v) => { if (live) setExists(v); }).catch(() => { if (live) setExists(null); }); return () => { live = false; }; }, [client, period, start]);
  const name = intentionName(intentionRange(period, start));
  return <p className="muse-intentions-pair"><span className="muse-reflections-quiet">Before</span><Link className="muse-reflections-pill" href={`/planner?view=intentions&period=${period}&date=${start}`}>{exists ? `See your intentions for ${name}` : `Set intentions for ${name}`} <MuseIcon name="arrow" size={14} /></Link></p>;
}

/** One period's page. Keyed by period and start, so moving to another period starts fresh. */
function PeriodBook({ period, start: periodStart, end, today, client, upload }: { period: ReflectionPeriod; start: string; end: string; today: string; client: () => Client; upload: (f: File, id: string) => Promise<ReflectionImage> }) {
  const range = { start: periodStart, end };
  const [review, setReview] = useState<Review | null | undefined>(undefined), [error, setError] = useState(""), [status, setStatus] = useState("");
  const [editing, setEditing] = useState(false);
  const saved = useRef<Review | null>(null), timer = useRef<number | null>(null), queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => { let live = true;
    readReview(client(), period, range.start).then((r) => { if (live) { saved.current = r; setReview(r); } }).catch((e) => { if (live) { setReview(null); setError(e instanceof Error ? e.message : "Reflections couldn’t load."); } });
    return () => { live = false; }; }, [client, period, range.start]);

  /** Every change shows at once and saves shortly after, in order, against the last saved revision. */
  const change = useCallback((fn: (r: Review) => Review, delay = 700) => {
    setReview((cur) => { if (!cur) return cur; const next = fn(cur); if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { queue.current = queue.current.then(async () => { setStatus("Saving…");
        try { const out = await saveReview(client(), { ...next, revision: saved.current?.revision ?? 0 }); saved.current = out; setReview((c) => c && c.id === out.id ? { ...c, revision: out.revision } : c); setStatus("Saved"); }
        catch (e) { setStatus(""); setError(e instanceof Error ? e.message : "That didn’t save. Your words are still here."); } }); }, delay);
      return next; });
  }, [client]);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  async function start(layout: LayoutId) {
    const r: Review = { id: uid(), period, start: range.start, end: range.end, layout, modules: seedModules(layout), status: "draft", title: "", revision: 0 };
    setReview(r); setEditing(true); setStatus("Saving…");
    try { const out = await saveReview(client(), r); saved.current = out; setReview(out); setStatus("Saved"); } catch (e) { setError(e instanceof Error ? e.message : "That didn’t save."); }
  }
  return <>
    {error && <p className="muse-reflections-alert" role="alert">{error} <button type="button" className="muse-reflections-pill" onClick={() => setError("")}>Dismiss</button></p>}
    {review === undefined ? <p className="muse-reflections-quiet" role="status">Opening your memory book…</p>
      : review === null ? <LayoutPicker period={period} future={range.start > today} onPick={(id) => void start(id)} />
      : <ReviewBook review={review} editing={editing} setEditing={setEditing} status={status} change={change} client={client} upload={upload} today={today} />}
  </>;
}

// ---------- Choosing a layout ----------
function LayoutPreview({ id }: { id: LayoutId }) {
  const l = layoutById(id)!;
  return <div className="muse-reflections-mini" data-mood={l.mood} aria-hidden="true">{l.seeds.map((s, i) => <span key={i} data-size={s.size ?? moduleType(s.type).size}>{moduleType(s.type).emoji}</span>)}</div>;
}
function LayoutPicker({ period, future, onPick, current, onCancel }: { period: ReflectionPeriod; future?: boolean; onPick: (id: LayoutId) => void; current?: string; onCancel?: () => void }) {
  return <div className="muse-reflections-picker">
    {!current && <header><p className="muse-reflections-kicker">A fresh page <MuseStar size={14} prismatic /></p><h2>How would you like to remember this {period}?</h2>
      <p className="muse-reflections-quiet">{future ? "This hasn’t happened yet, but you can set up the page now." : "Pick a starting layout. Each layout is a short, set page: three favorites, three wins and a few reflections."}</p></header>}
    <div className="muse-reflections-layouts">{layoutsFor(period).map((l) => <button key={l.id} type="button" className="muse-reflections-layout" data-mood={l.mood} aria-pressed={current === l.id} onClick={() => onPick(l.id)}>
      <LayoutPreview id={l.id} /><strong>{l.name}</strong><span>{l.tagline}</span><small>{l.seeds.map((s) => s.title ?? moduleType(s.type).defaultTitle).join(" · ")}</small></button>)}</div>
    {onCancel && <button type="button" className="muse-reflections-pill" onClick={onCancel}>Keep my current layout</button>}
  </div>;
}

// ---------- The review ----------
type Change = (fn: (r: Review) => Review, delay?: number) => void;
function ReviewBook({ review, editing, setEditing, status, change, client, upload, today }: { review: Review; editing: boolean; setEditing: (v: boolean) => void; status: string; change: Change; client: () => Client; upload: (f: File, id: string) => Promise<ReflectionImage>; today: string }) {
  const layout = layoutById(review.layout), [switching, setSwitching] = useState<null | "pick" | LayoutId>(null);
  const setModules = (fn: (m: ReflectionModule[]) => ReflectionModule[], delay?: number) => change((r) => ({ ...r, modules: fn(r.modules) }), delay);
  const visible = review.modules.filter((m) => editing || (!m.hidden && (hasContent(m) || m.type === "level10")));
  const plan = typeof switching === "string" && switching !== "pick" ? switchLayout(review.modules, switching) : null;
  return <article className="muse-reflections-book" data-mood={layout?.mood ?? "cozy"} data-editing={editing || undefined}>
    <header className="muse-reflections-cover">
      <div><p className="muse-reflections-kicker">{layout?.name ?? "Reflection"} <MuseStar size={14} prismatic />{review.status === "complete" && <span className="muse-reflections-badge">✓ Complete</span>}</p>
        {editing ? <input className="muse-reflections-title-input" aria-label="Title for this reflection" maxLength={120} value={review.title} placeholder="Give this chapter a name…" onChange={(e) => change((r) => ({ ...r, title: e.target.value }))} />
          : <h2>{review.title || (review.period === "week" ? "A week to remember" : review.period === "month" ? "This month, remembered" : "My year")}</h2>}</div>
      <div className="muse-reflections-actions">
        <span className="muse-reflections-quiet" role="status">{status}</span>
        {editing && <button type="button" className="muse-reflections-pill" onClick={() => setSwitching("pick")}>Change layout</button>}
        <button type="button" className="muse-reflections-pill" onClick={() => change((r) => ({ ...r, status: r.status === "complete" ? "draft" : "complete" }), 0)}>{review.status === "complete" ? "Reopen as draft" : "✓ Mark complete"}</button>
        <button type="button" className="muse-button button-primary" onClick={() => setEditing(!editing)}>{editing ? "Done" : "✎ Edit"}</button>
      </div>
    </header>

    {switching === "pick" && <LayoutPicker period={review.period} current={review.layout} onPick={(id) => id === review.layout ? setSwitching(null) : setSwitching(id)} onCancel={() => setSwitching(null)} />}
    {plan && typeof switching === "string" && switching !== "pick" && <div className="muse-reflections-confirm" role="alertdialog" aria-label="Confirm layout change">
      <p><strong>Switch to {layoutById(switching)!.name}?</strong> Nothing you wrote is removed.</p>
      <ul>{plan.merged > 0 && <li>{plan.merged} {plan.merged === 1 ? "section moves" : "sections move"} into matching sections of the new layout.</li>}
        {plan.carried.length > 0 && <li>Kept after the new sections: {plan.carried.join(", ")}.</li>}
        <li>Empty sections from the old layout are replaced. Level 10 Life ratings are always kept.</li></ul>
      <div className="muse-reflections-actions"><button type="button" className="muse-button button-primary" onClick={() => { change((r) => ({ ...r, layout: switching, modules: plan.modules }), 0); setSwitching(null); }}>Switch layout</button>
        <button type="button" className="muse-reflections-pill" onClick={() => setSwitching(null)}>Cancel</button></div>
    </div>}

    <div className="muse-reflections-grid">
      {visible.map((m) => <ModuleFrame key={m.id} module={m} editing={editing}
        onChange={(next, delay) => setModules((list) => list.map((x) => x.id === m.id ? next : x), delay)}
      >
        <ModuleBody module={m} editing={editing} review={review} client={client} upload={upload} today={today} onChange={(content, delay) => setModules((list) => list.map((x) => x.id === m.id ? { ...x, content } as ReflectionModule : x), delay)} />
      </ModuleFrame>)}
      {!editing && visible.length === 0 && <div className="muse-reflections-empty"><MuseStar size={20} prismatic /><p>This page is waiting for its first memory.</p><button type="button" className="muse-button button-primary" onClick={() => setEditing(true)}>Start writing</button></div>}
    </div>

  </article>;
}

/** #12: a gentle line for a section that's still empty while editing — an invitation, not a blank box. */
const invitations: Partial<Record<ModuleType, string>> = {
  memories: "A dinner, a walk, a laugh — the little stories worth keeping.",
  highlights: "Big or small, every win counts. Name a few.",
  favorites: "The finds you’d tell a friend about.",
  photos: "A few pictures that hold this chapter.",
  music: "The songs that played on repeat.",
  books: "What you read, and what stayed with you.",
  watching: "The movies and shows you loved (or couldn’t stop talking about).",
};
const isEmptyContent = (m: ReflectionModule) => m.type !== "level10" && m.type !== "guided" && m.type !== "writing" && !hasContent(m);

/** Guided reflections each get their own tile, so a page of them never reads as one repeated icon. */
const guidedMarks: Record<string, [MuseMarkIcon, MuseTone]> = { gratitude: ["heart", 2], growth: ["seedling", 1], lessons: ["lightbulb", 4], intentions: ["compass", 6], challenges: ["summit", 8], happy: ["smile", 3], custom: ["quill", 7] };
function ModuleFrame({ module: m, editing, onChange, children }: { module: ReflectionModule; editing: boolean; onChange: (m: ReflectionModule, delay?: number) => void; children: ReactNode }) {
  const meta = moduleType(m.type), prompt = m.type === "guided" ? (m.content as ModuleContent["guided"]).prompt : undefined, [glyph, tone] = (prompt && guidedMarks[prompt]) || [meta.glyph as MuseMarkIcon, meta.tone as MuseTone];
  const invite = editing && isEmptyContent(m) ? invitations[m.type] : undefined;
  return <section className="muse-reflections-module" style={{"--aura":`var(--chart-${tone})`} as CSSProperties} data-type={m.type} data-prompt={prompt} data-size={m.size} data-hidden={m.hidden || undefined} data-empty={invite ? true : undefined} aria-label={m.title}>
    <header className="muse-reflections-module-head">
      <MuseMark icon={glyph} tone={tone} size="sm" className="muse-section-mark"/>
      {editing ? <input className="muse-reflections-module-title" aria-label="Section title" maxLength={60} value={m.title} onChange={(e) => onChange({ ...m, title: e.target.value })} />
        : <h3>{m.title}</h3>}
    </header>
    {invite && <p className="muse-reflections-invite">{invite}</p>}
    {children}
  </section>;
}

// ---------- Images ----------
function Picture({ image, className }: { image?: ReflectionImage; className?: string }) {
  const [url, setUrl] = useState(image && "url" in image ? image.url : ""), [failed, setFailed] = useState(false);
  useEffect(() => { if (!image || "url" in image) return; let live = true; boardImageUrl(image.thumbnailPath).then((u) => { if (live) setUrl(u); }).catch(() => { if (live) setFailed(true); }); return () => { live = false; }; }, [image]);
  if (!image) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return failed ? <span className={`${className ?? ""} muse-reflections-missing`}>Image unavailable</span> : url ? <img className={className} src={url} alt={image.alt} onError={() => setFailed(true)} /> : <span className={`${className ?? ""} muse-reflections-loading`} aria-hidden="true" />;
}
function ImageField({ label, image, onChange, upload, reviewId }: { label: string; image?: ReflectionImage; onChange: (img?: ReflectionImage) => void; upload: (f: File, id: string) => Promise<ReflectionImage>; reviewId: string }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [url, setUrl] = useState(""), file = useRef<HTMLInputElement>(null);
  return <div className="muse-reflections-imagefield">
    {image ? <div className="muse-reflections-imagepreview"><Picture image={image} /><button type="button" className="muse-reflections-pill" onClick={() => { if (!("url" in image)) void removeBoardImages([{ ...image, name: "", mime: "image/webp" }] as never).catch(() => {}); onChange(undefined); }}>Remove {label.toLowerCase()}</button></div>
      : <div className="muse-reflections-imagepick">
        <button type="button" className="muse-reflections-pill" disabled={busy} onClick={() => file.current?.click()}>{busy ? "Uploading…" : `＋ ${label}`}</button>
        <input className="muse-reflections-input" aria-label={`${label} link (https)`} placeholder="or paste an https image link" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (/^https:\/\/\S+$/.test(url)) { onChange({ id: uid(), url, alt: "" }); setUrl(""); } else setError("Use an https link."); } }} />
      </div>}
    <input ref={file} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; setBusy(true); setError(""); try { onChange(await upload(f, reviewId)); } catch (err) { setError(err instanceof Error ? err.message : "That image didn’t upload."); } finally { setBusy(false); } }} />
    {error && <p className="muse-reflections-alert" role="alert">{error}</p>}
  </div>;
}

// ---------- Module bodies ----------
type Body = { module: ReflectionModule; editing: boolean; review: Review; client: () => Client; upload: (f: File, id: string) => Promise<ReflectionImage>; today: string; onChange: (c: ModuleContent[ModuleType], delay?: number) => void };
function Stars({ value, onChange, label }: { value?: number; onChange?: (v?: number) => void; label: string }) {
  if (!onChange) return value ? <span className="muse-reflections-stars" aria-label={`${label}: ${value} of 5`}>{"★".repeat(value)}<i>{"★".repeat(5 - value)}</i></span> : null;
  return <span className="muse-reflections-stars" role="group" aria-label={label}>{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-pressed={!!value && n <= value} aria-label={`${n} of 5`} onClick={() => onChange(value === n ? undefined : n)}>★</button>)}</span>;
}
const Field = ({ label, value, onChange, multiline, placeholder, max = 200 }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string; max?: number }) =>
  multiline ? <textarea className="muse-reflections-input" aria-label={label} placeholder={placeholder ?? label} maxLength={max} value={value} rows={3} onChange={(e) => onChange(e.target.value)} />
    : <input className="muse-reflections-input" aria-label={label} placeholder={placeholder ?? label} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} />;
function itemsOps<T extends { id: string }>(items: T[], set: (items: T[], delay?: number) => void) {
  return { update: (id: string, patch: Partial<T>) => set(items.map((i) => i.id === id ? { ...i, ...patch } : i)), remove: (id: string) => set(items.filter((i) => i.id !== id), 0), add: (item: T) => set([...items, item], 0) };
}
const Remove = ({ onClick, label }: { onClick: () => void; label: string }) => <button type="button" className="muse-reflections-icon" aria-label={label} onClick={onClick}>×</button>;
const AddItem = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => <button type="button" className="muse-reflections-additem" onClick={onClick}><MuseIcon name="plus" size={14} />{children}</button>;
const Nothing = ({ children }: { children: ReactNode }) => <p className="muse-reflections-quiet">{children}</p>;

function ModuleBody(p: Body) {
  switch (p.module.type) {
    case "memories": return <Memories {...p} />;
    case "photos": return <Photos {...p} />;
    case "music": return <Music {...p} />;
    case "books": case "watching": return <Shelf {...p} />;
    case "favorites": return <Favorites {...p} />;
    case "highlights": return <Highlights {...p} />;
    case "guided": return <Guided {...p} />;
    case "writing": return <Writing {...p} />;
    case "level10": return <Level10 review={p.review} client={p.client} editing={p.editing} />;
  }
}

function Memories({ module, editing, onChange, upload, review }: Body) {
  const c = module.content as ModuleContent["memories"], ops = itemsOps(c.items, (items, d) => onChange({ items }, d));
  if (!editing) return c.items.length ? <div className="muse-reflections-memories">{c.items.map((m, i) => <figure key={m.id} className="muse-reflections-memory" data-tilt={i % 3}>
    {m.photos.length > 0 && <div className="muse-reflections-polaroids">{m.photos.slice(0, 3).map((ph) => <Picture key={ph.id} image={ph} />)}</div>}
    <figcaption>{m.date && <time dateTime={m.date}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${m.date}T12:00:00Z`))}</time>}{m.title && <strong>{m.title}</strong>}{m.text && <p>{m.text}</p>}{m.caption && <small>{m.caption}</small>}</figcaption></figure>)}</div> : <Nothing>No memories yet.</Nothing>;
  return <div className="muse-reflections-editlist">{c.items.map((m) => <div key={m.id} className="muse-reflections-edititem">
    <div className="muse-reflections-row"><Field label="Memory title" value={m.title} onChange={(title) => ops.update(m.id, { title })} /><input className="muse-reflections-input" type="date" aria-label="Date (optional)" value={m.date ?? ""} onChange={(e) => ops.update(m.id, { date: e.target.value || undefined })} /><Remove label={`Remove ${m.title || "memory"}`} onClick={() => ops.remove(m.id)} /></div>
    <Field label="What happened" multiline max={4000} value={m.text} onChange={(text) => ops.update(m.id, { text })} placeholder="Tell the little story…" />
    <div className="muse-reflections-photostrip">{m.photos.map((ph) => <div key={ph.id}><Picture image={ph} /><Remove label="Remove photo" onClick={() => { if (!("url" in ph)) void removeBoardImages([{ ...ph, name: "", mime: "image/webp" }] as never).catch(() => {}); ops.update(m.id, { photos: m.photos.filter((x) => x.id !== ph.id) }); }} /></div>)}
      {m.photos.length < 8 && <ImageField label="Photo" upload={upload} reviewId={review.id} onChange={(img) => img && ops.update(m.id, { photos: [...m.photos, img] })} />}</div>
    <Field label="Caption (optional)" value={m.caption} onChange={(caption) => ops.update(m.id, { caption })} />
  </div>)}{canAddItem("memories", c.items.length) && <AddItem onClick={() => ops.add({ id: uid(), title: "", text: "", caption: "", photos: [] })}>Add a memory</AddItem>}</div>;
}

function Photos({ module, editing, onChange, upload, review }: Body) {
  const c = module.content as ModuleContent["photos"], set = (items: typeof c.items, d?: number) => onChange({ ...c, items }, d), ops = itemsOps(c.items, set);
  if (!editing) return c.items.some((i) => i.photo) ? <div className="muse-reflections-photos" data-variant={c.variant}>{c.items.filter((i) => i.photo).map((i) => <figure key={i.id}><Picture image={i.photo} />{i.caption && <figcaption>{i.caption}</figcaption>}</figure>)}</div> : <Nothing>No photos yet.</Nothing>;
  return <div className="muse-reflections-editlist">
    <div className="muse-segmented" role="group" aria-label="Photo layout">{(["single", "pair", "gallery"] as const).map((v) => <button key={v} type="button" aria-pressed={c.variant === v} onClick={() => onChange({ ...c, variant: v }, 0)}>{v === "single" ? "Single" : v === "pair" ? "Pair" : "Gallery"}</button>)}</div>
    <div className="muse-reflections-photogrid">{c.items.map((i) => <div key={i.id} className="muse-reflections-edititem">{i.photo ? <Picture image={i.photo} /> : <ImageField label="Photo" upload={upload} reviewId={review.id} onChange={(photo) => ops.update(i.id, { photo })} />}
      <Field label="Caption" value={i.caption} onChange={(caption) => ops.update(i.id, { caption })} /><Remove label="Remove photo" onClick={() => { if (i.photo && !("url" in i.photo)) void removeBoardImages([{ ...i.photo, name: "", mime: "image/webp" }] as never).catch(() => {}); ops.remove(i.id); }} /></div>)}</div>
    {canAddItem("photos", c.items.length) && <AddItem onClick={() => ops.add({ id: uid(), caption: "" })}>Add a photo</AddItem>}</div>;
}

function Music({ module, editing, onChange, upload, review }: Body) {
  const c = module.content as ModuleContent["music"], ops = itemsOps(c.items, (items, d) => onChange({ items }, d));
  if (!editing) return c.items.length ? <ul className="muse-reflections-songs">{c.items.map((s, i) => <li key={s.id} className="muse-reflections-song" style={{ "--hue": `${(i * 47) % 360}deg` } as CSSProperties}>
    <div className="muse-reflections-art">{s.art ? <Picture image={s.art} /> : <span aria-hidden="true">♪</span>}</div>
    <div className="muse-reflections-song-body"><strong>{s.title || "Untitled song"}</strong>{s.artist && <span>{s.artist}</span>}<i className="muse-reflections-wave" aria-hidden="true" />{s.note && <p>{s.note}</p>}
      {s.link && <a className="muse-reflections-pill" href={s.link} target="_blank" rel="noopener noreferrer">Listen elsewhere ↗</a>}</div></li>)}</ul> : <Nothing>No songs yet.</Nothing>;
  return <div className="muse-reflections-editlist">{c.items.map((s) => <div key={s.id} className="muse-reflections-edititem">
    <div className="muse-reflections-row"><Field label="Song" value={s.title} onChange={(title) => ops.update(s.id, { title })} /><Field label="Artist" value={s.artist} onChange={(artist) => ops.update(s.id, { artist })} /><Remove label={`Remove ${s.title || "song"}`} onClick={() => ops.remove(s.id)} /></div>
    <Field label="Why it was on repeat (optional)" value={s.note} onChange={(note) => ops.update(s.id, { note })} max={600} />
    <div className="muse-reflections-row"><input className="muse-reflections-input" aria-label="Link (optional, https)" placeholder="Link (optional, https)" value={s.link ?? ""} onChange={(e) => ops.update(s.id, { link: /^https:\/\/\S+$/.test(e.target.value) ? e.target.value : e.target.value ? s.link : undefined })} />
      <ImageField label="Artwork" image={s.art} upload={upload} reviewId={review.id} onChange={(art) => ops.update(s.id, { art })} /></div>
  </div>)}{canAddItem("music", c.items.length) && <AddItem onClick={() => ops.add({ id: uid(), title: "", artist: "", note: "" })}>Add a song</AddItem>}</div>;
}

function Shelf({ module, editing, onChange, upload, review }: Body) {
  const books = module.type === "books";
  type Item = ModuleContent["books"]["items"][number] & ModuleContent["watching"]["items"][number];
  const items = (module.content as { items: Item[] }).items, ops = itemsOps(items, (next, d) => onChange({ items: next } as never, d));
  const imageOf = (i: Item) => books ? i.cover : i.poster;
  if (!editing) return items.length ? <ul className="muse-reflections-shelf">{items.map((i) => <li key={i.id}>
    <div className="muse-reflections-cover-art">{imageOf(i) ? <Picture image={imageOf(i)} /> : <span aria-hidden="true">{books ? "📖" : i.kind === "show" ? "📺" : "🎬"}</span>}</div>
    <strong>{i.title || "Untitled"}</strong>{books ? i.author && <span>{i.author}</span> : <span>{i.kind === "show" ? "Show" : "Movie"}</span>}<Stars value={i.rating} label="Rating" />{i.note && <p>{i.note}</p>}</li>)}</ul> : <Nothing>Nothing here yet.</Nothing>;
  return <div className="muse-reflections-editlist">{items.map((i) => <div key={i.id} className="muse-reflections-edititem">
    <div className="muse-reflections-row"><Field label="Title" value={i.title} onChange={(title) => ops.update(i.id, { title })} />
      {books ? <Field label="Author" value={i.author ?? ""} onChange={(author) => ops.update(i.id, { author })} />
        : <div className="muse-segmented" role="group" aria-label="Movie or show">{(["movie", "show"] as const).map((k) => <button key={k} type="button" aria-pressed={i.kind === k} onClick={() => ops.update(i.id, { kind: k })}>{k === "movie" ? "Movie" : "Show"}</button>)}</div>}
      <Remove label={`Remove ${i.title || "item"}`} onClick={() => ops.remove(i.id)} /></div>
    <div className="muse-reflections-row"><Stars value={i.rating} label="Rating" onChange={(rating) => ops.update(i.id, { rating })} /><ImageField label={books ? "Cover" : "Poster"} image={imageOf(i)} upload={upload} reviewId={review.id} onChange={(img) => ops.update(i.id, books ? { cover: img } : { poster: img })} /></div>
    <Field label="A note (optional)" value={i.note} onChange={(note) => ops.update(i.id, { note })} max={600} />
  </div>)}{canAddItem(module.type, items.length) && <AddItem onClick={() => ops.add(books ? { id: uid(), title: "", author: "", note: "" } as Item : { id: uid(), title: "", kind: "movie", note: "" } as Item)}>{books ? "Add a book" : "Add a movie or show"}</AddItem>}
    <p className="muse-reflections-quiet">These stay in this reflection; Collections and Bookshelf aren’t changed.</p></div>;
}

function Favorites({ module, editing, onChange, upload, review }: Body) {
  const c = module.content as ModuleContent["favorites"], ops = itemsOps(c.items, (items, d) => onChange({ items }, d));
  if (!editing) return c.items.length ? <ul className="muse-reflections-favorites">{c.items.map((f) => <li key={f.id}>{f.image ? <Picture image={f.image} /> : <span className="muse-reflections-fav-glyph" aria-hidden="true">💖</span>}
    <div>{f.category && <small>{f.category}</small>}<strong>{f.name || "A favorite"}</strong>{f.description && <p>{f.description}</p>}</div></li>)}</ul> : <Nothing>No favorites yet.</Nothing>;
  return <div className="muse-reflections-editlist">{c.items.map((f) => <div key={f.id} className="muse-reflections-edititem">
    <div className="muse-reflections-row"><Field label="Favorite" value={f.name} onChange={(name) => ops.update(f.id, { name })} /><Field label="Category (food, place, find…)" value={f.category} onChange={(category) => ops.update(f.id, { category })} max={60} /><Remove label={`Remove ${f.name || "favorite"}`} onClick={() => ops.remove(f.id)} /></div>
    <Field label="Why you loved it (optional)" value={f.description} onChange={(description) => ops.update(f.id, { description })} max={600} />
    <ImageField label="Image" image={f.image} upload={upload} reviewId={review.id} onChange={(image) => ops.update(f.id, { image })} />
  </div>)}{canAddItem("favorites", c.items.length) && <AddItem onClick={() => ops.add({ id: uid(), name: "", category: "", description: "" })}>Add a favorite</AddItem>}</div>;
}

const highlightKinds = [{ id: "win", label: "Win", emoji: "🏆" }, { id: "achievement", label: "Achievement", emoji: "🎖️" }, { id: "experience", label: "Experience", emoji: "✨" }, { id: "moment", label: "Moment", emoji: "💫" }, { id: "milestone", label: "Milestone", emoji: "🌟" }] as const;
function Highlights({ module, editing, onChange }: Body) {
  const c = module.content as ModuleContent["highlights"], ops = itemsOps(c.items, (items, d) => onChange({ items }, d));
  if (!editing) return c.items.some((h) => h.text.trim()) ? <ul className="muse-reflections-highlights">{c.items.filter((h) => h.text.trim()).map((h) => { const k = highlightKinds.find((x) => x.id === h.kind)!; return <li key={h.id} data-kind={h.kind}><span aria-hidden="true">{k.emoji}</span><span className="sr-only">{k.label}: </span>{h.text}</li>; })}</ul> : <Nothing>No highlights yet.</Nothing>;
  return <div className="muse-reflections-editlist">{c.items.map((h) => <div key={h.id} className="muse-reflections-row">
    <MuseChoiceMenu label="Kind of highlight" valueLabel={`${highlightKinds.find((k) => k.id === h.kind)!.emoji} ${highlightKinds.find((k) => k.id === h.kind)!.label}`} options={highlightKinds.map((k) => ({ id: k.id, label: `${k.emoji} ${k.label}` }))} selectedIds={[h.kind]} onSelect={(kind) => ops.update(h.id, { kind: kind as typeof h.kind })} />
    <Field label="Highlight" value={h.text} onChange={(text) => ops.update(h.id, { text })} max={400} /><Remove label="Remove highlight" onClick={() => ops.remove(h.id)} /></div>)}
    {canAddItem("highlights", c.items.length) && <AddItem onClick={() => ops.add({ id: uid(), text: "", kind: "win" })}>Add a win</AddItem>}</div>;
}

function Guided({ module, editing, onChange }: Body) {
  const c = module.content as ModuleContent["guided"], prompt = guidedPrompts.find((g) => g.id === c.prompt)!, question = c.prompt === "custom" ? c.question : prompt.question;
  const ops = itemsOps(c.entries, (entries, d) => onChange({ ...c, entries }, d));
  if (!editing) return c.entries.some((e) => e.text.trim()) ? <div className="muse-reflections-guided">{question && <p className="muse-reflections-question">{question}</p>}<ul>{c.entries.filter((e) => e.text.trim()).map((e) => <li key={e.id}>{e.text}</li>)}</ul></div> : <Nothing>{question || "Nothing written yet."}</Nothing>;
  return <div className="muse-reflections-editlist">
    <div className="muse-reflections-row"><MuseChoiceMenu label="Reflection prompt" valueLabel={prompt.label} options={guidedPrompts.map((g) => ({ id: g.id, label: g.label }))} selectedIds={[c.prompt]} onSelect={(id) => onChange({ ...c, prompt: id as GuidedPrompt }, 0)} />
      {c.prompt === "custom" && <Field label="Your question" value={c.question} onChange={(q) => onChange({ ...c, question: q })} />}</div>
    {question && c.prompt !== "custom" && <p className="muse-reflections-question">{question}</p>}
    {c.entries.map((e) => <div key={e.id} className="muse-reflections-row"><Field label="Answer" value={e.text} onChange={(text) => ops.update(e.id, { text })} max={1000} multiline /><Remove label="Remove answer" onClick={() => ops.remove(e.id)} /></div>)}
    {canAddItem("guided", c.entries.length) && <AddItem onClick={() => ops.add({ id: uid(), text: "" })}>Add an answer</AddItem>}</div>;
}

function Writing({ module, editing, onChange }: Body) {
  const c = module.content as ModuleContent["writing"];
  if (!editing) return c.text.trim() ? <div className="muse-reflections-writing">{c.text.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}</div> : <Nothing>Nothing written yet.</Nothing>;
  return <textarea className="muse-reflections-input muse-reflections-longform" aria-label={`${module.title}: your words`} maxLength={20000} rows={8} value={c.text} placeholder="Write anything. Leave a blank line between paragraphs." onChange={(e) => onChange({ text: e.target.value }, 900)} />;
}

// ---------- Level 10 Life ----------
/** #12: a little personality per life area, matched by name so renamed or custom areas still get a fitting icon. */
const areaIcons: [RegExp, string][] = [[/health|fitness|body|wellness/i, "💪"], [/financ|money|wealth/i, "💰"], [/friend|social/i, "🫶"], [/growth|learn|mind/i, "🌱"],
  [/home|environment|space/i, "🏡"], [/career|work|business/i, "💼"], [/family|kid/i, "👨‍👩‍👧"], [/romance|love|partner|relationship/i, "💞"], [/fun|recreation|play|hobb/i, "🎉"],
  [/spirit|faith|soul/i, "🔮"], [/creat|art/i, "🎨"], [/travel|advent/i, "✈️"]];
const areaIcon = (label: string) => areaIcons.find(([re]) => re.test(label))?.[1] ?? "✦";
/** The wheel of life: one wedge per area, reaching out to its rating; rings mark 2, 4, 6, 8 and 10. */
const r2 = (n: number) => Math.round(n * 100) / 100;
function LifeWheel({ areas, ratings, avg }: { areas: LifeArea[]; ratings: LifeRating[]; avg: number | null }) {
  const n = Math.max(areas.length, 1), C = 150, R = 118, pt = (deg: number, r: number) => `${r2(C + r * Math.cos(deg * Math.PI / 180))} ${r2(C + r * Math.sin(deg * Math.PI / 180))}`;
  const wedge = (k: number, r: number) => { const a0 = -90 + k * 360 / n + 1.2, a1 = -90 + (k + 1) * 360 / n - 1.2; return `M${C} ${C}L${pt(a0, r)}A${r} ${r} 0 0 1 ${pt(a1, r)}Z`; };
  return <figure className="muse-l10-wheel" aria-label={`Life wheel: ${areas.map((a) => `${a.label} ${ratings.find((r) => r.areaId === a.id)?.rating ?? "not rated"}`).join(", ")}`}>
    <svg viewBox="0 0 300 300" aria-hidden="true">
      <defs>{areas.map((a) => <radialGradient key={a.id} id={`l10-${a.id}`} cx={C} cy={C} r={R} gradientUnits="userSpaceOnUse"><stop offset=".15" stopColor={a.color} stopOpacity=".35" /><stop offset="1" stopColor={a.color} /></radialGradient>)}</defs>
      {[2, 4, 6, 8, 10].map((v) => <circle key={v} className="muse-l10-ring" data-outer={v === 10 || undefined} cx={C} cy={C} r={r2(R * v / 10)} />)}
      {areas.map((a, k) => <path key={`b-${a.id}`} className="muse-l10-wedge-bg" d={wedge(k, R)} />)}
      {areas.map((a, k) => { const rating = ratings.find((r) => r.areaId === a.id)?.rating; return rating ? <path key={a.id} className="muse-l10-wedge" d={wedge(k, R * rating / 10)} fill={`url(#l10-${a.id})`} style={{ "--i": k } as CSSProperties} /> : null; })}
      {areas.map((a, k) => { const mid = -90 + (k + .5) * 360 / n, [x, y] = pt(mid, R + 18).split(" "); return <text key={`t-${a.id}`} x={x} y={y} textAnchor="middle" dominantBaseline="central" className="muse-l10-wheel-icon">{areaIcon(a.label)}</text>; })}
      <circle className="muse-l10-hub" cx={C} cy={C} r="34" />
    </svg>
    <figcaption><b>{avg ?? "—"}</b><small>{avg === null ? "not rated" : "average"}</small></figcaption>
  </figure>;
}
function Level10({ review, client, editing }: { review: Review; client: () => Client; editing: boolean }) {
  const [areas, setAreas] = useState<LifeArea[] | null>(null), [ratings, setRatings] = useState<LifeRating[]>([]), [error, setError] = useState(""), [manage, setManage] = useState(false);
  useEffect(() => { let live = true; Promise.all([readLifeAreas(client()), readRatings(client(), review.period, review.start)]).then(([a, r]) => { if (live) { setAreas(a); setRatings(r); } }).catch((e) => { if (live) setError(e instanceof Error ? e.message : "Level 10 Life couldn’t load."); }); return () => { live = false; }; }, [client, review.period, review.start]);
  async function rate(area: LifeArea, value: number | null, note?: string) {
    const cur = ratings.find((r) => r.areaId === area.id); setError("");
    try {
      if (value === null) { if (cur?.id) { await clearRating(client(), cur.id); setRatings((l) => l.filter((r) => r.areaId !== area.id)); } return; }
      const optimistic = { ...(cur ?? { areaId: area.id, note: "", revision: 0 }), rating: value, note: note ?? cur?.note ?? "" };
      setRatings((l) => [...l.filter((r) => r.areaId !== area.id), optimistic]);
      const saved = await saveRating(client(), review.period, review.start, review.end, optimistic); setRatings((l) => [...l.filter((r) => r.areaId !== area.id), saved]);
    } catch (e) { setError(e instanceof Error ? e.message : "That rating didn’t save."); }
  }
  async function editArea(a: LifeArea) { try { const s = await saveLifeArea(client(), a); setAreas((l) => l ? l.map((x) => x.id === s.id ? s : x) : l); } catch (e) { setError(e instanceof Error ? e.message : "That didn’t save."); } }
  if (error && !areas) return <p className="muse-reflections-alert" role="alert">{error}</p>;
  if (!areas) return <Nothing>Gathering your life areas…</Nothing>;
  const active = areas.filter((a) => !a.archived), rated = ratings.filter((r) => active.some((a) => a.id === r.areaId)), avg = rated.length ? Math.round(rated.reduce((n, r) => n + r.rating, 0) / rated.length * 10) / 10 : null;
  return <div className="muse-reflections-l10">
    <p className="muse-reflections-quiet">{rated.length ? `${rated.length} of ${active.length} areas rated · average ${avg}.` : editing ? "Tap a bar to rate each area from 1 to 10." : "No ratings for this period yet."} This {review.period}’s ratings stand on their own; they aren’t averaged from other periods.</p>
    <div className="muse-l10-layout"><LifeWheel areas={active} ratings={rated} avg={avg} />
    <ul className="muse-reflections-l10-grid">{active.map((a) => { const r = ratings.find((x) => x.areaId === a.id);
      return <li key={a.id} style={{ "--area": a.color } as CSSProperties} data-rated={r ? true : undefined}>
        <span className="muse-reflections-l10-icon" aria-hidden="true">{areaIcon(a.label)}</span>
        <span className="muse-reflections-l10-label">{a.label}</span>
        <span className="muse-reflections-l10-bar" role={editing ? "radiogroup" : "img"} aria-label={editing ? `Rate ${a.label}` : `${a.label}: ${r ? `${r.rating} of 10` : "not rated"}`}>
          {Array.from({ length: 10 }, (_, i) => editing
            ? <button key={i} type="button" role="radio" style={{ "--i": i } as CSSProperties} aria-checked={r?.rating === i + 1} aria-label={`${a.label} ${i + 1} of 10`} data-on={!!r && i < r.rating || undefined} onClick={() => void rate(a, r?.rating === i + 1 ? null : i + 1)} />
            : <i key={i} style={{ "--i": i } as CSSProperties} data-on={!!r && i < r.rating || undefined} />)}
        </span>
        <b className="muse-reflections-l10-value">{r ? r.rating : "—"}</b>
        {editing ? r && <input className="muse-reflections-input muse-reflections-l10-note" aria-label={`Note for ${a.label}`} maxLength={500} placeholder="A note (optional)" defaultValue={r.note} onBlur={(e) => { if (e.target.value !== r.note) void rate(a, r.rating, e.target.value); }} />
          : r?.note && <small className="muse-reflections-l10-note">{r.note}</small>}
      </li>; })}</ul></div>
    {error && <p className="muse-reflections-alert" role="alert">{error}</p>}
    {editing && <details className="muse-reflections-l10-manage" open={manage} onToggle={(e) => setManage((e.target as HTMLDetailsElement).open)}><summary>Rename or recolor areas</summary>
      <p className="muse-reflections-quiet">Renaming keeps each area’s history. Archiving hides an area from new ratings; past ratings stay.</p>
      {areas.map((a) => <AreaEditor key={a.id} area={a} onSave={editArea} />)}</details>}
  </div>;
}
function AreaEditor({ area, onSave }: { area: LifeArea; onSave: (a: LifeArea) => void }) {
  const [label, setLabel] = useState(area.label);
  return <div className="muse-reflections-row" data-archived={area.archived || undefined}>
    <input type="color" aria-label={`Color for ${area.label}`} value={area.color} onChange={(e) => onSave({ ...area, color: e.target.value })} />
    <input className="muse-reflections-input" aria-label={`Name for ${area.label}`} maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => { if (label.trim() && label !== area.label) onSave({ ...area, label }); }} />
    <button type="button" className="muse-reflections-pill" onClick={() => onSave({ ...area, archived: !area.archived })}>{area.archived ? "Restore" : "Archive"}</button>
  </div>;
}
