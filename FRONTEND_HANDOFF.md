# 렛츠런파크 통합 예약 프론트엔드

## 실행

`index.html`을 더블클릭하면 별도 서버나 설치 없이 서울 예약 화면이 바로 실행됩니다.

## 전달 파일

- `index.html`: 서울 프로그램별 직접 예약 진입 화면
- `pony.html`: 서울 포니 승마체험 상세
- `tour.html`: 서울 렛츠런파크 투어 상세
- `tokens.css`: 기존 LETSRUN PLAY 디자인 시스템 원본 토큰
- `components.css`: 디자인 시스템의 Button, Chip, Badge, Card 컴포넌트
- `styles.css`: 화면 컴포넌트 및 모바일 반응형 스타일
- `app.js`: 화면 전환, 예약 선택, 검색, 회차 차단 등 프로토타입 상호작용

## 구현 범위

LetsrunPlay CTA는 `index.html?program=pony` 또는 `index.html?program=tour` 형태로 연결합니다. 예약 서비스 탑바는 LetsrunPlay와 분리된 독립 브랜드로 구성했습니다.

이 결과물은 개발 연동 전 단계의 서울 전용 프론트엔드 프로토타입입니다. 결제, 로그인, 예약 저장은 실제 API 대신 화면 동작으로 구현되어 있습니다.

반응형 기준은 디자인 시스템과 동일한 997px이며 데스크톱과 모바일을 모두 지원합니다. 공통 컴포넌트에는 디자인 시스템의 `COMP-*` ID를 표시했습니다.
