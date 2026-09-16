# 렛츠런파크 통합 예약 프론트엔드

## 실행

`index.html`을 직접 열거나 저장소 루트에서 `python -m http.server 4173`을 실행합니다. 브라우저 저장소를 공유하는 예약·운영 관리자 확인에는 같은 HTTP 주소 사용을 권장합니다.

## 전달 파일

- `index.html` / `app.js`: 체험·예약 옵션, 장바구니, 결제 확인, 예약 완료, 티켓·취소·환불 화면
- `admin.html` / `admin.js`: 예약·티켓, 프로그램·회차·할인, 운영일, 매출·정산
- `account-admin.html` / `account-admin.js`: 운영 관리자 안의 계정·권한 메뉴. 통합 관리자 권한으로 접근
- `busan.html` / `jeju.html`: 지역별 준비 중 안내
- `booking-rules.js`: 계정별 구매 한도, 장바구니 검증, 금액 계산, 예약·티켓 생성
- `settlement.js` / `xlsx-export.js`: 정산 및 엑셀 출력
- `developer-policy.js`: 화면별 서비스·FE·BE 정책
- `empty-states.html` / `empty-states.js` / `empty-states.css`: 정책 보기와 연결된 빈 상태·예외 화면 모음
- `demo-controls.js`: 검토용 제어 표시
- `tokens.css` / `components.css` / `styles.css`: 공통 디자인과 예약 화면
- `admin.css` / `admin-reference.css`: 운영 관리자·계정·정책 화면
- `payment-failed.html` / `error.html` / `error.css`: 결제 예외·시스템 오류 안내

## 화면 흐름

예약 화면에서 체험 → 날짜 → 회차 → 인원·할인을 선택합니다. 로그인 후 장바구니 또는 바로 예약으로 진행하고, 예약 내용 확인 → 결제 → 예약 완료 → 티켓 조회로 이어집니다. 인원 선택형 부분취소와 환불 내역을 제공합니다.

현재 판매 대상은 포니 타기와 포니랑 놀기입니다. `?product=ride`, `?product=play`로 선택하며 장바구니는 `?view=cart`로 연결합니다. 투어 소개 페이지는 제거했으며 기존 예약 기록 표시용 데이터와 대표 이미지는 유지합니다.

시간이 겹쳐도 온라인 잔여 수량과 이용일 구매 한도 안에서 예약할 수 있습니다. 한 번의 결제는 예약번호 하나를 공유하며 프로그램·회차·인원은 하위 티켓으로 구분합니다.

계정·권한은 고객사 운영 관리자 메뉴의 일부입니다. 실제 파일은 `account-admin.html`이며 통합 관리자에게만 진입 메뉴를 노출합니다.

## 연동과 검수

현재 로그인·결제·예약 저장은 브라우저 프로토타입입니다. 실서비스에는 인증 회원 기준의 서버 검증, 원자적 재고 처리, PG 승인·환불, 권한·감사 로그가 필요합니다. 상세 기준은 `KRA_RESERVATION_REQUIREMENTS.md`를 따릅니다.

997px 이하에서 태블릿, 640px 이하에서 모바일 레이아웃으로 전환합니다. `Alt + P`로 현재 화면의 정책을 확인합니다.

`node --test tests/*.test.cjs`로 검사하고, 원본 변경 후 `node scripts/build-pages.mjs`로 공개용 `docs/`를 갱신합니다. 고객 전달용 구조는 `outputs/렛츠런파크_전체_IA_v1.html`에 정리되어 있습니다.
