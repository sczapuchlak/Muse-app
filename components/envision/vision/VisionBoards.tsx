"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { blankBoard, boardPeriods, boardSorts, isBook, libraryView, periodLabel, type BoardSort, type PeriodFilter, type VisionBoard } from "@/lib/vision-boards/model";
import { MuseChoiceMenu } from "../../MuseChoiceMenu";
import { MuseIcon } from "../../MuseIcon";
import { MuseModal } from "../../MuseModal";
import { MuseOverflowMenu } from "../../MuseOverflowMenu";
import { MuseStar } from "../../MuseStar";
import { MuseSearch } from "../../design/MuseSearch";
import { useAspirations } from "../aspirations/useAspirations";
import { useBucketList } from "../bucket/useBucketList";
import { BoardDetails } from "./BoardDetails";
import { BookObject, LazyPreview } from "./BoardThumb";
import { useVisionBoards } from "./useVisionBoards";
import "./VisionBoards.css";

// Konva only runs in the browser, and only people who open Vision Boards download it.
const BoardEditor = dynamic(() => import("./BoardEditor"), { ssr: false, loading: () => <p className="small-label" role="status">Opening your board…</p> });

const prefsKey = "muse.vision.library";
type Prefs = { sort: BoardSort; period: PeriodFilter; format: FormatFilter };
type FormatFilter = "all" | "board" | "book";
const formatFilters: { id: FormatFilter; label: string }[] = [{ id: "all", label: "All Visions" }, { id: "board", label: "Vision Boards" }, { id: "book", label: "Books" }];
const periodFilters: { id: PeriodFilter; label: string }[] = [{ id: "all", label: "All periods" }, ...boardPeriods, { id: "none", label: "No period" }];
const edited = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));

/** Envision → Visions (#118, #187): the library of Vision Boards and Books, and the editor for the one that's open (`?board=`). */
export function VisionBoards({ today }: { today: string }) {
  const lib = useVisionBoards();
  const router = useRouter(), pathname = usePathname(), params = useSearchParams();
  const openId = params?.get("board") ?? null;
  const href = (board?: string) => `${pathname}?view=vision-boards${board ? `&board=${board}` : ""}`;
  const [prefs, setPrefs] = useState<Prefs>({ sort: "updated", period: "all", format: "all" });
  useEffect(() => { const t = window.setTimeout(() => { try { const v = JSON.parse(localStorage.getItem(prefsKey) ?? "{}"); setPrefs({ sort: boardSorts.some((s) => s.id === v.sort) ? v.sort : "updated", period: periodFilters.some((p) => p.id === v.period) ? v.period : "all", format: formatFilters.some((f) => f.id === v.format) ? v.format : "all" }); } catch { /* defaults */ } }, 0); return () => window.clearTimeout(t); }, []);
  const changePrefs = (p: Partial<Prefs>) => setPrefs((v) => { const next = { ...v, ...p }; try { localStorage.setItem(prefsKey, JSON.stringify(next)); } catch { /* this device only */ } return next; });
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<{ kind: "details"; board: VisionBoard } | { kind: "delete"; board: VisionBoard } | null>(null);
  const visible = useMemo(() => libraryView(lib.boards, query, prefs.period, prefs.sort).filter((b) => prefs.format === "all" || (prefs.format === "book") === isBook(b)), [lib.boards, query, prefs]);
  const open = lib.boards.find((b) => b.id === openId);

  if (openId && lib.status.loaded && !lib.status.error) {
    if (!open) return <section className="muse-vision-library muse-planner-surface"><p>This Vision isn’t here any more. It may have been deleted on another device.</p><Link className="muse-button" href={href()}>Back to Visions</Link></section>;
    return <EditorHost key={open.id} board={open} today={today} lib={lib} onBack={() => router.push(href())} />;
  }
  const create = () => setModal({ kind: "details", board: blankBoard(crypto.randomUUID(), new Date().toISOString()) });

  return <section className="muse-vision-library" aria-labelledby="vision-library-title">
    <h2 id="vision-library-title" className="sr-only">Visions</h2>
    {lib.status.error && <p role="alert" className="muse-aspiration-error">{lib.status.error}</p>}
    {!lib.status.loaded ? <p className="small-label" role="status">Loading your Visions…</p> : lib.status.unavailable ? null : !lib.boards.length ? <EmptyLibrary onCreate={create} /> : <>
      <div className="muse-vision-tools">
        <div className="muse-search-row">
          <MuseSearch label="Search your Visions" value={query} onChange={setQuery} placeholder="Search Visions, themes, periods…" count={visible.length} noun={["Vision", "Visions"]} />
          <button type="button" className="muse-button button-primary muse-search-add" onClick={create}><MuseIcon name="plus" size={14} /><span className="muse-search-add-label">New Vision</span></button>
        </div>
        <div className="muse-control-row">
          <MuseChoiceMenu label="Show" valueLabel={formatFilters.find((f) => f.id === prefs.format)!.label} options={formatFilters} selectedIds={[prefs.format]} onSelect={(id) => changePrefs({ format: id as FormatFilter })} />
          <MuseChoiceMenu label="Period" valueLabel={periodFilters.find((p) => p.id === prefs.period)!.label} options={periodFilters} selectedIds={[prefs.period]} onSelect={(id) => changePrefs({ period: id as PeriodFilter })} />
          <MuseChoiceMenu label="Sort" valueLabel={boardSorts.find((s) => s.id === prefs.sort)!.label} options={[...boardSorts]} selectedIds={[prefs.sort]} onSelect={(id) => changePrefs({ sort: id as BoardSort })} />
        </div>
      </div>
      {!visible.length ? <p className="muse-reflections-quiet">Nothing matches. <button type="button" className="text-button" onClick={() => { setQuery(""); changePrefs({ period: "all", format: "all" }); }}>Show all Visions</button></p>
        : <ul className="muse-vision-grid">{visible.map((b) => <li key={b.id}><BoardCard board={b} href={href(b.id)} busy={lib.status.saving} onOpen={() => router.push(href(b.id))}
          onDetails={() => setModal({ kind: "details", board: b })} onDuplicate={() => void lib.duplicate(b)} onDelete={() => setModal({ kind: "delete", board: b })} /></li>)}</ul>}
    </>}
    {modal?.kind === "details" && <BoardDetails initial={modal.board} today={today} busy={lib.status.saving} error={lib.status.error} onClose={() => setModal(null)}
      onSave={(b) => void lib.save(b).then((saved) => { if (!saved) return; setModal(null); if (modal.board.revision === 0) router.push(href(saved.id)); })} />}
    {modal?.kind === "delete" && <MuseModal id="vision-delete" label="Delete Vision" title={`Delete “${modal.board.title}”?`} returnFocus={null} onClose={() => setModal(null)}>
      <div className="muse-vision-confirm">
        <p>{isBook(modal.board) ? "The book, its cover and pages" : "The board, its arrangement"} and the photos only it uses are deleted for good. Linked Aspirations, Bucket List dreams and Intentions are not touched.</p>
        {lib.status.error && <p role="alert" className="muse-aspiration-error">{lib.status.error}</p>}
        <div className="muse-aspiration-actions"><button type="button" className="muse-button" data-destructive disabled={lib.status.saving} onClick={() => void lib.remove(modal.board).then((ok) => { if (ok) setModal(null); })}>Delete {isBook(modal.board) ? "book" : "board"}</button><button type="button" className="text-button" onClick={() => setModal(null)}>Keep it</button></div>
      </div>
    </MuseModal>}
  </section>;
}

