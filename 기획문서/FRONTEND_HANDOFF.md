# 렛츠런파크 통합 예약 프론트엔드

2026-09-16 개정. 현재 화면의 입력·안내·동작을 최우선 기준으로 하며 화면 내부 차이는 요구사항 11장의 S-01~S-05로 관리합니다.

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

현재 판매 대상은 포니 타기와 포니랑 놀기입니다. `?product=ride`, `?product=play`로 선택하며 장바구니는 `cart.html`로 연결합니다. 투어 소개 페이지는 제거했으며 기존 예약 기록 표시용 데이터와 대표 이미지는 유지합니다.

다른 프로그램 간 이용 시간이 겹치면 기존 유효 예약과 장바구니를 기준으로 예약을 제한합니다. 한 번의 결제는 예약번호 하나를 공유하며 프로그램·회차·인원은 하위 티켓으로 구분합니다.

장바구니는 동일 이용일·지역·담당부서만 허용합니다. 선택 인원수만큼 1명 카드를 만들고 같은 회차 반복 담기와 카드별 삭제를 제공합니다. 수량 증감·자동 병합·결제 전 정원 선점은 하지 않습니다. 신규 결제 티켓도 카드별로 생성되며 사용자 목록은 예약번호별로 묶습니다.

예약 가능 기간은 프로그램별 N일이며 기본 14일입니다. 프로그램 대표 이미지·안내 문구·이용 전 확인사항을 관리자에서 입력합니다. 계정은 유형별 고정 권한이며 부서 계정은 자기 부서 업무와 타 부서 프로그램 조회 범위를 가집니다. 사용자 취소 기본 10분 안내와 실제 입장 대기 조건의 차이는 S-01을 참조합니다. 고객 자동 알림은 현재 미발송입니다.

계정·권한은 고객사 운영 관리자 메뉴의 일부입니다. 실제 파일은 `account-admin.html`이며 통합 관리자에게만 진입 메뉴를 노출합니다.

## 연동과 검수

현재 로그인·결제·예약 저장은 브라우저 프로토타입입니다. 실서비스에는 인증 회원 기준의 서버 검증, 원자적 재고 처리, PG 승인·환불, 권한·감사 로그가 필요합니다. 화면 기준으로 개정된 `KRA_RESERVATION_REQUIREMENTS.md`와 기능명세 v1.1을 함께 적용하며, 안내·동작 불일치를 기존 정책으로 임의 덮어쓰지 않습니다.

997px 이하에서 태블릿, 640px 이하에서 모바일 레이아웃으로 전환합니다. `Alt + P`로 현재 화면의 정책을 확인합니다.

`node --test tests/*.test.cjs`로 검사하고, 원본 변경 후 `node scripts/build-pages.mjs`로 공개용 `docs/`를 갱신합니다. 고객 전달용 구조는 `outputs/렛츠런파크_전체_IA_v1.html`에 정리되어 있습니다.

## 화면별 HTML 이동

결제 확인은 `checkout.html`, 예약 완료는 `complete.html?order=예약번호`, 예약 조회는 `reservations.html`, 티켓 상세는 `ticket.html?ticket=티켓ID`입니다. 실제 문서 이동을 사용하며 완료·티켓 링크는 로그인한 회원의 저장된 예약에서 복원합니다. 결제 확인 페이지는 진입할 때 장바구니를 재검증하고 약관 동의를 초기화합니다. 이전 쿼리 링크는 새 HTML로 연결됩니다.

화면 파일은 `scripts/build-pages.mjs`에서 `index.html`의 공통 마크업으로 생성하므로 공통 UI는 원본에서 수정한 뒤 빌드를 실행합니다.

관리자 프로그램 목록은 `admin.html`, 예약·티켓은 `admin-reservations.html`, 운영일은 `admin-operations.html`, 매출·정산은 `admin-settlement.html`입니다. 프로그램 등록·수정은 `admin-program-edit.html?program=프로그램키`(신규 등록은 쿼리 없음), 회차 관리는 `admin-program-sessions.html?program=프로그램키`입니다. 기존 관리자 해시 주소는 새 HTML로 이동합니다. 로그인·예약 상세·취소 확인 등 대화상자는 페이지 내부에서 유지합니다. 뒤로가기로 복원된 페이지는 저장소와 로그인 상태를 다시 확인합니다. 부산·제주 HTML도 공개 파일에 포함됩니다.

고객 예약 흐름: `booking.html` → `cart.html` → `checkout.html` → `complete.html` → `reservations.html` → `ticket.html`. 관리자 메뉴: `admin.html`, `admin-reservations.html`, `admin-operations.html`, `admin-settlement.html`, `admin-program-edit.html`, `admin-program-sessions.html`.

### 예약 티켓 목록 정렬 정책

예약번호별 묶음과 기존 묶음 순서를 유지합니다. 각 묶음 안의 티켓은 **입장 가능 → 입장 대기 → 입장 종료** 순으로 표시합니다. 같은 상태끼리는 기존 순서를 유지하며 이용 날짜나 회차 시간으로 추가 정렬하지 않습니다. 목록 진입·재조회 시 정렬을 적용하고, 화면을 보고 있는 동안에는 상태 배지만 자동 갱신하며 티켓 위치는 유지합니다. 개발자 정책 화면의 **RSV-07 예약 티켓 → 예약 티켓 목록 정렬**에 반영했습니다.
