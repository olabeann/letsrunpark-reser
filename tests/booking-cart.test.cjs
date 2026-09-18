const assert = require('node:assert/strict');
const test = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const rules = require('../booking-rules.js');

const source = readFileSync(require.resolve('../app.js'), 'utf8');
const pageSource = readFileSync(require.resolve('../index.html'), 'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('  var ponySlots ='), source.indexOf('  var query =')), context);
const programs = context.programs;
const now = new Date(2026, 7, 28, 9);
const memberId = 'demo:카카오:1';
const item = (overrides = {}) => ({
  id: 'cart-ride', memberId, programKey: 'ride', name: '포니 타기',
  dateKey: '2026-08-29', date: '2026.08.29 (토)', time: '10:00~10:20', qty: 2, discount: false, price: 10000,
  ...overrides,
});
const tour = (overrides = {}) => item({ id: 'cart-tour', programKey: 'tour', name: '렛츠런파크 투어', time: '14:00~15:20', price: 16000, ...overrides });
const error = (items, saved = [], clock = now) => rules.validationError(items, saved, memberId, programs, clock);
const store = (cart = [item(), tour()], saved = []) => ({ revision: 3, reservations: saved, carts: { [memberId]: cart, other: [item({ memberId: 'other' })] } });

test('starts local booking data from the post-reservation-number schema', () => {
  assert.match(source, /reservationStorageKey = "ponylandBookingStoreV3"/);
  assert.match(source, /localStorage\.removeItem\("ponylandBookingStoreV2"\)/);
  assert.match(source, /demoCancellationStorageKey = "ponylandDemoTicketCancellationsV2"/);
});

test('detects identical, contained and partially overlapping intervals in either order', () => {
  for (const time of ['14:00~14:20', '14:20~14:45', '15:00~15:20', '13:50~14:10', '14:50~15:30', '13:00~16:00']) {
    const pony = item({ time });
    assert.equal(rules.overlaps(pony, tour()), true, time);
    assert.equal(rules.overlaps(tour(), pony), true, time);
  }
});

test('rejects overlapping different programs in cart and reservations', () => {
  const ride = item({ qty: 1 });
  const play = item({ id: 'cart-play', programKey: 'play', name: '포니랑 놀기', qty: 1 });
  assert.match(error([ride, play]), /시간이 겹/);
  assert.match(error([ride], [play]), /시간이 겹/);
  assert.equal(error([ride], [{ ...play, status: 'cancelled' }]), '');
  assert.equal(error([ride], [{ ...play, memberId: 'other' }]), '');
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

test('blocks different-program overlaps while allowing same-session tickets', () => {
  assert.match(error([tour(), item({ time: '14:20~14:45' })]), /시간이 겹/);
  const saved = Array.from({ length: 12 }, (_, i) => item({ id: String(i), dateKey: '2026-09-20' }));
  saved.push(tour());
  assert.match(error([item({ time: '15:00~15:20' })], saved), /시간이 겹/);
  assert.equal(error([item(), item({ id: 'duplicate' })]), '');
  assert.match(error([item(), item({ programKey: 'play', name: '포니랑 놀기' })]), /시간이 겹/);
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

test('validates headcount, configured remaining places, program and discount eligibility', () => {
  for (const qty of [0, -1, 1.5, 5]) assert.notEqual(error([item({ qty })]), '');
  assert.notEqual(error([item({ qty: 3, discount: true })]), '');
  assert.notEqual(error([item({ qty: 4, time: '14:20~14:45' })]), '');
  assert.notEqual(error([tour({ discount: true })]), '');
  assert.notEqual(error([item({ programKey: 'missing' })]), '');
  assert.equal(error([item({ qty: 2, discount: true })]), '');
  assert.match(error([item({ qty: 4, discount: true, discountQty: 2, time: '15:00~15:20' })]), /나누어 담아주세요/);
  const discountedCard = rules.quoteItem(item({ id: 'discounted-card', qty: 2, discount: true, discountQty: 2, time: '15:00~15:20' }), programs);
  const regularCard = rules.quoteItem(item({ id: 'regular-card', qty: 2, discount: false, discountQty: 0, time: '15:00~15:20' }), programs);
  assert.equal(discountedCard.price + regularCard.price, 15000);
});

test('caps each program independently and enforces per-usage-date citizen discount limits', () => {
  const play = item({ id: 'cart-play', programKey: 'play', name: '포니랑 놀기', time: '10:20~10:45', qty: 2 });
  assert.equal(error([item({ qty: 2 }), play]), '');
  assert.equal(error([item({ qty: 3 }), play]), '');
  assert.equal(error([item({ qty: 3 }), tour({ qty: 2 })]), '');
  const discountedRide = item({ qty: 1, discount: true });
  const discountedPlay = { ...play, qty: 1, discount: true };
  assert.equal(error([discountedRide, discountedPlay]), '');
  assert.match(error([discountedRide], [item({ id: 'used-discount', qty: 2, discount: true })]), /최대 2매/);
  assert.equal(error([discountedRide], [item({ id: 'used-discount', dateKey: '2026-08-30', qty: 2, discount: true })]), '');
});

test('allows only one discount policy per account and usage date', () => {
  const alternate = { id: 'staff', type: 'percent', value: 20, rate: 0.2, maxQty: 2, maxQtyPerDate: 2, label: '임직원 20% 할인' };
  const multiPrograms = {
    ...programs,
    ride: { ...programs.ride, discountPolicies: [programs.ride.discountPolicy, alternate] },
    play: { ...programs.play, discountPolicies: [programs.play.discountPolicy, alternate] },
  };
  const ride = item({ qty: 1, discount: true, discountQty: 1, discountPolicyId: 'gwacheon' });
  const play = item({ id: 'cart-play', programKey: 'play', name: '포니랑 놀기', time: '10:20~10:45', qty: 1, discount: true, discountQty: 1, discountPolicyId: 'staff' });
  assert.match(rules.validationError([ride, play], [], memberId, multiPrograms, now), /하나의 할인 정책/);
});

test('uses configured sale weekdays and blocks stored operation closures', () => {
  const weekdayPrograms = {
    ...programs,
    ride: {
      ...programs.ride,
      saleDays: [1],
      operationExceptions: [{ status: 'closed', region: '서울', programKey: 'ride', sessionKey: 'ride-session-0', startDate: '2026-08-31', endDate: '2026-08-31' }],
      slots: programs.ride.slots.map((slot, index) => ({ ...slot, key: 'ride-session-' + index })),
    },
  };
  const monday = item({ dateKey: '2026-08-31' });
  assert.match(rules.validationError([monday], [], memberId, weekdayPrograms, now), /예약 가능한 날짜와 회차/);
  weekdayPrograms.ride.operationExceptions = [];
  assert.equal(rules.validationError([monday], [], memberId, weekdayPrograms, now), '');
});

test('allows capped same-session additions and resets the discount cap per usage date', () => {
  const usedOnSameDate = [
    item({ id: 'used-1', qty: 1 }),
    item({ id: 'used-2', programKey: 'play', name: '포니랑 놀기', time: '10:20~10:45', qty: 1 }),
  ];
  assert.equal(error([item({ qty: 1 })], usedOnSameDate), '');
  assert.equal(error([item({ dateKey: '2026-08-30', qty: 4 })], usedOnSameDate), '');
  const usedDiscountSameDate = [item({ id: 'used-discount', qty: 2, discount: true })];
  assert.match(error([item({ qty: 1, discount: true })], usedDiscountSameDate), /최대 2매/);
  assert.equal(error([item({ dateKey: '2026-08-30', qty: 2, discount: true })], usedDiscountSameDate), '');
});

test('blocks a cart that mixes more than one usage date', () => {
  assert.match(error([item(), item({ id: 'other-date', dateKey: '2026-08-30' })]), /하나의 이용일만/);
});

test('blocks mixed regions or departments', () => {
  const busanPrograms = { ...programs, busan: { ...programs.ride, key: 'busan', region: '부산경남' } };
  const otherRegion = item({ id: 'other-region', programKey: 'busan', time: '10:20~10:45' });
  assert.match(rules.validationError([item(), otherRegion], [], memberId, busanPrograms, now), /같은 지역과 담당부서/);
});

test('caps each program at 4 per usage date across cart and reservations', () => {
  const ride = item({ qty: 2 });
  const play = item({ id: 'cart-play', programKey: 'play', name: '포니랑 놀기', time: '10:20~10:45', qty: 2, price: 8000 });
  assert.equal(error([ride, play]), '');
  assert.equal(error([item({ qty: 2 })], [item({ id: 'saved-same-session', qty: 1 })]), '');
  const savedRide = item({ id: 'saved-ride', qty: 3 });
  assert.equal(error([play], [savedRide]), '');
  assert.equal(error([ride, play, item({ id: 'extra', time: '11:00~11:20', qty: 1 })]), '');
  assert.match(error([ride], [savedRide]), /최대 4매/);
});

test('fails payment when another member already paid for the same session', () => {
  const store = { revision: 1, reservations: [item({ id: 'paid-1', memberId: 'other', qty: 8 })], carts: { [memberId]: [item({ qty: 1 })] } };
  assert.throws(() => rules.buildOrder(store, memberId, programs, now, 'LRP-1'), (err) => err.code === 'SESSION_TAKEN');
});

test('keeps ride and play as independent sellable programs in one cart', () => {
  const ride = rules.quoteItem(item({ qty: 1 }), programs);
  const play = rules.quoteItem(item({ id: 'cart-play', programKey: 'play', name: '포니랑 놀기', time: '10:20~10:45', qty: 1, price: 4000 }), programs);
  assert.equal(ride.name, '포니 타기');
  assert.equal(play.name, '포니랑 놀기');
  assert.equal(error([ride, play]), '');
});

test('checkout recalculates prices and atomically produces one reservation with separate session tickets', () => {
  const before = store([item({ price: 1, discount: true }), tour({ price: 2 })]);
  const serialized = JSON.stringify(before);
  const order = rules.buildOrder(before, memberId, programs, now, 'order-1');
  assert.equal(order.total, 21000);
  assert.equal(order.reservation.id, 'order-1');
  assert.equal(order.store.reservations[0].id, 'order-1');
  assert.equal(order.store.reservations[0].tickets.length, 2);
  assert.deepEqual(order.tickets.map(ticket => ticket.reservationId), ['order-1', 'order-1']);
  assert.equal(new Set(order.tickets.map(ticket => ticket.id)).size, 2);
  assert.deepEqual(order.tickets.flatMap(ticket => ticket.ticketIds), ['order-1-T01', 'order-1-T02', 'order-1-T03', 'order-1-T04']);
  assert.equal(order.tickets[0].qty, 2, 'One customer ticket groups the session headcount');
  assert.deepEqual(order.tickets[0].unitAmounts, [2500, 2500], 'Each ticket keeps its paid amount snapshot');
  assert.equal(order.tickets[0].originalPrice, 5000);
  assert.deepEqual(order.tickets[0].originalTicketIds, order.tickets[0].ticketIds);
  assert.deepEqual(order.tickets[0].originalUnitAmounts, [2500, 2500]);
  assert.deepEqual(order.tickets[0].originalDiscountFlags, [true, true]);
  assert.deepEqual(order.tickets[0].adminTicketStatuses, ['confirmed', 'confirmed']);
  assert.equal(order.tickets[0].arrivalLeadMinutes, 20, 'Arrival waiting time is snapshotted at checkout');
  assert.equal(order.tickets[0].cancelMinutes, 10, 'Cancellation deadline is snapshotted at checkout');
  assert.equal(order.store.carts[memberId].length, 0);
  assert.deepEqual(order.store.carts.other, before.carts.other);
  assert.equal(order.store.revision, 4);
  assert.equal(JSON.stringify(before), serialized, 'Input remains untouched until the caller commits one storage write');
});

test('failed checkout preserves the whole cart and all reservations', () => {
  const before = store([item({ qty: 3 })], [item({ id: 'already-paid', qty: 2 })]);
  const serialized = JSON.stringify(before);
  assert.throws(() => rules.buildOrder(before, memberId, programs, now, 'bad-order'), /최대 4매/);
  assert.equal(JSON.stringify(before), serialized);
});

test('rechecking latest store allows same-session additions only within the daily cap', () => {
  const first = rules.buildOrder(store(), memberId, programs, now, 'order-1');
  assert.throws(() => rules.buildOrder(first.store, memberId, programs, now, 'order-2'), /담아주세요/);
  const stale = { ...first.store, carts: { [memberId]: [item()] } };
  assert.equal(rules.buildOrder(stale, memberId, programs, now, 'order-3').reservation.id, 'order-3');
  const overLimit = { ...first.store, carts: { [memberId]: [item({ qty: 3 })] } };
  assert.throws(() => rules.buildOrder(overLimit, memberId, programs, now, 'order-4'), /최대 4매/);
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

test('booking summary shows the discount note only after a discount is selected', () => {
  const elements = {};
  const state = { qty: 1, date: '', dateKey: '', time: '', discountPolicyId: '' };
  const runtime = vm.createContext({
    state, program: programs.ride,
    amount: () => 5000,
    currentPrice: () => 5000,
    money: value => value + '원',
    selectedDiscountPolicy: () => state.discountPolicyId ? { id: state.discountPolicyId, label: '과천시민 50% 할인' } : null,
    selectedDiscountQty: () => state.discountPolicyId ? 1 : 0,
    selectedMaxQty: () => 4,
    quantityLimitText: () => '수량 제한 안내',
    bookingSelectionError: () => '',
    programIsVisible: () => true,
    setExplainedButtonState: (button, blocked, reason) => { button.disabled = blocked; button.title = blocked ? reason : ''; },
    byId: id => {
      if (!elements[id]) elements[id] = {};
      return elements[id];
    },
  });
  vm.runInContext(appFunction('update'), runtime);
  runtime.update();
  assert.equal(runtime.byId('product-discount-note').hidden, true);
  assert.equal(runtime.byId('booking-quantity-limit').textContent, '이용일 기준 최대 4매 구매 가능합니다.');
  state.discountPolicyId = 'gwacheon-resident';
  runtime.update();
  assert.equal(runtime.byId('product-discount-note').hidden, false);
  assert.equal(runtime.byId('product-discount-value').textContent, '과천시민 50% · 1매');
  assert.equal(runtime.byId('booking-quantity-limit').textContent, '이용일 기준 최대 4매 구매 가능합니다.');
  assert.match(pageSource, /id="product-discount-note" hidden/);
});

test('reserve redirects to a valid existing cart when a new item exceeds the purchase group limit', async () => {
  const existing = item({ qty: 4 });
  const savedStore = store([existing]);
  const messages = [];
  const steps = [];
  const elements = {};
  let checkoutStarted = false;
  const runtime = vm.createContext({
    currentMember: { id: memberId },
    bookingSelectionError: () => '',
    makeCartItem: () => item({ id: 'new-item', programKey: 'play', name: '포니랑 놀기', qty: 1 }),
    withStoreLock: action => Promise.resolve().then(action),
    readStore: () => savedStore,
    ownCart: () => savedStore.carts[memberId],
    BookingRules: {
      validationError: () => '같은 구매 한도 그룹은 이용일 기준 계정당 최대 4매까지 예약할 수 있습니다.',
      quoteItem: entry => entry,
    },
    programs,
    writeStore: () => { throw new Error('invalid write'); },
    notify: message => messages.push(message),
    byId: id => (elements[id] ||= {}),
    renderSlots() {}, update() {}, renderCart() {},
    goToStep: step => steps.push(step),
    startCheckout: () => { checkoutStarted = true; },
  });
  vm.runInContext(appFunction('addToCart'), runtime);
  await runtime.addToCart(true);
  assert.deepEqual(steps, [4]);
  assert.deepEqual(messages, ['선택한 포니랑 놀기 1명은 구매 한도를 초과해 장바구니에 담기지 않았습니다. 기존 상품 확인 후 결제해주세요.']);
  assert.equal(elements['cart-page-error'].hidden, false);
  assert.equal(elements['cart-page-error'].textContent, messages[0]);
  assert.equal(checkoutStarted, false);
  assert.deepEqual(savedStore.carts[memberId], [existing]);
});

test('reserve skips the cart only when it was empty before adding the selection', async () => {
  async function run(initialCart) {
    const savedStore = store(initialCart);
    const messages = [];
    const steps = [];
    let checkoutStarted = false;
    const runtime = vm.createContext({
      currentMember: { id: memberId },
      bookingSelectionError: () => '',
      makeCartItem: () => item({ id: 'new-item', qty: 1 }),
      withStoreLock: action => Promise.resolve().then(action),
      readStore: () => savedStore,
      ownCart: () => savedStore.carts[memberId],
      BookingRules: { validationError: () => '', quoteItem: entry => entry },
      programs,
      writeStore: () => true,
      notify: message => messages.push(message),
      renderSlots() {}, update() {}, renderCart() {},
      goToStep: step => steps.push(step),
      startCheckout: () => { checkoutStarted = true; },
    });
    vm.runInContext(appFunction('addToCart'), runtime);
    await runtime.addToCart(true);
    return { savedStore, messages, steps, checkoutStarted };
  }

  const empty = await run([]);
  assert.equal(empty.checkoutStarted, true);
  assert.deepEqual(empty.steps, []);
  assert.equal(empty.savedStore.carts[memberId].length, 1);

  const existing = await run([item({ id: 'existing-card', qty: 1 })]);
  assert.equal(existing.checkoutStarted, false);
  assert.deepEqual(existing.steps, [4]);
  assert.deepEqual(existing.messages, ['기존 장바구니 상품과 함께 확인해주세요.']);
  assert.equal(existing.savedStore.carts[memberId].length, 2);
});

test('each add-to-cart action creates a separate card for the same product session', async () => {
  const existing = item({ id: 'existing-card', qty: 1 });
  const addedItem = item({ id: 'new-card', qty: 2 });
  const savedStore = store([existing]);
  const messages = [];
  const runtime = vm.createContext({
    state: {},
    currentMember: { id: memberId },
    bookingSelectionError: () => '',
    makeCartItem: () => addedItem,
    withStoreLock: action => Promise.resolve().then(action),
    readStore: () => savedStore,
    ownCart: () => savedStore.carts[memberId],
    BookingRules: { validationError: () => '', quoteItem: entry => entry },
    programs,
    writeStore: () => true,
    notify: message => messages.push(message),
    renderSlots() {}, update() {}, renderCart() {}, renderDiscountOptions() {}, startCheckout() {}, goToStep() {},
  });
  vm.runInContext(appFunction('addToCart'), runtime);
  await runtime.addToCart(false);
  assert.equal(savedStore.carts[memberId].length, 3);
  assert.deepEqual(savedStore.carts[memberId].map(entry => entry.id), ['existing-card', 'new-card-P01', 'new-card-P02']);
  assert.deepEqual(savedStore.carts[memberId].map(entry => entry.qty), [1, 1, 1]);
  assert.deepEqual(messages, ['장바구니에 담았습니다.']);
});

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
  const normalizedSnapshot = original.carts[memberId].flatMap(entry => Array.from({ length: entry.qty }, (_, index) => ({
    ...entry,
    id: entry.id + '-P' + String(index + 1).padStart(2, '0'),
    qty: 1,
    discount: !!entry.discount && index < (entry.discountQty ?? entry.qty),
    discountQty: entry.discount && index < (entry.discountQty ?? entry.qty) ? 1 : 0,
    price: Math.round(entry.price / entry.qty),
  })));
  const messages = [];
  const elements = { terms: { checked: true }, 'complete-payment': { disabled: false } };
  let completed = false;
  const runtime = vm.createContext({
    BookingRules: rules, programs, currentMember: { id: memberId }, state: { step: 2 }, isPaying: false,
    checkoutSnapshot: JSON.stringify(normalizedSnapshot), reservationStorageKey: 'test-store',
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [now.getTime()])); } },
    window: { localStorage: { getItem: () => serialized, setItem: () => { throw new Error('Quota exceeded'); } } },
    byId: id => elements[id], notify: message => messages.push(message), nextOrderId: () => 'failed-order',
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

test('legacy multi-person cart rows become stable one-person discount and regular cards', () => {
  const saved = store([item({ id: 'legacy-card', qty: 4, price: 15000, discount: true, discountQty: 2 })], []);
  const runtime = vm.createContext({ currentMember: { id: memberId } });
  vm.runInContext(appFunction('ownCart'), runtime);
  const cards = runtime.ownCart(saved);
  assert.equal(cards.length, 4);
  assert.deepEqual(Array.from(cards, entry => entry.id), ['legacy-card-P01', 'legacy-card-P02', 'legacy-card-P03', 'legacy-card-P04']);
  assert.deepEqual(Array.from(cards, entry => entry.qty), [1, 1, 1, 1]);
  assert.deepEqual(Array.from(cards, entry => entry.discount), [true, true, false, false]);
});

test('opening another program resets date, session, headcount and discount options', () => {
  const elements = new Map();
  const state = { programKey: 'ride', date: '2026.08.29 (토)', dateKey: '2026-08-29', time: '10:00~10:20', qty: 2, discount: true };
  const runtime = vm.createContext({
    programs, program: programs.ride, state, bookingStart: now, calendarFirstMonth: now, calendarMonth: now,
    money: value => value + '원',
    byId: id => {
      if (!elements.has(id)) elements.set(id, { replaceChildren() {}, append() {} });
      return elements.get(id);
    },
    createTextElement: () => ({}), applyBookingWindowOverrides() {}, programIsVisible: () => true,
    refreshBookingWindow() {}, renderCalendar() {}, renderSlots() {}, renderDiscountOptions() {}, update() {},
  });
  vm.runInContext(appFunction('selectProgram'), runtime);
  runtime.selectProgram('play');
  assert.equal(state.programKey, 'play');
  assert.equal(state.dateKey, '');
  assert.equal(state.time, '');
  assert.equal(state.qty, 1);
  assert.equal(state.discount, false);
  assert.equal(elements.get('product-title').textContent, '포니랑 놀기');
  assert.equal(elements.get('product-unit-price').textContent, '4000원');
  assert.equal(elements.get('date-picker').open, false);
});

test('slot refresh requires explicit selection and keeps it while capacity remains', () => {
  const state = { dateKey: '', time: '' };
  const elements = { 'slot-placeholder': {}, 'booking-slots': { replaceChildren() { this.innerHTML = ''; } } };
  const runtime = vm.createContext({
    state, program: programs.ride, byId: id => elements[id],
    slotHasStarted: () => false,
    slotRemainingCapacity: () => 4, slotOperationException: () => null,
    document: { querySelectorAll: () => [] },
  });
  vm.runInContext(appFunction('renderSlots'), runtime);
  runtime.renderSlots();
  assert.equal(elements['booking-slots'].hidden, true);
  state.dateKey = '2026-08-29';
  runtime.renderSlots();
  assert.equal(state.time, '', 'Opening a date must not pick the first available slot');
  assert.doesNotMatch(elements['booking-slots'].innerHTML, /data-booked|다른 일정과 시간 중복/);
  state.time = '10:20~10:45';
  runtime.renderSlots();
  assert.equal(state.time, '10:20~10:45', 'An available explicit choice remains selected');
  state.time = '10:00~10:20';
  runtime.renderSlots();
  assert.equal(state.time, '10:00~10:20', 'An overlapping choice remains available when seats remain');
});

test('same-session selection limits the added headcount to the remaining daily allowance', () => {
  const saved = store([item({ qty: 1 })], []);
  const state = { dateKey: '2026-08-29', time: '10:00~10:20' };
  const runtime = vm.createContext({
    state, program: programs.ride, programs, currentMember: { id: memberId }, BookingRules: rules,
    readStore: () => saved, ownCart: () => saved.carts[memberId], slotRemainingCapacity: () => 8,
    selectedDiscountPolicy: () => null, remainingDiscountQty: () => Infinity,
  });
  vm.runInContext(appFunction('selectedMaxQty'), runtime);
  assert.equal(runtime.selectedMaxQty(), 3);
  saved.carts[memberId][0].qty = 4;
  assert.equal(runtime.selectedMaxQty(), 1, 'A full cart keeps the booking action available so it can redirect to checkout');
});

test('discount selection caps a new card at the remaining discount quantity', () => {
  const saved = store([], []);
  const state = { dateKey: '2026-08-29', time: '10:00~10:20', discountPolicyId: 'gwacheon' };
  const runtime = vm.createContext({
    state, program: programs.ride, programs, currentMember: { id: memberId }, BookingRules: rules,
    readStore: () => saved, ownCart: () => saved.carts[memberId], slotRemainingCapacity: () => 8,
    selectedDiscountPolicy: () => programs.ride.discountPolicy, remainingDiscountQty: () => 2,
  });
  vm.runInContext(appFunction('selectedMaxQty'), runtime);
  assert.equal(runtime.selectedMaxQty(), 2);
});

test('discount selection keeps the default at one and only clamps an excessive quantity', () => {
  const state = { qty: 1, discountPolicyId: 'gwacheon', discountQty: 0 };
  const runtime = vm.createContext({
    state,
    selectedMaxQty: () => 2,
    selectedDiscountPolicy: () => state.discountPolicyId ? programs.ride.discountPolicy : null,
    selectedDiscountQty: () => state.discountPolicyId ? state.qty : 0,
  });
  vm.runInContext(appFunction('syncQuantityWithDiscount'), runtime);
  runtime.syncQuantityWithDiscount();
  assert.equal(state.qty, 1);
  assert.equal(state.discountQty, 1);

  state.qty = 4;
  runtime.syncQuantityWithDiscount();
  assert.equal(state.qty, 2, 'Discount tickets are capped without automatically selecting the maximum');
  assert.equal(state.discountQty, 2);
});

test('discount and regular quantity controls start at one and stop at their own maximum', () => {
  assert.doesNotMatch(source, /quantityLocked = !!selectedPolicy/);
  assert.match(source, /state\.qty >= selectedMaxQty\(\)/);
  assert.match(pageSource, /id="booking-quantity-limit" aria-live="polite"/);
});

test('logged-out discount selection still respects the two-ticket discount maximum', () => {
  const state = { dateKey: '2026-08-29', time: '10:00~10:20', discountPolicyId: 'gwacheon' };
  const runtime = vm.createContext({
    state, program: programs.ride, currentMember: null,
    slotRemainingCapacity: () => 8,
    selectedDiscountPolicy: () => programs.ride.discountPolicy,
    remainingDiscountQty: () => 2,
  });
  vm.runInContext(appFunction('selectedMaxQty'), runtime);
  assert.equal(runtime.selectedMaxQty(), 2);
});

test('requires date and time in order before later booking controls can change', () => {
  const state = { dateKey: '', time: '' };
  const runtime = vm.createContext({ state });
  vm.runInContext(appFunction('bookingSelectionError'), runtime);
  assert.equal(runtime.bookingSelectionError(), '이용 날짜를 먼저 선택해주세요.');
  state.dateKey = '2026-08-29';
  assert.equal(runtime.bookingSelectionError(), '이용 시간을 먼저 선택해주세요.');
  state.time = '10:00~10:20';
  assert.equal(runtime.bookingSelectionError(), '');
  assert.match(source, /booking-quantity-discount[^]*notify\(error\)/);
});

test('explains when existing cart tickets leave room for only one more person', () => {
  const saved = store(Array.from({ length: 3 }, (_, index) => item({ id: 'cart-' + index, qty: 1 })), []);
  const state = { dateKey: '2026-08-29', time: '10:00~10:20', discountPolicyId: 'gwacheon' };
  const runtime = vm.createContext({
    state, program: programs.ride, programs, currentMember: { id: memberId }, BookingRules: rules,
    readStore: () => saved, ownCart: () => saved.carts[memberId],
    selectedDiscountPolicy: () => programs.ride.discountPolicy,
    remainingDiscountQty: () => 1,
    selectedMaxQty: () => 1,
    slotRemainingCapacity: () => 8,
  });
  vm.runInContext(['purchaseLimitUsage', 'quantityLimitText'].map(appFunction).join('\n'), runtime);
  assert.equal(
    runtime.quantityLimitText(),
    '장바구니 3매 · 추가 가능 1매'
  );
});

test('HTML routes restore screens and redirect legacy query links', () => {
  const visited = [];
  const redirects = [];
  const runtime = vm.createContext({
    URLSearchParams, programs, state: { programKey: 'play' }, completedOrder: null,
    window: { location: { pathname: '/booking.html', search: '?product=play' } },
    currentMember: null,
    applyBookingWindowOverrides() {}, selectProgram() {},
    navigatePage: (file, params, replace) => redirects.push({ file, params, replace }),
    showMyTickets: () => visited.push('lookup'),
    goToStep: (step) => visited.push(step), renderCart() {},
  });
  vm.runInContext(appFunction('restoreShopRoute'), runtime);
  runtime.restoreShopRoute();
  assert.equal(visited.at(-1), 1);
  runtime.window.location.pathname = '/cart.html';
  runtime.restoreShopRoute();
  assert.equal(visited.at(-1), 4);
  runtime.window.location.pathname = '/reservations.html';
  runtime.restoreShopRoute();
  assert.equal(visited.at(-1), 'lookup');
  runtime.window.location.pathname = '/checkout.html';
  runtime.restoreShopRoute();
  assert.equal(redirects.at(-1).file, 'cart.html');
  runtime.window.location.pathname = '/index.html';
  for (const route of ['?view=cart', '?view=checkout', '?view=complete', '?view=tickets']) {
    runtime.window.location.search = route;
    runtime.restoreShopRoute();
    assert.equal(redirects.at(-1).file, ['?view=complete', '?view=tickets'].includes(route) ? 'reservations.html' : 'cart.html');
    assert.equal(redirects.at(-1).replace, true);
  }
  runtime.window.location.search = '?product=play';
  runtime.restoreShopRoute();
  assert.equal(redirects.at(-1).file, 'booking.html');
  assert.equal(redirects.at(-1).params.product, 'play');
});

test('customer catalog consumes administrator programs, sessions, closures and discounts', () => {
  assert.match(source, /catalog\.addedPrograms \|\| \[\]/);
  assert.match(source, /userBookable: true, adminCreated: true/);
  assert.match(source, /catalog\.addedSessions \|\| \[\]/);
  assert.match(source, /programs\[key\]\.operationExceptions = operationExceptions/);
  assert.match(source, /savedDiscounts\.filter/);
  assert.match(source, /Object\.keys\(programs\)\.filter\(function \(programKey\) \{ return programs\[programKey\]\.userBookable/);
});

 test('supports configured program limits above four and counts all sessions', () => {
 const configured = { ...programs, ride: { ...programs.ride, purchasePolicy: { maxQty: 6 } } };
 assert.equal(rules.validationError([item({ qty: 6, time: '15:00~15:20' })], [], memberId, configured, now), '');
 assert.match(rules.validationError([item({ qty: 4, time: '15:00~15:20' })], [item({ qty: 3 })], memberId, configured, now), /최대 6매/);
 });
