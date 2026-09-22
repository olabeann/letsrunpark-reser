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

function filterRuntime(account) {
  const elements = {
    location: { value: '', innerHTML: '', disabled: false },
    department: { value: '', innerHTML: '', disabled: false },
  };
  const context = vm.createContext({
    currentAccount: account,
    organization: {
      서울: ['홍보부', '브랜드총괄부', '공원화사업추진TF'],
      부산경남: ['부산경주자원관리부', '부산운영지원부'],
    },
    byId: id => elements[id],
    escapeHtml: value => String(value),
  });
  vm.runInContext(sourceFunction('refreshDepartmentSelect') + sourceFunction('lockLocationFilterSelect') + sourceFunction('normalizeLeadingZeroNumber'), context);
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
  assert.match(source, /description\.hidden = !!isReadOnlyScope/);
  assert.doesNotMatch(source, /다른 부서의 운영일은 조회만 가능하며 휴장 상태를 변경할 수 없습니다\./);
  assert.match(source, /headButton\.disabled = !canManage/);
  assert.match(source, /chip\.disabled = programClosed \|\| !canManage/);
  assert.match(source, /details\.classList\.toggle\("is-readonly", !canManage\)/);
  assert.match(source, /summary\.setAttribute\("aria-disabled", "true"\)/);
  assert.match(source, /closeAllButton\.disabled = !canManageWholeDay/);
  assert.match(source, /closeAllButton\.hidden = false/);
  assert.match(css, /operation-program-head button:disabled/);
  assert.match(css, /operation-session-toggle\.is-readonly>summary/);
  assert.match(css, /operation-close-all-btn:disabled/);
  assert.match(css, /cursor:not-allowed/);
  assert.doesNotMatch(css, /operation-day-quick>p\.is-readonly/);
});

test('returning to the operations screen refreshes the selected day for the current account', () => {
  assert.match(source, /if \(selectedOperationDateKey\) renderOperationDayQuick\(selectedOperationDateKey\)/);
});

test('department filters start from the signed-in department and keep catalog browsing available', () => {
  const { context, elements } = filterRuntime({ scope: 'department', region: '서울', department: '브랜드총괄부' });
  context.lockLocationFilterSelect('location', 'department', false);
  assert.equal(elements.location.value, '서울');
  assert.equal(elements.department.value, '브랜드총괄부');
  assert.equal(elements.location.disabled, false);
  assert.equal(elements.department.disabled, false);
  assert.match(elements.location.innerHTML, /부산경남/);
  assert.match(elements.department.innerHTML, /공원화사업추진TF/);
});

test('reservation filters start from the signed-in department and allow cross-department lookup', () => {
  const { context, elements } = filterRuntime({ scope: 'department', region: '서울', department: '브랜드총괄부' });
  context.lockLocationFilterSelect('location', 'department', false);
  assert.equal(elements.location.value, '서울');
  assert.equal(elements.department.value, '브랜드총괄부');
  assert.equal(elements.location.disabled, false);
  assert.equal(elements.department.disabled, false);
  assert.match(elements.location.innerHTML, /부산경남/);
  assert.match(elements.department.innerHTML, /공원화사업추진TF/);
});

test('number fields remove leading zeroes while preserving a single zero', () => {
  const { context } = filterRuntime({ scope: 'all' });
  assert.equal(context.normalizeLeadingZeroNumber('020'), '20');
  assert.equal(context.normalizeLeadingZeroNumber('0005'), '5');
  assert.equal(context.normalizeLeadingZeroNumber('0'), '0');
  assert.equal(context.normalizeLeadingZeroNumber(''), '');
});

test('foreign program detail and session routes remain read-only', () => {
  assert.match(html, /id="program-readonly-notice"[^>]*>다른 부서의 프로그램은 조회만 가능합니다/);
  assert.match(html, /id="session-readonly-notice"[^>]*>다른 부서의 프로그램은 조회만 가능합니다/);
  assert.match(source, /editView\.querySelectorAll\("\.admin-panel input,\.admin-panel select,\.admin-panel textarea,\.admin-panel button"\)/);
  assert.match(source, /byId\("add-session"\)\.disabled = !canManage/);
  assert.match(source, /row\.querySelector\("\.session-state"\)\.disabled = !canManage/);
  assert.match(css, /department-readonly-notice\{[^}]*color:#a34328/);
});

test('foreign program rows preserve action buttons and explain read-only access by toast', () => {
  assert.match(source, /class="row-detail" type="button"'[\s\S]*title="다른 부서의 프로그램은 조회만 가능합니다\./);
  assert.match(source, /class="row-sessions" type="button"'[\s\S]*title="다른 부서의 프로그램은 조회만 가능합니다\./);
  assert.match(source, /class="row-delete" type="button"'[\s\S]*aria-disabled="true" title="다른 부서의 프로그램은 조회만 가능합니다\./);
  assert.match(source, /row\.querySelector\("\.row-detail"\)\.addEventListener\("click", function \(\) \{ openProductDialog\(item\)/);
  assert.match(source, /row\.querySelector\("\.row-sessions"\)\.addEventListener\("click", function \(\) \{ openSessionManager\(item\.key\)/);
  assert.match(source, /querySelectorAll\("\.row-state,\.row-delete"\)/);
  assert.match(source, /notify\("다른 부서의 프로그램은 조회만 가능합니다\."\)/);
  assert.doesNotMatch(source, /<span class="row-readonly"/);
});
