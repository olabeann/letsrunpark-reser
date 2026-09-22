const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = readFileSync(path.join(__dirname, '../admin.js'), 'utf8');
const html = readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
const css = readFileSync(path.join(__dirname, '../admin-reference.css'), 'utf8');

function sourceFunction(name) {
  const start = source.indexOf('  function ' + name + '(');
  return source.slice(start, source.indexOf('\n  }', start) + 4);
}

function runtime(account) {
  const elements = {
    'operation-region': { value: '서울', dataset: {}, disabled: false },
    'operation-department': { value: '', innerHTML: '', disabled: false },
  };
  const context = vm.createContext({
    currentAccount: account,
    organization: {
      서울: ['홍보부', '공원화사업추진TF'],
      부산경남: ['부산경주자원관리부', '부산운영지원부'],
    },
    byId: id => elements[id],
    escapeHtml: value => String(value),
  });
  vm.runInContext(sourceFunction('regionForDepartment') + sourceFunction('refreshOperationScopeSelects'), context);
  return { context, elements };
}

test('operation controls keep region first and add department beneath it', () => {
  const regionIndex = html.indexOf('id="operation-region"');
  const departmentIndex = html.indexOf('id="operation-department"');
  assert.ok(regionIndex > -1);
  assert.ok(departmentIndex > regionIndex);
  assert.match(html.slice(regionIndex, departmentIndex + 40), /대상 부서/);
});

test('department account starts with its own region and department selected', () => {
  const { context, elements } = runtime({ scope: 'department', region: '부산경남', department: '부산경주자원관리부' });
  context.refreshOperationScopeSelects(false);
  assert.equal(elements['operation-region'].value, '부산경남');
  assert.equal(elements['operation-department'].value, '부산경주자원관리부');
  assert.match(elements['operation-department'].innerHTML, /부산운영지원부/);
  assert.doesNotMatch(elements['operation-department'].innerHTML, /공원화사업추진TF/);
});

test('changing region resets the department choices to that region', () => {
  const { context, elements } = runtime({ scope: 'all' });
  context.refreshOperationScopeSelects(false);
  elements['operation-region'].value = '부산경남';
  context.refreshOperationScopeSelects(true);
  assert.equal(elements['operation-department'].value, '');
  assert.match(elements['operation-department'].innerHTML, /부산경주자원관리부/);
  assert.doesNotMatch(elements['operation-department'].innerHTML, /홍보부/);
});

test('foreign departments are identified as read-only with visibly disabled controls', () => {
  assert.match(source, /다른 부서의 운영일은 조회만 가능하며 휴장 상태를 변경할 수 없습니다\./);
  assert.match(source, /headButton\.disabled = !canManage/);
  assert.match(source, /chip\.disabled = programClosed \|\| !canManage/);
  assert.match(css, /operation-program-head button:disabled/);
  assert.match(css, /cursor:not-allowed/);
  assert.match(css, /operation-day-quick>p\.is-readonly/);
});

test('returning to the operations screen refreshes the selected day for the current account', () => {
  assert.match(source, /if \(selectedOperationDateKey\) renderOperationDayQuick\(selectedOperationDateKey\)/);
});
