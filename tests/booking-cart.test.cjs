const assert = require('node:assert/strict');
const test = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const rules = require('../booking-rules.js');

const source = readFileSync(require.resolve('../app.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('  var programs ='), source.indexOf('  var query =')), context);
const programs = context.programs;
const now = new Date(2026, 7, 28, 9);
const memberId = 'demo:카카오:1';
const item = (overrides = {}) => ({
  id: 'cart-pony', memberId, programKey: 'pony', experience: 'ride', name: '어린이 포니타기',
  dateKey: '2026-08-29', date: '2026.08.29 (토)', time: '10:00~10:20', qty: 2, discount: false, price: 10000,
  ...overrides,
});
const tour = (overrides = {}) => item({ id: 'cart-tour', programKey: 'tour', experience: 'ride', name: '렛츠런파크 투어', time: '14:00~15:20', price: 16000, ...overrides });
const error = (items, saved = [], clock = now) => rules.validationError(items, saved, memberId, programs, clock);
const store = (cart = [item(), tour()], saved = []) => ({ revision: 3, reservations: saved, carts: { [memberId]: cart, other: [item({ memberId: 'other' })] } });

test('blocks identical, contained and partially overlapping intervals in either order across programs', () => {
  for (const time of ['14:00~14:20', '14:20~14:45', '15:00~15:20', '13:50~14:10', '14:50~15:30', '13:00~16:00']) {
    const pony = item({ time });
    assert.equal(rules.overlaps(pony, tour()), true, time);
    assert.equal(rules.overlaps(tour(), pony), true, time);
  }
});

test('allows adjacent intervals and the same time on another date', () => {
  assert.equal(rules.overlaps(item(), item({ time: '10:20~10:45' })), false);
  assert.equal(rules.overlaps(tour(), item({ time: '15:20~15:45' })), false);
  assert.equal(rules.overlaps(item(), item({ dateKey: '2026-08-30' })), false);
  assert.equal(error([tour(), item({ time: '15:20~15:45' })]), '');
});

test('legacy tour start-only values reserve all 80 minutes and overnight intervals overlap', () => {
  assert.equal(rules.overlaps(tour({ time: '14:00' }), item({ time: '15:00~15:20' })), true);
  assert.equal(rules.overlaps(item({ time: '23:50~00:20' }), item({ dateKey: '2026-08-30', time: '00:00~00:30' })), true);
});

test('uses member ownership, never attendee count, provider name alone or example tickets', () => {
  const saved = item({ qty: 1 });
  assert.equal(rules.findConflict(item({ qty: 4 }), [saved], memberId), saved);
  for (const other of [item({ memberId: 'demo:카카오:2' }), item({ memberId: 'demo:네이버:1' }), item({ memberId: undefined }), item({ isExample: true }), item({ status: 'cancelled' }), item({ qty: 0 })]) {
    assert.equal(rules.findConflict(item(), [other], memberId), null);
  }
  assert.equal(rules.findConflict(item(), [saved], null), null);
});

test('checks the entire cart and all persisted reservations, not only visible tickets', () => {
  assert.match(error([tour(), item({ time: '14:20~14:45' })]), /겹칩니다/);
  const saved = Array.from({ length: 12 }, (_, i) => item({ id: String(i), dateKey: '2026-09-20' }));
  saved.push(tour());
  assert.match(error([item({ time: '15:00~15:20' })], saved), /겹칩니다/);
  assert.match(error([item(), item({ id: 'duplicate' })]), /겹칩니다/);
  assert.match(error([item(), item({ experience: 'play', name: '포니랑 놀기' })]), /겹칩니다/);
});

test('rejects logged-out, empty or foreign-member carts', () => {
  assert.match(rules.validationError([item()], [], null, programs, now), /로그인/);
  assert.match(error([]), /담아주세요/);
  assert.match(error([item({ memberId: 'other' })]), /현재 로그인/);
});

test('rejects stale dates, already-started slots, weekdays, invalid dates and sold out slots', () => {
  for (const dateKey of ['2026-08-22', '2026-09-19', '2026-08-31', '2026-02-30']) assert.notEqual(error([item({ dateKey })]), '');
  assert.notEqual(error([item()], [], new Date(2026, 7, 29, 10, 0)), '');
  assert.notEqual(error([item({ time: '16:20~16:45' })]), '');
  assert.notEqual(error([item({ time: '10:00~10:21' })]), '');
});

test('validates headcount, configured remaining places, experience and discount eligibility', () => {
  for (const qty of [0, -1, 1.5, 5]) assert.notEqual(error([item({ qty })]), '');
  assert.notEqual(error([item({ qty: 3, discount: true })]), '');
  assert.notEqual(error([item({ qty: 4, time: '14:20~14:45' })]), '');
  assert.notEqual(error([tour({ discount: true })]), '');
  assert.notEqual(error([item({ experience: 'missing' })]), '');
  assert.equal(error([item({ qty: 2, discount: true })]), '');
});

test('checkout recalculates prices and atomically produces one order with separate session tickets', () => {
  const before = store([item({ price: 1, discount: true }), tour({ price: 2 })]);
  const serialized = JSON.stringify(before);
  const order = rules.buildOrder(before, memberId, programs, now, 'order-1');
  assert.equal(order.total, 21000);
  assert.deepEqual(order.tickets.map(ticket => ticket.orderId), ['order-1', 'order-1']);
  assert.equal(new Set(order.tickets.map(ticket => ticket.id)).size, 2);
  assert.equal(order.tickets[0].qty, 2, 'One customer ticket groups the session headcount');
  assert.equal(order.store.carts[memberId].length, 0);
  assert.deepEqual(order.store.carts.other, before.carts.other);
  assert.equal(order.store.revision, 4);
  assert.equal(JSON.stringify(before), serialized, 'Input remains untouched until the caller commits one storage write');
});

test('failed checkout preserves the whole cart and all reservations', () => {
  const before = store([item(), tour()], [tour()]);
  const serialized = JSON.stringify(before);
  assert.throws(() => rules.buildOrder(before, memberId, programs, now, 'bad-order'), /겹칩니다/);
  assert.equal(JSON.stringify(before), serialized);
});

test('rechecking latest store blocks repeat payment and another tab booking the same interval', () => {
  const first = rules.buildOrder(store(), memberId, programs, now, 'order-1');
  assert.throws(() => rules.buildOrder(first.store, memberId, programs, now, 'order-2'), /담아주세요/);
  const stale = { ...first.store, carts: { [memberId]: [item()] } };
  assert.throws(() => rules.buildOrder(stale, memberId, programs, now, 'order-3'), /겹칩니다/);
});

test('invalid time strings are not interpreted as valid booking intervals', () => {
  for (const time of ['25:00~26:00', '10:90~11:00', 'not-a-time']) assert.equal(rules.interval(item({ time })), null);
});

function appFunction(name) {
  const start = source.indexOf('  function ' + name + '(');
  const asyncStart = source.indexOf('  async function ' + name + '(');
  const offset = start >= 0 ? start : asyncStart;
  assert.notEqual(offset, -1, name);
  return source.slice(offset, source.indexOf('\n  }', offset) + 4);
}

test('unreadable storage is not replaced with an empty reservation store', () => {
  for (const raw of ['{broken', 'null', JSON.stringify({ revision: 1, reservations: [null], carts: {} })]) {
    let writes = 0;
    const messages = [];
    const runtime = vm.createContext({
      reservationStorageKey: 'test-store', notify: message => messages.push(message),
      window: { localStorage: { getItem: () => raw, setItem: () => { writes += 1; } } },
    });
    vm.runInContext(appFunction('readStore'), runtime);
    assert.equal(runtime.readStore(), null);
    assert.equal(writes, 0);
    assert.match(messages[0], /덮어쓰지 않고/);
  }
});

test('storage failure does not report payment complete or clear the persisted cart', async () => {
  const original = store();
  const serialized = JSON.stringify(original);
  const messages = [];
  const elements = { terms: { checked: true }, 'complete-payment': { disabled: false } };
  let completed = false;
  const runtime = vm.createContext({
    BookingRules: rules, programs, currentMember: { id: memberId }, state: { step: 2 }, isPaying: false,
    checkoutSnapshot: JSON.stringify(original.carts[memberId]), reservationStorageKey: 'test-store',
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [now.getTime()])); } },
    window: { localStorage: { getItem: () => serialized, setItem: () => { throw new Error('Quota exceeded'); } } },
    byId: id => elements[id], notify: message => messages.push(message), newId: () => 'failed-order',
    withStoreLock: action => Promise.resolve().then(action),
    renderSlots() {}, update() {}, renderCart() {}, renderBookingItems() {},
    goToStep: () => { completed = true; },
  });
  vm.runInContext(['readStore', 'writeStore', 'ownCart', 'completePayment'].map(appFunction).join('\n'), runtime);
  await runtime.completePayment();
  assert.equal(completed, false);
  assert.equal(runtime.isPaying, false);
  assert.equal(JSON.stringify(runtime.readStore()), serialized);
  assert.match(messages.join(' '), /결제는 완료되지 않았으며/);
});

