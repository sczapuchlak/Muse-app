/**
 * Money reconciliation: one transaction ledger, read from the plan's side and the bills' side. Nothing here stores or
 * creates records; it only works out, from what is already recorded, how much of each paycheck plan has happened and how
 * much of each bill has been paid.
 *
 * Paycheck plan Actual comes from exactly one source, never added together:
 * 1. Manual: the amount typed on the planned amount. Anything that would otherwise count is listed as not counted.
 * 2. Recorded: transactions (card payments, for a card plan) attributed to it, which are:
 *    - linked: the transaction names this planned amount;
 *    - bill: the transaction pays a bill this planned amount funds;
 *    - category: automatic. A transaction (or each split part) in this paycheck's period with the same subcategory, or the
 *      same category when the plan has no subcategory. The most specific plan wins; two equally specific plans in one
 *      paycheck are a tie, and the transaction waits in review instead of being guessed. Transfers, and transactions
 *      marked "not from a paycheck", are never matched automatically. Card plans count recorded card payments, and
 *      transactions in their category that weren't charged to a card (a payment to the card made from a bank account);
 *      purchases on a card never count toward a card plan.
 * A transaction counts toward at most one planned amount. Dates choose a paycheck only as a convenience; a link always
 * wins, and the person can move a transaction to another plan or to none.
 */
import { recurrenceDate, type RecurringPayment } from "./recurring";
import { validDate } from "./dates";
import type { Allocation, MoneyBill, MoneyState, MoneyTransaction, Paycheck } from "./money";

export type ActualSource = "manual" | "recorded" | "none";
export type Contribution = { id: string; kind: "transaction" | "payment"; name: string; date: string; amountCents: number; how: "linked" | "bill" | "category" };
export type PlanActual = { actual: number | null; source: ActualSource; counted: Contribution[]; notCounted: Contribution[] };
export type Review = { transactionId: string; name: string; date: string; amountCents: number; reason: string };

const sum = (items: { amountCents: number }[]) => items.reduce((n, i) => n + i.amountCents, 0);
/** The paycheck a date belongs to: the one whose period holds it; among overlapping periods, the latest received. */
export function paycheckFor(state: MoneyState, date: string): Paycheck | undefined {
  return state.paychecks.filter((p) => date >= p.periodStart && date <= p.periodEnd).sort((a, b) => b.receivedDate.localeCompare(a.receivedDate) || b.periodStart.localeCompare(a.periodStart))[0];
}
/** The parts of a transaction that carry a category: its splits, or the whole amount. */
function parts(tx: MoneyTransaction) {
  if (!tx.splits.length) return [{ categoryId: tx.categoryId, subcategoryId: tx.subcategoryId, amountCents: tx.amountCents }];
  const rest = tx.amountCents - sum(tx.splits);
  return [...tx.splits, ...(rest > 0 ? [{ categoryId: tx.categoryId, subcategoryId: tx.subcategoryId, amountCents: rest }] : [])];
}

/** Every planned amount's Actual and its source, plus the transactions that matched more than one plan equally. */
const memo = new WeakMap<MoneyState, { plans: Map<string, PlanActual>; review: Review[] }>();
export function reconcile(state: MoneyState): { plans: Map<string, PlanActual>; review: Review[] } {
  const cached = memo.get(state); if (cached) return cached;
  const found = new Map<string, Contribution[]>(), review: Review[] = [];
  const add = (allocationId: string, c: Contribution) => found.set(allocationId, [...(found.get(allocationId) ?? []), c]);
  const byId = new Map(state.allocations.map((a) => [a.id, a]));
  for (const tx of state.transactions) {
    const base = { id: tx.id, kind: "transaction" as const, name: tx.merchant, date: tx.date };
    if (tx.allocationId && byId.has(tx.allocationId)) { add(tx.allocationId, { ...base, amountCents: tx.amountCents, how: "linked" }); continue; }
    if (tx.billId) {
      const funders = state.allocations.filter((a) => a.billId === tx.billId && !a.cardId);
      const p = paycheckFor(state, tx.date), pick = funders.length === 1 ? funders[0] : funders.find((a) => a.paycheckId === p?.id);
      if (pick) { add(pick.id, { ...base, amountCents: tx.amountCents, how: "bill" }); continue; }
      // No plan funds that bill: it still counts by category below, like any purchase.
    }
    if (tx.unplanned || tx.transfer) continue;
    const paycheck = paycheckFor(state, tx.date); if (!paycheck) continue;
    // A card plan takes category matches only from transactions not charged to a card: paying the card from checking counts,
    // purchases on the card never do (they're spending, not the card payment).
    const plans = state.allocations.filter((a) => a.paycheckId === paycheck.id && a.categoryId && (!a.cardId || !tx.cardId));
    for (const part of parts(tx)) {
      if (!part.categoryId) continue;
      const exact = part.subcategoryId ? plans.filter((a) => a.categoryId === part.categoryId && a.subcategoryId === part.subcategoryId) : [];
      const broad = plans.filter((a) => a.categoryId === part.categoryId && !a.subcategoryId);
      const tier = exact.length ? exact : broad;
      if (tier.length === 1) add(tier[0].id, { ...base, amountCents: part.amountCents, how: "category" });
      else if (tier.length > 1) review.push({ transactionId: tx.id, name: tx.merchant, date: tx.date, amountCents: part.amountCents, reason: `matches ${tier.length} plans in ${paycheck.name} equally (${tier.map((a) => a.name).join(", ")})` });
    }
  }
  for (const pay of state.payments) if (pay.allocationId && byId.get(pay.allocationId)?.cardId) add(pay.allocationId, { id: pay.id, kind: "payment", name: state.cards.find((c) => c.id === pay.cardId)?.name ?? "Card payment", date: pay.date, amountCents: pay.amountCents, how: "linked" });
  const plans = new Map<string, PlanActual>();
  for (const a of state.allocations) {
    const got = (found.get(a.id) ?? []).sort((x, y) => x.date.localeCompare(y.date));
    plans.set(a.id, a.actualCents !== undefined ? { actual: a.actualCents, source: "manual", counted: [], notCounted: got }
      : got.length ? { actual: sum(got), source: "recorded", counted: got, notCounted: [] } : { actual: null, source: "none", counted: [], notCounted: [] });
  }
  const result = { plans, review };
  memo.set(state, result);
  return result;
}
export const planActual = (state: MoneyState, allocation: Allocation) => reconcile(state).plans.get(allocation.id) ?? { actual: null, source: "none" as const, counted: [], notCounted: [] };

