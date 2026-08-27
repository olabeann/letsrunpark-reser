const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = readFileSync(resolve(__dirname, '../app.js'), 'utf8');
const ticketHtml = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
const programSource = source.slice(source.indexOf('  var programs ='), source.indexOf('  var query ='));
const names = [
  'dateKey', 'formatBookingDate', 'formatTime', 'ticketSessionStart', 'ticketSessionEnd',
  'ticketTiming', 'isWeekend', 'demoReservationId', 'slotDateTime', 'activeSlotForNow',
  'stateExampleReservations', 'uniqueReservations', 'allReservations', 'hasTimeConflict',
  'ticketListReservations', 'updateTicketListStatuses', 'updateTicketAccess',
];
const functions = names.map(name => {
  const start = source.indexOf('  function ' + name + '(');
  assert.notEqual(start, -1, 'Missing production function: ' + name);
  return source.slice(start, source.indexOf('\n  }', start) + 4);
}).join('\n');

function runtime(now, saved = []) {
  let clock = now.getTime();
  let renders = 0;
  const elements = {
    'my-tickets-screen': { hidden: false },
    'my-tickets-list-view': { hidden: false },
  };
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
    money: value => value + '원',
    byId: id => elements[id],
    document: { querySelectorAll: () => [] },
    renderTicketList: () => { renders += 1; },
  });
  vm.runInContext(programSource + '\n' + functions, context);
  return { context, elements, setNow: date => { clock = date.getTime(); }, renders: () => renders };
}

function assertStates(context, tickets, now) {
  assert.equal(tickets.length, 3);
  assert.deepEqual(Array.from(tickets, item => context.ticketTiming(item, now).accessState), ['active', 'upcoming', 'ended']);
  assert.equal(new Set(Array.from(tickets, item => item.id)).size, 3);
  assert.equal(tickets[0].discount, true, 'Active demo retains citizen proof notice');
}

const now = new Date(2026, 7, 27, 11, 23);
for (const count of [0, 1, 2, 8, 20]) {
  test('keeps all three states with ' + count + ' stored upcoming reservations', () => {
    const saved = Array.from({ length: count }, (_, i) => ({
      id: 'saved-' + i, dateKey: '2026-09-' + String(i + 1).padStart(2, '0'),
      time: '10:00~10:20', discount: false,
    }));
    const before = JSON.stringify(saved);
    const { context } = runtime(now, saved);
    const tickets = context.ticketListReservations();
    assertStates(context, tickets, now);
    if (count) assert.equal(tickets[1].id, 'saved-0');
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
  assertStates(context, tickets, now);
  assert.equal(tickets[2].id, 'ended');
});

test('example states remain distinct across a full week and month boundary', () => {
  for (let day = 27; day <= 34; day += 1) {
    for (const [hour, minute] of [[0, 0], [9, 50], [11, 45], [11, 46], [13, 9], [13, 10], [13, 45], [17, 0], [23, 59]]) {
      const time = new Date(2026, 7, day, hour, minute);
      const { context } = runtime(time);
      const tickets = context.ticketListReservations();
      assertStates(context, tickets, time);
      assert.ok(context.ticketTiming(tickets[1], time).entryOpen > time);
      assert.ok(context.ticketTiming(tickets[2], time).entryClose < time);
      assert.equal(context.ticketTiming(tickets[1], time).sessionStart.getDay() % 6, 0);
    }
  }
});

test('refreshes the visible list at a status boundary without replacing open details', () => {
  const fixture = runtime(now);
  fixture.context.ticketReservations = fixture.context.ticketListReservations();
  fixture.context.updateTicketListStatuses();
  assert.equal(fixture.renders(), 0);
  fixture.setNow(new Date(2026, 7, 27, 11, 46));
  fixture.context.updateTicketListStatuses();
  assert.equal(fixture.renders(), 1);
  fixture.elements['my-tickets-list-view'].hidden = true;
  fixture.context.updateTicketListStatuses();
  assert.equal(fixture.renders(), 1);
});

test('staff discount notice is compact and inside the top status card', () => {
  const statusStart = ticketHtml.indexOf('<section class="entry-ticket__status">');
  const statusEnd = ticketHtml.indexOf('</section>', statusStart);
  const notice = ticketHtml.indexOf('id="ticket-citizen-discount"');
  const sessionSummary = ticketHtml.indexOf('id="ticket-session-summary"');
  assert.ok(statusStart < notice && notice < sessionSummary && sessionSummary < statusEnd);
  assert.equal([...ticketHtml.matchAll(/id="ticket-citizen-discount"/g)].length, 1);
  assert.match(ticketHtml, /<strong>과천시민 50%<\/strong><span>증빙 서류 확인<\/span>/);
  assert.match(ticketHtml, /aria-label="직원 확인: 과천시민 50% 할인 고객의 신분증 등 증빙 서류를 확인해주세요\."/);
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
