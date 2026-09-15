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
  assert.match(source, /결제번호 · 포트원 거래번호 구분/);
  assert.match(source, /PAY-YYMMDD-NNNN 형식의 결제번호는 서비스가 발급하는 내부 식별자/);
  assert.match(source, /imp_로 시작하는 포트원 거래번호는 포트원이 발급하는 외부 결제 식별자/);
  assert.match(source, /‘통합 결제번호’가 아닌 ‘결제번호’로 표시/);
  assert.match(source, /포트원 거래번호는 관리자 결제 상세에서만 표시/);
  assert.match(source, /선택 인원수만큼 1명 단위 장바구니 카드를 만듭니다/);
  assert.match(source, /기존 카드와 합치지 않습니다/);
  assert.match(source, /인원은 1명에서 시작하고 해당 이용일의 남은 할인 매수까지만 직접 늘릴 수 있습니다/);
  assert.match(source, /모든 장바구니 카드는 1명으로 고정/);
  assert.match(source, /기존 장바구니가 비어 있으면 예약 내용 확인 화면으로 바로 이동합니다/);
  assert.match(source, /기존 상품이 1개 이상이면 선택 상품을 추가한 뒤 장바구니 화면으로 이동/);
  assert.match(source, /예약하기 진입 경로/);
  assert.match(source, /담기지 않았습니다\. 기존 상품 확인 후 결제해주세요/);
  assert.match(source, /선택 상품은 저장하지 않고, 상품명·인원과 미반영 사실을 장바구니 화면에 지속 표시/);
  assert.match(source, /카드별 삭제만 제공/);
  assert.match(source, /다른 상품이나 기존 예약과 시간이 겹쳐도 회차를 선택하고 장바구니에 담을 수 있습니다/);
  assert.match(source, /시간대가 겹치는지만으로 차단하지 않습니다/);
  assert.doesNotMatch(storefront, /다른 일정과 시간 중복|시간이 겹치는 상품은 예약할 수 없습니다/);
  assert.doesNotMatch(source, /새 줄을 만들지 않고 기존 항목의 인원수에 더합니다/);
  assert.doesNotMatch(source, /예약 항목마다 주문번호 뒤에 담긴 순서대로|상품이 1개뿐인 주문에도 -1/);
  assert.match(source, /className = "policy-marker"/);
  assert.match(source, /className = "policy-inspector"/);
  assert.match(source, /window\.DeveloperPolicy = createInspector/);
  assert.match(source, /data-policy-all>전체 정책 보기/);
  assert.match(source, /dialog\.showModal\(\)/);
});

test('administrator access is scoped by department instead of region', () => {
  assert.match(accountAdmin, /DEPARTMENT ACCOUNTS/);
  assert.match(accountAdmin, /부서 계정 발급/);
  assert.match(source, /부서당 공용 계정 1개/);
  assert.match(source, /자기 부서 프로그램은 관리/);
  assert.doesNotMatch(accountAdmin, /REGIONAL ACCOUNTS|지역 계정 발급|지역 통합 운영/);
  assert.doesNotMatch(source, /지역당 계정 1개|자기 지역 CRUD|타 지역 Read/);
});
