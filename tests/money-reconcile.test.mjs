import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

// Paycheck actuals reconcile with recorded transactions; bills are occurrences of one recurring definition.
const m = load('lib/money'), r = load('lib/money-reconcile'), {emptyMoney} = load('lib/data/money');
const save = (state, collection, record) => m.moneyReducer(state, {type: 'save', collection, record});
const remove = (state, collection, id) => m.moneyReducer(state, {type: 'remove', collection, id});
const tx = (id, date, amountCents, categoryId, subcategoryId, extra = {}) => ({id, merchant: id, amountCents, date, categoryId, subcategoryId, tagIds: [], paymentMethod: 'debit', splits: [], ...extra});
const plan = (id, paycheckId, plannedCents, categoryId, subcategoryId, extra = {}) => ({id, paycheckId, name: id, plannedCents, categoryId, subcategoryId, ...extra});
const actual = (state, id) => m.allocationActual(state, state.allocations.find((a) => a.id === id));

function base() {
  let s = emptyMoney();
  s = save(s, 'categories', {id: 'utilities', name: 'Utilities', accent: 'info', archived: false, subcategories: [{id: 'rent', name: 'Rent'}, {id: 'power', name: 'Electric'}]});
  s = save(s, 'categories', {id: 'food', name: 'Food & Drink', accent: 'pop', archived: false, subcategories: [{id: 'groceries', name: 'Groceries'}, {id: 'delivery', name: 'Delivery'}]});
  s = save(s, 'categories', {id: 'loans', name: 'Loans', accent: 'warm', archived: false, subcategories: []});
  s = save(s, 'paychecks', {id: 'nov1', name: 'Nov Check 1', receivedDate: '2026-11-01', periodStart: '2026-11-01', periodEnd: '2026-11-14', actualCents: 300000});
  s = save(s, 'paychecks', {id: 'nov2', name: 'Nov Check 2', receivedDate: '2026-11-15', periodStart: '2026-11-15', periodEnd: '2026-11-30', actualCents: 300000});
  return s;
}

test('rent: a recorded rent purchase is the Actual, and edits recalculate it', () => {
  let s = save(base(), 'allocations', plan('rent', 'nov1', 170000, 'utilities', 'rent'));
  assert.equal(actual(s, 'rent'), null, 'nothing recorded yet');
  s = save(s, 'transactions', tx('rent-paid', '2026-11-01', 170000, 'utilities', 'rent'));
  assert.equal(actual(s, 'rent'), 170000);
  assert.equal(170000 - actual(s, 'rent'), 0, 'remaining is zero');
  s = save(s, 'transactions', tx('rent-paid', '2026-11-01', 165000, 'utilities', 'rent'));
  assert.equal(actual(s, 'rent'), 165000, 'editing the transaction recalculates');
  s = save(s, 'transactions', tx('rent-paid', '2026-11-01', 165000, 'food', 'groceries'));
  assert.equal(actual(s, 'rent'), null, 'recategorising it moves it away');
});

test('groceries: purchases add up, and a deletion updates Actual', () => {
  let s = save(base(), 'allocations', plan('groceries', 'nov1', 10000, 'food', 'groceries'));
  s = save(s, 'transactions', tx('g1', '2026-11-02', 4500, 'food', 'groceries'));
  s = save(s, 'transactions', tx('g2', '2026-11-05', 3000, 'food', 'groceries'));
  assert.equal(actual(s, 'groceries'), 7500);
  s = save(s, 'transactions', tx('g3', '2026-11-09', 2000, 'food', 'groceries'));
  assert.equal(actual(s, 'groceries'), 9500);
  s = remove(s, 'transactions', 'g2');
  assert.equal(actual(s, 'groceries'), 6500);
  assert.equal(r.planActual(s, s.allocations[0]).counted.every((c) => c.how === 'category'), true);
});

