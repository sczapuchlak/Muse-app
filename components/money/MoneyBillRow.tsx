import { shortDate } from "@/lib/display-date";
import { MuseIcon } from "../MuseIcon";
import { useRef } from "react";
import { formatMoney } from "@/lib/money";
import { occurrenceRecord, occurrenceStatus, type BillOccurrence } from "@/lib/money-reconcile";
import { recurrenceLabel } from "@/lib/recurring";
import { useMoney } from "./MoneyStore";
import type { MoneyOpen } from "./MoneyEditors";
import { useMuseSpark } from "../MuseSpark";
import { MuseOverflowMenu } from "../MuseOverflowMenu";

const labels = { paid: "Paid", partial: "Partly paid", overdue: "Overdue", due: "Due today", upcoming: "Upcoming" } as const;

/**
 * One bill occurrence: this month's (or this date's) obligation. Its status comes from the payments linked to it (partial
 * payments add up) or from Mark paid, which confirms only this occurrence. Marking it paid never records spending.
 */
export function MoneyBillRow({ occurrence: o, onOpen, today }: { occurrence: BillOccurrence; onOpen: MoneyOpen; today: string }) {
  const { state, dispatch } = useMoney(), { trigger, spark } = useMuseSpark(), nameRef = useRef<HTMLButtonElement>(null);
  const status = occurrenceStatus(o, today), def = o.recurringId ? state.recurring.find((r) => r.id === o.recurringId) : undefined;
  const record = () => occurrenceRecord(o, state);
  const setPaid = (paid: boolean) => { dispatch({ type: "save", collection: "bills", record: { ...record(), paid } }); if (paid) trigger(); };
  const open = (anchor: HTMLElement) => onOpen({ kind: "bill", initial: record(), anchor });
  const fullyRecorded = o.amountCents > 0 && o.paidCents >= o.amountCents;
  return <li className="muse-money-bill-row" data-status={status}>
    <div><button ref={nameRef} className="muse-ledger-name muse-bill-name" type="button" onClick={(e) => open(e.currentTarget)}>{o.name}</button>
      <small>{def ? recurrenceLabel(def.recurrence) : "One-time"}{o.fundedBy.length > 0 && ` · planned from ${o.fundedBy.length === 1 ? "1 paycheck" : `${o.fundedBy.length} paychecks`}`}</small></div>
    <time dateTime={o.dueDate}><span className="muse-money-mobile-label">Due</span>{shortDate(o.dueDate)}</time>
    <strong className="muse-money-ledger-number">{formatMoney(o.amountCents)}{o.paidCents > 0 && o.paidCents < o.amountCents && <small>{formatMoney(o.paidCents)} paid · {formatMoney(o.amountCents - o.paidCents)} left</small>}</strong>
    <span className="muse-bill-status" data-status={status === "due" ? "unpaid" : status}>{labels[status]}</span>
    {fullyRecorded ? <span className="muse-bill-recorded" title="Recorded payments cover this bill"><MuseIcon name="check" size={14} />Recorded</span>
      : <button type="button" className="muse-button muse-bill-paid-action muse-feedback-anchor" onClick={() => setPaid(!o.confirmed)}><MuseIcon name="check" size={14} />{o.confirmed ? "Undo paid" : "Mark paid"}{spark}</button>}
    <MuseOverflowMenu label={o.name} actions={[
      { id: "edit", label: def ? "Edit this date’s bill" : "Edit bill", onSelect: () => { if (nameRef.current) open(nameRef.current); } },
      ...(def ? [{ id: "series", label: "Edit the repeating bill", onSelect: () => { if (nameRef.current) onOpen({ kind: "recurring", initial: def, anchor: nameRef.current }); } }] : []),
    ]} />
  </li>;
}
