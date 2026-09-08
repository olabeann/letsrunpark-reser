const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');

const source = readFileSync(resolve(__dirname, '../developer-policy.js'), 'utf8');
const storefront = readFileSync(resolve(__dirname, '../index.html'), 'utf8');
const admin = readFileSync(resolve(__dirname, '../admin.html'), 'utf8');
const accountAdmin = readFileSync(resolve(__dirname, '../account-admin.html'), 'utf8');

test('each relevant screen loads the keyboard-only shared policy viewer', () => {
  for (const html of [storefront, admin, accountAdmin]) {
    assert.match(html, /class="developer-policy-keys" role="tablist"/);
    assert.match(html, /developer-policy\.js\?v=[^"']+/);
    assert.match(html, /서비스 정책 · FE · BE/);
    assert.doesNotMatch(html, /id="open-developer-policy"/);
  }
  for (const script of ['app.js', 'admin.js', 'account-admin.js']) {
    const shortcutSource = readFileSync(resolve(__dirname, '..', script), 'utf8');
    assert.match(shortcutSource, /event\.altKey[\s\S]*event\.code === "KeyP"/);
    assert.match(shortcutSource, /event\.key\.toLowerCase\(\) === "p"/);
  }
});

test('policy viewer joins confirmed service, frontend and backend rules without pending decisions', () => {
  assert.match(source, /type === "service"/);
  assert.match(source, /"적용 범위", "정책 기준", "확정 내용", "예외 · 주의"/);
  assert.match(source, /data-policy-index=/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /ArrowLeft/);
  assert.match(source, /ArrowRight/);
  assert.match(source, /결제 사전 검증/);
  assert.match(source, /관리자 권한/);
  assert.doesNotMatch(source, /아직 확정이 필요한 정책|DECISION REQUIRED|D-14/);
  assert.doesNotMatch(source, /policy\.backend\.groups\[2\]\.items/);
  assert.match(source, /document\.body\.classList\.contains\("admin-page"\)/);
  assert.match(source, /key: "RSV-01"/);
  assert.match(source, /key: "ADM-01"/);
  assert.match(source, /key: "ACC-01"/);
  assert.match(source, /policy-lane policy-lane--/);
  assert.match(source, /renderLane\("frontend"/);
  assert.match(source, /renderLane\("backend"/);
  assert.match(source, /renderLane\("service"/);
  assert.match(source, /과천시민 할인/);
  assert.match(source, /className = "policy-marker"/);
  assert.match(source, /className = "policy-inspector"/);
  assert.match(source, /window\.DeveloperPolicy = createInspector/);
  assert.match(source, /data-policy-all>전체 정책 보기/);
  assert.match(source, /dialog\.showModal\(\)/);
});
