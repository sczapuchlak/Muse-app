/**
 * Spending view: sorting and filtering (#112). Pure views over the period's transactions; nothing here changes
 * a transaction. "Payment" covers both cards and manual payment methods (card:<id> / method:<id>).
 */
import { splitRemainder, type MoneyTransaction } from "./money";

export const spendingSorts = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "amount-desc", label: "Amount: high to low" },
  { id: "amount-asc", label: "Amount: low to high" },
  { id: "name-asc", label: "Name: A–Z" },
  { id: "name-desc", label: "Name: Z–A" },
] as const;
export type SpendingSort = typeof spendingSorts[number]["id"];
export type SpendingFilters = { search: string; category: string; tag: string; payment: string };
export const emptySpendingFilters: SpendingFilters = { search: "", category: "", tag: "", payment: "" };

export function parseSpendingSort(value: unknown): SpendingSort { return spendingSorts.some((s) => s.id === value) ? value as SpendingSort : "newest"; }
export const paymentKey = (item: Pick<MoneyTransaction, "cardId" | "paymentMethodId">) => item.cardId ? `card:${item.cardId}` : item.paymentMethodId ? `method:${item.paymentMethodId}` : "";

/** How much of a transaction belongs to a category: its split parts in that category, or all of it when unsplit. */
export function categoryShare(item: MoneyTransaction, category: string) {
  if (!item.splits.length) return item.categoryId === category ? item.amountCents : 0;
  return item.splits.filter((s) => s.categoryId === category).reduce((sum, s) => sum + s.amountCents, 0);
}

export function filterSpending(items: MoneyTransaction[], f: SpendingFilters) {
  const q = f.search.trim().toLowerCase();
  return items.filter((item) => (!q || item.merchant.toLowerCase().includes(q))
    && (!f.category || categoryShare(item, f.category) > 0 || item.categoryId === f.category)
    && (!f.tag || item.tagIds.includes(f.tag))
    && (!f.payment || paymentKey(item) === f.payment));
}

export function sortSpending(items: MoneyTransaction[], sort: SpendingSort) {
  const name = (a: MoneyTransaction, b: MoneyTransaction) => a.merchant.localeCompare(b.merchant, undefined, { sensitivity: "base" });
  const newest = (a: MoneyTransaction, b: MoneyTransaction) => b.date.localeCompare(a.date) || name(a, b);
  const by: Record<SpendingSort, (a: MoneyTransaction, b: MoneyTransaction) => number> = {
    newest,
    oldest: (a, b) => a.date.localeCompare(b.date) || name(a, b),
    "amount-desc": (a, b) => b.amountCents - a.amountCents || newest(a, b),
    "amount-asc": (a, b) => a.amountCents - b.amountCents || newest(a, b),
    "name-asc": (a, b) => name(a, b) || newest(a, b),
    "name-desc": (a, b) => name(b, a) || newest(a, b),
  };
  return [...items].sort(by[sort]);
}

/** The filtered total: with a category filter, only that category's share of split transactions counts. */
export function filteredTotal(items: MoneyTransaction[], category: string) {
  return items.reduce((sum, item) => sum + (category ? categoryShare(item, category) : item.amountCents), 0);
}
export const activeSpendingFilters = (f: SpendingFilters) => [f.search.trim(), f.category, f.tag, f.payment].filter(Boolean).length;
export { splitRemainder };