test('app reads only the signed-in member cart and active reservations', () => {
  const saved = store([item()], [item(), tour({ memberId: 'other' }), item({ status: 'cancelled' })]);
  const runtime = vm.createContext({ currentMember: { id: memberId }, BookingRules: rules, readStore: () => saved });
  vm.runInContext(['readReservations', 'ownCart'].map(appFunction).join('\n'), runtime);
  assert.equal(runtime.readReservations().length, 1);
  assert.equal(runtime.ownCart(saved)[0].memberId, memberId);
  runtime.currentMember = null;
  assert.equal(runtime.readReservations().length, 0);
  assert.equal(runtime.ownCart(saved).length, 0);
});

test('opening another product resets date, session, headcount and discount options', () => {
  const elements = new Map();
  const state = { experience: 'ride', date: '2026.08.29 (토)', dateKey: '2026-08-29', time: '10:00~10:20', qty: 2, discount: true };
  const runtime = vm.createContext({
    programs, program: programs.pony, state, bookingStart: now,
    currentExperience: () => programs.pony.experiences[state.experience], money: value => value + '원',
    byId: id => {
      if (!elements.has(id)) elements.set(id, { replaceChildren() {}, append() {} });
      return elements.get(id);
    },
    createTextElement: () => ({}), renderCalendar() {}, renderSlots() {}, update() {},
  });
  vm.runInContext(appFunction('selectProduct'), runtime);
  runtime.selectProduct('play');
  assert.equal(state.experience, 'play');
  assert.equal(state.dateKey, '');
  assert.equal(state.time, '');
  assert.equal(state.qty, 1);
  assert.equal(state.discount, false);
  assert.equal(elements.get('product-title').textContent, '포니랑 놀기');
  assert.equal(elements.get('product-unit-price').textContent, '4000원');
  assert.equal(elements.get('date-picker').open, false);
});

