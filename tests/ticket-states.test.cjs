const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const BookingRules = require('../booking-rules.js');

const source = readFileSync(resolve(__dirname, '../app.js'), 'utf8');
const ticketHtml = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
const componentCss = readFileSync(resolve(__dirname, '../components.css'), 'utf8');
const programSource = source.slice(source.indexOf('  var ponySlots ='), source.indexOf('  var query ='));
const names = [
  'dateKey', 'formatBookingDate', 'formatTime', 'ticketSessionStart', 'ticketSessionEnd',
  'ticketTiming', 'ticketDiscountQty', 'isWeekend', 'ticketReservationId', 'slotDateTime', 'activeSlotForNow',
  'ticketReservationNumber',
  'formatTicketGroupDate', 'ticketListGroups',
  'exampleTicketsNeedRefresh',
  'defaultTicketReservations', 'persistDefaultTicketReservations',
  'ticketListReservations', 'updateTicketListStatuses', 'updateTicketAccess',
];
const functions = names.map(name => {
  const start = source.indexOf('  function ' + name + '(');
  assert.notEqual(start, -1, 'Missing production function: ' + name);
  return source.slice(start, source.indexOf('\n  }', start) + 4);
}).join('\n');

function runtime(now, saved = [], examples = false) {
  let clock = now.getTime();
  let renders = 0;
  let writtenStore = null;
  const elements = {
    'my-tickets-screen': { hidden: false },
    'my-tickets-list-view': { hidden: false },
  };
  const cards = [];
  for (const [, id] of ticketHtml.matchAll(/id="([^"]+)"/g)) {
    if (!elements[id]) elements[id] = { hidden: true, textContent: '', setAttribute(name, value) { this[name] = value; } };
  }
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])); }
  }
  const context = vm.createContext({
    Date: ClockDate,
    weekdayNames: ['일', '월', '화', '수', '목', '금', '토'],
    readReservations: () => saved,
    readStore: () => ({ revision: 0, reservations: saved, carts: {} }),
    writeStore: store => { writtenStore = store; return true; },
    ownCart: () => [],
    readDemoCancellations: () => ({}),
    currentMember: { id: 'member-1' },
    program: { key: 'pony' },
    showTicketExamples: examples,
    BookingRules,
    discountDisplayLabel: (name, type, value) => String(name || '할인').trim() + ' ' + (type === 'percent' ? Number(value || 0) + '%' : Number(value || 0).toLocaleString('ko-KR') + '원'),
    money: value => value + '원',
    byId: id => elements[id],
    document: { querySelectorAll: () => cards },
    renderTicketList: () => { renders += 1; },
  });
  vm.runInContext(programSource + '\n' + functions, context);
  return { context, elements, cards, setNow: date => { clock = date.getTime(); }, renders: () => renders, writtenStore: () => writtenStore };
}

function assertStates(context, tickets, now) {
  assert.equal(tickets.length, 3);
  assert.deepEqual(Array.from(tickets, item => context.ticketTiming(item, now).accessState), ['upcoming', 'active', 'ended']);
  assert.equal(new Set(Array.from(tickets, item => item.id)).size, 3);
  assert.equal(tickets[1].discount, true, 'Active sample retains citizen discount information');
}

