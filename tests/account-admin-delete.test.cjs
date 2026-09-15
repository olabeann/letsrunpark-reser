const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');

const html = readFileSync(resolve(__dirname, '../account-admin.html'), 'utf8');
const script = readFileSync(resolve(__dirname, '../account-admin.js'), 'utf8');
const requirements = readFileSync(resolve(__dirname, '../KRA_RESERVATION_REQUIREMENTS.md'), 'utf8');

test('account details expose a guarded deletion flow', () => {
  assert.match(html, /id="delete-admin-account"[^>]*hidden/);
  assert.match(html, /id="account-delete-dialog"/);
  assert.match(html, /id="confirm-account-delete"/);
  assert.match(script, /account\.type === "super"/);
  assert.match(script, /accountDeletionBlockers\(account\)/);
  assert.match(script, /연결된 프로그램/);
  assert.doesNotMatch(script, /account\.lastLogin &&/);
  assert.match(script, /accounts\.splice\(index, 1\)/);
});

test('deletion policy protects operational data and audit history', () => {
  assert.match(requirements, /통합 관리자 계정은 삭제할 수 없다/);
  assert.match(requirements, /프로그램·회차·예약·결제·환불·정산 이력이 없을 때만 완전 삭제/);
  assert.doesNotMatch(requirements, /사용 중지/);
  assert.match(requirements, /연쇄 삭제하지 않는다/);
  assert.match(requirements, /트랜잭션 안에서 다시 확인/);
});

test('account admin profile represents the shared integrated account', () => {
  assert.match(html, /class="admin-user"><span aria-hidden="true"><svg/);
  assert.match(html, /<strong>통합 운영 관리자<\/strong><small>전체 지역·부서<\/small>/);
  assert.doesNotMatch(html, /[가-힣]+ 매니저/);
  assert.match(requirements, /개인 담당자 이름은 저장하거나 노출하지 않는다/);
});
