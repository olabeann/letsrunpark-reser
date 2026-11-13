const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../program-data-migration.js'), 'utf8');
const key = 'letsrunPlayAdminDemoV4';
test('updates existing reference content once and preserves unrelated stored data', () => {
  const original = { reservations: [{ id: 'existing' }], catalog: {
    programOverrides: { ride: { programName: 'old', active: false, noticeText: 'old', cancelMinutes: 10, purchaseMaxQty: 3 }, play: { programName: '포니랑 놀기', price: 4000, noticeText: 'play notice' } },
    addedPrograms: [{ key: 'custom', programName: 'vhsl' }], sessionOverrides: { custom: { capacity: 10 } }
  }};
  const storage = new Map([[key, JSON.stringify(original)]]);
  const run = () => vm.runInNewContext(source, { window: { localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) } } });
  run();
  const updated = JSON.parse(storage.get(key));
  assert.deepEqual(updated.catalog.programOverrides.ride, { purchaseMaxQty: 3 });
  assert.deepEqual(updated.catalog.programOverrides.play, { noticeText: 'play notice' });
  assert.deepEqual(updated.reservations, original.reservations);
  assert.deepEqual(updated.catalog.addedPrograms, original.catalog.addedPrograms);
  assert.deepEqual(updated.catalog.sessionOverrides, original.catalog.sessionOverrides);
  assert.equal(storage.get(key + ':before:20261113-reference-content'), JSON.stringify(original));
  updated.catalog.programOverrides.ride.programName = 'Later administrator edit';
  storage.set(key, JSON.stringify(updated));
  run();
  assert.equal(JSON.parse(storage.get(key)).catalog.programOverrides.ride.programName, 'Later administrator edit');
});
test('does not create state for a new browser or throw when storage is blocked', () => {
  vm.runInNewContext(source, { window: { localStorage: { getItem: () => null, setItem: () => assert.fail() } } });
  assert.doesNotThrow(() => vm.runInNewContext(source, { window: { localStorage: { getItem() { throw Error('blocked'); } } } }));
});
