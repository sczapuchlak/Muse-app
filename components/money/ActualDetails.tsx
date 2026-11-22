"use client";
import { shortDate } from "@/lib/display-date";
import { formatMoney, planLabel, type Allocation } from "@/lib/money";
import { planActual, type Contribution } from "@/lib/money-reconcile";
import { MuseDrawer } from "../MuseDrawer";
import { useMoney } from "./MoneyStore";

const how = { linked: "Linked to this plan", bill: "Pays a bill this plan funds", category: "Matched by category" } as const;

/** What a planned amount's Actual is made of: the records counted, how each matched, and the rule; or the manual amount. */
export function ActualDetails({ allocation, anchor, onClose }: { allocation: Allocation; anchor: HTMLElement; onClose: () => void }) {
  const { state, dispatch } = useMoney(), detail = planActual(state, allocation), paycheck = state.paychecks.find((p) => p.id === allocation.paycheckId);
  const bill = allocation.billId ? state.bills.find((b) => b.id === allocation.billId) : undefined, label = planLabel(state, allocation);
  const rule = allocation.cardId ? `Card payments recorded for ${state.cards.find((c) => c.id === allocation.cardId)?.name ?? "this card"} and linked to this plan${allocation.categoryId && paycheck ? `, and payments in ${label.name} dated ${shortDate(paycheck.periodStart)} – ${shortDate(paycheck.periodEnd)} that weren’t charged to a card (paying it from your bank account)` : ""}. Purchases on the card don’t count here.`
    : allocation.categoryId && paycheck ? `Purchases in ${label.name} dated ${shortDate(paycheck.periodStart)} – ${shortDate(paycheck.periodEnd)}, unless they’re linked to another plan, marked “not from a paycheck”, or transfers.`
    : "Only records linked to this plan; it has no category to match.";
  const list = (items: Contribution[]) => <ul className="muse-money-payment-list">{items.map((c) => <li key={`${c.kind}-${c.id}-${c.amountCents}`}><span>{c.name}<small>{how[c.how]}</small></span><time dateTime={c.date}>{shortDate(c.date)}</time><strong>{formatMoney(c.amountCents)}</strong></li>)}</ul>;
  return <MuseDrawer title={`${allocation.name}: what counts`} returnFocus={anchor} onClose={onClose}><div className="muse-money-form">
    <dl className="muse-money-actual-facts">
      <div><dt>Planned</dt><dd>{formatMoney(allocation.plannedCents)}</dd></div>
      <div><dt>Actual</dt><dd>{formatMoney(detail.actual)}<small>{detail.source === "manual" ? "Manual amount" : detail.source === "recorded" ? `${detail.counted.length} recorded` : "Nothing recorded yet"}</small></dd></div>
      <div><dt>{detail.actual !== null && detail.actual > allocation.plannedCents ? "Over plan" : "Remaining"}</dt><dd>{formatMoney(Math.abs(allocation.plannedCents - (detail.actual ?? 0)))}</dd></div>
    </dl>
    <p className="small-label">{rule}{bill ? ` Funds the bill “${bill.name}” due ${shortDate(bill.dueDate)}.` : ""}</p>
    {detail.counted.length > 0 && <div className="muse-money-field"><span>Counted</span>{list(detail.counted)}</div>}
    {detail.source === "manual" && <div className="muse-money-field"><span>Manual amount in use</span>
      {detail.notCounted.length > 0 ? <><p className="small-label">These recorded items match this plan but aren’t added to the manual amount:</p>{list(detail.notCounted)}</> : <p className="small-label">No recorded purchases match this plan yet.</p>}
      <button type="button" className="muse-button" onClick={() => { const next = { ...allocation }; delete next.actualCents; dispatch({ type: "save", collection: "allocations", record: next }); onClose(); }}>Use recorded purchases instead</button></div>}
    {detail.source === "none" && <p className="card-description">Nothing recorded yet. Record a purchase in Spending (or link one) and it shows up here.</p>}
  </div></MuseDrawer>;
}
