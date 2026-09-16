const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const script = readFileSync(resolve(__dirname, '../admin.js'), 'utf8');
const html = readFileSync(resolve(__dirname, '../admin.html'), 'utf8');
const referenceCss = readFileSync(resolve(__dirname, '../admin-reference.css'), 'utf8');

test('admin reservation UI exposes only the shared reservation number', () => {
  assert.doesNotMatch(script, /<small>' \+ escapeHtml\(item\.id\) \+ '<\/small>/);
  assert.doesNotMatch(script, /<dt>티켓 묶음<\/dt>/);
  assert.doesNotMatch(script, /reservationNumber\(item\) \+ " " \+ item\.id/);
  assert.doesNotMatch(html, /id="drawer-title">LRP-[^<]+-[12]<\/h2>/);
  assert.match(script, /reservationId: "LRP-260902-00001"/);
  assert.match(script, /adminStateKey = "letsrunPlayAdminDemoV4"/);
  assert.match(script, /localStorage\.removeItem\("letsrunPlayAdminDemoV3"\)/);
});

test('admin identity uses account scope without personal manager names', () => {
  assert.match(html, /<strong>통합 운영 관리자<\/strong><small>전체 지역·부서<\/small>/);
  assert.match(html, /class="admin-user"><span aria-hidden="true"><svg/);
  assert.match(script, /currentAccount\.department/);
  assert.match(script, /currentAccount\.region \+ " · 관리자"/);
  assert.match(script, /function currentAdminActor\(\)/);
  assert.doesNotMatch(script + html, /[가-힣]+ 매니저/);
});

test('admin groups product tickets under one reservation and labels each person ticket', () => {
  const functionNames = ['reservationNumber', 'ticketUnitPrice', 'ticketDiscountLabel', 'groupReservationItems'];
  const functions = functionNames.map(name => {
    const start = script.indexOf('  function ' + name + '(');
    assert.notEqual(start, -1);
    return script.slice(start, script.indexOf('\n  }', start) + 4);
  }).join('\n');
  const context = vm.createContext({
    discountPolicies: [{ id: 'gwacheon', name: '과천시민 할인', type: 'percent', value: 50 }],
    programs: { ride: { price: 5000 }, play: { price: 4000 } },
    money: value => value + '원',
  });
  vm.runInContext(functions, context);
  const grouped = context.groupReservationItems([
    { id: 'LRP-260902-00001-G01', reservationId: 'LRP-260902-00001', program: '포니 타기', programKey: 'ride', date: '2026.09.12 (토)', time: '14:20~14:45', qty: 2, price: 5000, discount: true, tickets: ['confirmed', 'confirmed'], location: '서울', department: '공원화사업추진TF' },
    { id: 'LRP-260902-00001-G02', reservationId: 'LRP-260902-00001', program: '포니랑 놀기', programKey: 'play', date: '2026.09.12 (토)', time: '15:20~15:45', qty: 1, price: 4000, tickets: ['confirmed'], location: '서울', department: '공원화사업추진TF' },
  ]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].program, '포니 타기, 포니랑 놀기');
  assert.deepEqual(Array.from(grouped[0].ticketDetails, ticket => ticket.program), ['포니 타기', '포니 타기', '포니랑 놀기']);
  assert.deepEqual(Array.from(grouped[0].ticketIds), ['LRP-260902-00001-T01', 'LRP-260902-00001-T02', 'LRP-260902-00001-T03']);
  assert.deepEqual(Array.from(grouped[0].ticketDetails, ticket => ticket.discountLabel), ['과천시민 50% 할인', '과천시민 50% 할인', '']);
  assert.match(script, /escapeHtml\(detail\.program\).*escapeHtml\(ticketId\)/);
  assert.doesNotMatch(script, /배분 결제액/);
  assert.doesNotMatch(script, /할인 미적용/);
});

test('admin cancellation uses the checkout deadline snapshot and rechecks it on confirm', () => {
  const start = script.indexOf('  function adminTicketCanCancel(');
  const fn = script.slice(start, script.indexOf('\n  }', start) + 4);
  const context = vm.createContext({ programs: { ride: { cancelMinutes: 10 } } });
  vm.runInContext(fn, context);
  const detail = { sourceItem: { dateKey: '2026-09-20', time: '10:00~10:20', programKey: 'ride', cancelMinutes: 30 } };
  assert.equal(context.adminTicketCanCancel(detail, new Date(2026, 8, 20, 9, 29)), true);
  assert.equal(context.adminTicketCanCancel(detail, new Date(2026, 8, 20, 9, 30)), false);
  assert.match(script, /selected\.some\(function \(index\) \{ return !adminTicketCanCancel/);
  assert.match(script, /ticket-cancelled-status">취소 불가/);
  assert.doesNotMatch(script, /ticket-cancelled-status">취소 마감/);
  assert.match(referenceCss, /\.reservation-drawer\{width:min\(560px,100vw\)\}/);
});

test('stored customer and operation cancellations preserve original ticket snapshots', () => {
  assert.match(script, /price: item\.originalPrice \|\| item\.price \|\| 0/);
  assert.match(script, /target\.originalTicketIds = originalTicketIds/);
  assert.match(script, /target\.originalUnitAmounts = originalUnitAmounts/);
  assert.match(script, /target\.adminTicketStatuses = originalTicketIds\.map/);
  assert.match(script, /target\.price = 0/);
});

test('reservation program filter includes current catalog and historical ticket names', () => {
  assert.match(script, /function syncReservationProgramFilter\(\)/);
  assert.match(script, /programCatalog\(\)\.map/);
  assert.match(script, /names = names\.concat\(item\.programNames \|\| \[item\.program\]\)/);
  assert.match(script, /syncReservationProgramFilter\(\);\r?\n    var items = filteredReservations/);
  assert.match(script, /programKey: item\.programKey \|\| "ride"/);
});
