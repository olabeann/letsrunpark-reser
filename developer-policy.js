(function () {
  "use strict";

  var policy = {
    frontend: {
      label: "FE 화면 로직",
      summary: "사용자·관리자 화면에서 무엇을 누르면 어떤 조건을 확인하고 무엇을 보여주는지 정리합니다.",
      groups: [
        { title: "사용자 예약 화면", eyebrow: "CUSTOMER FLOW", items: [
          ["로그인 · 예약 조회", "‘예약 조회’, ‘장바구니 담기’, ‘예약하기’를 클릭", "로그인이 없으면 소셜 로그인 창을 먼저 표시합니다. 네이버·카카오를 선택하면 해당 제공자 계정으로 식별합니다.", "로그인 성공 후 요청했던 화면으로 돌아가며 계정별 장바구니와 예약 내역만 불러옵니다.", "비회원 예약은 허용하지 않고 서로 다른 로그인 제공자의 계정은 자동 통합하지 않습니다."],
          ["체험 선택", "‘포니 타기’ 또는 ‘포니랑 놀기’를 클릭", "선택 프로그램의 노출 기간·판매 상태를 확인하고 가격, 이미지, 안내문, 운영 요일을 갱신합니다.", "기존 날짜·회차 선택은 새 프로그램 기준으로 다시 계산하고 예약 가능 회차만 보여줍니다.", "판매 중지 또는 노출 기간 밖인 프로그램은 예약 CTA를 활성화하지 않습니다."],
          ["날짜 선택", "달력에서 이용일을 클릭", "오늘부터 프로그램별 예약 가능 기간(기본 14일) 안인지, 운영 기간·요일과 판매 기간에 포함되는지 확인합니다.", "가능한 날짜만 선택되며 해당 날짜의 회차와 잔여 수량을 표시합니다.", "기간 밖·미운영 요일·판매 종료일은 비활성화하고 클릭해도 선택값을 바꾸지 않습니다."],
          ["회차 선택", "이용 시간을 클릭", "회차 판매 상태와 온라인 잔여 수량을 확인하고 같은 계정의 확정 예약·장바구니 시간과 겹치는지 검사합니다.", "가능한 회차만 선택하고 선택 요약과 결제 예정 금액을 즉시 갱신합니다.", "일부라도 시간이 겹치면 차단합니다. 앞 회차 종료와 다음 회차 시작 시각이 같으면 허용합니다."],
          ["인원 · 할인", "인원 +/− 또는 ‘과천시민 할인’을 클릭", "미체크 시 전 인원을 정상가로 최대 4명까지, 체크 시 전 인원을 50% 할인가로 최대 2명까지 선택합니다. 두 포니 프로그램의 같은 이용일 기존 예약·장바구니 사용량도 합산합니다.", "체크하면 2명을 넘는 인원은 2명으로 조정하고, 체크 해제하면 선택 인원은 유지한 채 정상가와 최대 4명 기준으로 금액·버튼 상태를 다시 계산합니다.", "남은 할인 수량을 초과하면 담기·결제 검증에서 차단합니다. 할인 체크만으로 증빙이 완료되지는 않으며 현장 확인 대상임을 계속 안내합니다."],
          ["장바구니 담기", "날짜·회차·인원 선택 후 ‘장바구니 담기’를 클릭", "로그인, 필수 선택값, 단일 이용일, 계정별 하루 수량, 시간 중복, 할인 사용량을 검사합니다.", "통과하면 계정 장바구니에 추가하고 헤더 수량과 합계 금액을 갱신합니다.", "같은 프로그램·날짜·회차를 다시 담으면 새 수량과 할인 선택으로 교체합니다. 담기만으로 재고를 확정하지 않습니다."],
          ["바로 예약", "‘예약하기’를 클릭", "장바구니 담기와 같은 조건을 검사하고 선택 상품을 장바구니에 반영합니다.", "통과하면 장바구니를 거쳐 예약 내용 확인 화면으로 이동합니다.", "다른 이용일 상품이 있거나 기존 예약과 충돌하면 이동하지 않고 이유를 화면에 표시합니다."],
          ["장바구니 수정", "장바구니에서 +/− 또는 삭제를 클릭", "변경 뒤에도 수량·단일 이용일·시간 중복·할인 한도를 다시 확인합니다.", "상품 금액, 할인 금액, 총액과 주문 버튼 활성 상태를 갱신합니다.", "검증 오류가 있으면 메시지를 보여주고 ‘주문하기’를 비활성화합니다."],
          ["주문하기 · 결제", "‘N개 상품 주문하기’ 후 약관 동의 및 ‘결제하기’를 클릭", "결제 직전 최신 장바구니와 계정·재고·시간 충돌·할인 사용량을 다시 검사합니다. 약관 동의가 없으면 진행하지 않습니다.", "성공하면 통합 결제번호를 만들고 프로그램·회차별 티켓을 표시합니다.", "확인 화면 진입 후 장바구니가 바뀌면 약관 동의를 해제합니다. 처리 중 중복 클릭은 막습니다."],
          ["내 티켓", "‘내 티켓 보기’ 또는 예약 목록의 티켓을 클릭", "로그인 계정의 유효 예약만 조회하고 이용 시각 기준으로 예정·입장 가능·종료 상태를 계산합니다.", "같은 프로그램·같은 회차의 복수 인원은 한 티켓에 인원수로 표시합니다.", "다른 프로그램 또는 다른 회차는 별도 티켓이며 취소된 티켓은 유효 인원에서 제외합니다."],
          ["티켓 취소 · 입장", "티켓의 ‘예약 취소’ 또는 입장 상태를 확인", "본인 예약, 유효 인원, 프로그램별 취소 마감과 현재 취소·환불·입장 상태를 확인합니다.", "취소 가능 대상과 예상 환불액을 보여주고, 입장 대기·가능·종료·취소 상태를 구분합니다.", "사용자 직접 부분취소, 나눠 입장, 증빙 실패와 사용 처리 방식은 정책 확정 전 임의로 제공하지 않습니다."]
        ]},
        { title: "운영 관리자 화면", eyebrow: "ADMIN FLOW", items: [
          ["예약 검색 · 상세", "검색/필터를 변경하거나 예약 행을 클릭", "권한의 조회 범위 안에서 예약번호·지역·부서·날짜·프로그램·상태 조건을 적용합니다.", "목록을 갱신하고 행 클릭 시 인원별 티켓, 결제 정보, 처리 이력을 엽니다.", "다른 부서 데이터는 조회만 가능하며 수정·취소 버튼은 권한에 따라 제한해야 합니다."],
          ["프로그램 판매 상태", "프로그램 목록의 ‘판매중/숨김’을 클릭", "프로그램 수정 권한과 담당 부서 범위를 확인합니다.", "판매중이면 사용자 화면에 노출하고 숨김이면 신규 예약 화면에서 제외합니다.", "상태 변경은 기존 예약과 결제 당시 상품 정보에 영향을 주지 않습니다."],
          ["프로그램 저장", "‘새 프로그램’ 또는 ‘수정’ 후 저장을 클릭", "명칭, 지역·부서, 운영/노출/판매 기간, 요일, 가격, 취소 마감, 적용 할인 값을 검증합니다.", "저장 후 해당 프로그램의 회차 관리 화면으로 이동합니다.", "종료일이 시작일보다 빠른 값 등 잘못된 기간은 저장하지 않고 오류를 안내합니다."],
          ["회차 저장 · 상태 변경", "‘회차 등록/수정’, ‘판매중/숨김’을 클릭", "종료 시간이 시작보다 늦고 온라인 판매 수량이 1명 이상인지 확인합니다.", "시간순으로 회차명을 자동 부여하고 사용자 화면의 선택 가능 회차에 반영합니다.", "현장 재고와 안내문은 회차 입력값으로 받지 않습니다. 기존 예약보다 수량을 낮출 때는 충돌 안내가 필요합니다."],
          ["할인 저장", "‘할인 관리’에서 추가/수정 후 저장을 클릭", "할인명, 정률 1~100% 또는 정액 1원 이상, 적용 기간, 최대 수량, 대상 프로그램을 검증합니다.", "활성 할인만 신규 예약 가격 계산에 사용합니다.", "과천시민 할인은 50%·하루 2매·현장 증빙으로 고정하며 변경은 기존 주문 스냅샷을 바꾸지 않습니다."],
          ["선택 티켓 취소", "예약 상세에서 인원을 선택하고 ‘선택 취소·환불’을 클릭", "유효 티켓, 한 명 이상 선택, 취소 사유와 환불 권한을 확인합니다.", "선택 인원의 배분 결제액만 환불하고 나머지 예약을 유지하며 이력을 추가합니다.", "모두 취소되면 ‘취소 완료’, 일부면 ‘부분 취소’로 표시합니다."],
          ["회차 운영 취소", "‘기상·운영상 회차 취소’를 클릭하고 확정", "지역·이용일·프로그램·회차·사유와 운영 취소 권한을 확인합니다.", "대상 회차의 유효 예약을 일괄 취소하고 전액 환불 처리 결과를 기록합니다.", "실행 전 대상 예약 수와 환불액을 확인하는 단계가 필요합니다."],
          ["내보내기 · 정산", "‘CSV 다운로드’ 또는 정산 조회를 클릭", "현재 필터, 정산 권한, 서비스 완료일, 지역·부서·프로그램 범위를 적용합니다.", "화면과 동일 범위의 자료를 내려받고 지급 예정액을 표시합니다.", "개인정보 다운로드 이력을 남기고 미확정 정산값은 확정값처럼 표시하지 않습니다."]
        ]}
        ,{ title: "위이 계정 관리 화면", eyebrow: "ACCOUNT ADMIN", items: [
          ["계정 검색 · 조회", "지역 필터 또는 계정 검색어를 변경", "통합 관리자 권한으로 지역·부서·로그인 ID 조건을 적용합니다.", "조건에 맞는 계정, 권한, 최근 접속과 사용 상태를 표시합니다.", "일반 부서 계정에는 계정 발급 화면과 다른 계정의 보안 정보를 노출하지 않습니다."],
          ["부서 계정 발급 · 재설정", "‘부서 계정 발급’ 또는 ‘계정 설정’을 클릭 후 저장", "지역·부서, 중복되지 않는 로그인 ID, 신규/재발급 비밀번호와 부서당 공용 계정 1개 원칙을 검증합니다.", "계정과 초기 권한을 저장하고 임시 비밀번호는 저장 완료 후 다시 표시하지 않습니다.", "통합 관리자 계정은 일반 부서 계정 화면에서 소속과 필수 권한을 임의 변경할 수 없습니다."],
          ["기능 권한 설정", "프로그램·예약·환불·정산 권한을 선택", "취소·환불 권한에는 예약·결제 조회 권한이 함께 있는지 확인합니다.", "전체 프로그램 조회는 기본 제공하고, 변경 작업은 계정의 담당 부서와 선택 권한 안에서만 활성화합니다.", "화면에서 버튼을 숨기는 것만으로 권한 처리가 끝난 것으로 보지 않습니다."],
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
          ["장바구니 견적", "담기/수량 변경/주문 화면 진입 시 견적 요청", "상품·회차 ID, 수량, 단일 이용일, 하루 4매, 시간 중복, 활성 할인·기간·대상·사용량을 서버 데이터로 계산합니다.", "단가·할인 배분·총액을 포함한 서버 견적을 반환합니다.", "클라이언트 가격·할인액은 무시하고 불일치는 오류 코드와 사용자용 사유로 반환합니다."],
          ["결제 사전 검증", "결제하기 클릭 후 주문 생성 요청", "최신 회차 상태, 온라인 재고, 기존 확정 예약+새 주문 수량, 시간 충돌, 할인 사용량을 잠금 상태에서 재검사합니다.", "통과 건만 결제 준비 주문을 만들고 PG 요청 금액을 확정합니다.", "동시 요청으로 재고가 바뀌면 409와 최신 잔여 수량을 반환합니다."],
          ["주문 확정 트랜잭션", "PG 승인 결과 검증 성공", "PG 결제번호·금액·상태와 주문을 대조하고 멱등키/PG 번호 중복을 검사합니다.", "재고 차감, 주문 확정, 티켓 발급, 할인 사용량 기록을 한 트랜잭션으로 커밋합니다.", "실패하면 전체 롤백하고 재시도에는 기존 성공 결과를 반환해 중복 결제·예약을 막습니다."],
          ["주문 스냅샷 · 티켓", "주문 확정 시", "프로그램명, 지역·부서, 이용일·회차, 정가, 할인 정책/금액, 결제액을 주문 항목에 복사합니다.", "이후 프로그램·회차·할인이 수정되어도 과거 주문과 정산은 유지됩니다.", "표시는 회차별로 묶되 부분취소를 위해 인원별 티켓과 금액 배분값을 보관합니다."],
          ["시간 충돌 판정", "견적과 결제 사전 검증 시", "같은 계정의 유효 예약과 새 주문을 [시작, 종료) 구간으로 비교합니다.", "일부라도 겹치면 거절하고 종료 시각과 다음 시작 시각이 같으면 허용합니다.", "종료가 없는 레거시 투어 데이터는 정의된 80분 소요 시간을 적용합니다."],
          ["취소 · 환불", "사용자 또는 관리자가 전체/부분 취소 요청", "소유권/권한, 취소 마감, 티켓 상태, 환불 가능액, PG 취소 가능 여부를 검사합니다.", "선택 티켓 금액만 PG 부분취소하고 상태, 환불 누계, 처리자·사유·시각을 기록합니다.", "PG 결과가 불명확하면 완료 처리하지 않고 ‘확인 필요’로 두어 재조회합니다."],
          ["할인·구매 수량 복원", "취소/환불 완료 후 사용량 재계산", "정책별 복원 설정과 취소 티켓 수량을 기준으로 할인·구매 한도 사용량을 계산합니다.", "확정 정책에 따라 사용 가능 수량을 복원하거나 유지합니다.", "현재 고객사 결정 전 항목이므로 정책 값을 코드에 고정하지 않습니다."],
          ["결제 결과 조회 · 복구", "PG 응답 지연, 화면 이탈, 웹훅 중복 또는 승인 후 저장 실패", "주문·결제 시도 식별자와 PG 거래를 조회하고 이미 처리한 이벤트인지 확인합니다.", "성공 상태를 복구하거나 원 승인을 취소하고 사용자가 주문 내역에서 최종 결과를 확인하게 합니다.", "응답이 불명확한 상태를 실패로 단정해 새 결제를 유도하지 않으며 과거 상태로 되돌리지 않습니다."],
          ["티켓 사용 · 알림", "입장 처리 또는 예약·취소·운영 변경 알림 발생", "유효·취소·사용 상태와 처리 권한을 확인하고 알림 대상·채널·재시도 정책을 적용합니다.", "입장 이력과 알림 성공·실패를 예약 처리 결과와 분리해 기록합니다.", "알림 실패만으로 예약이나 환불을 취소하지 않으며 중복 입장 방지 방식은 확정 정책을 따릅니다."]
        ]},
        { title: "관리 · 운영 API", eyebrow: "ADMIN API", items: [
          ["관리자 권한", "모든 관리자 조회·저장·취소·다운로드 요청", "계정의 지역·부서 범위와 프로그램, 예약, 환불, 정산 권한을 요청마다 확인합니다.", "허용 범위만 처리하고 계정과 변경 전후 값을 감사 로그에 남깁니다.", "FE에서 버튼을 숨겨도 API가 재검증하며 위반 요청은 403으로 거절합니다."],
          ["프로그램 · 회차 저장", "프로그램/회차 생성·수정·상태 변경", "필수값, 기간·시간 순서, 수량, 지역·부서·할인 관계를 검증합니다.", "프로그램 → 회차 템플릿 → 날짜별 실제 회차 구조로 외래키 연결해 저장합니다.", "이미 판매된 회차 변경은 예약 영향과 재고 부족을 검사하고 충돌 시 저장을 막습니다."],
          ["할인 정책 저장", "할인 추가/수정/비활성화", "정률·정액, 상한, 적용 수량/집계, 기간, 프로그램, 증빙 방식과 권한을 검증합니다.", "정책과 프로그램 관계 데이터로 저장해 신규 견적에 반영합니다.", "과거 주문은 스냅샷을 사용하며 과천시민 고정값 변경은 별도 상위 권한이 필요합니다."],
          ["회차 일괄 취소", "운영 취소 확정 요청", "회차를 잠그고 유효 예약·결제, 환불 예정액, 중복 실행 여부를 조회합니다.", "예약별 PG 취소 결과, 회차 중지, 티켓 취소, 알림 대상, 감사 이력을 기록합니다.", "일부 PG 실패를 전체 성공으로 표시하지 않고 건별로 재처리 가능하게 합니다."],
          ["정산 집계", "기간별 정산 조회 또는 파일 생성", "서비스 완료일 기준으로 환불 완료액과 PG 수수료를 반영해 지역·부서·프로그램별 집계합니다.", "권한 범위의 결제액, 환불액, 수수료, 지급 예정액과 근거 주문을 반환합니다.", "지급일·투어 예외 차감 방식은 확정 전이므로 ‘예상’으로 구분합니다."],
          ["민감정보 · 비밀번호", "관리자 계정 발급/재발급 및 개인정보 조회", "비밀번호는 단방향 해시, 개인정보는 최소 권한·마스킹·접근 로그를 적용합니다.", "임시 비밀번호는 최초 로그인 변경 대상으로 발급하고 저장 후 원문을 노출하지 않습니다.", "분실 시 기존 비밀번호 조회가 아니라 새 임시 비밀번호 재발급만 허용합니다."],
          ["계정 수명주기 · 감사", "계정 발급, 권한 변경, 비밀번호 재발급 또는 사용 중지", "통합 관리자 권한과 부서당 계정 제한, 권한 의존 관계를 검증합니다.", "중지 계정의 기존 세션을 만료하고 관리자 ID·지역·부서·시각·변경 전후 값·사유를 기록합니다.", "공용 계정은 개인 처리자를 식별하지 못하므로 운영 인계와 감사 한계를 별도로 관리합니다."],
          ["운영 보안 · 복구", "배포, 장애, 백업 복구 또는 대량 작업", "운영/테스트 환경 분리, HTTPS, 접근 통제, 비밀정보 노출, 백업과 복구 가능성을 점검합니다.", "장애와 대량 작업 결과를 추적하고 신규 판매 중단 중에도 기존 티켓·취소·환불 처리 방침을 적용합니다.", "성능·보관 기간·복구 목표와 공공기관 보안 요건은 승인된 운영 기준 없이는 확정값으로 표시하지 않습니다."]
        ]},
        { title: "아직 확정이 필요한 정책", eyebrow: "DECISION REQUIRED", pending: true, items: [
          ["D-01 상품 운영값", "상품 등록·예약 노출·견적 계산 전", "가격, 운영일, 예약 오픈 범위, 회차 길이와 상품별 인원·할인 한도를 확정해야 합니다.", "승인값을 프로그램 설정과 검수 사례에 반영합니다.", "시연의 5,000/4,000원·주말·14일 값은 전 상품 공통값이 아닙니다."],
          ["D-02 시간 충돌 범위", "다른 지역 또는 연속 회차를 예약할 때", "지역 간 충돌 적용, 이동·준비시간과 종료=다음 시작 허용 여부를 확정해야 합니다.", "충돌 그룹과 시간 계산 기준에 반영합니다.", "현재 시연은 [시작, 종료) 기준으로 종료와 다음 시작이 같으면 허용합니다."],
          ["D-03 사용자 취소 범위", "사용자가 전체·부분취소를 요청할 때", "기본 마감은 이용 시작 10분 전이며 프로그램별 예외값과 인원 선택형 부분취소 제공 여부를 확정해야 합니다.", "버튼 노출, 서버 마감 검사와 안내 문구에 반영합니다.", "기본값과 프로그램별 승인값을 구분하고 서버 요청 접수 시각을 기준으로 검사합니다."],
          ["D-04 환불 · 할인 계산", "부분취소와 할인 증빙 실패가 발생할 때", "할인 유지/재계산, 금액 배분·반올림, 수수료, 사용량 복원과 증빙 실패 처리 기준이 필요합니다.", "PG 환불액·티켓·할인 사용량을 같은 승인 기준으로 갱신합니다.", "차액 결제나 이용 제한을 임의로 자동 처리하지 않습니다."],
          ["D-05 입장 · 인원 식별", "티켓을 표시하거나 현장에서 사용할 때", "참석자 정보 수집, QR/직원 확인, 나눠 입장, 사용 취소와 노쇼 기준을 확정해야 합니다.", "입장 담당 화면과 개별 티켓 상태에 반영합니다.", "움직이는 티켓 표현만으로 실제 사용·중복 입장을 보장하지 않습니다."],
          ["D-06 정원 점유 · 복구", "장바구니, 결제 대기, 취소 처리 중", "장바구니의 정원 점유 여부·만료, 공유 정원과 환불 중 재판매 시점을 확정해야 합니다.", "재고 잠금, 만료, 실패 복구와 상태 화면에 반영합니다.", "늦은 승인과 취소 처리 중에는 초과 발급이 생기지 않아야 합니다."],
          ["D-07 혼합 주문 범위", "다른 지역·부서 상품을 한 번에 결제할 때", "허용 조합, PG 계약, 정산 귀속과 부서별 취소 권한을 확정해야 합니다.", "장바구니 조합 제한과 주문 분배 구조에 반영합니다.", "현재 두 포니 상품의 일괄결제가 모든 지역 조합을 허용한다는 뜻은 아닙니다."],
          ["D-08 관리자 권한 범위", "타 부서 데이터 조회·다운로드·취소 요청", "프로그램, 개인정보, 매출, 환불, 다운로드와 예외 승인 권한을 역할별로 확정해야 합니다.", "역할×데이터×행동 권한표와 API 검사에 반영합니다.", "타 부서 프로그램 조회가 예약자 개인정보 조회까지 뜻하지 않습니다."],
          ["D-09 회원 · 개인정보", "소셜 계정 연결, 탈퇴 또는 개인정보 처리", "네이버·카카오 계정 통합, 수집 항목, 동의, 보관·삭제와 거래 이력 유지 기준이 필요합니다.", "회원 연결과 보존 정책에 반영합니다.", "현재는 제공자가 다르면 별도 계정이며 동일인 전체 제한과는 다릅니다."],
          ["D-10 정산 기준", "월 마감·환불·보고서 생성", "정산일, 집계 기준, 환불 귀속 월, 수수료·세금·반올림 기준을 확정해야 합니다.", "확정 전 금액은 예상으로, 승인 후 배치와 자료 산식에 반영합니다.", "결제일과 서비스 완료일을 혼용하지 않습니다."],
          ["D-11 PG 운영 · 전환", "결제 수단 연결 또는 PG 전환", "실제 PG, MID, 부분취소 조건과 과거 거래 환불·구 PG 접근 기준을 확정해야 합니다.", "결제 라우팅과 복구 절차에 반영합니다.", "기술 참고 문서가 특정 PG 채택을 의미하지 않습니다."],
          ["D-12 알림", "예약·취소·운영 변경 시", "SMS·알림톡·이메일·웹 알림의 대상, 시점, 실패 재시도와 비용을 확정해야 합니다.", "알림 큐와 사용자 상태 안내에 반영합니다.", "연락 채널 미확정 상태에서 발송 완료를 가정하지 않습니다."],
          ["D-13 보안 · 운영", "실서비스 배포와 개인정보 처리 전", "공공기관 보안, 접근·보관·삭제, 백업, 모니터링과 장애 복구 목표를 확정해야 합니다.", "인프라·운영 검수와 감사 기준에 반영합니다.", "프로토타입의 브라우저 저장은 운영 보안 구현이 아닙니다."],
          ["D-14 오픈 범위 · 검수", "지역·상품·CTA를 공개할 때", "실제 오픈 대상, 순서, 연동 준비, QA·승인 일정과 지원 환경을 확정해야 합니다.", "단계별 공개와 완료 기준에 반영합니다.", "두 상품 시연이나 과거 일정 의견을 전체 구축 완료로 표시하지 않습니다."]
        ]}
      ]
    }
  };

  var servicePolicy = {
    "RSV-01": [
      ["회원 예약 원칙", "상품 조회는 누구나, 장바구니·예약·티켓은 로그인 회원에게 적용", "네이버·카카오 간편로그인만 사용하고 비회원 예약은 허용하지 않습니다.", "로그인 제공자와 제공자 회원 식별자 조합으로 예약 데이터를 분리합니다.", "서로 다른 제공자 계정의 동일인 통합 여부는 D-09 확정 전 자동 처리하지 않습니다."]
    ],
    "RSV-02": [
      ["프로그램 노출 · 판매", "상품 목록, 상세, 날짜 선택", "노출 기간에는 상품을 보여주되 운영·판매 기간과 판매 상태를 별도로 판단합니다.", "예약 가능한 이용일은 판매 기간 안에서 오늘 기준 향후 14일까지 제공합니다.", "숨김 상품은 신규 예약 화면에서 제외하고 기존 예약·티켓은 유지합니다."]
    ],
    "RSV-03": [
      ["예약 시간 중복", "같은 계정의 확정 예약과 장바구니 전체", "같은 충돌 그룹의 이용 구간이 일부라도 겹치면 프로그램과 인원 수에 관계없이 차단합니다.", "[시작, 종료) 기준이므로 앞 회차 종료와 다음 회차 시작이 같으면 허용합니다.", "지역 간 범위와 이동·준비시간은 D-02에서 확정합니다."]
    ],
    "RSV-04": [
      ["이용일 구매 한도", "포니 타기·포니랑 놀기 합산", "같은 계정은 이용일 하루에 두 프로그램을 합쳐 최대 4매까지 구매할 수 있습니다.", "주문을 나눠 결제해도 같은 이용일의 유효 예약과 현재 장바구니를 합산합니다.", "다른 이용일에는 한도가 새로 시작되며 취소 후 수량 복원은 D-04에서 확정합니다."],
      ["과천시민 할인 미체크", "할인 체크박스가 선택되지 않은 인원", "선택 인원 전부를 정상가로 계산하고 과천시민 할인 사용량을 차감하지 않습니다.", "회차 잔여 수량과 이용일 구매 한도 안에서 최대 4명까지 선택할 수 있습니다.", "결제 후 임의로 시민 할인을 소급 적용하지 않습니다."],
      ["과천시민 할인 체크", "할인 체크박스를 선택한 인원", "선택 인원 전부에 50%를 적용하며 두 포니 프로그램을 합쳐 계정별 이용일 하루 최대 2매입니다.", "체크하는 즉시 인원을 최대 2명으로 조정하고 견적·장바구니·결제 단계에서 남은 할인 수량을 다시 검사합니다.", "체크는 증빙 완료를 뜻하지 않습니다. 현장 증빙 실패 처리는 D-04·D-05 확정 전 자동 처리하지 않습니다."]
    ],
    "RSV-05": [
      ["장바구니 구성", "로그인 회원이 예약 옵션을 담을 때", "한 장바구니에는 하나의 이용일만 담고 그 날짜의 여러 상품·비중복 회차는 함께 결제할 수 있습니다.", "같은 상품·날짜·회차를 다시 담으면 별도 줄을 추가하지 않고 새 인원·할인 선택으로 교체합니다.", "다른 이용일은 기존 장바구니를 결제하거나 비운 뒤 담습니다."],
      ["장바구니와 재고", "담기 완료부터 결제 직전까지", "장바구니 저장만으로 예약이나 재고를 확정하지 않습니다.", "수량 변경·주문 진입·결제 직전에 가격, 할인, 회차 상태와 재고를 다시 확인합니다.", "정원 선점·만료 시간을 운영하려면 D-06 승인 후 별도 상태를 추가합니다."]
    ],
    "RSV-06": [
      ["주문 · 결제 확정", "장바구니 주문 또는 바로 예약", "한 주문에 여러 예약 항목을 포함하되 각 상품·이용일·회차 예약은 별도 식별자로 관리합니다.", "PG 승인 검증과 서버 저장이 모두 끝난 뒤에만 예약 완료와 티켓을 표시합니다.", "결제 버튼 클릭이나 완료 화면 노출만으로 성공으로 판단하지 않습니다."],
      ["결제 오류 · 복구", "중복 클릭, 화면 이탈, 응답 지연, 늦은 승인 또는 저장 실패", "같은 결제 시도는 한 번만 청구·발급하도록 멱등 처리합니다.", "주문 내역 조회로 최종 결과를 복구하고 필요하면 예약 복구 또는 원 승인 취소를 수행합니다.", "결과가 불명확하면 새 결제를 유도하지 않고 확인 필요 상태를 표시합니다."]
    ],
    "RSV-07": [
      ["티켓 표시 단위", "결제 완료된 예약 조회", "사용자는 상품·이용일·회차별 묶음 티켓 한 장에서 유효 인원을 확인합니다.", "관리자는 예약 인원별 개별 티켓으로 상태와 취소·환불 이력을 관리합니다.", "취소 완료 인원은 묶음 티켓의 유효 인원에서 제외합니다."],
      ["취소 · 입장", "사용자 취소 또는 현장 입장", "기본 취소 마감은 이용 시작 10분 전이며 취소 상태가 시간상 입장 가능 상태보다 우선합니다.", "취소 가능한 대상·예상 환불액과 입장 대기·가능·종료 상태를 구분합니다.", "사용자 직접 부분취소, 나눠 입장, 노쇼와 현장 증빙 실패는 D-03~D-05에서 확정합니다."]
    ],
    "ADM-01": [["예약 운영 권한", "예약 목록과 상세", "전체 프로그램 조회와 예약자·결제 정보 조회 권한을 구분합니다.", "허용된 지역·부서·기능 범위의 예약만 조회·처리합니다.", "다른 부서 프로그램 조회가 개인정보·취소 권한을 의미하지 않습니다."]],
    "ADM-02": [["프로그램 수명주기", "등록·수정·판매중·숨김", "신규 판매 상태와 과거 주문 스냅샷을 분리합니다.", "숨김은 신규 노출만 중단하고 기존 예약·결제·티켓은 보존합니다.", "실제 오픈 상품과 CTA는 D-14에서 확정합니다."]],
    "ADM-03": [["회차 운영", "반복 회차와 날짜별 실제 회차", "온라인 정원은 현장 키오스크 수량과 독립적으로 관리합니다.", "기존 예약이 있는 회차 변경은 영향과 재고를 확인한 뒤 처리합니다.", "정원 축소·공유 자원·재판매 시점은 D-06에서 확정합니다."]],
    "ADM-04": [["할인 정책", "정률·정액 할인과 적용 프로그램", "할인은 프로그램과 분리해 신규 견적에 적용하고 결제 당시 값은 스냅샷으로 보존합니다.", "MVP는 티켓당 할인 하나만 허용합니다.", "증빙 실패·환불 후 사용량 복원·재계산은 D-04에서 확정합니다."]],
    "ADM-05": [["부분취소 · 부분환불", "관리자가 선택한 인원별 티켓", "선택한 티켓의 실제 배분 결제액만 환불하고 나머지 예약은 유지합니다.", "환불 누계, 티켓 상태, 유효 인원과 처리 이력을 함께 갱신합니다.", "PG 결과가 불명확하면 완료로 표시하거나 재판매하지 않습니다."]],
    "ADM-06": [["운영 취소", "기상·시설·안전 사유의 날짜별 회차", "실행 전 대상 예약과 환불 예정액을 확인하고 건별 결과를 관리합니다.", "회차 중지, 티켓 취소, 환불과 알림 대상을 연결해 기록합니다.", "일부 실패를 전체 성공으로 표시하지 않고 재처리 대상을 남깁니다."]],
    "ADM-07": [["매출 · 정산", "지역·부서·프로그램별 서비스 완료 건", "결제일이 아닌 서비스 제공 완료일 기준으로 결제액·환불액·PG 수수료·지급 예정액을 구분합니다.", "화면과 다운로드는 같은 필터와 산식을 사용합니다.", "지급일·세금·환불 귀속 월·PG 전환은 D-10·D-11 확정 전 예상으로 표시합니다."]],
    "ADM-08": [["관리자 보안", "모든 관리자 기능", "화면 노출과 무관하게 서버가 매 요청의 계정 상태·지역·부서·기능 권한을 검사합니다.", "개인정보 마스킹·접근 로그와 변경 이력을 남깁니다.", "공공기관 보안·보관·복구 기준은 D-13에서 확정합니다."]],
    "ACC-01": [["계정 관리 접근", "위이 통합 관리자", "부서 계정 발급과 다른 계정의 상태·권한 조회는 내부 운영 기능입니다.", "일반 부서 계정과 고객 예약 화면에는 접근 경로를 제공하지 않습니다.", "전체 관리자와 예외 승인 범위는 D-08에서 확정합니다."]],
    "ACC-02": [["부서 공용 계정", "지역·담당 부서별", "MVP는 부서당 공용 계정 1개와 별도 통합 관리자 계정을 발급합니다.", "임시 비밀번호는 최초 로그인 변경 대상으로 전달하고 저장 후 원문을 노출하지 않습니다.", "분실 시 기존 비밀번호 조회가 아닌 재발급만 허용합니다."]],
    "ACC-03": [["기능 권한", "프로그램·회차, 예약 조회, 취소·환불, 정산", "전체 프로그램 조회는 기본 제공하고 변경·처리는 소속 부서와 부여 권한 안에서만 허용합니다.", "취소·환불 권한은 예약·결제 조회 권한을 필수로 요구합니다.", "권한표와 개인정보 범위는 D-08 승인값을 따릅니다."]],
    "ACC-04": [["계정 중지 · 감사", "사용 중지, 권한 변경, 비밀번호 재발급", "사용 중지는 기존 로그인 세션까지 만료시킵니다.", "관리자 ID·지역·부서·시각·사유와 변경 전후 값을 기록합니다.", "공용 계정은 개인 처리자를 구분하지 못하므로 운영 인계와 감사 한계를 관리합니다."]]
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function renderItem(item, type) {
    var labels = type === "service" ? ["적용 범위", "정책 기준", "확정 내용", "예외 · 미정"] : type === "pending" ? ["결정 시점", "확인할 기준", "반영 위치", "주의"] : ["트리거", "조건 · 검증", "정상 결과", "예외 · 주의"];
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
    var pending = policy.backend.groups[2].items;
    if (context === "account") return withService([
      { key: "ACC-01", title: "계정 조회", summary: "통합 관리자 전용 계정 목록과 검색 범위", fe: [account[0]], be: [adminApi[0], adminApi[5]], pending: [pending[7], pending[12]] },
      { key: "ACC-02", title: "계정 발급 · 재설정", summary: "부서당 공용 계정 발급과 임시 비밀번호 처리", fe: [account[1]], be: [adminApi[5], adminApi[6]], pending: [pending[7], pending[12]] },
      { key: "ACC-03", title: "기능 권한", summary: "권한 의존 관계와 담당 부서별 API 접근 제어", fe: [account[2]], be: [adminApi[0], adminApi[6]], pending: [pending[7]] },
      { key: "ACC-04", title: "중지 · 보안 · 감사", summary: "세션 만료, 비밀번호 재발급과 변경 이력", fe: [account[3]], be: [adminApi[5], adminApi[6], adminApi[7]], pending: [pending[12]] }
    ]);
    if (context === "admin") return withService([
      { key: "ADM-01", title: "예약 조회 · 권한", summary: "예약 목록 조회부터 상세 열람, 부서별 접근 제어까지", fe: [admin[0]], be: [adminApi[0]], pending: [pending[7]] },
      { key: "ADM-02", title: "프로그램 관리", summary: "프로그램 판매 상태와 입력값 저장 정책", fe: [admin[1], admin[2]], be: [adminApi[1]], pending: [pending[0], pending[13]] },
      { key: "ADM-03", title: "회차 관리", summary: "회차 등록·수정·숨김과 기존 예약 영향", fe: [admin[3]], be: [adminApi[1]], pending: [pending[0], pending[5]] },
      { key: "ADM-04", title: "할인 관리", summary: "할인 정책 입력, 적용 범위와 과거 주문 보호", fe: [admin[4]], be: [adminApi[2]], pending: [pending[3], pending[4]] },
      { key: "ADM-05", title: "부분취소 · 환불", summary: "인원별 티켓 선택부터 PG 부분환불과 사용량 복원까지", fe: [admin[5]], be: [bookingApi[7], bookingApi[8], bookingApi[9]], pending: [pending[2], pending[3], pending[5]] },
      { key: "ADM-06", title: "회차 운영 취소", summary: "기상·시설·안전 사유의 일괄 취소 처리", fe: [admin[6]], be: [adminApi[3], bookingApi[10]], pending: [pending[5], pending[11]] },
      { key: "ADM-07", title: "내보내기 · 정산", summary: "권한 범위 CSV와 서비스 완료일 기준 정산", fe: [admin[7]], be: [adminApi[4]], pending: [pending[9], pending[10]] },
      { key: "ADM-08", title: "계정 · 보안", summary: "관리자 권한 검증과 비밀번호·개인정보 보호", fe: [], be: [adminApi[0], adminApi[5], adminApi[6], adminApi[7]], pending: [pending[7], pending[12]] }
    ]);
    return withService([
      { key: "RSV-01", title: "로그인 · 계정", summary: "소셜 로그인부터 계정별 예약 데이터 분리까지", fe: [customer[0]], be: [bookingApi[0]], pending: [pending[8]] },
      { key: "RSV-02", title: "프로그램 · 날짜", summary: "체험 선택과 예약 가능한 이용일 노출 기준", fe: [customer[1], customer[2]], be: [bookingApi[1]], pending: [pending[0], pending[13]] },
      { key: "RSV-03", title: "회차 · 시간 중복", summary: "잔여 회차 표시와 기존 예약·장바구니 충돌 판정", fe: [customer[3]], be: [bookingApi[1], bookingApi[6]], pending: [pending[1]] },
      { key: "RSV-04", title: "인원 · 할인", summary: "하루 구매 한도와 과천시민 할인 계산", fe: [customer[4]], be: [bookingApi[2]], pending: [pending[0], pending[3], pending[4]] },
      { key: "RSV-05", title: "장바구니", summary: "담기·수량 변경·삭제와 단일 이용일 정책", fe: [customer[5], customer[7]], be: [bookingApi[2]], pending: [pending[5], pending[6]] },
      { key: "RSV-06", title: "예약 · 결제", summary: "바로 예약부터 결제 직전 재검증과 주문 확정까지", fe: [customer[6], customer[8]], be: [bookingApi[3], bookingApi[4], bookingApi[5], bookingApi[9]], pending: [pending[5], pending[6], pending[10]] },
      { key: "RSV-07", title: "티켓 · 취소 · 입장", summary: "회차별 티켓 표시와 전체·부분취소·입장 처리", fe: [customer[9], customer[10]], be: [bookingApi[5], bookingApi[7], bookingApi[8], bookingApi[10]], pending: [pending[2], pending[3], pending[4], pending[11]] }
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
    var pendingHtml = topic.pending && topic.pending.length ? '<aside class="policy-decision"><strong>결정 필요</strong><div>' + topic.pending.map(function (item) { return renderItem(item, "pending"); }).join("") + '</div></aside>' : "";
    var contextLabel = context === "account" ? "계정 관리 화면" : context === "admin" ? "관리자 화면" : "예약 화면";
    return '<section class="policy-topic"' + (embedded ? "" : ' id="policy-topic" role="tabpanel" aria-labelledby="policy-key-' + topic.key + '"') + '><header class="policy-topic-head"><div><small>' + topic.key + ' · ' + contextLabel + '</small><h3>' + escapeHtml(topic.title) + '</h3><p>' + escapeHtml(topic.summary) + '</p></div><span>정책 → FE → BE</span></header><div class="policy-lanes">' + renderLane("service", "서비스 정책", topic.service) + renderLane("frontend", "화면 동작", topic.fe) + renderLane("backend", "서버 처리", topic.be) + '</div>' + pendingHtml + '</section>';
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
      "RSV-07": "#view-my-tickets"
    };
  }

  function createInspector(context, topics) {
    var selectors = targetSelectors(context);
    var markerLayer = document.createElement("div");
    markerLayer.className = "policy-marker-layer";
    var panel = document.createElement("aside");
    panel.className = "policy-inspector";
    panel.setAttribute("aria-label", "개발 정책 안내");
    panel.hidden = true;
    document.body.append(markerLayer, panel);
    var activeTopic = null;

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
      }).join("") + '</nav><footer><span>정책 키 클릭 또는 <kbd>Alt</kbd>+<kbd>P</kbd></span><button type="button" data-policy-close>정책 보기 종료</button></footer>';
      panel.querySelectorAll("[data-policy-close]").forEach(function (button) { button.addEventListener("click", close); });
      panel.querySelectorAll("[data-inspector-topic]").forEach(function (button) {
        button.addEventListener("click", function () { showTopic(Number(button.dataset.inspectorTopic)); });
      });
    }

    function showTopic(index) {
      activeTopic = index;
      var topic = topics[index];
      panel.classList.add("is-detail");
      panel.innerHTML = '<header><button class="policy-inspector-back" type="button" aria-label="정책 목록으로">‹</button><div><small>' + topic.key + '</small><strong>' + escapeHtml(topic.title) + '</strong></div><button type="button" data-policy-close aria-label="상세 닫기">×</button></header><div class="policy-inspector-detail">' + renderTopic(topic, context, true) + '</div><footer><span>' + topic.key + ' · FE와 BE 연결 정책</span><button type="button" data-policy-index>목록 보기</button></footer>';
      panel.querySelector("[data-policy-close]").addEventListener("click", renderIndex);
      panel.querySelector(".policy-inspector-back").addEventListener("click", renderIndex);
      panel.querySelector("[data-policy-index]").addEventListener("click", renderIndex);
      panel.scrollTop = 0;
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
    return { open: open, close: close, toggle: function () { if (document.body.classList.contains("policy-inspector-on")) close(); else open(); }, show: showTopic, refresh: positionMarkers };
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
})();