/** The editor only loads Aspirations and the Bucket List (for optional links) when a board is open. */
function EditorHost({ board, today, lib, onBack }: { board: VisionBoard; today: string; lib: ReturnType<typeof useVisionBoards>; onBack: () => void }) {
  const asp = useAspirations(), bucket = useBucketList(today);
  const [initial] = useState(board); // later library updates come from this editor's own saves
  return <BoardEditor initial={initial} userId={lib.userId} today={today} lookups={{ aspirations: asp.aspirations, dreams: bucket.entries }} onSaved={lib.put} onBack={onBack} sweep={lib.sweep} createVision={lib.save} />;
}

function BoardCard({ board: b, href, busy, onOpen, onDetails, onDuplicate, onDelete }: { board: VisionBoard; href: string; busy: boolean; onOpen: () => void; onDetails: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const period = periodLabel(b.period, b.periodStart), book = isBook(b), count = book ? b.pages?.length ?? 0 : b.elements.length;
  return <article className="muse-vision-card muse-planner-surface" data-format={book ? "book" : "board"}>
    <Link href={href} className="muse-vision-card-link" aria-label={`Open ${b.title}`}>{book ? <BookObject board={b} /> : <LazyPreview board={b} />}</Link>
    <div className="muse-vision-card-body">
      <div className="muse-vision-card-head"><h3><Link href={href}>{b.title}</Link></h3>
        <MuseOverflowMenu label={b.title} actions={[{ id: "open", label: "Open", onSelect: onOpen }, { id: "details", label: "Rename & details", onSelect: onDetails }, ...(busy ? [] : [{ id: "duplicate", label: "Duplicate", onSelect: onDuplicate }]), { id: "delete", label: "Delete…", onSelect: onDelete }]} /></div>
      {b.theme && <p className="muse-vision-theme">{b.theme}</p>}
      <p className="small-label">{book && <span className="muse-vision-format">Book</span>}{[period, book ? `${count} ${count === 1 ? "page" : "pages"}` : `${count} ${count === 1 ? "piece" : "pieces"}`, `edited ${edited(b.updatedAt)}`].filter(Boolean).join(" · ")}</p>
    </div>
  </article>;
}
function EmptyLibrary({ onCreate }: { onCreate: () => void }) {
  return <section className="muse-envision-empty" aria-labelledby="muse-vision-boards-title">
    <div className="muse-envision-collage" aria-hidden="true">
      <span data-tile="sky" /><span data-tile="word">dream</span><span data-tile="bloom" /><span data-tile="photo" /><span data-tile="word" data-alt>bold</span><span data-tile="sun" />
      <MuseStar size={22} prismatic className="muse-envision-collage-star" />
    </div>
    <div className="muse-envision-empty-copy">
      <p className="muse-envision-kicker">Visions <MuseStar size={13} prismatic /></p>
      <h2 id="muse-vision-boards-title">A canvas for the life you’re imagining</h2>
      <p>Collage photos, words and stickers into a Vision Board, or make a Book of beautiful pages for a trip, a season or a story. Nothing in a Vision becomes a task or a goal unless you decide it should.</p>
      <p className="muse-envision-quiet">Pieces can point at your <Link href="/envision">Aspirations</Link> or <Link href="/envision?view=bucket">Bucket List</Link>, and <Link href="/planner?view=intentions">Intentions</Link> in Planner can show a board for the period.</p>
      <p className="muse-vision-empty-action"><button type="button" className="muse-button button-primary" onClick={onCreate}><MuseIcon name="plus" size={14} /> Create your first Vision</button></p>
    </div>
  </section>;
}
