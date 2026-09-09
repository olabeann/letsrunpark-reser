(function () {
  "use strict";

  var policy = {
    frontend: {
      label: "FE 화면 로직",
      summary: "사용자·관리자 화면에서 무엇을 누르면 어떤 조건을 확인하고 무엇을 보여주는지 정리합니다.",
      groups: [
        { title: "사용자 예약 화면", eyebrow: "CUSTOMER FLOW", items: [
          ["로그인 · 예약 조회", "‘예약 조회’, ‘장바구니 담기’, ‘예약하기’를 클릭", "로그인이 없으면 소셜 로그인 창을 먼저 표시합니다. 네이버·카카오를 선택하면 해당 제공자 계정으로 식별합니다.", "로그인 성공 후 요청했던 화면으로 돌아가며 계정별 장바구니와 예약 내역만 불러옵니다.", "비회원 예약은 허용하지 않고 서로 다른 로그인 제공자의 계정은 자동 통합하지 않습니다."],
          ["체험 선택", "노출된 체험을 클릭", "선택 프로그램의 노출 기간·판매 상태를 확인하고 가격, 이미지, 안내문, 운영 요일을 갱신합니다.", "운영 중인 프로그램만 선택 영역에 표시하며 프로그램이 1개이면 해당 체험 1개만 노출합니다. 기존 날짜·회차 선택은 새 프로그램 기준으로 다시 계산합니다.", "판매 중지 또는 노출 기간 밖인 프로그램은 선택 영역에서 제외하고 예약 CTA를 활성화하지 않습니다."],
          ["날짜 선택", "달력에서 이용일을 클릭", "오늘부터 프로그램별로 관리자가 설정한 예약 가능 일수(기본 14일) 안인지, 운영 기간·요일에 포함되는지 확인합니다.", "가능한 날짜만 선택되며 해당 날짜의 회차와 잔여 수량을 표시합니다.", "기간 밖·미운영 요일은 비활성화하고 클릭해도 선택값을 바꾸지 않습니다."],
          ["회차 선택", "이용 시간을 클릭", "회차 판매 상태와 온라인 잔여 수량을 확인하고 같은 계정의 확정 예약·장바구니 시간과 겹치는지 검사합니다.", "가능한 회차만 선택하고 선택 요약과 결제 예정 금액을 즉시 갱신합니다.", "일부라도 시간이 겹치면 차단합니다. 앞 회차 종료와 다음 회차 시작 시각이 같으면 허용합니다."],
          ["인원 · 할인", "인원 +/− 또는 할인 라디오 버튼을 클릭", "‘할인 미적용’과 현재 프로그램에 적용 가능한 활성 할인을 표시합니다. 최초 진입과 프로그램 변경 시 ‘할인 미적용’을 기본 선택하며, 정책이 여러 개여도 동일 이용일에는 하나만 선택할 수 있습니다.", "할인을 직접 선택한 경우에만 적용하고 수량·할인 선택에 따라 결제 예정 금액과 잔여 수량을 다시 계산합니다. 현재 포니 타기에는 과천시민 할인 1개를 예시로 표시합니다.", "할인을 자동 적용하거나 가장 큰 할인으로 자동 변경하지 않습니다. 온라인에서 별도 할인 증빙을 수집하거나 검증하지 않습니다."],
          ["장바구니 담기", "날짜·회차·인원 선택 후 ‘장바구니 담기’를 클릭", "로그인, 필수 선택값, 동일 이용일·지역·부서, 전 지역 예약 시간 중복과 할인 사용량을 검사합니다.", "재고를 미리 점유하지 않고 통과하면 그대로 장바구니에 담습니다. 이미 담긴 것과 같은 날짜·회차이면 새 줄을 만들지 않고 기존 항목의 인원수에 더합니다. 실제 잔여 수량은 결제 시점에 다시 확인합니다.", "신규 항목은 ‘장바구니에 담았습니다.’, 기존 항목에 더한 경우는 ‘장바구니에 담긴 인원을 추가했습니다.’로 토스트 문구를 구분합니다. 여러 계정이 같은 회차를 동시에 담아도 이 단계에서는 막지 않으며, 먼저 결제를 완료한 주문이 그 회차를 가져갑니다."],
          ["바로 예약", "‘예약하기’를 클릭", "장바구니 담기와 같은 조건을 검사하고 선택 상품을 장바구니에 반영합니다.", "통과하면 장바구니를 거쳐 예약 내용 확인 화면으로 이동합니다.", "다른 이용일 상품이 있거나 기존 예약과 충돌하면 이동하지 않고 이유를 화면에 표시합니다."],
          ["장바구니 화면 상태", "장바구니 진입, 상품 삭제 또는 결제 완료", "현재 로그인 계정의 장바구니 상품 수와 추가 가능한 체험을 확인합니다.", "비어 있으면 빈 상태 안내와 ‘체험 둘러보기’를 표시하고 주문 버튼을 비활성화합니다. 상품이 있으면 ‘다른 체험 추가’와 아직 담지 않은 체험만 표시합니다.", "제공 중인 체험을 모두 담으면 추가 영역을 숨깁니다. 마지막 상품 삭제 또는 결제 완료 후에는 즉시 빈 상태로 돌아갑니다."],
          ["장바구니 수정", "장바구니에서 +/− 또는 삭제를 클릭", "변경 뒤에도 수량·단일 이용일·시간 중복·할인 한도를 다시 확인합니다.", "상품 금액, 할인 금액, 총액과 주문 버튼 활성 상태를 갱신합니다.", "검증 오류가 있으면 메시지를 보여주고 ‘주문하기’를 비활성화합니다."],
          ["주문하기 · 결제", "‘N개 상품 주문하기’ 후 약관 동의 및 ‘결제하기’를 클릭", "결제 직전 최신 장바구니와 계정·재고·시간 충돌·할인 사용량을 다시 검사합니다. 약관 동의가 없으면 진행하지 않습니다.", "성공하면 통합 결제번호를 만들고 프로그램·회차별 티켓을 표시합니다.", "확인 화면 진입 후 장바구니가 바뀌면 약관 동의를 해제합니다. 처리 중 중복 클릭은 막습니다."],
          ["내 티켓", "‘내 티켓 보기’ 또는 예약 목록의 티켓을 클릭", "로그인 계정의 유효 예약만 조회하고 이용 시각 기준으로 예정·입장 가능·종료 상태를 계산합니다.", "같은 프로그램·같은 회차의 복수 인원은 한 티켓에 인원수로 표시하고, 카드에는 입장 대기·입장 가능·입장 종료 상태 배지와 과천시민 할인 인원이 있으면 ‘과천시민 할인’ 문구를 함께 보여줍니다.", "다른 프로그램 또는 다른 회차는 별도 티켓이며 취소된 티켓은 유효 인원에서 제외합니다."],
          ["티켓 상태 · 정보 표시", "티켓 목록 카드와 상세 화면 진입", "현재 시각과 회차 시작·종료 시각을 비교해 상태를 자동 계산하며 별도 입장 체크 기능은 사용하지 않습니다.", "카드에는 입장 대기·입장 가능·입장 종료 상태와 프로그램, 이용일·회차, 인원수, 결제금액, 할인 여부를 표시합니다. 회차 종료 시 운영상 ‘이용 완료’로 자동 처리합니다.", "입장 종료·이용 완료는 실제 입장 여부나 노쇼를 의미하지 않으며 노쇼 상태와 수동 입장 처리는 제공하지 않습니다."],
          ["티켓 취소 · 이용 완료", "티켓의 ‘예약 취소’ 또는 시간 상태를 확인", "본인 예약, 유효 인원, 프로그램별 취소 마감과 현재 취소·환불 상태를 확인합니다.", "입장 대기 상태이면서 관리자 설정 취소 마감 전일 때만 티켓 단위로 취소하며 저장된 티켓 결제액을 그대로 환불합니다. 회차 종료 시 별도 입장 확인 없이 이용 완료됩니다.", "환불 내역은 결제 영역 하단에 기록하고 카드사 영업일 기준 5~7일이 걸릴 수 있음을 안내합니다. 입장 체크·노쇼·온라인 할인 증빙 기능은 제공하지 않습니다."],
          ["회원탈퇴", "‘내 티켓’ 화면의 ‘회원탈퇴’를 클릭", "시스템 확인 모달로 탈퇴 의사를 다시 확인합니다.", "이름·연락처 등의 회원정보는 수집하지 않으며 탈퇴 시 소셜 로그인 연결과 장바구니를 제거합니다.", "결제·예약 이력은 운영 기록으로 계속 보관하고 재가입은 제한하지 않습니다."],
          ["로그아웃", "헤더 우측 ‘로그아웃’을 클릭(로그인 중에만 노출)", "별도 확인 절차 없이 즉시 처리하는 저위험 동작입니다.", "현재 세션을 종료하고 장바구니·티켓 상세 등 화면 상태를 초기화한 뒤 예약 화면으로 돌아갑니다.", "저장된 예약·장바구니 데이터는 삭제하지 않으며 같은 계정으로 다시 로그인하면 그대로 이어집니다."]
        ]},
        { title: "운영 관리자 화면", eyebrow: "ADMIN FLOW", items: [
          ["예약 검색 · 상세", "검색 버튼을 클릭하거나 검색창에서 Enter, 필터 변경 또는 예약 행 클릭", "검색어 앞뒤 공백을 제거한 뒤 예약번호·결제번호·프로그램명에서 부분 일치로 찾고 지역→부서, 이용일, 프로그램, 예약 상태를 AND 조건으로 적용합니다.", "검색 실행 시 첫 페이지부터 다시 조회하고 결과 건수와 적용 조건을 유지합니다. 초기화는 검색어·모든 필터·페이지를 기본값으로 되돌린 뒤 즉시 전체 목록을 다시 조회합니다.", "조건 적용 후 0건이면 ‘검색 결과가 없습니다.’, 조건 없이 예약 데이터가 0건이면 ‘예약내역이 없습니다.’를 표시합니다. 다른 부서 데이터의 상세·취소·다운로드는 권한에 따라 각각 제한합니다."],
          ["프로그램 목록 · 검색", "프로그램명 입력 후 검색 버튼 또는 Enter, 지역·부서 필터 변경, 새로고침 아이콘 클릭", "프로그램명 검색은 화면에 표시된 프로그램명 필드를 대상으로 앞뒤 공백을 제거한 부분 일치로 적용하고 지역·부서 필터와 AND 결합합니다. 새로고침은 저장 데이터를 다시 조회하되 필터와 검색어는 유지합니다.", "검색은 명시적으로 실행하며 성공 시 첫 페이지로 이동합니다. 초기화가 필요할 때는 검색어와 필터를 모두 기본값으로 되돌리고 전체 목록을 다시 조회합니다.", "결과가 없으면 빈 상태를 표시하고 테이블의 이전 결과를 남기지 않습니다. 대량 데이터에서는 전체 데이터를 내려받아 브라우저에서 찾지 않고 서버 검색·페이지네이션을 사용합니다."],
          ["프로그램 표시 · 판매 상태", "프로그램 목록을 조회하거나 ‘판매중/숨김’을 클릭", "목록의 할인 정책은 연결된 할인명 하나를 먼저 표시하고 2개 이상이면 ‘과천시민 할인 외 N개’, 없으면 ‘없음’으로 표시합니다. 등록 회차는 전체 수와 판매중 수를 구분합니다.", "판매중이면 사용자 화면에 노출하고 숨김이면 신규 예약 화면에서 제외합니다. 상태 변경 성공 후 해당 행만 서버 응답으로 갱신합니다.", "할인 목록의 표시 순서는 적용 우선순위가 아닙니다. 상태 변경은 기존 예약·결제 스냅샷에 영향을 주지 않습니다."],
          ["프로그램 저장", "‘프로그램 등록’ 또는 ‘프로그램 수정’ 후 저장 클릭", "명칭 중복, 지역·담당 부서, 가격, 운영·노출 기간과 요일, 대표 이미지, 예약 가능 일수, 취소 마감, 적용 할인 ID를 검증합니다.", "저장 성공 후 목록의 현재 필터를 유지한 채 해당 행을 갱신하고 신규 프로그램은 회차 관리로 이어갈 수 있게 안내합니다. 저장 중에는 중복 클릭을 막습니다.", "종료일이 시작일보다 빠르거나 예약 가능 일수가 1일 미만이면 필드 단위 오류를 표시합니다. 창 닫기·이동 시 저장하지 않은 변경이 있으면 확인합니다."],
          ["회차 저장 · 상태 변경", "‘회차 관리’에서 등록/수정/판매중/숨김 클릭", "시작·종료 시각, 판매 수량, 시간 중복과 프로그램 권한을 검증합니다. 종료 시각은 시작보다 늦어야 하고 판매 수량은 1명 이상이어야 합니다.", "회차는 시작 시각순으로 정렬하고 회차 번호를 자동 부여합니다. 저장 성공 시 목록과 사용자 예약 가능 회차를 다시 조회합니다.", "기존 예약 수보다 판매 수량을 낮추거나 예약이 있는 회차의 시간·상태를 바꿀 때 영향 인원과 차단 사유를 먼저 보여줍니다. 현장 재고는 이 값과 합산하지 않습니다. 예약 이력이 없는 회차만 삭제할 수 있으며, 취소 완료를 포함해 이력이 있는 회차는 삭제 대신 숨김으로 신규 판매를 중지합니다. 서버에서도 권한과 전체 예약 이력을 재검증해야 합니다."],
          ["할인 목록 · 저장", "‘할인 관리’ 열기, 할인 추가/수정/활성 상태 저장", "할인명·방식·값·적용 기간·최대 수량·대상 프로그램·활성 상태는 결제 완료 예약이 있어도 수정할 수 있습니다. 목록은 대표 할인명+‘외 N개’로 요약합니다.", "할인 간 우선순위를 두지 않고 동일 회원은 같은 이용일에 활성 할인 중 하나를 선택합니다. 최대 수량은 해당 이용일의 모든 프로그램·주문을 합산하고, 취소·환불 완료 시 해당 티켓 수량만큼 복원합니다.", "변경 내용은 신규 견적에만 적용합니다. 기존 주문은 결제 당시 선택한 할인과 금액의 스냅샷을 유지하며 온라인 증빙 항목은 두지 않습니다."],
          ["선택 티켓 취소 요청", "예약 상세에서 유효 인원 1명 이상 선택 후 ‘선택 취소 요청’ 클릭", "취소 가능 상태, 선택 티켓, 취소 마감, 실제 배분 결제액, 환불 권한과 사유를 서버에서 다시 확인합니다.", "성공하면 남은 티켓이 있을 때 ‘부분 취소’, 모두 취소했을 때 ‘취소 완료’로 즉시 표시하고 처리자·시각·대상·금액·사유를 기록합니다.", "별도 중간 상태는 사용하지 않으며 요청 실패 시 기존 예약 상태를 유지하고 오류를 안내합니다."],
          ["운영일 · 휴장일", "지역과 전체/개별 프로그램을 선택하거나 휴장일 등록", "캘린더에는 프로그램에 등록된 운영일만 표시하고 회차는 노출하지 않습니다. 전체 프로그램 휴장은 개별 프로그램 운영보다 우선하며 같은 날짜의 중복 휴장 등록은 막습니다.", "휴장 적용 전 날짜·지역·프로그램·회차 범위와 유효 예약 건수·인원을 확인창에 표시하고, 기존 예약이 자동 취소되지 않음을 확인해야 최종 적용할 수 있습니다. 휴장 해제 시 원래 운영 일정에 포함되는 날짜만 다시 운영으로 표시합니다.", "이미 예약이 있는 날짜는 휴장 저장만으로 자동 환불하지 않습니다. 대상 예약 수와 별도 운영 취소 절차를 안내합니다."],
          ["회차 운영 취소", "‘기상·운영상 회차 취소’를 클릭하고 대상 확인 후 확정", "지역·이용일·프로그램·회차·사유, 유효 예약 수, 환불 예정액과 운영 취소 권한을 확인합니다.", "확정 전 영향 범위를 요약하고 실행 후 예약별 성공·실패 결과를 기록합니다. 별도 알림은 발송하지 않습니다.", "일부 환불 실패는 전체 완료로 표시하지 않고 재처리 대상으로 남깁니다. 운영 취소와 단순 휴장일 등록은 별도 동작입니다."],
          ["내보내기 · 정산", "기간·지역·부서 조건 조회, 정산 행 열기 또는 ‘거래 원장 CSV’ 클릭", "시작일≤종료일, 최대 조회 기간, 정산 권한과 서비스 완료일 기준을 검사하고 화면 필터와 다운로드 조건을 동일하게 사용합니다.", "요약·일별 집계·예약 단위 거래 원장을 표시하고 CSV 파일명과 생성 시각에 조회 범위를 포함합니다. 초기화는 기본 기간·전체 지역·전체 부서로 되돌린 뒤 재조회합니다.", "0건이어도 헤더가 있는 빈 파일을 제공할지 정책을 통일합니다. 큰 파일은 비동기 생성하고 개인정보 포함 다운로드는 처리자·시각·조건을 기록합니다."]
        ]}
        ,{ title: "위이 계정 관리 화면", eyebrow: "ACCOUNT ADMIN", items: [
          ["계정 검색 · 조회", "지역 필터 또는 계정 검색어를 변경", "통합 관리자 권한으로 지역·로그인 ID 조건을 적용합니다.", "조건에 맞는 계정, 권한, 최근 접속과 사용 상태를 표시합니다.", "지역 관리자에게는 계정 발급 화면과 다른 계정의 보안 정보를 노출하지 않습니다."],
          ["지역 계정 발급 · 재설정", "‘지역 계정 발급’ 또는 ‘계정 설정’을 클릭 후 저장", "서울·부산경남·제주에 각각 하나의 활성 지역 계정과 중복되지 않는 로그인 ID, 신규/재발급 임시 비밀번호를 검증합니다.", "기본 로그인 ID는 seoul_admin·busan_admin·jeju_admin이며 임시 비밀번호는 자동 생성해 최초 전달 후 다시 표시하지 않습니다.", "통합 관리자만 지역 계정을 발급·중지·재발급할 수 있으며 지역 계정은 자기 지역 범위나 고정 권한을 변경할 수 없습니다."],
          ["지역별 CRUD · 조회 권한", "지역 계정으로 프로그램·예약·환불·정산 기능 접근", "로그인 계정의 소속 지역과 대상 데이터의 지역을 비교합니다.", "자기 지역은 프로그램·회차·운영일·예약·취소·환불·정산의 생성·조회·수정·삭제가 가능하고 다른 지역은 조회만 가능합니다.", "타 지역의 등록·수정·삭제·상태 변경·환불·다운로드 버튼은 비활성화하며 화면 숨김과 별개로 API도 거절해야 합니다."],
          ["계정 중지 · 비밀번호 재발급", "계정 사용을 해제하거나 새 임시 비밀번호를 저장", "통합 관리자 권한, 대상 계정 상태와 재발급 사유를 확인합니다.", "사용 중지는 기존 세션까지 만료시키고, 재발급 시 이전 비밀번호를 폐기합니다.", "기존 비밀번호 원문은 조회할 수 없으며 변경 이력을 감사 로그에 남깁니다."]
        ]}
      ]
    },
    backend: {
      label: "BE · API 로직",
      summary: "화면 값을 신뢰하지 않고 서버에서 다시 검사해야 하는 데이터·트랜잭션·권한 기준입니다.",
      groups: [
        { title: "예약 · 결제 API", eyebrow: "BOOKING API", items: [
          ["인증 세션", "소셜 로그인 콜백 또는 인증이 필요한 API 요청", "제공자와 제공자별 사용자 식별자를 검증해 내부 회원 ID에 연결합니다.", "세션/토큰의 내부 회원 ID로 장바구니·예약 조회 범위를 제한합니다.", "클라이언트가 보낸 회원 ID는 권한 판단에 쓰지 않으며 비회원 주문은 401로 거절합니다."],
          ["프로그램 · 회차 조회", "예약 화면이 프로그램, 날짜, 회차 목록을 요청", "노출·판매·운영 기간, 운영 요일, 프로그램/회차 활성 상태와 날짜별 실제 회차를 조회합니다.", "예약 가능 날짜·회차, 온라인 잔여 수량, 적용 가능한 할인만 반환합니다.", "현장 키오스크 재고는 API 미연동이므로 온라인 잔여 수량에 섞지 않습니다."],
          ["장바구니 견적", "담기/수량 변경/주문 화면 진입 시 견적 요청", "상품·회차 ID, 수량, 동일 이용일·지역·부서, 전 지역 시간 중복, 활성 할인과 사용량을 서버 데이터로 계산합니다.", "재고를 점유하지 않고 요청 시점의 견적 금액과 잔여 수량만 반환합니다.", "실제 재고 확정은 결제 사전 검증에서 이루어지며, 여러 장바구니가 같은 회차를 담아도 이 단계에서는 거절하지 않습니다."],
          ["결제 사전 검증", "결제하기 클릭 후 주문 생성 요청", "최신 회차 상태, 온라인 재고, 기존 확정 예약+새 주문 수량, 시간 충돌, 할인 사용량을 잠금 상태에서 재검사합니다.", "통과 건만 결제 준비 주문을 만들고 PG 요청 금액을 확정합니다.", "동시 요청으로 재고가 바뀌면 409와 최신 잔여 수량을 반환합니다."],
          ["주문 확정 트랜잭션", "PG 승인 결과 검증 성공", "PG 결제번호·금액·상태와 주문을 대조하고 멱등키/PG 번호 중복을 검사합니다.", "재고 차감, 주문 확정, 티켓 발급, 할인 사용량 기록을 한 트랜잭션으로 커밋합니다.", "실패하면 전체 롤백하고 재시도에는 기존 성공 결과를 반환해 중복 결제·예약을 막습니다."],
          ["주문 스냅샷 · 티켓", "주문 확정 시", "프로그램명, 지역·부서, 이용일·회차, 정가, 할인 정책/금액, 결제액을 주문 항목에 복사합니다.", "이후 프로그램·회차·할인이 수정되어도 과거 주문과 정산은 유지됩니다.", "표시는 회차별로 묶되 부분취소를 위해 인원별 티켓과 금액 배분값을 보관합니다."],
          ["시간 충돌 판정", "견적과 결제 사전 검증 시", "같은 계정의 모든 지역·프로그램 유효 예약과 장바구니를 [시작, 종료) 구간으로 비교합니다.", "지역이 같거나 달라도 일부라도 겹치면 거절하고 종료 시각과 다음 시작 시각이 같으면 허용합니다.", "인원수와 주문 분할 여부에 관계없이 계정 단위로 검사합니다."],
          ["취소 요청 · 환불", "사용자 또는 관리자가 전체/부분 취소 요청", "소유권/권한, 취소 마감, 티켓 상태, 환불 가능액과 PG 취소 가능 여부를 한 요청에서 검사합니다.", "PG 취소와 티켓 상태 저장이 모두 성공하면 ‘부분 취소’ 또는 ‘취소 완료’로 확정하고 환불 누계와 처리 이력을 기록합니다.", "중간 상태는 노출하지 않으며 실패 시 기존 예약과 티켓 상태를 유지하고 운영 로그에 실패 원인을 남깁니다."],
          ["할인 사용량 복원", "취소·환불 성공 후", "취소 완료된 할인 티켓 수를 이용일별 할인 사용량에서 차감합니다.", "취소 성공과 같은 트랜잭션에서 일일 할인 한도를 즉시 복원합니다.", "취소 요청이 실패하면 티켓과 할인 사용량을 모두 기존 상태로 유지합니다."],
          ["결제 결과 조회 · 복구", "PG 응답 지연, 화면 이탈, 웹훅 중복 또는 승인 후 저장 실패", "주문·결제 시도 식별자와 PG 거래를 조회하고 이미 처리한 이벤트인지 확인합니다.", "성공 상태를 복구하거나 원 승인을 취소하고 사용자가 주문 내역에서 최종 결과를 확인하게 합니다.", "응답이 불명확한 상태를 실패로 단정해 새 결제를 유도하지 않으며 과거 상태로 되돌리지 않습니다."],
          ["이용 완료 처리", "회차 종료 시각 경과", "별도 입장 확인 없이 취소되지 않은 예약의 회차 종료 여부만 확인합니다.", "회차가 끝나면 예약을 ‘이용 완료’로 자동 처리해 정산 집계에 포함합니다.", "실제 입장 여부·노쇼·입장 이력은 수집하거나 별도 상태로 관리하지 않습니다."],
          ["회원탈퇴 처리", "회원탈퇴 확인 요청", "본인 계정 인증만 확인하며, 유효한 예약이 남아 있어도 탈퇴 가능 여부를 별도로 제한하지 않습니다.", "예약·장바구니·결제 이력을 포함한 회원 데이터를 삭제 처리하고 로그인 세션을 종료합니다.", "동일 로그인 제공자·식별자로 재가입해도 대기 기간이나 횟수 제한 없이 새 계정 생성을 허용합니다."]
        ]},
        { title: "관리 · 운영 API", eyebrow: "ADMIN API", items: [
          ["관리자 조회 · 지역 권한", "모든 관리자 목록 조회·검색·초기화·상세·저장·취소·환불·다운로드 요청", "통합 관리자는 전체 지역 CRUD, 지역 관리자는 자기 지역 CRUD·타 지역 Read로 권한을 계산하고 요청 대상의 regionId를 서버 데이터에서 확인합니다.", "허용 범위만 처리하고 계정 ID·소속 지역·대상 지역·작업·변경 전후 값을 감사 로그에 남깁니다.", "클라이언트가 보낸 소속 지역을 신뢰하지 않으며 지역 계정의 타 지역 C/U/D 요청은 403으로 거절합니다."],
          ["프로그램 · 회차 저장", "프로그램 검색/생성/수정/상태 변경과 회차 저장", "프로그램명 검색은 정규화된 이름 부분 일치로 처리하고 필수값, 중복명 범위, 기간·시간 순서, 수량, 지역·부서·할인 관계와 수정 버전을 검증합니다.", "프로그램 → 회차 템플릿 → 날짜별 실제 회차 구조로 연결하고 저장 응답에 최신 행과 할인 요약용 count/name을 반환합니다.", "동시 수정은 버전 충돌로 막고 이미 판매된 회차 변경은 예약 영향·재고 부족을 확인합니다. 목록 새로고침은 최신 수정 시각 기준 데이터를 반환합니다."],
          ["할인 정책 저장 · 요약", "할인 추가/수정/비활성화 또는 프로그램 목록 조회", "결제 완료 예약의 존재 여부와 관계없이 할인명·방식·값·상한·적용 수량·기간·프로그램·활성 상태를 검증해 저장하며 할인 간 우선순위는 두지 않습니다.", "동일 회원·동일 이용일의 모든 프로그램·주문에서 선택한 할인 정책 하나와 사용 수량을 집계하고, 취소·환불 완료 시 해당 티켓 수량만큼 복원합니다. 목록에는 ‘할인명 외 N개’로 요약합니다.", "변경된 정책은 신규 견적부터 적용하고 결제 완료 주문은 저장된 할인 스냅샷을 사용합니다."],
          ["회차 일괄 취소", "운영 취소 확정 요청", "회차를 잠그고 유효 예약·결제, 환불 예정액, 중복 실행 여부를 조회합니다.", "예약별 환불 결과, 회차 중지, 티켓 취소와 감사 이력을 기록합니다.", "별도 알림 발송 기능은 제공하지 않으며 일부 환불 실패는 건별 재처리 대상으로 남깁니다."],
          ["정산 집계 · 내보내기", "기간별 정산 조회·초기화 또는 파일 생성", "서비스 완료일 기준으로 권한 범위의 결제·환불 거래를 집계하며 정산일은 매월 8일입니다.", "요약·일별 집계와 불변 거래 원장을 예약·결제번호 기준으로 반환하고 화면과 파일에 같은 산식을 적용합니다.", "세금과 PG 수수료는 확정 전까지 별도 항목으로 두고 임의의 비율을 계산에 적용하지 않습니다."],
          ["민감정보 · 비밀번호", "관리자 계정 발급/재발급 및 개인정보 조회", "비밀번호는 단방향 해시, 개인정보는 최소 권한·마스킹·접근 로그를 적용합니다.", "임시 비밀번호는 최초 로그인 변경 대상으로 발급하고 저장 후 원문을 노출하지 않습니다.", "분실 시 기존 비밀번호 조회가 아니라 새 임시 비밀번호 재발급만 허용합니다."],
          ["계정 수명주기 · 감사", "계정 발급, 비밀번호 재발급 또는 사용 중지", "통합 관리자 권한과 지역당 계정 1개 제한을 검증합니다.", "중지 계정의 기존 세션을 만료하고 관리자 ID·소속 지역·시각·변경 전후 값·사유를 기록합니다.", "지역 공용 계정은 개인 처리자를 구분하지 못하므로 중요한 작업에는 처리자 메모를 함께 남깁니다."],
          ["운영 보안 · 복구", "배포, 장애, 백업 복구 또는 대량 작업", "운영/테스트 환경 분리, HTTPS, 접근 통제, 비밀정보 노출, 백업과 복구 가능성을 점검합니다.", "장애와 대량 작업 결과를 추적하고 신규 판매 중단 중에도 기존 티켓·취소·환불 처리 방침을 적용합니다.", "성능·보관 기간·복구 목표와 공공기관 보안 요건은 승인된 운영 기준 없이는 확정값으로 표시하지 않습니다."]
        ]}
      ]
    }
  };

  var servicePolicy = {
    "RSV-01": [
      ["회원 예약 원칙", "상품 조회는 누구나, 장바구니·예약·티켓은 로그인 회원에게 적용", "네이버·카카오 간편로그인만 사용하고 비회원 예약은 허용하지 않습니다.", "이름·연락처는 수집하지 않고 로그인 제공자와 제공자 회원 식별자 조합으로 예약 소유권만 구분합니다.", "서로 다른 로그인 제공자의 계정은 별도 계정으로 유지합니다."],
      ["검수용 헤더 메뉴", "서울·부산경남·제주 지역 전환과 관리자 링크", "일반 화면에서는 숨기고 Alt+P로 정책 보기를 활성화한 동안에만 ‘DEMO ONLY’ 표식과 함께 노출합니다.", "정책 보기를 닫으면 메뉴도 즉시 숨기며 실제 사용자 기능이나 운영 정책으로 제공하지 않습니다.", "예약 조회·장바구니·로그인·로그아웃 등 일반 사용자 메뉴는 숨김 대상에 포함하지 않습니다."]
    ],
    "RSV-02": [
      ["프로그램 노출 · 판매", "상품 목록, 상세, 날짜 선택", "노출 기간에는 상품을 보여주되 운영 기간·요일과 판매 상태를 별도로 판단합니다.", "운영 중인 프로그램만 노출하며 프로그램 또는 체험이 1개이면 선택 영역에도 1개만 표시합니다. 예약 가능한 이용일은 프로그램별 예약 가능 일수 안에서 제공합니다.", "숨김 상품은 신규 예약 화면에서 제외하고 기존 예약·티켓은 유지합니다."],
      ["예약 화면 공통 제목", "체험 예약 화면 상단", "특정 프로그램이나 연령대로 한정하지 않고 ‘렛츠런파크 체험 예약’으로 표시합니다.", "선택한 프로그램의 이름·가격·설명은 체험 선택 영역과 예약 요약에서 구체적으로 보여줍니다.", "프로그램을 변경해도 화면 상단의 공통 제목은 바꾸지 않습니다."]
    ],
    "RSV-03": [
      ["예약 시간 중복", "같은 계정의 확정 예약과 장바구니 전체", "지역·부서·프로그램과 관계없이 이용 구간이 일부라도 겹치면 결제를 차단합니다.", "[시작, 종료) 기준이므로 앞 회차 종료와 다음 회차 시작이 같으면 허용합니다.", "주문을 나누거나 인원수를 바꿔도 같은 계정의 모든 지역 예약을 합산합니다."]
    ],
    "RSV-04": [
      ["일반 구매 수량", "할인을 적용하지 않는 예약", "계정별 일일 구매 한도는 두지 않고 선택 회차의 판매 가능 수량만 적용합니다.", "장바구니와 결제 단계에서 최신 잔여 수량을 검사합니다.", "관리자가 설정한 회차 판매 수량을 초과할 수 없습니다."],
      ["할인 적용", "할인 정책을 선택한 티켓", "온라인 증빙 절차 없이 활성 할인 정책의 대상·기간·일일 한도만 검사합니다.", "취소가 성공한 할인 티켓 수만큼 해당 이용일의 할인 한도를 같은 트랜잭션에서 즉시 복원합니다.", "취소 요청이 실패하면 티켓 상태와 할인 사용량을 모두 기존 값으로 유지합니다."]
    ],
    "RSV-05": [
      ["장바구니 구성", "로그인 회원이 예약 옵션을 담을 때", "한 장바구니에는 동일한 이용일·지역·담당부서의 비중복 회차만 함께 담을 수 있습니다.", "다른 이용일·지역·담당부서 상품은 묶음 결제하지 않으며 기존 장바구니를 결제하거나 비운 뒤 담습니다.", "같은 상품·날짜·회차를 다시 담으면 별도 줄 대신 기존 항목의 인원수에 새로 선택한 인원수를 더하고 금액을 다시 계산합니다. 합산 수량이 회차 정원이나 할인 한도를 넘으면 담지 않고 사유를 안내합니다."],
      ["장바구니 노출 상태", "장바구니 상품 수가 변경될 때", "0개이면 빈 상태와 체험 탐색 링크를, 1개 이상이면 상품 목록·결제 요약·아직 담지 않은 체험 링크를 표시합니다.", "담긴 상품과 같은 체험 링크는 숨기고 모든 제공 체험이 담기면 추가 영역 전체를 숨깁니다.", "빈 장바구니에서는 주문을 진행할 수 없으며 마지막 상품 삭제와 결제 완료 시 합계·할인 금액도 0원으로 초기화합니다."],
      ["장바구니는 재고를 점유하지 않음", "담기 완료부터 결제 전까지", "장바구니에 담은 수량은 재고를 잠그지 않으며 별도 보유 시간이나 만료 표시를 두지 않습니다.", "결제는 먼저 완료한 주문 순서대로 확정되며, 같은 회차를 여러 장바구니가 동시에 담고 있어도 결제 전까지는 서로 막지 않습니다.", "결제가 몇 초 차이로 밀린 사용자에게는 ‘이미 결제가 완료된 회차입니다.’ 안내와 함께 재선택을 요청합니다."]
    ],
    "RSV-06": [
      ["주문 · 결제 확정", "장바구니 주문 또는 바로 예약", "한 주문에 여러 예약 항목을 포함하되 각 상품·이용일·회차 예약은 별도 식별자로 관리합니다.", "PG 승인 검증과 서버 저장이 모두 끝난 뒤에만 예약 완료와 티켓을 표시합니다.", "결제 버튼 클릭이나 완료 화면 노출만으로 성공으로 판단하지 않습니다."],
      ["예약(주문)번호 체계", "결제 확정 시 주문번호를 발급할 때", "형식은 GP-YYMMDD-NNNNN 입니다. YYMMDD는 결제(주문) 발생일, NNNNN은 그날짜 안에서만 증가하는 5자리 순번입니다.", "날짜가 바뀌면 순번을 1부터 다시 시작하며, 같은 날짜 안에서는 순번이 항상 증가만 하므로 같은 번호가 두 번 나오지 않습니다. 사람이 눈으로 비교·구두 전달하기 쉽도록 UUID 대신 이 형식을 사용합니다.", "인원별 티켓 번호는 주문번호 뒤에 -T01, -T02처럼 순번만 붙여 구성하며 별도 채번 규칙을 두지 않습니다."],
      ["결제 오류 · 복구", "중복 클릭, 화면 이탈, 응답 지연, 늦은 승인 또는 저장 실패", "같은 결제 시도는 한 번만 청구·발급하도록 멱등 처리합니다.", "주문 내역 조회로 최종 결과를 복구하고 필요하면 예약 복구 또는 원 승인 취소를 수행합니다.", "결과가 불명확하면 새 결제를 유도하지 않고 확인 필요 상태를 표시합니다."]
    ],
    "RSV-07": [
      ["티켓 표시 단위", "결제 완료된 예약 조회", "사용자는 상품·이용일·회차별 묶음 티켓 한 장에서 유효 인원을 확인하며, 과천시민 할인 인원이 있으면 할인 문구를 함께 표시합니다.", "관리자는 예약 인원별 개별 티켓으로 상태와 취소·환불 이력을 관리합니다.", "취소 완료 인원은 묶음 티켓의 유효 인원에서 제외합니다."],
      ["취소 · 이용 완료", "사용자 취소 또는 회차 종료", "관리자가 프로그램별로 설정한 취소 마감 전이며 입장 대기 상태인 예약만 취소할 수 있습니다.", "선택한 티켓에 저장된 실제 결제액을 그대로 환불하므로 재계산과 원 단위 반올림은 하지 않습니다. 회차 종료 시 별도 입장 확인 없이 이용 완료 처리합니다.", "카드사 환불 완료에는 영업일 기준 5~7일이 걸릴 수 있으며 실제 입장 여부와 노쇼는 관리하지 않습니다."],
      ["상태 표시 규칙", "티켓 카드와 상세 화면의 상태 배지·정보", "입장 대기는 노란색, 입장 가능은 초록색, 입장 종료는 회색 계열로 구분하고 색과 함께 텍스트 라벨을 항상 표시합니다.", "카드와 상세 화면은 같은 1초 주기 시계를 기준으로 상태를 다시 계산하므로 두 화면의 표시가 어긋나지 않습니다. 과천시민 할인 인원이 포함된 티켓에는 카드·상세 화면 모두에 할인 여부를 표시합니다.", "실제 색상 값과 명도 대비 기준은 디자인 시스템 토큰을 따르며 이 문서에서 임의로 재정의하지 않습니다."]
    ],
    "RSV-08": [
      ["회원·거래 정보", "로그인, 예약, 결제와 회원탈퇴", "이름·연락처 등 별도 회원정보를 수집하지 않고 소셜 로그인 식별값만 예약 소유권 확인에 사용합니다.", "결제·예약 이력은 운영 기록으로 계속 보관하며 회원탈퇴 시 로그인 연결과 장바구니만 제거합니다.", "결제수단에서 제공되는 정보는 필요한 범위만 저장하고 관리자 화면에서는 마스킹합니다."]
    ],
    "RSV-09": [
      ["로그아웃", "로그인 상태의 모든 화면", "로그아웃은 별도 확인 절차 없이 즉시 처리되는 저위험 동작입니다.", "클라이언트 세션만 종료하며 서버에 저장된 예약·장바구니·결제 이력은 그대로 유지합니다.", "동일 기기에서도 자동 로그인은 제공하지 않으며 다음 이용 시 계정을 다시 선택합니다."]
    ],
    "ADM-01": [["예약 검색 기준", "예약번호·결제번호·프로그램명 검색과 지역·부서·이용일·프로그램·상태 필터", "문자 검색은 앞뒤 공백을 제거한 부분 일치, 복수 필터는 AND 조건으로 적용합니다.", "검색 버튼과 Enter는 같은 요청을 실행하고 초기화는 기본 조건·첫 페이지로 재조회합니다.", "조건 적용 후 0건은 ‘검색 결과가 없습니다.’, 조건 없이 데이터가 0건이면 ‘예약내역이 없습니다.’로 구분합니다."], ["예약 목록 페이지", "검색·필터가 적용된 예약 목록", "한 페이지에 20건을 최신 예약순으로 표시하고 하단에 현재 범위·전체 건수·최대 5개의 페이지 번호를 제공합니다.", "무한 스크롤이나 스크롤 고정 페이징은 사용하지 않습니다. 페이지 이동 시 목록 상단으로 스크롤하고 검색·필터·초기화 시 1페이지로 돌아갑니다.", "전체 선택은 현재 페이지 20건만 대상으로 하며 서버 API도 page·pageSize=20과 전체 건수를 반환해야 합니다."], ["빈 상태 검수", "예약·프로그램·회차·휴장일·정산 등 데이터 0건 화면", "일반 데이터와 분리된 전용 빈 화면 페이지에서 제목과 안내 문구를 검수합니다.", "Command+E로 전용 페이지에 이동하고 사용자 예약·예약/티켓·프로그램/회차·운영/정산·계정 탭을 전환합니다.", "검수 페이지는 저장 데이터·검색 조건·페이지 상태를 변경하지 않으며 Command+E를 다시 누르면 원래 화면으로 돌아갑니다."], ["예약 운영 권한", "예약 목록과 상세", "전체 프로그램 조회와 예약자·결제 정보 조회 권한을 구분합니다.", "허용된 지역·부서·기능 범위의 예약만 조회·처리합니다.", "다른 부서 프로그램 조회가 개인정보·취소 권한을 의미하지 않습니다."]],
    "ADM-02": [["프로그램 검색 · 초기화", "프로그램·회차 목록 상단 검색 영역", "프로그램명 필드만 부분 일치 검색하며 지역·부서 필터와 AND 결합합니다.", "검색은 버튼/Enter로 실행하고 새로고침은 조건을 유지한 최신 데이터 조회, 초기화는 모든 조건 제거 후 전체 조회입니다.", "페이지가 있다면 검색·초기화 시 1페이지로 이동합니다."], ["목록 축약 표기", "할인 정책·등록 회차처럼 복수 값인 열", "할인은 연결된 첫 항목 뒤에 ‘외 N개’를 표시하고 상세/툴팁에서 전체 목록을 제공합니다.", "할인 0개는 ‘없음’, 1개는 이름만, 2개 이상은 ‘대표 할인 외 N개’로 표시하며 표시 순서는 적용 우선순위가 아닙니다.", "등록 회차 수에는 숨김 회차도 포함하고 판매중 수를 보조 정보로 분리합니다."], ["프로그램 수명주기", "등록·수정·판매중·숨김", "신규 판매 상태와 과거 주문 스냅샷을 분리합니다.", "숨김은 신규 노출만 중단하고 기존 예약·결제·티켓은 보존합니다.", "저장 실패 시 기존 화면 상태를 유지하고 성공 응답으로 해당 행을 갱신합니다."]],
    "ADM-03": [["회차 운영", "반복 회차와 날짜별 실제 회차", "판매 수량은 현장 수량과 독립적으로 관리하며 회차는 시작 시각순으로 번호를 부여합니다.", "기존 예약이 있는 회차 변경은 영향 인원과 재고를 확인한 뒤 처리합니다.", "기존 예약 수보다 작은 수량 저장, 시간 중복과 종료≤시작은 차단합니다."], ["운영일 · 휴장일", "지역과 전체 또는 개별 프로그램의 단일 날짜·기간", "캘린더에는 프로그램에 이미 등록된 운영일을 표시하고 예약을 닫을 휴장일만 별도 저장합니다.", "휴장 적용 전 대상 범위와 유효 예약 영향을 확인하고, 기존 예약이 자동 취소되지 않음을 확인해야 적용합니다. 전체 프로그램 휴장이 개별 프로그램 운영보다 우선하며 휴장 해제는 원 운영 일정에 포함된 날만 복원합니다.", "이미 예약된 날짜의 휴장 등록은 자동 환불이 아니며 별도 운영 취소 절차가 필요합니다."]],
    "ADM-04": [["할인 정책 · 복수 표시", "정률·정액 할인과 적용 프로그램", "할인은 프로그램과 분리하고 같은 프로그램에 여러 할인이 연결되면 목록에는 할인명 하나+‘외 N개’로 표시합니다. 표시 순서는 적용 우선순위가 아닙니다.", "동일 회원은 같은 이용일에 적용 가능한 할인 중 하나를 선택하며, 모든 프로그램·주문의 할인 수량을 합산해 정책별 최대 수량을 제한합니다.", "결제 직전 서버에서 기존 유효 예약과 새 주문을 재검증하고 결제 당시 선택 할인과 금액은 주문 스냅샷으로 보존합니다."]],
    "ADM-05": [["부분취소 · 부분환불", "고객 직접 취소 또는 관리자가 선택한 인원별 티켓", "선택한 티켓의 실제 배분 결제액만 환불하고 나머지 예약을 유지합니다.", "환불 누계, 티켓 상태, 유효 인원과 함께 고객 직접 취소·관리자 처리 주체, 처리 시각, 사유를 이력에 기록합니다.", "PG 결과가 불명확하면 완료로 표시하거나 재판매하지 않습니다."]],
    "ADM-06": [["운영 취소", "기상·시설·안전 사유의 날짜별 회차", "실행 전 대상 예약과 환불 예정액을 확인하고 건별 결과를 관리합니다.", "회차 중지, 티켓 취소와 환불 결과를 연결해 기록하며 별도 알림은 발송하지 않습니다.", "일부 실패를 전체 성공으로 표시하지 않고 재처리 대상을 남깁니다."]],
    "ADM-07": [["정산 조회 · 초기화", "기간·지역·부서 필터", "서비스 완료일 기준으로 집계하며 월 정산일은 매월 8일입니다.", "초기화는 기본 기간과 전체 지역·부서로 재조회하며 화면과 다운로드는 같은 필터·산식을 사용합니다.", "세금·PG 수수료가 확정되기 전에는 임의 비율을 적용하지 않습니다."], ["거래 원장 · 다운로드", "지역·부서·프로그램별 서비스 완료 건", "결제일이 아닌 서비스 제공 완료일 기준으로 결제액·환불액·지급 예정액을 구분합니다.", "상세는 예약·결제 1건 단위 원장을 제공하고 파일에는 조회 조건·생성 시각을 포함합니다.", "대용량 파일은 비동기 생성하며 다운로드 이력을 기록합니다."]],
    "ADM-08": [["관리자 보안", "모든 관리자 기능", "화면 노출과 무관하게 서버가 매 요청의 계정 상태·지역·부서·기능 권한을 검사합니다.", "결제수단 정보는 마스킹하고 접근 로그와 변경 이력을 남깁니다.", "프로토타입의 브라우저 저장 방식은 운영 인증·보안 구현으로 사용하지 않습니다."]],
    "ACC-01": [["계정 관리 접근", "위이 통합 관리자", "지역 계정 발급과 다른 계정의 상태·권한 조회는 내부 운영 기능입니다.", "지역 관리자와 고객 예약 화면에는 접근 경로를 제공하지 않습니다.", "통합 관리자만 계정 발급·중지·재발급을 수행합니다."]],
    "ACC-02": [["지역 운영 계정", "서울·부산경남·제주 지역별 1개", "기본 로그인 ID는 seoul_admin·busan_admin·jeju_admin으로 발급하고 별도 통합 관리자 계정을 유지합니다.", "임시 비밀번호는 안전하게 자동 생성해 최초 전달 후 해시만 저장하고 원문은 다시 노출하지 않습니다.", "분실 시 기존 비밀번호 조회가 아닌 재발급만 허용합니다."]],
    "ACC-03": [["지역별 CRUD · Read", "프로그램·회차·운영일, 예약·결제, 취소·환불, 정산", "지역 관리자는 자기 지역 데이터에 CRUD, 다른 지역 데이터에는 Read만 허용합니다.", "타 지역의 변경·삭제·환불·운영 취소·다운로드 요청은 버튼 상태와 무관하게 API에서 403으로 거절합니다.", "통합 운영 관리자는 모든 지역 CRUD와 지역 계정 발급·중지·재발급 권한을 가집니다."]],
    "ACC-04": [["계정 중지 · 감사", "사용 중지, 권한 변경, 비밀번호 재발급", "사용 중지는 기존 로그인 세션까지 만료시킵니다.", "관리자 ID·지역·부서·시각·사유와 변경 전후 값을 기록합니다.", "공용 계정은 개인 처리자를 구분하지 못하므로 운영 인계와 감사 한계를 관리합니다."]]
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function renderItem(item, type) {
    var labels = type === "service" ? ["적용 범위", "정책 기준", "확정 내용", "예외 · 주의"] : ["트리거", "조건 · 검증", "정상 결과", "예외 · 주의"];
    var rows = item.slice(1).map(function (value, rowIndex) {
      return '<div class="policy-rule"><dt>' + labels[rowIndex] + '</dt><dd>' + escapeHtml(value) + '</dd></div>';
    }).join("");
    return '<details class="policy-flow" open><summary><span>' + escapeHtml(item[0]) + '</span><i aria-hidden="true"></i></summary><dl>' + rows + '</dl></details>';
  }

  function topicsFor(context) {
    var customer = policy.frontend.groups[0].items;
    var admin = policy.frontend.groups[1].items;
    var account = policy.frontend.groups[2].items;
    var bookingApi = policy.backend.groups[0].items;
    var adminApi = policy.backend.groups[1].items;
    // Pending-decision policies were removed once the service rules were confirmed.
    // Keep an empty compatibility list until the topic metadata below is cleaned up.
    var pending = [];
    if (context === "account") return withService([
      { key: "ACC-01", title: "계정 조회", summary: "통합 관리자 전용 계정 목록과 검색 범위", fe: [account[0]], be: [adminApi[0], adminApi[5]], pending: [pending[7], pending[12]] },
      { key: "ACC-02", title: "지역 계정 발급 · 재설정", summary: "지역당 운영 계정 1개와 임시 비밀번호 처리", fe: [account[1]], be: [adminApi[5], adminApi[6]], pending: [pending[7], pending[12]] },
      { key: "ACC-03", title: "지역별 접근 권한", summary: "자기 지역 CRUD·타 지역 Read의 화면 및 API 접근 제어", fe: [account[2]], be: [adminApi[0], adminApi[6]], pending: [pending[7]] },
      { key: "ACC-04", title: "중지 · 보안 · 감사", summary: "세션 만료, 비밀번호 재발급과 변경 이력", fe: [account[3]], be: [adminApi[5], adminApi[6], adminApi[7]], pending: [pending[12]] }
    ]);
    if (context === "admin") return withService([
      { key: "ADM-01", title: "예약 조회 · 권한", summary: "예약 목록 조회부터 상세 열람, 부서별 접근 제어까지", fe: [admin[0]], be: [adminApi[0]], pending: [pending[7]] },
      { key: "ADM-02", title: "프로그램 관리", summary: "검색·초기화·목록 축약 표기부터 판매 상태와 저장까지", fe: [admin[1], admin[2], admin[3]], be: [adminApi[1]], pending: [pending[0], pending[13]] },
      { key: "ADM-03", title: "회차 · 운영일 관리", summary: "회차 저장과 운영일·휴장일 우선순위 및 기존 예약 영향", fe: [admin[4], admin[7]], be: [adminApi[1]], pending: [pending[0], pending[5]] },
      { key: "ADM-04", title: "할인 관리", summary: "복수 할인 선택, 이용일 합산 한도와 과거 주문 보호", fe: [admin[5]], be: [adminApi[2]], pending: [pending[3], pending[4]] },
      { key: "ADM-05", title: "부분취소 · 환불", summary: "인원별 티켓 선택부터 PG 부분환불과 사용량 복원까지", fe: [admin[6]], be: [bookingApi[7], bookingApi[8], bookingApi[9]], pending: [pending[2], pending[3], pending[5]] },
      { key: "ADM-06", title: "회차 운영 취소", summary: "기상·시설·안전 사유의 일괄 취소 처리", fe: [admin[8]], be: [adminApi[3], bookingApi[10]], pending: [pending[5], pending[11]] },
      { key: "ADM-07", title: "내보내기 · 정산", summary: "조회·초기화·0건 처리와 권한 범위 CSV 및 정산", fe: [admin[9]], be: [adminApi[4]], pending: [pending[9], pending[10]] },
      { key: "ADM-08", title: "계정 · 보안", summary: "관리자 권한 검증과 비밀번호·개인정보 보호", fe: [], be: [adminApi[0], adminApi[5], adminApi[6], adminApi[7]], pending: [pending[7], pending[12]] }
    ]);
    return withService([
      { key: "RSV-01", title: "로그인 · 계정", summary: "소셜 로그인부터 계정별 예약 데이터 분리까지", fe: [customer[0]], be: [bookingApi[0]], pending: [pending[8]] },
      { key: "RSV-02", title: "프로그램 · 날짜", summary: "체험 선택과 예약 가능한 이용일 노출 기준", fe: [customer[1], customer[2]], be: [bookingApi[1]], pending: [pending[0], pending[13]] },
      { key: "RSV-03", title: "회차 · 시간 중복", summary: "잔여 회차 표시와 기존 예약·장바구니 충돌 판정", fe: [customer[3]], be: [bookingApi[1], bookingApi[6]], pending: [pending[1]] },
      { key: "RSV-04", title: "인원 · 할인", summary: "하루 구매 한도와 과천시민 할인 계산", fe: [customer[4]], be: [bookingApi[2]], pending: [pending[0], pending[3], pending[4]] },
      { key: "RSV-05", title: "장바구니", summary: "담기·수량 변경·삭제와 상태별 노출 및 단일 이용일 정책", fe: [customer[5], customer[7], customer[8]], be: [bookingApi[2]], pending: [pending[5], pending[6]] },
      { key: "RSV-06", title: "예약 · 결제", summary: "바로 예약부터 결제 직전 재검증과 주문 확정까지", fe: [customer[6], customer[9]], be: [bookingApi[3], bookingApi[4], bookingApi[5], bookingApi[9]], pending: [pending[5], pending[6], pending[10]] },
      { key: "RSV-07", title: "내 티켓", summary: "회차별 티켓 표시, 상태 배지와 전체·부분취소·입장 처리", fe: [customer[10], customer[11], customer[12]], be: [bookingApi[5], bookingApi[7], bookingApi[8], bookingApi[10]], pending: [pending[3], pending[4], pending[11]] },
      { key: "RSV-08", title: "회원탈퇴", summary: "확인 모달 후 즉시 삭제, 재가입 제한 없음", fe: [customer[12]], be: [bookingApi[11]] },
      { key: "RSV-09", title: "로그아웃", summary: "확인 없이 즉시 세션 종료, 데이터는 유지", fe: [customer[13]], be: [] }
    ]);
  }

  function withService(topics) {
    return topics.map(function (topic) {
      topic.service = servicePolicy[topic.key] || [];
      return topic;
    });
  }

  function renderLane(type, title, items) {
    var empty = type === "service" ? "이 영역에 별도로 적용되는 서비스 정책이 없습니다." : type === "frontend" ? "별도 화면 동작 없이 서버 정책으로만 적용됩니다." : "별도 서버 처리 없이 화면 상태만 변경합니다.";
    var badge = type === "service" ? "정책" : type === "frontend" ? "FE" : "BE";
    var eyebrow = type === "service" ? "SERVICE" : type === "frontend" ? "INTERACTION" : "SERVER";
    return '<section class="policy-lane policy-lane--' + type + '"><header><b>' + badge + '</b><div><small>' + eyebrow + '</small><h4>' + title + '</h4></div><span>' + items.length + '개</span></header><div class="policy-lane-body">' + (items.length ? items.map(function (item) { return renderItem(item, type); }).join("") : '<p class="policy-lane-empty">' + empty + '</p>') + '</div></section>';
  }

  function renderTopic(topic, context, embedded) {
    var contextLabel = context === "account" ? "계정 관리 화면" : context === "admin" ? "관리자 화면" : "예약 화면";
    return '<section class="policy-topic"' + (embedded ? "" : ' id="policy-topic" role="tabpanel" aria-labelledby="policy-key-' + topic.key + '"') + '><header class="policy-topic-head"><div><small>' + topic.key + ' · ' + contextLabel + '</small><h3>' + escapeHtml(topic.title) + '</h3><p>' + escapeHtml(topic.summary) + '</p></div><span>정책 → FE → BE</span></header><div class="policy-lanes">' + renderLane("service", "서비스 정책", topic.service) + renderLane("frontend", "화면 동작", topic.fe) + renderLane("backend", "서버 처리", topic.be) + '</div></section>';
  }

  function targetSelectors(context) {
    if (context === "account") return {
      "ACC-01": ".account-toolbar",
      "ACC-02": "#issue-account",
      "ACC-03": ".account-policy-note",
      "ACC-04": ".account-metrics"
    };
    return context === "admin" ? {
      "ADM-01": '[data-admin-view="reservations"]',
      "ADM-02": "#add-product",
      "ADM-03": ".row-sessions",
      "ADM-04": "#discount-settings",
      "ADM-05": "#cancel-selected",
      "ADM-06": "#bulk-cancel",
      "ADM-07": '[data-admin-view="settlement"]',
      "ADM-08": "#scope-button"
    } : {
      "RSV-01": "#reservation-login",
      "RSV-02": "#date-picker",
      "RSV-03": ".product-options > .option-field:nth-child(3)",
      "RSV-04": "#booking-quantity-discount",
      "RSV-05": "#add-to-cart",
      "RSV-06": "#book-now",
      "RSV-07": "#ticket-list",
      "RSV-08": "#member-withdraw",
      "RSV-09": "#header-logout"
    };
  }

  function createInspector(context, topics) {
    var allTopics = topics.slice();
    var selectors = targetSelectors(context);
    var markerLayer = document.createElement("div");
    markerLayer.className = "policy-marker-layer";
    var panel = document.createElement("aside");
    panel.className = "policy-inspector";
    panel.setAttribute("aria-label", "개발 정책 안내");
    panel.hidden = true;
    document.body.append(markerLayer, panel);
    var activeTopic = null;

    function currentPageTopicKeys() {
      if (context === "account") return ["ACC-01", "ACC-02", "ACC-03", "ACC-04"];
      if (context === "admin") {
        var view = document.querySelector(".admin-view:not([hidden])");
        var viewName = view && view.dataset.view;
        if (viewName === "reservations") return ["ADM-01", "ADM-05", "ADM-06"];
        if (viewName === "programs" || viewName === "program-edit") return ["ADM-02", "ADM-04"];
        if (viewName === "program-sessions" || viewName === "operations") return ["ADM-03"];
        if (viewName === "settlement") return ["ADM-07"];
        return ["ADM-08"];
      }
      var ticketScreen = document.getElementById("my-tickets-screen");
      if (!ticketScreen || ticketScreen.hidden) {
        var stage = document.querySelector("[data-booking-step]:not([hidden])");
        var step = stage && Number(stage.dataset.bookingStep);
        if (step === 4) return ["RSV-05"];
        if (step === 2) return ["RSV-06"];
        if (step === 3) return ["RSV-07"];
        return ["RSV-02", "RSV-03", "RSV-04"];
      }
      return ["RSV-07", "RSV-08", "RSV-09"];
    }

    function syncTopics() {
      var keys = currentPageTopicKeys();
      topics = allTopics.filter(function (topic) { return keys.indexOf(topic.key) !== -1; });
      activeTopic = null;
    }

    function visibleTarget(topic) {
      var target = document.querySelector(selectors[topic.key]);
      if (!target || target.closest("[hidden]") || getComputedStyle(target).display === "none") return null;
      var rect = target.getBoundingClientRect();
      return rect.width && rect.height && rect.bottom > 0 && rect.top < innerHeight ? target : null;
    }

    function positionMarkers() {
      if (!document.body.classList.contains("policy-inspector-on")) return;
      document.querySelectorAll(".policy-target").forEach(function (target) { target.classList.remove("policy-target"); });
      markerLayer.querySelectorAll("[data-policy-marker]").forEach(function (marker) {
        var topic = topics[Number(marker.dataset.policyMarker)];
        var target = visibleTarget(topic);
        if (!target) { marker.hidden = true; return; }
        var rect = target.getBoundingClientRect();
        var panelRect = panel.getBoundingClientRect();
        var markerLeft = rect.right - 12;
        if (!panel.hidden && rect.right > panelRect.left && rect.left < panelRect.left) markerLeft = panelRect.left - 14;
        target.classList.add("policy-target");
        marker.hidden = false;
        marker.style.left = Math.min(innerWidth - 28, Math.max(8, markerLeft)) + "px";
        marker.style.top = Math.min(innerHeight - 28, Math.max(8, rect.top - 10)) + "px";
      });
    }

    function renderIndex() {
      activeTopic = null;
      panel.classList.remove("is-detail");
      var policyTitle = context === "account" ? "계정 정책" : context === "admin" ? "관리 정책" : "예약 정책";
      panel.innerHTML = '<header><div><b>P</b><span><strong>' + policyTitle + ' ' + topics.length + '개</strong><small>표시된 영역을 누르면 상세가 열립니다.</small></span></div><button type="button" data-policy-close aria-label="정책 보기 종료">종료</button></header><nav class="policy-inspector-list" aria-label="현재 화면 정책">' + topics.map(function (topic, index) {
        return '<button type="button" data-inspector-topic="' + index + '"><small>' + topic.key + '</small><strong>' + escapeHtml(topic.title) + '</strong><span>' + escapeHtml(topic.summary) + '</span></button>';
      }).join("") + '</nav><footer><span>정책 키 클릭 또는 <kbd>Alt</kbd>+<kbd>P</kbd></span><div class="policy-inspector-actions"><button type="button" data-policy-all>전체 정책 보기</button><button type="button" data-policy-close>정책 보기 종료</button></div></footer>';
      panel.querySelectorAll("[data-policy-close]").forEach(function (button) { button.addEventListener("click", close); });
      panel.querySelector("[data-policy-all]").addEventListener("click", openAllPolicies);
      panel.querySelectorAll("[data-inspector-topic]").forEach(function (button) {
        button.addEventListener("click", function () { showTopic(Number(button.dataset.inspectorTopic)); });
      });
    }

    function showTopic(index) {
      activeTopic = index;
      var topic = topics[index];
      panel.classList.add("is-detail");
      panel.innerHTML = '<header><button class="policy-inspector-back" type="button" aria-label="정책 목록으로">‹</button><div><small>' + topic.key + '</small><strong>' + escapeHtml(topic.title) + '</strong></div><button type="button" data-policy-close aria-label="상세 닫기">×</button></header><div class="policy-inspector-detail">' + renderTopic(topic, context, true) + '</div><footer><span>' + topic.key + ' · FE와 BE 연결 정책</span><div class="policy-inspector-actions"><button type="button" data-policy-all>전체 정책 보기</button><button type="button" data-policy-index>목록 보기</button></div></footer>';
      panel.querySelector("[data-policy-close]").addEventListener("click", renderIndex);
      panel.querySelector(".policy-inspector-back").addEventListener("click", renderIndex);
      panel.querySelector("[data-policy-index]").addEventListener("click", renderIndex);
      panel.querySelector("[data-policy-all]").addEventListener("click", openAllPolicies);
      panel.scrollTop = 0;
    }

    function openAllPolicies() {
      var dialog = document.getElementById("developer-policy-dialog");
      close();
      if (dialog && !dialog.open) dialog.showModal();
    }

    function buildMarkers() {
      markerLayer.replaceChildren();
      topics.forEach(function (topic, index) {
        var marker = document.createElement("button");
        marker.type = "button"; marker.className = "policy-marker"; marker.dataset.policyMarker = index;
        marker.setAttribute("aria-label", topic.key + " " + topic.title + " 정책 보기"); marker.textContent = "P";
        marker.addEventListener("click", function () { showTopic(index); });
        markerLayer.append(marker);
      });
      positionMarkers();
    }

    function open(index) {
      syncTopics();
      document.body.classList.add("policy-inspector-on");
      panel.hidden = false; markerLayer.hidden = false;
      buildMarkers();
      if (typeof index === "number") showTopic(index); else renderIndex();
    }

    function close() {
      document.body.classList.remove("policy-inspector-on");
      panel.hidden = true; markerLayer.hidden = true; activeTopic = null;
      document.querySelectorAll(".policy-target").forEach(function (target) { target.classList.remove("policy-target"); });
    }

    document.addEventListener("click", function (event) {
      if (!document.body.classList.contains("policy-inspector-on") || event.target.closest(".policy-inspector,.policy-marker")) return;
      var selected = topics.findIndex(function (topic) {
        var target = document.querySelector(selectors[topic.key]);
        return target && target.classList.contains("policy-target") && target.contains(event.target);
      });
      if (selected < 0) return;
      event.preventDefault(); event.stopImmediatePropagation(); showTopic(selected);
    }, true);
    window.addEventListener("scroll", positionMarkers, true);
    window.addEventListener("resize", positionMarkers);
    document.addEventListener("click", function () { requestAnimationFrame(positionMarkers); }, true);
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape" || !document.body.classList.contains("policy-inspector-on")) return;
      if (activeTopic !== null) renderIndex(); else close();
    });
    function refresh() {
      syncTopics();
      if (document.body.classList.contains("policy-inspector-on")) { renderIndex(); buildMarkers(); }
      else positionMarkers();
    }
    return { open: open, close: close, toggle: function () { if (document.body.classList.contains("policy-inspector-on")) close(); else open(); }, show: showTopic, refresh: refresh };
  }

  document.querySelectorAll(".developer-policy-dialog").forEach(function (dialog) {
    var keys = dialog.querySelector(".developer-policy-keys");
    var body = dialog.querySelector(".developer-policy-body");
    if (!keys || !body) return;
    var context = document.body.classList.contains("account-admin-page") ? "account" : document.body.classList.contains("admin-page") ? "admin" : "booking";
    var topics = topicsFor(context);
    dialog.dataset.policyContext = context;
    keys.innerHTML = topics.map(function (topic, index) {
      return '<button type="button" id="policy-key-' + topic.key + '" role="tab" data-policy-index="' + index + '" aria-controls="policy-topic" aria-selected="' + (index === 0) + '"><b>' + topic.key + '</b><span>' + escapeHtml(topic.title) + '</span></button>';
    }).join("");
    keys.querySelectorAll("button").forEach(function (button, index) { button.tabIndex = index === 0 ? 0 : -1; });
    body.innerHTML = renderTopic(topics[0], context);

    keys.addEventListener("click", function (event) {
      var button = event.target.closest("[data-policy-index]");
      if (!button) return;
      var selected = Number(button.dataset.policyIndex);
      keys.querySelectorAll("[data-policy-index]").forEach(function (keyButton, index) {
        var active = index === selected;
        keyButton.setAttribute("aria-selected", String(active)); keyButton.tabIndex = active ? 0 : -1;
      });
      body.innerHTML = renderTopic(topics[selected], context);
      body.scrollTop = 0;
    });
    keys.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      var buttons = Array.from(keys.querySelectorAll("[data-policy-index]"));
      var next = (buttons.indexOf(document.activeElement) + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].click(); buttons[next].focus();
    });
    window.DeveloperPolicy = createInspector(context, topics);
  });

  document.addEventListener("keydown", function (event) {
    var shortcut = ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "e") || (event.altKey && !event.metaKey && !event.ctrlKey && event.key.toLowerCase() === "e");
    if (!shortcut) return;
    event.preventDefault();
    var gallery = new URL("empty-states.html", window.location.href);
    gallery.searchParams.set("from", window.location.href);
    window.location.href = gallery.href;
  });
})();
