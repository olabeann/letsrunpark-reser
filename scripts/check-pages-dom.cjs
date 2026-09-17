const { JSDOM, VirtualConsole } = require('jsdom');
const { readFileSync, existsSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = require('node:path').resolve(__dirname, '..');
const source = readFileSync(root + '/app.js', 'utf8');
const defs = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('  var ponySlots ='), source.indexOf('  var query =')), defs);
const rules = require(root + '/booking-rules.js');
const member = { id: 'demo:카카오:1', label: '카카오 계정' };
const clock = new Date('2026-09-19T00:00:00Z');
const item = { id: 'cart-ride', memberId: member.id, programKey: 'ride', name: '포니 타기', dateKey: '2026-09-20', date: '2026.09.20 (일)', time: '10:00~10:20', qty: 1, discount: false, price: 5000 };
const cartStore = { revision: 0, carts: { [member.id]: [item] }, reservations: [] };
const order = rules.buildOrder(cartStore, member.id, defs.programs, clock, 'LRP-QA-1');
function page(file, query = '', store = order.store, loggedIn = true) {
  const errors = [], navigations = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', err => { if (err.message.includes('navigation')) navigations.push(err.message); else errors.push(err.message); });
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [clock.getTime()])); } static now() { return clock.getTime(); } }
  const dom = new JSDOM(readFileSync(root + '/docs/' + file, 'utf8'), {
    url: 'https://example.test/park/' + file + query, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.Date = ClockDate; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
      w.HTMLDialogElement.prototype.showModal = function() { this.open = true; };
      w.HTMLDialogElement.prototype.close = function() { this.open = false; };
      w.localStorage.setItem('ponylandBookingStoreV3', JSON.stringify(store));
      if (loggedIn) w.sessionStorage.setItem('ponylandDemoMember', JSON.stringify(member));
    }
  });
  for (const script of dom.window.document.querySelectorAll('script')) {
    const src = script.getAttribute('src');
    try { dom.window.eval(src ? readFileSync(root + '/docs/' + src.split('?')[0], 'utf8') : script.textContent); }
    catch (err) { errors.push(err.stack); }
  }
  assert.deepEqual(errors, [], file + ' script errors');
  return { errors, dom, w: dom.window, doc: dom.window.document, navigations, close: () => dom.window.close() };
}
let count = 0;
function check(file, query, verify, store, loggedIn) {
  const result = page(file, query, store, loggedIn);
  try { verify(result); assert.deepEqual(result.errors, [], file + " event errors"); count++; console.log('PASS ' + file + (query || '')); } finally { result.close(); }
}
for (const file of ['index.html', 'booking.html']) check(file, '?product=play', ({doc}) => { assert.equal(doc.getElementById('product-title').textContent, '포니랑 놀기'); assert.equal(doc.querySelector('[data-booking-step="1"]').hidden, false); });
check('cart.html', '', ({doc}) => { assert.equal(doc.querySelector('[data-booking-step="4"]').hidden, false); assert.equal(doc.getElementById('cart-empty').hidden, true); }, cartStore);
check('checkout.html', '', ({doc}) => { assert.equal(doc.querySelector('[data-booking-step="2"]').hidden, false); assert.equal(doc.getElementById('terms').checked, false); }, cartStore);
check('complete.html', '?order=LRP-QA-1', ({doc}) => { assert.equal(doc.getElementById('complete-order-id').textContent, 'LRP-QA-1'); assert.equal(doc.querySelector('[data-booking-step="3"]').hidden, false); });
check('reservations.html', '', ({doc}) => { assert.equal(doc.getElementById('my-tickets-screen').hidden, false); assert.ok(doc.querySelectorAll('.ticket-list-card').length); });
check('reservations.html', '', ({doc}) => { assert.equal(doc.getElementById('login-dialog').open, true); assert.equal(doc.querySelector('[data-booking-step="1"]').hidden, true); doc.querySelector('[data-login-provider="카카오"]').click(); assert.equal(doc.getElementById('login-dialog').open, false); assert.ok(doc.querySelector('.ticket-list-card')); }, order.store, false);
check('ticket.html', '?ticket=' + order.tickets[0].id, ({doc}) => { assert.equal(doc.getElementById('ticket-detail-view').hidden, false); assert.equal(doc.getElementById('ticket-reservation-number').textContent, 'LRP-QA-1'); });
check('ticket.html', '?ticket=missing', ({navigations}) => assert.equal(navigations.length, 1));
for (const [file, view, query] of [['admin.html', 'programs', ''], ['admin-reservations.html', 'reservations', ''], ['admin-operations.html', 'operations', ''], ['admin-settlement.html', 'settlement', ''], ['admin-program-edit.html', 'program-edit', '?program=ride'], ['admin-program-edit.html', 'program-edit', ''], ['admin-program-sessions.html', 'program-sessions', '?program=ride']]) {
  check(file, query, ({doc}) => { assert.equal(doc.querySelector('[data-view="' + view + '"]').hidden, false); if (view === 'program-edit') assert.equal(doc.getElementById('detail-program').value, query ? '포니 타기' : ''); if (view === 'program-sessions') assert.ok(doc.getElementById('session-list').children.length); });
}
for (const file of ['account-admin.html', 'busan.html', 'jeju.html', 'payment-failed.html', 'error.html']) check(file, '', ({doc}) => assert.ok(doc.body.textContent.trim()));
console.log(count + ' DOM scenarios passed');
(async () => {
  const checkout = page('checkout.html', '', cartStore);
  checkout.doc.getElementById('terms').checked = true;
  checkout.doc.getElementById('complete-payment').click();
  await new Promise(resolve => setTimeout(resolve, 50));
  const paid = JSON.parse(checkout.w.localStorage.getItem('ponylandBookingStoreV3'));
  assert.deepEqual(checkout.errors, []);
  assert.equal(paid.reservations.length, 1);
  assert.equal(paid.carts[member.id].length, 0);
  assert.equal(checkout.doc.querySelector('[data-booking-step="3"]').hidden, false);
  assert.equal(checkout.navigations.length, 1);
  checkout.close();
  const receipt = page('complete.html', '?order=' + paid.reservations[0].id, paid);
  assert.equal(receipt.doc.getElementById('complete-order-id').textContent, paid.reservations[0].id);
  receipt.close();
  const tickets = page('reservations.html', '', paid);
  tickets.doc.querySelector('.ticket-list-card').click();
  assert.equal(tickets.navigations.length, 1);
  tickets.close();
  const detail = page('ticket.html', '?ticket=' + paid.reservations[0].tickets[0].id, paid);
  detail.doc.getElementById('back-to-ticket-list').click();
  assert.equal(detail.navigations.length, 1);
  detail.close();
  console.log('PASS payment -> persisted receipt -> ticket selection -> list return');
})().catch(error => { console.error(error); process.exitCode = 1; });