test('multiple paychecks: a purchase counts once, and moving it updates both paychecks', () => {
  let s = base();
  s = save(s, 'paychecks', {id: 'bonus', name: 'Bonus', receivedDate: '2026-11-10', periodStart: '2026-11-10', periodEnd: '2026-11-20', actualCents: 50000});
  for (const p of ['nov1', 'nov2', 'bonus']) s = save(s, 'allocations', plan(`g-${p}`, p, 10000, 'food', 'groceries'));
  s = save(s, 'transactions', tx('shop', '2026-11-12', 4000, 'food', 'groceries'));
  const counted = ['nov1', 'nov2', 'bonus'].map((p) => actual(s, `g-${p}`));
  assert.deepEqual(counted, [null, null, 4000], 'overlapping periods: the latest received paycheck, and only once');
  s = save(s, 'transactions', tx('shop', '2026-11-12', 4000, 'food', 'groceries', {allocationId: 'g-nov1'}));
  assert.deepEqual(['nov1', 'nov2', 'bonus'].map((p) => actual(s, `g-${p}`)), [4000, null, null], 'reassigned to the first paycheck');
  s = save(s, 'transactions', tx('shop', '2026-11-12', 4000, 'food', 'groceries', {unplanned: true}));
  assert.deepEqual(['nov1', 'nov2', 'bonus'].map((p) => actual(s, `g-${p}`)), [null, null, null], 'left out of every paycheck');
});

test('subcategories: the most specific plan wins, nothing counts twice, ties wait for review', () => {
  let s = save(base(), 'allocations', plan('food', 'nov1', 30000, 'food'));
  s = save(s, 'allocations', plan('groceries', 'nov1', 10000, 'food', 'groceries'));
  s = save(s, 'transactions', tx('market', '2026-11-03', 5000, 'food', 'groceries'));
  s = save(s, 'transactions', tx('pizza', '2026-11-04', 2500, 'food', 'delivery'));
  assert.equal(actual(s, 'groceries'), 5000, 'groceries go to the groceries plan');
  assert.equal(actual(s, 'food'), 2500, 'other food goes to the whole-category plan, not both');
  s = save(s, 'transactions', {...tx('split', '2026-11-06', 6000, 'food', 'groceries'), splits: [{id: 's1', categoryId: 'food', subcategoryId: 'groceries', amountCents: 4000}, {id: 's2', categoryId: 'food', subcategoryId: 'delivery', amountCents: 2000}]});
  assert.equal(actual(s, 'groceries'), 9000, 'a split counts each part where it belongs');
  assert.equal(actual(s, 'food'), 4500);
  s = save(s, 'allocations', plan('groceries-2', 'nov1', 5000, 'food', 'groceries'));
  s = save(s, 'transactions', tx('costco', '2026-11-07', 8000, 'food', 'groceries'));
  const {review} = r.reconcile(s);
  assert.ok(review.some((x) => x.transactionId === 'costco'), 'two equal plans: in review, not guessed');
  assert.equal(actual(s, 'groceries-2'), null);
});

test('credit card: the plan reflects the payment, not the purchases, and spending counts purchases once', () => {
  let s = save(base(), 'cards', {id: 'citi', name: 'Citi', balanceCents: 0, accent: 'primary'});
  s = save(s, 'allocations', plan('pay-citi', 'nov1', 100000, undefined, undefined, {cardId: 'citi'}));
  s = save(s, 'allocations', plan('groceries', 'nov1', 10000, 'food', 'groceries'));
  s = save(s, 'transactions', tx('card-shop', '2026-11-03', 8000, 'food', 'groceries', {cardId: 'citi', paymentMethod: 'card'}));
  s = save(s, 'transactions', tx('card-shop-2', '2026-11-04', 12000, 'utilities', 'power', {cardId: 'citi', paymentMethod: 'card'}));
  assert.equal(actual(s, 'pay-citi'), null, 'purchases on the card are not the payment');
  s = save(s, 'payments', {id: 'p1', cardId: 'citi', amountCents: 100000, date: '2026-11-10', paycheckId: 'nov1', allocationId: 'pay-citi'});
  assert.equal(actual(s, 'pay-citi'), 100000);
  assert.equal(actual(s, 'groceries'), 8000, 'the grocery purchase still counts toward groceries');
  const period = m.paycheckPeriod(s.paychecks[0]);
  assert.equal(m.spendingTotal(s, period), 20000, 'spending counts the purchases; the card payment is not spending again');
});