// ---------- Bills: occurrences of one definition, each with its own payments ----------

export type BillStatus = "paid" | "partial" | "overdue" | "due" | "upcoming";
export type BillOccurrence = {
  /** Stable key: the stored bill's id, or recurring id + due date for an occurrence nothing has been saved about yet. */
  key: string; billId?: string; recurringId?: string; name: string; amountCents: number; dueDate: string; categoryId?: string; cardId?: string;
  /** "Mark paid" on this occurrence (an explicit confirmation, whatever was recorded). */
  confirmed: boolean; paidCents: number; payments: Contribution[]; fundedBy: Allocation[]; repeats: boolean;
};
export const occurrenceKey = (recurringId: string, dueDate: string) => `${recurringId}@${dueDate}`;

/** Due dates of a recurring definition inside [from, to], counted from its anchor (Jan 31 → Feb 28 → Mar 31). */
export function occurrenceDates(def: RecurringPayment, from: string, to: string): string[] {
  if (!validDate(def.nextChargeDate) || def.status !== "active") return [];
  const out: string[] = [], last = [to, def.endDate, def.cancelledDate].filter((d): d is string => !!d && validDate(d)).sort()[0];
  for (let step = 0; step < 1000; step++) {
    const d = recurrenceDate(def.nextChargeDate, def.recurrence, step); if (!d || d > last) break;
    if (d >= from) out.push(d);
  }
  return out;
}

/** Bills due in [from, to] (and any listed in `include`): one-time bills, stored occurrences, and occurrences of every
 *  recurring definition shown in Bills. Showing an occurrence never creates a record. */
export function billOccurrences(state: MoneyState, from: string, to: string, include: string[] = []): BillOccurrence[] {
  const out = new Map<string, BillOccurrence>();
  const payments = (billId: string | undefined, funders: Allocation[]) => {
    const fund = new Set(funders.map((a) => a.id));
    const txs = state.transactions.filter((t) => (billId && t.billId === billId) || (t.allocationId && fund.has(t.allocationId)));
    const pays = state.payments.filter((p) => p.allocationId && fund.has(p.allocationId));
    return [...txs.map((t) => ({ id: t.id, kind: "transaction" as const, name: t.merchant, date: t.date, amountCents: t.amountCents, how: (t.billId === billId ? "bill" : "linked") as Contribution["how"] })),
      ...pays.map((p) => ({ id: p.id, kind: "payment" as const, name: state.cards.find((c) => c.id === p.cardId)?.name ?? "Card payment", date: p.date, amountCents: p.amountCents, how: "linked" as const }))];
  };
  const fromRow = (b: MoneyBill): BillOccurrence => {
    const fundedBy = state.allocations.filter((a) => a.billId === b.id), got = payments(b.id, fundedBy), def = b.recurringId ? state.recurring.find((r) => r.id === b.recurringId) : undefined;
    return { key: b.id, billId: b.id, recurringId: b.recurringId, name: b.name, amountCents: b.amountCents, dueDate: b.dueDate, categoryId: b.categoryId, cardId: b.cardId, confirmed: b.paid, paidCents: sum(got), payments: got, fundedBy, repeats: !!def || b.recurrence !== "once" };
  };
  for (const b of state.bills) if ((b.dueDate >= from && b.dueDate <= to) || include.includes(b.id)) out.set(b.recurringId ? occurrenceKey(b.recurringId, b.dueDate) : b.id, fromRow(b));
  for (const def of state.recurring.filter((r) => r.showInBills)) for (const d of occurrenceDates(def, from, to)) {
    const key = occurrenceKey(def.id, d); if (out.has(key)) continue;
    out.set(key, { key, recurringId: def.id, name: def.name, amountCents: def.amountCents ?? 0, dueDate: d, categoryId: def.categoryId, cardId: def.cardId, confirmed: false, paidCents: 0, payments: [], fundedBy: [], repeats: true });
  }
  return [...out.values()].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.name.localeCompare(b.name));
}
export function occurrenceStatus(o: BillOccurrence, today: string): BillStatus {
  if (o.confirmed || (o.amountCents > 0 && o.paidCents >= o.amountCents)) return "paid";
  if (o.paidCents > 0) return "partial";
  return o.dueDate < today ? "overdue" : o.dueDate === today ? "due" : "upcoming";
}
/** The stored bill for an occurrence, created from its definition only when something about it must be saved. */
export function occurrenceRecord(o: BillOccurrence, state: MoneyState, id: string = crypto.randomUUID()): MoneyBill {
  const existing = o.billId ? state.bills.find((b) => b.id === o.billId) : undefined;
  return existing ?? { id, name: o.name, amountCents: o.amountCents, dueDate: o.dueDate, recurrence: "once", categoryId: o.categoryId, cardId: o.cardId, paid: false, recurringId: o.recurringId };
}
