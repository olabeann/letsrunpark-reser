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

test('migrates hidden-ticket notices without changing bookings or custom guidance', () => {
  const original = { reservations: [{ id: 'cancelled', status: 'cancelled' }], catalog: {
    referenceContentRevision: '20261113-reference-content', weatherNoticeRevision: '20261114-weather-cancellation-compact',
    programOverrides: { ride: { noticeText: '취소된 티켓은 예약조회에 표시되지 않으며, 결제 금액은 전액 환불 처리됩니다.\n예약조회에서 티켓 표시 여부를 확인해 주세요.', guidanceText: '별도 안내 유지' } }
  } };
  const storage = new Map([[key, JSON.stringify(original)]]);
  const run = () => vm.runInNewContext(source, { window: { localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) } } });
  run();
  const updated = JSON.parse(storage.get(key));
  assert.match(updated.catalog.programOverrides.ride.noticeText, /‘취소 완료’로 표시/);
  assert.equal(updated.catalog.programOverrides.ride.guidanceText, '별도 안내 유지');
  assert.deepEqual(updated.reservations, original.reservations);
  const once = storage.get(key);
  run();
  assert.equal(storage.get(key), once);
});