test('transfers: not spending, never auto-matched, but count toward a plan they are linked to', () => {
  let s = save(base(), 'categories', {id: 'savings', name: 'Savings', accent: 'secondary', archived: false, subcategories: []});
  s = save(s, 'allocations', plan('save', 'nov1', 50000, 'savings'));
  s = save(s, 'transactions', tx('to-savings', '2026-11-02', 50000, 'savings', undefined, {transfer: true}));
  const period = m.paycheckPeriod(s.paychecks[0]);
  assert.equal(m.spendingTotal(s, period), 0);
  assert.equal(m.categorySpending(s, period).length, 0);
  assert.equal(actual(s, 'save'), null, 'not matched automatically');
  s = save(s, 'transactions', tx('to-savings', '2026-11-02', 50000, 'savings', undefined, {transfer: true, allocationId: 'save'}));
  assert.equal(actual(s, 'save'), 50000, 'linked on purpose: it counts');
});

test('manual Actual: never added to recorded payments, and its source stays clear', () => {
  let s = save(base(), 'allocations', plan('gift', 'nov1', 20000, 'food', undefined, {actualCents: 15000}));
  s = save(s, 'transactions', tx('gift-shop', '2026-11-03', 15000, 'food', 'groceries'));
  const d = r.planActual(s, s.allocations[0]);
  assert.equal(d.actual, 15000, 'not 30000');
  assert.equal(d.source, 'manual');
  assert.equal(d.notCounted.length, 1, 'the matching purchase is shown as not counted');
  const cleared = {...s.allocations[0]}; delete cleared.actualCents;
  s = save(s, 'allocations', cleared);
  assert.equal(actual(s, 'gift'), 15000);
  assert.equal(r.planActual(s, s.allocations[0]).source, 'recorded');
});

test('SoFi: one recurring bill, funded by two paychecks, paid in parts, each month on its own', () => {
  let s = base();
  s = save(s, 'recurring', {id: 'sofi', name: 'SoFi', amountCents: 138400, amountBehavior: 'fixed', categoryId: 'loans', recurrence: {interval: 1, unit: 'month'}, nextChargeDate: '2026-11-25', billingSource: 'Bill', status: 'active', showInBills: true});
  const nov = r.billOccurrences(s, '2026-11-01', '2026-11-30');
  assert.equal(nov.length, 1, 'shown in Bills without creating a record');
  assert.equal(s.bills.length, 0);
  assert.equal(s.transactions.length, 0, 'a recurring bill never creates spending');
  const novRow = r.occurrenceRecord(nov[0], s, 'sofi-nov');
  s = save(s, 'bills', novRow);
  s = save(s, 'allocations', plan('sofi-1', 'nov1', 69200, 'loans', undefined, {billId: 'sofi-nov'}));
  s = save(s, 'allocations', plan('sofi-2', 'nov2', 69200, 'loans', undefined, {billId: 'sofi-nov'}));
  s = save(s, 'transactions', tx('sofi-a', '2026-11-05', 69200, 'loans', undefined, {billId: 'sofi-nov'}));
  let o = r.billOccurrences(s, '2026-11-01', '2026-11-30')[0];
  assert.equal(o.paidCents, 69200);
  assert.equal(r.occurrenceStatus(o, '2026-11-10'), 'partial');
  assert.equal(actual(s, 'sofi-1'), 69200, 'the first paycheck’s plan reconciles its own payment');
  assert.equal(actual(s, 'sofi-2'), null);
  s = save(s, 'transactions', tx('sofi-b', '2026-11-20', 69200, 'loans', undefined, {billId: 'sofi-nov'}));
  o = r.billOccurrences(s, '2026-11-01', '2026-11-30')[0];
  assert.equal(r.occurrenceStatus(o, '2026-11-21'), 'paid', 'fully paid once payments cover it');
  assert.equal(actual(s, 'sofi-2'), 69200);
  const dec = r.billOccurrences(s, '2026-12-01', '2026-12-31');
  assert.equal(dec.length, 1);
  assert.equal(r.occurrenceStatus(dec[0], '2026-12-01'), 'upcoming', 'November paid does not mark December');
  assert.equal(s.transactions.length, 2, 'no duplicate transactions');
  s = save(s, 'bills', {...r.occurrenceRecord(dec[0], s, 'sofi-dec'), paid: true});
  assert.equal(r.occurrenceStatus(r.billOccurrences(s, '2026-12-01', '2026-12-31')[0], '2026-12-01'), 'paid', 'explicit confirmation');
  assert.equal(r.billOccurrences(s, '2027-01-01', '2027-01-31')[0].confirmed, false, 'January untouched');
});