test('user ticket displays one shared reservation number for current and legacy records', () => {
  const { context } = runtime(now);
  assert.equal(context.ticketReservationNumber({ reservationId: 'LRP-260915-00001', id: 'LRP-260915-00001-G02' }), 'LRP-260915-00001');
  assert.equal(context.ticketReservationNumber({ id: 'LRP-260915-00001-2' }), 'LRP-260915-00001');
  assert.equal(context.ticketReservationNumber({ id: 'GP-a7f798e3-19cf-4a95-9672-2399f01187a5-4' }), 'GP-a7f798e3-19cf-4a95-9672-2399f01187a5');
  assert.equal(context.ticketReservationNumber({ id: 'order-1' }), 'order-1');
  assert.match(source, /ticket-reservation-number"\)\.textContent = ticketReservationNumber\(ticketReservation\)/);
  assert.match(source, /ticket-order-number"\)\.textContent = ticketReservationNumber\(ticketReservation\)/);
});

test('default tickets use admin reservation format and persist to the shared booking store', () => {
  const fixture = runtime(now);
  const tickets = fixture.context.ticketListReservations();
  assert.equal(tickets.length, 3);
  tickets.forEach(ticket => assert.match(ticket.reservationId, /^LRP-\d{6}-\d{5}$/));
  const store = fixture.writtenStore();
  assert.ok(store);
  assert.equal(store.reservations.length, 2);
  assert.equal(store.reservations[0].tickets.length, 2);
  assert.equal(store.reservations[0].total, 13000);
  assert.equal(store.reservations[0].tickets.reduce((sum, ticket) => sum + ticket.qty, 0), 4);
  assert.equal(store.reservations[0].tickets.reduce((sum, ticket) => sum + ticket.discountQty, 0), 2);
  assert.equal(new Set(store.reservations[0].tickets.flatMap(ticket => ticket.ticketIds)).size, 4);
  assert.deepEqual(Array.from(BookingRules.ticketRecords(store.reservations), ticket => ticket.reservationId).sort(), Array.from(tickets, ticket => ticket.reservationId).sort());
  assert.ok(store.reservations.every(reservation => reservation.isExample && reservation.memberId === 'member-1'));
  assert.equal(fixture.context.ticketListGroups(tickets)[0].tickets.length, 2);
});

test('refreshes only example data that violates the daily quantity or discount limits', () => {
  const { context } = runtime(now);
  const base = { isExample: true, reservationId: 'sample-order', dateKey: '2026-09-19', time: '13:20~13:45' };
  assert.equal(context.exampleTicketsNeedRefresh([
    { ...base, id: 'sample-order-G01', qty: 2, discount: true, discountQty: 2 },
    { ...base, id: 'sample-order-G02', qty: 4, discount: true, discountQty: 2 },
  ]), true);
  assert.equal(context.exampleTicketsNeedRefresh([
    { ...base, id: 'sample-order-G01', qty: 2, discount: true, discountQty: 2 },
    { ...base, id: 'sample-order-G02', qty: 2, discount: false, discountQty: 0 },
  ]), false);
  assert.equal(context.exampleTicketsNeedRefresh([
    { ...base, id: 'sample-order-G01', qty: 2, discount: true, discountQty: 2 },
    { ...base, id: 'sample-order-G02', qty: 2, discount: true, discountQty: 1 },
  ]), true);
  assert.equal(context.exampleTicketsNeedRefresh([
    { ...base, isExample: false, id: 'real-order-G01', qty: 6, discount: false },
  ]), false);
});

const now = new Date(2026, 7, 27, 11, 23);
for (const count of [0, 1, 2, 8, 20]) {
  test('shows all ' + count + ' stored reservations without adding examples or hiding tickets', () => {
    const saved = Array.from({ length: count }, (_, i) => ({
      id: 'saved-' + i, dateKey: '2026-09-' + String(i + 1).padStart(2, '0'),
      time: '10:00~10:20', discount: false, memberId: 'member-1',
    }));
    const before = JSON.stringify(saved);
    const { context } = runtime(now, saved);
    const tickets = context.ticketListReservations();
    if (count === 0) assert.equal(tickets.length, 3);
    else assert.deepEqual(Array.from(tickets, item => item.id), saved.map(item => item.id));
    assert.equal(JSON.stringify(saved), before, 'Stored reservations must remain untouched');
  });
}

test('uses a saved ended ticket when one exists', () => {
  const saved = [
    { id: 'upcoming', dateKey: '2026-08-30', time: '10:00~10:20' },
    { id: 'ended', dateKey: '2026-08-23', time: '11:00~11:20' },
  ];
  const { context } = runtime(now, saved);
  const tickets = context.ticketListReservations();
  assert.equal(tickets.length, 2);
  assert.equal(tickets[1].id, 'ended');
});

test('shows the same date and total group header for single and multi-ticket payments', () => {
  const { context } = runtime(now);
  const groups = context.ticketListGroups([
    { id: 'order-1-G01', reservationId: 'order-1', date: '2026.09.19 (토)', dateKey: '2026-09-19', time: '10:00~10:20', createdAt: '2026-09-15T03:00:00.000Z', price: 12000 },
    { id: 'order-1-G02', reservationId: 'order-1', date: '2026.09.19 (토)', dateKey: '2026-09-19', time: '10:00~10:20', createdAt: '2026-09-15T03:00:00.000Z', price: 5000 },
    { id: 'order-2-G01', reservationId: 'order-2', date: '2026.09.13 (일)', dateKey: '2026-09-13', time: '10:00~10:20', createdAt: '2026-09-12T03:00:00.000Z', price: 10000 },
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].tickets.length, 2);
  assert.equal(groups[0].total, 17000);
  assert.equal(groups[0].date, '2026.09.19 (토)');
  assert.doesNotMatch(source.slice(source.indexOf('  function createTicketListCard'), source.indexOf('  function updateTicketListStatuses')), /discountLabel|할인 적용/);
  assert.doesNotMatch(source, /createTextElement\([^\n]+함께 예약한 티켓/);
  assert.doesNotMatch(source, /group\.tickets\.length === 1/);
  assert.match(source, /group\.date \+ " 예약 티켓 " \+ group\.tickets\.length \+ "개"/);
  assert.match(source, /ticket-list-group__date/);
  assert.match(source, /ticket-list-group__total/);
});

test('sorts tickets within each reservation by active, upcoming, ended without moving groups', () => {
  const { context } = runtime(new Date(2026, 8, 19, 10, 0));
  const saved = [
    { id: 'a-ended', reservationId: 'a', dateKey: '2026-09-18', time: '10:00~10:20', price: 1000 },
    { id: 'b-upcoming', reservationId: 'b', dateKey: '2026-09-20', time: '10:00~10:20', price: 2000 },
    { id: 'a-upcoming-1', reservationId: 'a', dateKey: '2026-09-19', time: '13:20~13:45', price: 3000 },
    { id: 'a-active', reservationId: 'a', dateKey: '2026-09-19', time: '10:00~10:20', price: 4000 },
    { id: 'a-upcoming-2', reservationId: 'a', dateKey: '2026-09-19', time: '12:00~12:20', price: 5000 },
  ];
  const before = JSON.stringify(saved);
  const groups = context.ticketListGroups(saved);
  assert.deepEqual(Array.from(groups, group => group.id), ['a', 'b']);
  assert.deepEqual(Array.from(groups[0].tickets, ticket => ticket.id), ['a-active', 'a-upcoming-1', 'a-upcoming-2', 'a-ended']);
  assert.equal(groups[0].total, 13000);
  assert.equal(JSON.stringify(saved), before);
});

test('example states remain distinct across a full week and month boundary', () => {
  for (let day = 27; day <= 34; day += 1) {
    for (const [hour, minute] of [[0, 0], [9, 50], [11, 45], [11, 46], [13, 9], [13, 10], [13, 45], [17, 0], [23, 59]]) {
      const time = new Date(2026, 7, day, hour, minute);
      const { context } = runtime(time, [], true);
      const tickets = context.ticketListReservations();
      assertStates(context, tickets, time);
      assert.ok(context.ticketTiming(tickets[0], time).entryOpen > time);
      assert.ok(context.ticketTiming(tickets[2], time).entryClose < time);
      assert.equal(context.ticketTiming(tickets[0], time).sessionStart.getDay() % 6, 0);
    }
  }
});

test('updates ticket badges at a status boundary without replacing the list or open details', () => {
  const fixture = runtime(now, [{ id: 'test', dateKey: '2026-08-27', time: '11:20~11:45' }]);
  const badge = {};
  fixture.cards.push({ getAttribute: () => 'test', setAttribute() {}, querySelector: () => badge });
  fixture.context.ticketReservations = fixture.context.ticketListReservations();
  fixture.context.updateTicketListStatuses();
  assert.equal(fixture.renders(), 0);
  assert.equal(badge.textContent, '입장 가능');
  fixture.setNow(new Date(2026, 7, 27, 11, 46));
  fixture.context.updateTicketListStatuses();
  assert.equal(badge.textContent, '입장 종료');
  assert.equal(fixture.renders(), 0);
  fixture.elements['my-tickets-list-view'].hidden = true;
  fixture.context.updateTicketListStatuses();
  assert.equal(fixture.renders(), 0);
});

test('uses the program arrival waiting time for ticket activation and guidance', () => {
  const { context } = runtime(now);
  const reservation = { id: 'arrival-policy', dateKey: '2026-08-27', time: '12:00~12:20', arrivalLeadMinutes: 35 };
  const beforeOpen = context.ticketTiming(reservation, new Date(2026, 7, 27, 11, 24));
  const atOpen = context.ticketTiming(reservation, new Date(2026, 7, 27, 11, 25));
  assert.equal(beforeOpen.accessState, 'upcoming');
  assert.equal(beforeOpen.status.detail, '35분 전까지 방문하셔서 입장을 대기해주세요.');
  assert.equal(atOpen.accessState, 'active');
  assert.equal(atOpen.arrivalLeadMinutes, 35);
  assert.equal(atOpen.status.detail, '35분 전까지 방문하셔서 입장을 대기해주세요.');
  const noLead = context.ticketTiming({ ...reservation, arrivalLeadMinutes: 0 }, new Date(2026, 7, 27, 12, 0));
  assert.equal(noLead.status.detail, '예약 시간까지 방문하셔서 입장을 대기해주세요.');
});

test('staff discount notice is a compact design-system badge beside the ticket status', () => {
  const statusStart = ticketHtml.indexOf('<section class="entry-ticket__status">');
  const statusEnd = ticketHtml.indexOf('</section>', statusStart);
  const indicators = ticketHtml.indexOf('class="entry-ticket__indicators"');
  const statusBadge = ticketHtml.indexOf('class="entry-ticket__badge"');
  const notice = ticketHtml.indexOf('id="ticket-discount-proof"');
  const clock = ticketHtml.indexOf('class="entry-ticket__clock"');
  const sessionSummary = ticketHtml.indexOf('id="ticket-session-summary"');
  assert.ok(statusStart < indicators && indicators < statusBadge && statusBadge < notice && notice < clock && clock < sessionSummary && sessionSummary < statusEnd);
  assert.equal([...ticketHtml.matchAll(/id="ticket-discount-proof"/g)].length, 1);
  assert.match(ticketHtml, /<strong id="ticket-discount-label">할인 증빙 검토 필요<\/strong>/);
  assert.match(ticketHtml, /aria-label="할인 증빙 검토가 필요한 티켓입니다\."/);
});

test('ticket colors use only design-system tokens instead of one-off color values', () => {
  const start = componentCss.indexOf('.ticket-list-card__status');
  const end = componentCss.indexOf('.ticket-list-card__title', start);
  const ticketCss = componentCss.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(ticketCss, /#[0-9a-f]{3,8}|rgba?\(/i);
  assert.match(ticketCss, /status--active\{[^}]*background:var\(--green-100\)/);
  assert.match(ticketCss, /status--ended\{[^}]*color:var\(--grey\)/);
});

test('ticket details share a black shell while each access state keeps its card treatment', () => {
  assert.match(componentCss, /my-tickets-screen:has\(\.ticket-detail-view:not\(\[hidden\]\)\)\{background:linear-gradient\(180deg,var\(--ink\)/);
  assert.match(componentCss, /\.entry-ticket__status\{[^}]*border-radius:28px[^}]*background:var\(--ticket-upcoming-bg\)/);
  assert.match(componentCss, /data-access-state="active"[^}]*\.entry-ticket__status\{[^}]*background:var\(--green-100\)/);
  assert.match(componentCss, /data-access-state="ended"[^}]*\.entry-ticket__status\{[^}]*background:var\(--grey\)/);
});

test('discount notice visibility follows the selected ticket in every access state', () => {
  assert.match(source, /ticket-discount-proof"\)\.hidden = !hasDiscount/);
  assert.match(source, /ticket-discount-label"\)\.textContent = "할인 증빙 검토 필요"/);
  assert.match(source, /ticket\.setAttribute\("data-access-state", timing\.accessState\)/);
});
