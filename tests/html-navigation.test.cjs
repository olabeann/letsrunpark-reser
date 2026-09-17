const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const source = readFileSync(resolve(__dirname, '../app.js'), 'utf8');
function fn(name) {
  const start = source.indexOf('  function ' + name + '(');
  return source.slice(start, source.indexOf('\n  }', start) + 4);
}
test('screen navigation loads distinct HTML documents and preserves the deployment directory', () => {
  const calls = [];
  const context = vm.createContext({ URL, window: { location: {
    href: 'https://example.com/letsrunpark/index.html?product=ride',
    assign: url => calls.push(['assign', url]), replace: url => calls.push(['replace', url]),
  } } });
  vm.runInContext(fn('navigatePage'), context);
  assert.equal(context.navigatePage('reservations.html'), true);
  assert.deepEqual(calls.pop(), ['assign', 'https://example.com/letsrunpark/reservations.html']);
  context.navigatePage('ticket.html', { ticket: 'id & 1' }, true);
  assert.deepEqual(calls.pop(), ['replace', 'https://example.com/letsrunpark/ticket.html?ticket=id+%26+1']);
  assert.equal(context.navigatePage('index.html', { product: 'ride' }), false);
});
test('all screen HTML files and public copies are generated consistently', () => {
  for (const page of ['booking', 'cart', 'checkout', 'complete', 'reservations', 'ticket']) {
    const html = readFileSync(resolve(__dirname, '../' + page + '.html'), 'utf8');
    assert.ok(html.includes('data-screen="' + page + '"'));
    assert.equal(html, readFileSync(resolve(__dirname, '../docs/' + page + '.html'), 'utf8'));
  }
});
function routeRuntime({ page, search = '', member = { id: 'owner' }, store = { carts: {}, reservations: [] }, error = '' }) {
  const redirects = [], steps = [], elements = {};
  const context = vm.createContext({
    URLSearchParams, window: { location: { pathname: '/' + page, search } },
    currentMember: member, programs: { ride: { userBookable: true }, play: { userBookable: true }, extra: { userBookable: true } },
    state: { programKey: 'ride' },
    applyBookingWindowOverrides() {},
    navigatePage: (...args) => redirects.push(args),
    selectProgram: key => { context.state.programKey = key; },
    readStore: () => store, ownCart: () => store ? store.carts.owner || [] : [],
    BookingRules: { validationError: () => error },
    byId: id => elements[id] || (elements[id] = { checked: true }),
    renderBookingItems() {}, money: n => n + '원', renderCart() {},
    goToStep: step => steps.push(step), showMyTickets() {}, showTicketDetail() {},
  });
  vm.runInContext(fn('restoreShopRoute'), context);
  context.restoreShopRoute();
  return { context, redirects, steps, elements };
}
test('checkout reload rebuilds its snapshot and requires fresh agreement', () => {
  const cart = [{ id: 'cart-1' }];
  const result = routeRuntime({ page: 'checkout.html', store: { carts: { owner: cart }, reservations: [] } });
  assert.deepEqual(result.steps, [2]);
  assert.equal(result.context.checkoutSnapshot, JSON.stringify(cart));
  assert.equal(result.elements.terms.checked, false);
  for (const args of [{ member: null }, { error: 'sold out' }, { store: null }]) {
    assert.equal(routeRuntime({ page: 'checkout.html', ...args }).redirects[0][0], 'cart.html');
  }
});
test('completion reload restores only the current member receipt', () => {
  const reservation = { id: 'order-1', memberId: 'owner', tickets: [{ id: 't1' }], total: 5000 };
  const store = { carts: {}, reservations: [reservation] };
  const valid = routeRuntime({ page: 'complete.html', search: '?order=order-1', store });
  assert.deepEqual(valid.steps, [3]);
  assert.equal(valid.elements['complete-order-id'].textContent, 'order-1');
  for (const args of [{ member: { id: 'other' } }, { member: null }, { search: '?order=missing' }]) {
    const result = routeRuntime({ page: 'complete.html', search: '?order=order-1', store, ...args });
    assert.deepEqual(result.steps, []);
    assert.equal(result.redirects[0][0], 'reservations.html');
  }
});
test('direct booking links support administrator-created products', () => {
  const result = routeRuntime({ page: 'booking.html', search: '?product=extra' });
  assert.equal(result.context.state.programKey, 'extra');
  assert.equal(routeRuntime({ page: 'booking.html', search: '?product=__proto__' }).context.state.programKey, 'ride');
});
const adminSource = readFileSync(resolve(__dirname, '../admin.js'), 'utf8');
function adminFn(name) {
  const start = adminSource.indexOf('  function ' + name + '(');
  return adminSource.slice(start, adminSource.indexOf('\n  }', start) + 4);
}
const adminPageFiles = { programs: 'admin.html', reservations: 'admin-reservations.html', operations: 'admin-operations.html', settlement: 'admin-settlement.html', 'program-edit': 'admin-program-edit.html', 'program-sessions': 'admin-program-sessions.html' };
test('administrator navigation carries the program key into distinct HTML files', () => {
  const context = vm.createContext({ URL, adminPageFiles, window: { location: { href: 'https://example.com/park/admin.html' } }, activeProgramKey: 'ride', sessionProgramKey: 'play' });
  vm.runInContext(adminFn('adminViewUrl'), context);
  assert.equal(context.adminViewUrl('program-edit').href, 'https://example.com/park/admin-program-edit.html?program=ride');
  assert.equal(context.adminViewUrl('program-sessions').href, 'https://example.com/park/admin-program-sessions.html?program=play');
  for (const file of Object.values(adminPageFiles)) {
    assert.equal(readFileSync(resolve(__dirname, '../' + file), 'utf8'), readFileSync(resolve(__dirname, '../docs/' + file), 'utf8'));
  }
});
test('administrator direct URLs restore the selected program and reject missing programs', () => {
  for (const view of ['program-edit', 'program-sessions']) {
    const opened = [], redirected = [];
    const context = vm.createContext({ URLSearchParams, adminPageFiles,
      window: { location: { pathname: '/' + adminPageFiles[view], search: '?program=ride', hash: '', replace: url => redirected.push(url) } },
      programCatalog: () => [{ key: 'ride' }],
      openProductDialog: item => opened.push(item.key), openSessionManager: key => opened.push(key),
      adminViewUrl: () => ({ href: 'admin.html' }), showView() {},
    });
    vm.runInContext(adminFn('restoreAdminRoute'), context);
    context.restoreAdminRoute();
    assert.deepEqual(opened, ['ride']);
    context.window.location.search = '?program=missing';
    context.restoreAdminRoute();
    assert.deepEqual(redirected, ['admin.html']);
  }
});
test('all published HTML references resolve to published local files', () => {
  const { readdirSync, existsSync } = require('node:fs');
  const docs = resolve(__dirname, '../docs');
  for (const file of readdirSync(docs).filter(file => file.endsWith('.html'))) {
    const html = readFileSync(resolve(docs, file), 'utf8');
    for (const [, value] of html.matchAll(/(?:src|href|data-admin-href)="([^"]+)"/g)) {
      if (/^(?:https?:|data:|#|mailto:|tel:|javascript:)/.test(value)) continue;
      const target = value.split(/[?#]/)[0];
      if (target) assert.ok(existsSync(resolve(docs, target)), file + ' references missing ' + value);
    }
  }
});
