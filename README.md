# PONYLAND 체험·투어 예약

서울 렛츠런파크 포니 체험과 투어 예약 화면을 확인할 수 있는 프론트엔드 프로토타입입니다.

## 공유 링크

| 페이지 | 바로가기 |
| --- | --- |
| 메인 예약 화면 | [사이트 열기](https://olabeann.github.io/letsrunpark-reser/) |
| 포니 체험 예약 | [예약 화면 열기](https://olabeann.github.io/letsrunpark-reser/?program=pony) |
| 렛츠런파크 투어 예약 | [예약 화면 열기](https://olabeann.github.io/letsrunpark-reser/?program=tour) |
| 포니 체험 소개 | [소개 페이지 열기](https://olabeann.github.io/letsrunpark-reser/pony.html) |
| 렛츠런파크 투어 소개 | [소개 페이지 열기](https://olabeann.github.io/letsrunpark-reser/tour.html) |
| GitHub 저장소 | [코드 보기](https://github.com/olabeann/letsrunpark-reser) |

티켓 목록과 상세 화면은 **예약 조회 → 카카오로 계속하기 또는 네이버로 계속하기 → 티켓 선택** 순서로 확인할 수 있습니다.

## 이용 안내

- 디자인과 예약 흐름을 확인하기 위한 시연용 사이트입니다. 실제 예약·입장에 사용할 수 없습니다.
- 간편 로그인과 결제는 실제 서비스에 연결되어 있지 않습니다.
- 예약 내역은 해당 브라우저에만 저장되며 다른 사람이나 기기와 공유되지 않습니다.
- 입장 가능·대기·종료 상태를 확인할 수 있는 예시 티켓이 포함되어 있습니다.

## 수정 내용 배포하기

원본 HTML·CSS·JavaScript 또는 이미지를 수정한 뒤 아래 명령으로 공개용 파일을 갱신합니다.

```sh
node scripts/build-pages.mjs
```

갱신된 `docs/` 폴더를 함께 커밋하고 `master` 브랜치에 푸시하면 GitHub Pages가 자동으로 배포합니다. 웹사이트에는 지정된 페이지와 이미지 파일만 게시됩니다.
