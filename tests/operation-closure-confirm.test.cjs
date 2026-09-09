const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../admin.js'), 'utf8');
const start = source.indexOf('  function operationClosureImpact(');
const end = source.indexOf('  function deleteSession(', start);
const functions = source.slice(start, end);

function runtime() {
  const elements = {
    'operation-closure-confirm-title': { textContent: '' },
    'operation-closure-confirm-scope': { textContent: '' },
    'operation-closure-impact': { textContent: '' },
    'operation-closure-confirm-dialog': {
      opened: false,
      showModal() { this.opened = true; },
      close() { this.opened = false; },
    },
  };
  const context = {
    pendingOperationClosureAction: null,
    byId: id => elements[id],
    allReservations: () => [
      { location: '서울', dateKey: '2026-09-05', programKey: 'ride', time: '10:00~10:20', tickets: ['confirmed', 'confirmed'], status: '예약 확정' },
      { location: '서울', dateKey: '2026-09-05', programKey: 'ride', time: '10:00~10:20', qty: 1, status: '예약 확정' },
      { location: '서울', dateKey: '2026-09-05', programKey: 'ride', time: '10:00~10:20', qty: 4, status: '취소 완료' },
      { location: '서울', dateKey: '2026-09-06', programKey: 'ride', time: '10:00~10:20', qty: 5, status: '예약 확정' },
    ],
  };
  vm.createContext(context);
  vm.runInContext(functions, context);
  return { context, elements };
}

test('shows closure scope and active reservation impact before applying', () => {
  const { context, elements } = runtime();
  context.requestOperationClosure('회차 휴장 확인', '포니 타기 · 10:00~10:20', '서울', '2026-09-05', { key: 'ride', programName: '포니 타기' }, { start: '10:00', end: '10:20' }, () => {});
  assert.equal(elements['operation-closure-confirm-scope'].textContent, '2026-09-05 · 서울 · 포니 타기 · 10:00~10:20');
  assert.equal(elements['operation-closure-impact'].textContent, '현재 유효 예약 2건 · 3명이 있습니다.');
  assert.equal(elements['operation-closure-confirm-dialog'].opened, true);
});

test('applies closure only after the confirmation action', () => {
  const { context, elements } = runtime();
  let applied = 0;
  context.requestOperationClosure('전체 휴장 확인', '2개 프로그램 전체 회차', '서울', '2026-09-05', null, null, () => { applied += 1; });
  assert.equal(applied, 0);
  context.confirmOperationClosure();
  assert.equal(applied, 1);
  assert.equal(elements['operation-closure-confirm-dialog'].opened, false);
});