test('slot refresh requires explicit selection and never silently picks a replacement', () => {
  const state = { dateKey: '', time: '' };
  const elements = { 'slot-placeholder': {}, 'booking-slots': { replaceChildren() { this.innerHTML = ''; } } };
  const runtime = vm.createContext({
    state, program: programs.pony, byId: id => elements[id],
    hasTimeConflict: (_date, time) => time === '10:00~10:20', slotHasStarted: () => false,
    document: { querySelectorAll: () => [] },
  });
  vm.runInContext(appFunction('renderSlots'), runtime);
  runtime.renderSlots();
  assert.equal(elements['booking-slots'].hidden, true);
  state.dateKey = '2026-08-29';
  runtime.renderSlots();
  assert.equal(state.time, '', 'Opening a date must not pick the first available slot');
  state.time = '10:20~10:45';
  runtime.renderSlots();
  assert.equal(state.time, '10:20~10:45', 'An available explicit choice remains selected');
  state.time = '10:00~10:20';
  runtime.renderSlots();
  assert.equal(state.time, '', 'A newly conflicting choice must be cleared, not replaced');
});

test('shop routes restore product options and send stale checkout links back to the cart', () => {
  const visited = [];
  const products = [];
  const runtime = vm.createContext({
    URLSearchParams, programs, state: { experience: 'ride' }, completedOrder: null,
    window: { location: { search: '?product=play' } },
    selectProduct: (key, reset) => products.push({ key, reset }),
    goToStep: (step, options) => visited.push({ step, options }), renderCart() {},
  });
  vm.runInContext(appFunction('restoreShopRoute'), runtime);
  runtime.restoreShopRoute();
  assert.deepEqual(products, [{ key: 'play', reset: true }]);
  assert.equal(visited.at(-1).step, 1);
  assert.equal(visited.at(-1).options.history, false);
  for (const route of ['?view=cart', '?view=checkout', '?view=complete']) {
    runtime.window.location.search = route;
    runtime.restoreShopRoute();
    assert.equal(visited.at(-1).step, 4);
    assert.equal(visited.at(-1).options.replace, true);
  }
  for (const route of ['', '?program=tour', '?product=unknown', '?product=__proto__']) {
    runtime.window.location.search = route;
    runtime.restoreShopRoute();
    assert.equal(visited.at(-1).step, 0);
  }
});