test('bill occurrences follow every recurrence, include one-time bills, and stop at an end date', () => {
  let s = base();
  s = save(s, 'recurring', {id: 'weekly', name: 'Lessons', amountCents: 3000, amountBehavior: 'fixed', recurrence: {interval: 1, unit: 'week'}, nextChargeDate: '2026-11-02', billingSource: 'Bill', status: 'active', showInBills: true});
  s = save(s, 'recurring', {id: 'quarterly', name: 'Insurance', amountCents: 45000, amountBehavior: 'fixed', recurrence: {interval: 3, unit: 'month'}, nextChargeDate: '2026-08-31', billingSource: 'Bill', status: 'active', showInBills: true, endDate: '2027-03-01'});
  s = save(s, 'recurring', {id: 'stream', name: 'Streaming', amountCents: 1500, amountBehavior: 'fixed', recurrence: {interval: 1, unit: 'month'}, nextChargeDate: '2026-11-03', billingSource: 'Netflix', status: 'active'});
  s = save(s, 'bills', {id: 'vet', name: 'Vet', amountCents: 20000, dueDate: '2026-11-12', recurrence: 'once', paid: false});
  const nov = r.billOccurrences(s, '2026-11-01', '2026-11-30');
  assert.deepEqual(nov.filter((o) => o.recurringId === 'weekly').map((o) => o.dueDate), ['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']);
  assert.deepEqual(nov.filter((o) => o.recurringId === 'quarterly').map((o) => o.dueDate), ['2026-11-30'], 'Aug 31 → Nov 30');
  assert.ok(!nov.some((o) => o.recurringId === 'stream'), 'a subscription that is not a bill stays in Recurring only');
  assert.ok(nov.some((o) => o.billId === 'vet'), 'one-time bills in the period');
  assert.equal(r.billOccurrences(s, '2027-03-02', '2027-12-31').filter((o) => o.recurringId === 'quarterly').length, 0, 'ends');
  const funded = r.billOccurrences(s, '2026-11-01', '2026-11-14', ['vet']);
  assert.ok(funded.some((o) => o.billId === 'vet'));
});

test('templates never supply actuals, and changing one leaves past plans and actuals alone', () => {
  let s = save(base(), 'allocations', plan('groceries', 'nov1', 10000, 'food', 'groceries'));
  s = save(s, 'transactions', tx('g', '2026-11-02', 4000, 'food', 'groceries'));
  s = save(s, 'templates', {id: 't', name: 'Regular', allocations: [{name: 'groceries', plannedCents: 99999, categoryId: 'food', subcategoryId: 'groceries'}]});
  assert.equal(actual(s, 'groceries'), 4000);
  assert.equal(s.allocations[0].plannedCents, 10000);
});

test('a bill payment still counts by category when no plan funds that bill', () => {
  let s = save(base(), 'allocations', plan('rent', 'nov1', 170000, 'utilities', 'rent'));
  s = save(s, 'bills', {id: 'rent-bill', name: 'Rent', amountCents: 170000, dueDate: '2026-11-01', recurrence: 'once', paid: false});
  s = save(s, 'transactions', tx('rent-paid', '2026-11-01', 170000, 'utilities', 'rent', {billId: 'rent-bill'}));
  assert.equal(actual(s, 'rent'), 170000);
  assert.equal(r.occurrenceStatus(r.billOccurrences(s, '2026-11-01', '2026-11-30')[0], '2026-11-02'), 'paid');
});
