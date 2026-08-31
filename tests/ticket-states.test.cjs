const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const BookingRules = require('../booking-rules.js');

const source = readFileSync(resolve(__dirname, '../app.js'), 'utf8');
const ticketHtml = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
const componentCss = readFileSync(resolve(__dirname, '../components.css'), 'utf8');
const programSource = source.slice(source.indexOf('  var programs ='), source.indexOf('  var query ='));
const names = [
  'dateKey', 'formatBookingDate', 'formatTime', 'ticketSessionStart', 'ticketSessionEnd',
  'ticketTiming', 'isWeekend', 'demoReservationId', 'slotDateTime', 'activeSlotForNow',
  'stateExampleReservations', 'hasTimeConflict',
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
    readStore: () => ({ reservations: saved, carts: {} }),
    ownCart: () => [],
    currentMember: { id: 'member-1' },
    program: { key: 'pony' },
    showTicketExamples: examples,
    BookingRules,
    money: value => value + '원',
    byId: id => elements[id],
    document: { querySelectorAll: () => cards },
    renderTicketList: () => { renders += 1; },
  });
  vm.runInContext(programSource + '\n' + functions, context);
  return { context, elements, cards, setNow: date => { clock = date.getTime(); }, renders: () => renders };
}

function assertStates(context, tickets, now) {
  assert.equal(tickets.length, 3);
  assert.deepEqual(Array.from(tickets, item => context.ticketTiming(item, now).accessState), ['active', 'upcoming', 'ended']);
  assert.equal(new Set(Array.from(tickets, item => item.id)).size, 3);
  assert.equal(tickets[0].discount, true, 'Active demo retains citizen proof notice');
}

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
    assert.deepEqual(Array.from(tickets, item => item.id), saved.map(item => item.id));
    if (count > 3) assert.equal(context.hasTimeConflict(saved[count - 1].dateKey, saved[count - 1].time), true);
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

test('example states remain distinct across a full week and month boundary', () => {
  for (let day = 27; day <= 34; day += 1) {
    for (const [hour, minute] of [[0, 0], [9, 50], [11, 45], [11, 46], [13, 9], [13, 10], [13, 45], [17, 0], [23, 59]]) {
      const time = new Date(2026, 7, day, hour, minute);
      const { context } = runtime(time, [], true);
      const tickets = context.ticketListReservations();
      assertStates(context, tickets, time);
      assert.ok(context.ticketTiming(tickets[1], time).entryOpen > time);
      assert.ok(context.ticketTiming(tickets[2], time).entryClose < time);
      assert.equal(context.ticketTiming(tickets[1], time).sessionStart.getDay() % 6, 0);
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

test('staff discount notice is a compact design-system badge beside the ticket status', () => {
  const statusStart = ticketHtml.indexOf('<section class="entry-ticket__status">');
  const statusEnd = ticketHtml.indexOf('</section>', statusStart);
  const indicators = ticketHtml.indexOf('class="entry-ticket__indicators"');
  const statusBadge = ticketHtml.indexOf('class="entry-ticket__badge"');
  const notice = ticketHtml.indexOf('id="ticket-citizen-discount"');
  const clock = ticketHtml.indexOf('class="entry-ticket__clock"');
  const sessionSummary = ticketHtml.indexOf('id="ticket-session-summary"');
  assert.ok(statusStart < indicators && indicators < statusBadge && statusBadge < notice && notice < clock && clock < sessionSummary && sessionSummary < statusEnd);
  assert.equal([...ticketHtml.matchAll(/id="ticket-citizen-discount"/g)].length, 1);
  assert.match(ticketHtml, /<strong>과천시민 50%<\/strong><span>증빙 확인<\/span>/);
  assert.match(ticketHtml, /aria-label="직원 확인: 과천시민 50% 할인 고객의 신분증 등 증빙 서류를 확인해주세요\."/);
});

test('ticket colors use only design-system tokens instead of one-off color values', () => {
  const start = componentCss.indexOf('.ticket-list-card__status');
  const end = componentCss.indexOf('@media(max-width:997px)', start);
  const ticketCss = componentCss.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(ticketCss, /#[0-9a-f]{3,8}|rgba?\(/i);
  assert.match(ticketCss, /\.entry-ticket__discount\{[^}]*background:var\(--coral-500\);color:var\(--ink\)/);
  assert.match(ticketCss, /data-access-state="active"[^}]*background:var\(--green-100\)/);
  assert.match(ticketCss, /data-access-state="ended"[^}]*background:var\(--grey\)/);
});

test('discount notice visibility follows the selected ticket in every access state', () => {
  const { context, elements } = runtime(now);
  const examples = context.stateExampleReservations();
  for (const [index, accessState] of ['active', 'upcoming', 'ended'].entries()) {
    for (const discount of [true, false]) {
      context.ticketReservation = { ...examples[index], discount };
      context.updateTicketAccess();
      assert.equal(elements['ticket-citizen-discount'].hidden, !discount);
      assert.equal(elements['entry-ticket']['data-access-state'], accessState);
      assert.equal(elements['ticket-reservation-number'].textContent, examples[index].id);
    }
  }
});
