(function () {
  "use strict";

  var reservationStoreKey = "ponylandBookingStoreV2";
  var adminStateKey = "letsrunPlayAdminDemoV3";
  var adminSessionKey = "letsrunPlayAdminSessionV1";
  var toastTimer;
  var activeReservation = null;
  var deletedReservationIds = [];
  var activeProgramKey = null;
  var activeSessionKey = null;
  var activeSettlementKey = null;
  var pendingImageDataUrl = null;
  var pendingDiscountAdditions = [];
  var pendingDiscountRemovals = [];
  var sessionProgramKey = null;
  var operationExceptions = [];
  var operationCalendarMonth = new Date(2026, 8, 1);
  var selectedOperationDateKey = null;
  var pendingOperationClosureAction = null;
  var pendingOperationClosureImpact = null;
  var pendingProgramDeletion = null;
  var reservationPage = 1;
  var reservationPageSize = 20;
  var organization = {
    "서울": ["홍보부", "브랜드총괄부", "발매운영부", "서울고객안전부", "공원화사업추진TF"],
    "부산경남": ["부산경주자원관리부", "부산고객안전부", "부산운영지원부"],
    "제주": ["제주경주자원관리부", "제주고객안전부", "제주운영지원부"]
  };
  var adminAccounts = [
    { id: "admin", password: "1234", name: "박지은 매니저", role: "통합 운영 관리자", scope: "all" },
    { id: "seoul", password: "seoul1234", name: "김서울 매니저", role: "서울 지역 관리자", scope: "region", region: "서울", department: "공원화사업추진TF" },
    { id: "busan", password: "busan1234", name: "이부산 매니저", role: "부산경남 지역 관리자", scope: "region", region: "부산경남", department: "부산운영지원부" },
    { id: "jeju", password: "jeju1234", name: "박제주 매니저", role: "제주 지역 관리자", scope: "region", region: "제주", department: "제주운영지원부" }
  ];
  var currentAccount = null;

  function canManageRegion(region) {
    return !!currentAccount && (currentAccount.scope === "all" || currentAccount.region === region);
  }

  // Region-scoped accounts must not be able to switch the "대상 지역" filter to another
  // region and edit/close that region's operating days.
  function lockOperationRegionSelect() {
    var select = byId("operation-region"); if (!select) return;
    var isRegionLocked = currentAccount && currentAccount.scope === "region";
    select.disabled = isRegionLocked;
    if (isRegionLocked) select.value = currentAccount.region;
  }

  // Region-scoped accounts should only ever see their own region/department in filter
  // dropdowns — not "전체 지역" plus every other region's options.
  function lockLocationFilterSelect(locationId, departmentId) {
    var locationSelect = byId(locationId); if (!locationSelect) return;
    var isRegionLocked = currentAccount && currentAccount.scope === "region";
    if (isRegionLocked) {
      locationSelect.innerHTML = '<option>' + escapeHtml(currentAccount.region) + '</option>';
      locationSelect.value = currentAccount.region;
      locationSelect.disabled = true;
      if (departmentId) refreshDepartmentSelect(departmentId, currentAccount.region, "");
    } else {
      locationSelect.innerHTML = '<option value="">전체 지역</option>' + Object.keys(organization).map(function (region) { return '<option>' + escapeHtml(region) + '</option>'; }).join("");
      locationSelect.value = "";
      locationSelect.disabled = false;
      if (departmentId) refreshDepartmentSelect(departmentId, "", "");
    }
  }

  function lockAccountFilterSelects() {
    lockLocationFilterSelect("reservation-location", "reservation-department");
    lockLocationFilterSelect("kiosk-location-filter", "kiosk-department-filter");
  }

  var defaultBookingWindow = 14;
  var defaultCancelMinutes = 10;
  var discountPolicies = [
    { id: "gwacheon", name: "과천시민 할인", type: "percent", value: 50, maxAmount: 0, maxQty: 2, scope: "day", proof: "onsite", startDate: "", endDate: "", stackable: false, restoreOnCancel: true, allPrograms: false, programs: ["포니 타기", "포니랑 놀기"], active: true }
  ];
  var catalogState = { programOverrides: {}, addedPrograms: [], sessionOverrides: {}, addedSessions: [] };

  var demoReservations = [
    { id: "LRP-260902-00005-1", orderId: "PAY-260902-3018", memberId: "demo:카카오:1", programKey: "ride", program: "포니 타기", dateKey: "2026-09-05", date: "2026.09.05 (토)", time: "10:00~10:20", qty: 3, price: 15000, discount: false, status: "예약 확정", createdAt: "2026-09-02 10:42", method: "신용카드", tickets: ["confirmed", "confirmed", "confirmed"] },
    { id: "LRP-260902-00004-1", orderId: "PAY-260902-3012", memberId: "demo:네이버:2", programKey: "play", program: "포니랑 놀기", dateKey: "2026-09-05", date: "2026.09.05 (토)", time: "10:20~10:45", qty: 2, price: 4000, discount: true, status: "부분 취소", createdAt: "2026-09-02 10:36", method: "신용카드", tickets: ["confirmed", "cancelled"], cancellationEvents: [{ source: "customer", qty: 1, amount: 2000, reason: "고객 직접 취소", createdAt: "2026-09-03 14:20" }] },
    { id: "LRP-260902-00003-1", orderId: "PAY-260902-2998", memberId: "demo:카카오:2", programKey: "ride", program: "포니 타기", dateKey: "2026-09-06", date: "2026.09.06 (일)", time: "11:00~11:20", qty: 1, price: 2500, discount: true, status: "취소 완료", paymentStatus: "전액 환불 완료", createdAt: "2026-09-02 10:19", method: "신용카드", tickets: ["cancelled"] },
    { id: "LRP-260902-00002-1", orderId: "PAY-260902-2971", memberId: "demo:네이버:1", programKey: "play", program: "포니랑 놀기", dateKey: "2026-09-06", date: "2026.09.06 (일)", time: "13:20~13:45", qty: 4, price: 16000, discount: false, status: "예약 확정", createdAt: "2026-09-02 09:51", method: "신용카드", tickets: ["confirmed", "confirmed", "confirmed", "confirmed"] },
    { id: "LRP-260902-00001-1", orderId: "PAY-260902-2944", memberId: "demo:카카오:1", programKey: "ride", program: "포니 타기", dateKey: "2026-09-12", date: "2026.09.12 (토)", time: "14:20~14:45", qty: 2, price: 5000, discount: true, status: "예약 확정", createdAt: "2026-09-02 09:27", method: "신용카드", tickets: ["confirmed", "confirmed"] },
    { id: "LRP-260902-00001-2", orderId: "PAY-260902-2944", memberId: "demo:카카오:1", programKey: "play", program: "포니랑 놀기", dateKey: "2026-09-12", date: "2026.09.12 (토)", time: "15:20~15:45", qty: 1, price: 4000, discount: false, status: "예약 확정", createdAt: "2026-09-02 09:27", method: "신용카드", tickets: ["confirmed"] },
    { id: "LRP-260901-00001-1", orderId: "PAY-260901-2886", memberId: "demo:네이버:2", programKey: "play", program: "포니랑 놀기", dateKey: "2026-09-12", date: "2026.09.12 (토)", time: "15:00~15:20", qty: 1, price: 4000, discount: false, status: "취소 완료", createdAt: "2026-09-01 18:44", method: "신용카드", tickets: ["cancelled"], cancellationEvents: [{ source: "admin", qty: 1, amount: 4000, reason: "운영사 사정", createdAt: "2026-09-02 09:10", actor: "박지윤 매니저" }] }
  ];

  var settlementDetails = {
    ride: { program: "포니 타기", scope: "서울 · 공원화사업추진TF", completed: 982, paid: 5210000, refunded: 210000, fee: 150000, payout: 4850000, daily: [["2026.09.05", 324, 1720000, 60000, 1610000], ["2026.09.12", 346, 1830000, 90000, 1686000], ["2026.09.19", 312, 1660000, 60000, 1554000]], transactions: [["2026.09.05", "LRP-260902-00005-1", "PAY-260902-3018", 3, 15000, 0, 450, 14550, "결제 완료"], ["2026.09.06", "LRP-260902-00003-1", "PAY-260902-2998", 1, 2500, 2500, 0, 0, "전체 환불"], ["2026.09.12", "LRP-260902-00001-1", "PAY-260902-2944", 2, 5000, 0, 150, 4850, "결제 완료"], ["2026.09.12", "LRP-260912-00003-1", "PAY-260912-3811", 4, 20000, 5000, 450, 14550, "부분 환불"], ["2026.09.19", "LRP-260919-00001-1", "PAY-260919-4172", 2, 10000, 0, 300, 9700, "결제 완료"]], refunds: [["2026.09.05 · 전체 환불 8건", "고객 요청 외 2개 사유", 60000], ["2026.09.12 · 부분 환불 14건", "인원별 부분취소", 90000], ["2026.09.19 · 전체·부분 환불 9건", "운영 취소 포함", 60000]] },
    play: { program: "포니랑 놀기", scope: "서울 · 공원화사업추진TF", completed: 604, paid: 3210000, refunded: 116000, fee: 92820, payout: 3001180, daily: [["2026.09.05", 204, 1080000, 36000, 1012000], ["2026.09.12", 216, 1120000, 40000, 1047000], ["2026.09.19", 184, 1010000, 40000, 942180]], transactions: [["2026.09.05", "LRP-260902-00004-1", "PAY-260902-3012", 2, 8000, 4000, 120, 3880, "부분 환불"], ["2026.09.06", "LRP-260902-00002-1", "PAY-260902-2971", 4, 16000, 0, 480, 15520, "결제 완료"], ["2026.09.12", "LRP-260912-00001-1", "PAY-260912-3758", 2, 8000, 0, 240, 7760, "결제 완료"], ["2026.09.12", "LRP-260912-00002-1", "PAY-260912-3884", 3, 12000, 4000, 240, 7760, "부분 환불"], ["2026.09.19", "LRP-260919-00002-1", "PAY-260919-4263", 1, 4000, 4000, 0, 0, "전체 환불"]], refunds: [["2026.09.05 · 부분 환불 6건", "인원별 부분취소", 36000], ["2026.09.12 · 전체 환불 5건", "고객 요청", 40000], ["2026.09.19 · 전체·부분 환불 7건", "운영 취소 포함", 40000]] }
  };

  var sessionData = {
    ride: [
      ["1회차", "10:00", "10:20", 7, 8, "판매중"], ["2회차", "10:20", "10:45", 6, 6, "마감"],
      ["3회차", "11:00", "11:20", 5, 8, "판매중"], ["4회차", "11:20", "11:45", 3, 4, "판매중"],
      ["5회차", "13:00", "13:20", 5, 8, "판매중"], ["6회차", "13:20", "13:45", 4, 5, "판매중"],
      ["7회차", "14:00", "14:20", 5, 6, "판매중"], ["8회차", "14:20", "14:45", 2, 3, "잔여 1석"],
      ["9회차", "15:00", "15:20", 4, 8, "판매중"], ["10회차", "15:20", "15:45", 2, 6, "판매중"],
      ["11회차", "16:00", "16:20", 3, 4, "판매중"], ["12회차", "16:20", "16:45", 0, 4, "운영 마감"]
    ],
    play: [
      ["1회차", "10:00", "10:20", 4, 8, "판매중"], ["2회차", "10:20", "10:45", 3, 8, "판매중"],
      ["3회차", "11:00", "11:20", 6, 8, "판매중"], ["4회차", "11:20", "11:45", 8, 8, "마감"],
      ["5회차", "13:00", "13:20", 2, 8, "판매중"], ["6회차", "13:20", "13:45", 5, 8, "판매중"],
      ["7회차", "14:00", "14:20", 4, 8, "판매중"], ["8회차", "14:20", "14:45", 6, 8, "판매중"]
    ]
  };

  var programs = {
    ride: { name: "포니 타기", price: 5000, image: "assets/pony/cover.jpg", location: "서울", department: "공원화사업추진TF", programType: "승마체험", settlementTag: "SEOUL-PARK-TF", purchaseGroup: "SEOUL-PONY", conflictGroup: "SEOUL-PONY", bookingWindow: 14, cancelMinutes: 10, cancelOffsetValue: 10, cancelOffsetUnit: "minutes", saleStartDate: "2026-09-01", saleEndDate: "2026-12-31", visibleStartAt: "2026-08-25T09:00", visibleEndAt: "2026-12-31T23:59", saleDays: [6, 0], discountIds: ["gwacheon"], active: true },
    play: { name: "포니랑 놀기", price: 4000, image: "assets/pony/gallery-02.jpg", location: "서울", department: "공원화사업추진TF", programType: "승마체험", settlementTag: "SEOUL-PARK-TF", purchaseGroup: "SEOUL-PONY", conflictGroup: "SEOUL-PONY", bookingWindow: 14, cancelMinutes: 10, cancelOffsetValue: 10, cancelOffsetUnit: "minutes", saleStartDate: "2026-09-01", saleEndDate: "2026-12-31", visibleStartAt: "2026-08-25T09:00", visibleEndAt: "2026-12-31T23:59", saleDays: [6, 0], discountIds: ["gwacheon"], noticeText: "포니의 건강을 위해 먹이주기는 진행하지 않습니다.", active: true }
  };

  function byId(id) { return document.getElementById(id); }
  function setAdminLoginState(isLoggedIn) {
    document.body.classList.toggle("is-logged-out", !isLoggedIn);
    byId("admin-login").hidden = isLoggedIn;
    if (!isLoggedIn) {
      document.querySelectorAll("dialog[open]").forEach(function (dialog) { dialog.close(); });
      byId("admin-login-form").reset();
      byId("admin-login-error").hidden = true;
      window.setTimeout(function () { byId("admin-login-id").focus(); }, 0);
    }
  }

  function saveAdminSession(value) {
    try { sessionStorage.setItem(adminSessionKey, value); } catch (error) {}
  }

  function restoreAdminSession() {
    var stored;
    try { stored = sessionStorage.getItem(adminSessionKey); } catch (error) { stored = null; }
    if (stored === "signed-out") return null;
    return adminAccounts.find(function (item) { return item.id === stored; }) || adminAccounts[0];
  }

  function renderAdminIdentity() {
    if (!currentAccount) return;
    var user = document.querySelector(".admin-user");
    if (!user) return;
    user.querySelector("span").textContent = currentAccount.name.charAt(0);
    user.querySelector("strong").textContent = currentAccount.name;
    user.querySelector("small").textContent = currentAccount.role;
  }
  function prepareDiscountFormFields() {
    var form = document.querySelector(".discount-form-grid");
    if (!form) return;
    form.innerHTML = '<label><span>할인명</span><input id="discount-name" placeholder="예: 어린이 무료 할인"></label>' +
      '<label><span>할인 방식</span><select id="discount-type"><option value="percent">정률 할인 (%)</option><option value="fixed">정액 할인 (원)</option></select></label>' +
      '<label><span id="discount-value-label">할인율</span><span class="discount-input-suffix"><input id="discount-value" type="number" min="0" value="50"><em id="discount-value-unit">%</em></span></label>' +
      '<label><span>1매당 최대 할인 금액</span><span class="discount-input-suffix"><input id="discount-max-amount" type="number" min="0" step="100" value="0"><em>원</em></span><small class="field-help">정률 할인에만 적용됩니다. 0원은 상한 없음입니다.</small></label>' +
      '<div class="discount-section-title field-wide"><strong>사용 제한</strong><small>수량 한도는 계정당 이용일마다 합산하며, 증빙은 현장에서 확인합니다.</small></div>' +
      '<label><span>최대 적용 수량</span><span class="discount-input-suffix"><input id="discount-max-qty" type="number" min="1" step="1" value="1"><em>매</em></span></label>' +
      '<label style="grid-column:1"><span>할인 적용 시작일</span><input id="discount-start-date" type="date"><small class="field-help">이용일 기준입니다. 비워두면 시작일 제한이 없습니다.</small></label>' +
      '<label><span>할인 적용 종료일</span><input id="discount-end-date" type="date"><small class="field-help">이용일 기준입니다. 비워두면 종료일 제한이 없습니다.</small></label>' +
      '<fieldset class="field-wide"><legend>적용 프로그램</legend><label class="policy-toggle"><input id="discount-all-programs" type="checkbox"><span><strong>모든 프로그램에 적용</strong><small>체크하지 않으면 아래에서 적용할 프로그램을 선택합니다.</small></span></label><div id="discount-program-options" class="discount-program-options"></div></fieldset>' +
      '<label class="policy-toggle field-wide"><input id="discount-active" type="checkbox" checked><span><strong>할인 활성화</strong><small>활성화한 할인만 신규 예약에 적용됩니다. 기존 예약의 할인 금액은 변경되지 않습니다.</small></span></label>';
  }
  function money(value) { return new Intl.NumberFormat("ko-KR").format(value) + "원"; }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, function (char) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]; }); }
  function notify(message) {
    var toast = document.querySelector(".toast");
    toast.textContent = message; toast.classList.add("is-on"); clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 3200);
  }

  function loadSavedDemoState() {
    try {
      var state = JSON.parse(localStorage.getItem(adminStateKey) || "null");
      if (!state) return;
      if (Array.isArray(state.reservations)) {
        state.reservations.forEach(function (saved) {
          var target = demoReservations.find(function (item) { return item.id === saved.id; });
          if (target && Array.isArray(saved.tickets)) { target.tickets = saved.tickets.map(function (ticket) { return ticket === "review" ? "cancelled" : ticket; }); target.status = saved.status === "환불 확인" || saved.status === "취소 처리 중" ? "취소 완료" : saved.status; target.paymentStatus = saved.status === "환불 확인" || saved.status === "취소 처리 중" ? "전액 환불 완료" : saved.paymentStatus || target.paymentStatus; if (Array.isArray(saved.cancellationEvents)) target.cancellationEvents = saved.cancellationEvents; }
        });
      }
      if (Array.isArray(state.discounts) && state.discounts.length) discountPolicies = state.discounts;
      discountPolicies = discountPolicies.map(function (discount) {
        return Object.assign({ maxAmount: 0, maxQty: 1, scope: "day", proof: "onsite", startDate: "", endDate: "", stackable: false, restoreOnCancel: true }, discount);
      });
      if (state.catalog && typeof state.catalog === "object") {
        catalogState.programOverrides = state.catalog.programOverrides || {};
        catalogState.addedPrograms = Array.isArray(state.catalog.addedPrograms) ? state.catalog.addedPrograms : [];
        catalogState.sessionOverrides = state.catalog.sessionOverrides || {};
        catalogState.addedSessions = Array.isArray(state.catalog.addedSessions) ? state.catalog.addedSessions : [];
      }
      if (Array.isArray(state.deletedReservationIds)) deletedReservationIds = state.deletedReservationIds;
      if (Array.isArray(state.operationExceptions)) operationExceptions = state.operationExceptions.filter(function (item) { return item.status !== "open"; }).map(function (item) { return Object.assign({ programKey: "all", status: "closed" }, item); });
    } catch (error) { /* Keep the review prototype usable if browser storage is unavailable. */ }
  }

  function saveDemoState() {
    try { localStorage.setItem(adminStateKey, JSON.stringify({ reservations: demoReservations.map(function (item) { return { id: item.id, status: item.status, paymentStatus: item.paymentStatus || "결제 완료", tickets: item.tickets, cancellationEvents: item.cancellationEvents || [] }; }), discounts: discountPolicies, catalog: catalogState, operationExceptions: operationExceptions, deletedReservationIds: deletedReservationIds })); }
    catch (error) { notify("변경사항을 이 브라우저에 저장하지 못했습니다."); }
  }

  function readBookingReservations() {
    try {
      var store = JSON.parse(localStorage.getItem(reservationStoreKey) || "null");
      if (!store || !Array.isArray(store.reservations)) return [];
      return store.reservations.filter(function (item) { return item && item.id && Number.isInteger(item.qty); }).map(function (item, index) {
        return {
          id: item.id, orderId: item.orderId || "PAY-ORDER-" + (index + 1), memberId: item.memberId,
          location: item.location || "서울", department: item.department || "공원화사업추진TF",
          programKey: item.programKey === "play" ? "play" : "ride",
          program: item.name || (item.programKey === "play" ? "포니랑 놀기" : "포니 타기"), dateKey: item.dateKey,
          date: item.date || item.dateKey, time: item.time, qty: item.qty, price: item.price || 0, discount: !!item.discount,
          status: item.status === "cancelled" ? "취소 완료" : "예약 확정", createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString("ko-KR") : "예약 생성", createdTimestamp: item.createdAt ? new Date(item.createdAt).getTime() : 0,
          method: item.paymentMethod === "demo-card" ? "신용카드" : "기타 결제", tickets: Array.from({ length: item.qty }, function () { return item.status === "cancelled" ? "cancelled" : "confirmed"; }),
          cancellationEvents: (item.cancellationHistory || []).map(function (event) { return { source: "customer", qty: Number(event.qty || 0), amount: Number(event.amount || 0), reason: "고객 직접 취소", createdAt: event.createdAt ? new Date(event.createdAt).toLocaleString("ko-KR") : "접수 시간 미기록" }; })
        };
      });
    } catch (error) { return []; }
  }

  function allReservations() {
    var ids = {};
    return demoReservations.concat(readBookingReservations()).filter(function (item) { if (ids[item.id]) return false; ids[item.id] = true; return true; }).filter(function (item) { return deletedReservationIds.indexOf(item.id) === -1; }).map(function (item) {
      if (!item.location) item.location = "서울";
      if (!item.department) item.department = "공원화사업추진TF";
      return item;
    });
  }

  function confirmDelete(message, onConfirm, confirmLabel, title, positiveAction) {
    var dialog = byId("generic-confirm-dialog");
    byId("generic-confirm-title").textContent = title || "삭제할까요?";
    byId("generic-confirm-message").innerHTML = message;
    var actionButton = byId("generic-confirm-action");
    actionButton.textContent = confirmLabel || "삭제";
    var freshButton = actionButton.cloneNode(true);
    actionButton.parentNode.replaceChild(freshButton, actionButton);
    freshButton.classList.toggle("admin-button--danger", !positiveAction);
    freshButton.classList.toggle("admin-button--primary", !!positiveAction);
    freshButton.addEventListener("click", function () { dialog.close(); onConfirm(); });
    dialog.showModal();
  }

  function deleteReservation(id) {
    confirmDelete(escapeHtml(id) + " 예약을 목록에서 삭제할까요?<br>삭제해도 고객 환불 등은 자동으로 처리되지 않으니,<br>필요한 경우 별도로 처리해주세요.", function () {
      deletedReservationIds.push(id);
      saveDemoState();
      renderReservations();
      notify(id + " 예약을 삭제했습니다.");
    });
  }

  function statusClass(status) {
    if (status === "부분 취소") return "is-partial";
    if (status === "취소 완료") return "is-cancelled";
    return "";
  }

  function reservationRow(item) {
    var canManage = canManageRegion(item.location);
    var row = document.createElement("tr");
    row.dataset.reservationId = item.id;
    row.innerHTML = '<td><strong>' + escapeHtml(item.id) + '</strong></td>' +
      '<td><strong>' + escapeHtml(item.location) + '</strong><br><small>' + escapeHtml(item.department) + '</small></td>' +
      '<td><span class="table-program"><img src="' + (programs[item.programKey] ? programs[item.programKey].image : "assets/pony/cover.jpg") + '" alt=""><span class="table-program-info"><strong>' + escapeHtml(item.program) + '</strong></span></span></td>' +
      '<td><strong>' + escapeHtml(item.date) + '</strong><br><small>' + escapeHtml(item.time) + '</small></td>' +
      '<td><strong>' + item.tickets.filter(function (ticket) { return ticket === "confirmed"; }).length + '명</strong><br><small>전체 ' + item.qty + '명</small></td>' +
      '<td><strong>' + money(item.price) + '</strong></td>' +
      '<td><span class="table-status ' + statusClass(item.status) + '">' + paymentStatusLabel(item) + '</span></td>' +
      '<td><strong>' + escapeHtml(item.createdAt) + '</strong></td>' +
      '<td><div class="reservation-row-actions"><button class="reservation-detail-button" type="button">상세보기</button>' + (canManage ? '<button class="row-delete" type="button">삭제</button>' : '') + '</div></td>';
    row.addEventListener("click", function (event) { if (!event.target.closest(".row-delete")) openDrawer(item.id); });
    var deleteButton = row.querySelector(".row-delete");
    if (deleteButton) deleteButton.addEventListener("click", function (event) { event.stopPropagation(); deleteReservation(item.id); });
    return row;
  }

  function filteredReservations() {
    var search = byId("reservation-search").value.trim().toLowerCase();
    var location = byId("reservation-location").value;
    var department = byId("reservation-department").value;
    var date = byId("reservation-date").value;
    var endDate = byId("reservation-end-date").value;
    var program = byId("reservation-program").value;
    var status = byId("reservation-status").value;
    return allReservations().filter(function (item) {
      return (!search || item.id.toLowerCase().includes(search)) && (!location || item.location === location) && (!department || item.department === department) && (!date || item.dateKey >= date) && (!endDate || item.dateKey <= endDate) && (!program || item.program === program) && (!status || item.status === status);
    }).sort(function (a, b) { return (b.createdTimestamp || Date.parse(b.createdAt) || 0) - (a.createdTimestamp || Date.parse(a.createdAt) || 0); });
  }

  function hasReservationFilters() {
    return ["reservation-search", "reservation-location", "reservation-department", "reservation-date", "reservation-end-date", "reservation-program", "reservation-status"].some(function (id) {
      return Boolean(byId(id).value);
    });
  }

  function renderReservations() {
    var items = filteredReservations(); var body = byId("reservation-table-body"); body.replaceChildren();
    var totalPages = Math.max(1, Math.ceil(items.length / reservationPageSize));
    reservationPage = Math.min(Math.max(1, reservationPage), totalPages);
    var startIndex = (reservationPage - 1) * reservationPageSize;
    var pageItems = items.slice(startIndex, startIndex + reservationPageSize);
    pageItems.forEach(function (item) { body.append(reservationRow(item)); });
    if (!items.length) {
      var row = document.createElement("tr");
      var emptyTitle = hasReservationFilters() ? "검색 결과가 없습니다." : "예약내역이 없습니다.";
      var emptyHelp = hasReservationFilters() ? "검색어나 필터 조건을 변경해 다시 확인해주세요." : "예약이 접수되면 이곳에 표시됩니다.";
      row.innerHTML = '<td colspan="9" class="empty-table"><strong>' + emptyTitle + '</strong><small>' + emptyHelp + '</small></td>';
      body.append(row);
    }
    byId("reservation-count").textContent = items.length;
    byId("reservation-range").textContent = items.length ? (startIndex + 1) + "–" + (startIndex + pageItems.length) + " / " + items.length + "건 · 페이지당 " + reservationPageSize + "건" : "0건 · 페이지당 " + reservationPageSize + "건";
    byId("reservation-prev-page").disabled = reservationPage === 1;
    byId("reservation-next-page").disabled = reservationPage === totalPages;
    var firstPage = Math.max(1, Math.min(reservationPage - 2, totalPages - 4));
    var lastPage = Math.min(totalPages, firstPage + 4);
    byId("reservation-page-buttons").innerHTML = items.length ? Array.from({ length: lastPage - firstPage + 1 }, function (_, index) { var page = firstPage + index; return '<button type="button" data-reservation-page="' + page + '"' + (page === reservationPage ? ' class="is-current" aria-current="page"' : "") + '>' + page + '</button>'; }).join("") : "";
  }

  function changeReservationPage(page) {
    reservationPage = page; renderReservations();
    document.querySelector(".reservation-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function operationDateKey(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function programOperatesOn(programItem, dateKey, weekday) {
    return programItem.active !== false && (!programItem.saleStartDate || programItem.saleStartDate <= dateKey) && (!programItem.saleEndDate || programItem.saleEndDate >= dateKey) && (programItem.saleDays || []).map(Number).includes(weekday);
  }

  function closuresForDate(dateKey, region) {
    return operationExceptions.filter(function (item) { return item.region === region && item.startDate <= dateKey && item.endDate >= dateKey; });
  }

  function renderOperationExceptions() {
    var list = byId("operation-exception-list");
    if (!list) return;
    list.replaceChildren();
    var region = byId("operation-region").value;
    var heading = byId("operation-exception-heading");
    if (!selectedOperationDateKey) {
      if (heading) heading.textContent = "운영 일정";
      list.innerHTML = "<p>달력에서 날짜를 선택하면 해당 일의 운영 일정을 확인할 수 있습니다.</p>";
      return;
    }
    if (heading) {
      var labelDate = new Date(selectedOperationDateKey + "T00:00:00");
      heading.textContent = "운영 일정 · " + (labelDate.getMonth() + 1) + "월 " + labelDate.getDate() + "일";
    }
    var items = closuresForDate(selectedOperationDateKey, region).slice().reverse();
    if (!items.length) { list.innerHTML = "<p>이 날 등록된 운영 예외가 없습니다.</p>"; return; }
    items.forEach(function (item) {
      var article = document.createElement("article");
      var programName = item.programKey === "all" ? "전체 프로그램" : ((programCatalog().find(function (programItem) { return programItem.key === item.programKey; }) || {}).programName || "삭제된 프로그램");
      var session = item.sessionKey ? sessionsForProgram(item.programKey).find(function (sessionItem) { return sessionItem.key === item.sessionKey; }) : null;
      var scopeLabel = session ? programName + " · " + session.start + "~" + session.end + " 회차" : programName;
      article.innerHTML = "<strong>휴장 · " + escapeHtml(item.startDate === item.endDate ? item.startDate : item.startDate + " ~ " + item.endDate) + "</strong><span>" + escapeHtml(scopeLabel + " · " + (item.reason || "사유 미입력")) + "</span><button type=\"button\">삭제</button>";
      article.querySelector("button").addEventListener("click", function () {
        confirmDelete("<strong>본 내용을 삭제할까요?</strong><br>삭제하는 경우 해당 회차가 오픈되어있다면, 고객 예약 화면에서 즉시 노출됩니다.", function () {
          operationExceptions = operationExceptions.filter(function (saved) { return saved.id !== item.id; }); saveDemoState(); renderOperationCalendar(); if (selectedOperationDateKey) renderOperationDayQuick(selectedOperationDateKey); renderOperationExceptions(); notify("운영 예외를 삭제했습니다.");
        });
      });
      list.append(article);
    });
  }

  function isProgramFullyClosed(programItem, closures) {
    if (closures.some(function (item) { return item.programKey === "all"; })) return true;
    if (closures.some(function (item) { return item.programKey === programItem.key && !item.sessionKey; })) return true;
    var activeSessions = sessionsForProgram(programItem.key).filter(function (session) { return session.active !== false; });
    return activeSessions.length > 0 && activeSessions.every(function (session) { return closures.some(function (item) { return item.programKey === programItem.key && item.sessionKey === session.key; }); });
  }

  function renderOperationCalendar() {
    var calendar = byId("operation-calendar");
    if (!calendar) return;
    calendar.replaceChildren();
    var year = operationCalendarMonth.getFullYear();
    var month = operationCalendarMonth.getMonth();
    byId("operation-month-title").textContent = year + "년 " + (month + 1) + "월";
    var first = new Date(year, month, 1);
    var cursor = new Date(year, month, 1 - first.getDay());
    var region = byId("operation-region").value;
    var regionalPrograms = programCatalog().filter(function (item) { return item.location === region; });
    for (var index = 0; index < 42; index += 1) {
      var date = new Date(cursor); date.setDate(cursor.getDate() + index);
      var key = operationDateKey(date);
      var operatingPrograms = regionalPrograms.filter(function (item) { return programOperatesOn(item, key, date.getDay()); });
      var closures = closuresForDate(key, region);
      var isClosed = closures.some(function (item) { return item.programKey === "all"; });
      var closedOperatingCount = operatingPrograms.filter(function (item) { return isProgramFullyClosed(item, closures); }).length;
      if (operatingPrograms.length && closedOperatingCount === operatingPrograms.length) isClosed = true;
      var isPartial = !isClosed && closures.length > 0;
      var isOperating = operatingPrograms.length > 0 && !isClosed && !isPartial;
      var button = document.createElement("button"); button.type = "button";
      button.className = "operation-day" + (date.getMonth() !== month ? " is-outside" : "") + (isClosed ? " is-closed" : isPartial ? " is-partial" : isOperating ? " is-operating" : "") + (key === selectedOperationDateKey ? " is-selected" : "");
      var stateLabel = isClosed ? "휴장" : isPartial ? "일부 휴장" : isOperating ? "운영" : "";
      button.innerHTML = "<span>" + date.getDate() + "</span>" + (stateLabel ? "<small>" + stateLabel + "</small>" : "");
      button.setAttribute("aria-label", key + (stateLabel ? " " + stateLabel : " 미운영"));
      (function (selectedKey) { button.addEventListener("click", function () { selectOperationDate(selectedKey); }); })(key);
      calendar.append(button);
    }
  }

  function selectOperationDate(dateKey) {
    selectedOperationDateKey = dateKey;
    renderOperationCalendar();
    renderOperationDayQuick(dateKey);
    renderOperationExceptions();
  }

  function renderOperationDayQuick(dateKey) {
    var quick = byId("operation-day-quick");
    var list = byId("operation-day-programs");
    var closeAllButton = byId("operation-day-close-all");
    if (!quick || !dateKey) return;
    var region = byId("operation-region").value;
    var date = new Date(dateKey + "T00:00:00");
    var weekday = date.getDay();
    var dateLabel = (date.getMonth() + 1) + "월 " + date.getDate() + "일";
    var regionalPrograms = programCatalog().filter(function (item) { return item.location === region; });
    var operatingPrograms = regionalPrograms.filter(function (item) { return programOperatesOn(item, dateKey, weekday); });
    var closures = closuresForDate(dateKey, region);
    var allClosure = closures.find(function (item) { return item.programKey === "all"; });
    byId("operation-day-quick-title").textContent = dateLabel + " · " + region;
    list.replaceChildren();
    if (!operatingPrograms.length) {
      byId("operation-day-quick-desc").textContent = "이 날은 운영 예정인 프로그램이 없습니다.";
      list.hidden = true;
      closeAllButton.hidden = true;
      return;
    }
    byId("operation-day-quick-desc").textContent = allClosure
      ? "이 날은 전체 휴장으로 등록되어 있습니다" + (allClosure.reason ? " · " + allClosure.reason : "") + "."
      : "프로그램 전체, 회차 또는 이 날 전체를 선택한 뒤 확인 절차를 거쳐 휴장 처리할 수 있습니다.";
    list.hidden = false;
    operatingPrograms.forEach(function (item) {
      var programClosed = !!allClosure || closures.some(function (closure) { return closure.programKey === item.key && !closure.sessionKey; });
      var activeSessions = sessionsForProgram(item.key).filter(function (session) { return session.active !== false; });
      var closedSessionKeys = closures.filter(function (closure) { return closure.programKey === item.key && closure.sessionKey; }).map(function (closure) { return closure.sessionKey; });
      var li = document.createElement("li");
      li.className = "operation-program-block " + (programClosed ? "is-closed" : "is-operating");
      var head = document.createElement("div");
      head.className = "operation-program-head";
      head.innerHTML = "<strong>" + escapeHtml(item.programName) + "</strong>";
      var headButton = document.createElement("button");
      headButton.type = "button";
      headButton.textContent = programClosed ? "휴장 처리됨" : "전체 휴장 처리";
      headButton.addEventListener("click", function () { toggleProgramClosureForDate(item, dateKey, region); });
      head.append(headButton);
      li.append(head);
      if (activeSessions.length) {
        var details = document.createElement("details");
        details.className = "operation-session-toggle";
        if (closedSessionKeys.length) details.open = true;
        var summary = document.createElement("summary");
        summary.textContent = "회차별로 보기" + (closedSessionKeys.length ? " · " + closedSessionKeys.length + "/" + activeSessions.length + " 휴장" : " (" + activeSessions.length + "개)");
        details.append(summary);
        var grid = document.createElement("div");
        grid.className = "operation-session-grid";
        activeSessions.forEach(function (session) {
          var sessionClosed = programClosed || closedSessionKeys.includes(session.key);
          var chip = document.createElement("button");
          chip.type = "button";
          chip.className = "operation-session-chip" + (sessionClosed ? " is-closed" : "");
          chip.textContent = session.start + "~" + session.end;
          chip.disabled = programClosed;
          chip.addEventListener("click", function () { toggleSessionClosureForDate(item, session, dateKey, region); });
          grid.append(chip);
        });
        details.append(grid);
        li.append(details);
      } else {
        var empty = document.createElement("p");
        empty.className = "operation-session-empty";
        empty.textContent = "등록된 운영 회차가 없습니다.";
        li.append(empty);
      }
      list.append(li);
    });
    var allClosed = operatingPrograms.every(function (item) { return programFullyClosedForDate(item, dateKey, region, closures); });
    closeAllButton.hidden = false;
    closeAllButton.textContent = allClosed ? "운영 재개" : "이 날 전체 휴장으로 전환";
    closeAllButton.onclick = allClosed
      ? function () { reopenAllProgramsForDate(operatingPrograms, dateKey, region); }
      : function () { closeAllProgramsForDate(operatingPrograms, dateKey, region); };
  }

  function removeMatchingExceptions(region, dateKey, programKey, sessionKey) {
    operationExceptions = operationExceptions.filter(function (item) {
      return !(item.region === region && item.startDate === dateKey && item.endDate === dateKey && item.programKey === programKey && (sessionKey === undefined || item.sessionKey === sessionKey));
    });
  }

  function toggleProgramClosureForDate(programItem, dateKey, region) {
    if (!canManageRegion(region)) return;
    var existing = operationExceptions.find(function (item) { return item.region === region && item.programKey === programItem.key && !item.sessionKey && item.startDate === dateKey && item.endDate === dateKey; });
    var allClosure = operationExceptions.find(function (item) { return item.region === region && item.programKey === "all" && item.startDate <= dateKey && item.endDate >= dateKey; });
    if (existing || allClosure) {
      if (allClosure) {
        var date = new Date(dateKey + "T00:00:00");
        var otherPrograms = programCatalog().filter(function (item) { return item.location === region && item.key !== programItem.key && programOperatesOn(item, dateKey, date.getDay()); });
        operationExceptions = operationExceptions.filter(function (item) { return item.id !== allClosure.id; });
        otherPrograms.forEach(function (item) {
          sessionsForProgram(item.key).filter(function (session) { return session.active !== false; }).forEach(function (session) {
            operationExceptions.push({ id: "operation-" + Date.now() + "-" + item.key + "-" + session.key, region: region, programKey: item.key, sessionKey: session.key, startDate: dateKey, endDate: dateKey, status: "closed", reason: "회차별 휴장 처리" });
          });
        });
      } else {
        removeMatchingExceptions(region, dateKey, programItem.key);
      }
      notify(programItem.programName + " 운영을 다시 시작합니다.");
      saveDemoState(); renderOperationCalendar(); renderOperationDayQuick(dateKey);
    } else {
      requestOperationClosure("프로그램 휴장 확인", programItem.programName + " 전체 회차", region, dateKey, programItem, null, function () {
        removeMatchingExceptions(region, dateKey, programItem.key);
        operationExceptions.push({ id: "operation-" + Date.now() + "-" + programItem.key, region: region, programKey: programItem.key, startDate: dateKey, endDate: dateKey, status: "closed", reason: "프로그램 단위 휴장 처리" });
        saveDemoState(); renderOperationCalendar(); renderOperationDayQuick(dateKey); renderOperationExceptions();
        notify(programItem.programName + "를 이 날만 휴장 처리했습니다.");
      });
    }
  }

  function toggleSessionClosureForDate(programItem, session, dateKey, region) {
    if (!canManageRegion(region)) return;
    var existing = operationExceptions.find(function (item) { return item.region === region && item.programKey === programItem.key && item.sessionKey === session.key && item.startDate === dateKey && item.endDate === dateKey; });
    var programClosure = operationExceptions.find(function (item) { return item.region === region && item.programKey === programItem.key && !item.sessionKey && item.startDate <= dateKey && item.endDate >= dateKey; });
    var allClosure = operationExceptions.find(function (item) { return item.region === region && item.programKey === "all" && item.startDate <= dateKey && item.endDate >= dateKey; });
    if (existing || programClosure || allClosure) {
      if (allClosure) {
        var date = new Date(dateKey + "T00:00:00");
        var operatingPrograms = programCatalog().filter(function (item) { return item.location === region && programOperatesOn(item, dateKey, date.getDay()); });
        operationExceptions = operationExceptions.filter(function (item) { return item.id !== allClosure.id; });
        operatingPrograms.forEach(function (item) {
          sessionsForProgram(item.key).filter(function (sessionItem) { return sessionItem.active !== false; }).forEach(function (sessionItem) {
            if (item.key === programItem.key && sessionItem.key === session.key) return;
            operationExceptions.push({ id: "operation-" + Date.now() + "-" + item.key + "-" + sessionItem.key, region: region, programKey: item.key, sessionKey: sessionItem.key, startDate: dateKey, endDate: dateKey, status: "closed", reason: "회차별 휴장 처리" });
          });
        });
      } else if (programClosure) {
        operationExceptions = operationExceptions.filter(function (item) { return item.id !== programClosure.id; });
        sessionsForProgram(programItem.key).filter(function (item) { return item.active !== false && item.key !== session.key; }).forEach(function (sessionItem) {
          operationExceptions.push({ id: "operation-" + Date.now() + "-" + sessionItem.key, region: region, programKey: programItem.key, sessionKey: sessionItem.key, startDate: dateKey, endDate: dateKey, status: "closed", reason: "회차별 휴장 처리" });
        });
      } else {
        operationExceptions = operationExceptions.filter(function (item) { return item.id !== existing.id; });
      }
      notify(programItem.programName + " " + session.start + "~" + session.end + " 회차 운영을 다시 시작합니다.");
      saveDemoState(); renderOperationCalendar(); renderOperationDayQuick(dateKey); renderOperationExceptions();
    } else {
      requestOperationClosure("회차 휴장 확인", programItem.programName + " · " + session.start + "~" + session.end, region, dateKey, programItem, session, function () {
        operationExceptions.push({ id: "operation-" + Date.now() + "-" + session.key, region: region, programKey: programItem.key, sessionKey: session.key, startDate: dateKey, endDate: dateKey, status: "closed", reason: "회차별 휴장 처리" });
        saveDemoState(); renderOperationCalendar(); renderOperationDayQuick(dateKey); renderOperationExceptions();
        notify(programItem.programName + " " + session.start + "~" + session.end + " 회차를 휴장 처리했습니다.");
      });
    }
  }

  function closeAllProgramsForDate(operatingPrograms, dateKey, region) {
    if (!canManageRegion(region)) return;
    requestOperationClosure("전체 휴장 확인", operatingPrograms.length + "개 프로그램 전체 회차", region, dateKey, null, null, function () {
      operationExceptions = operationExceptions.filter(function (item) { return !(item.region === region && item.startDate === dateKey && item.endDate === dateKey); });
      operationExceptions.push({ id: "operation-" + Date.now() + "-all", region: region, programKey: "all", startDate: dateKey, endDate: dateKey, status: "closed", reason: "일괄 휴장 처리" });
      saveDemoState(); renderOperationCalendar(); renderOperationDayQuick(dateKey);
      notify("이 날을 전체 휴장으로 전환했습니다.");
    });
  }

  function programFullyClosedForDate(programItem, dateKey, region, closures) {
    if (closures.some(function (closure) { return closure.programKey === "all" || (closure.programKey === programItem.key && !closure.sessionKey); })) return true;
    var activeSessions = sessionsForProgram(programItem.key).filter(function (session) { return session.active !== false; });
    if (!activeSessions.length) return false;
    return activeSessions.every(function (session) {
      return closures.some(function (closure) { return closure.programKey === programItem.key && closure.sessionKey === session.key; });
    });
  }

  function reopenAllProgramsForDate(operatingPrograms, dateKey, region) {
    if (!canManageRegion(region)) return;
    confirmDelete("휴장을 해제하면 등록된 프로그램과 판매 중인 회차가<br>고객 예약 화면에 즉시 노출됩니다.<br>그래도 운영을 재개할까요?", function () {
      operationExceptions = operationExceptions.filter(function (item) { return !(item.region === region && item.startDate === dateKey && item.endDate === dateKey && (item.programKey === "all" || operatingPrograms.some(function (program) { return program.key === item.programKey; }))); });
      saveDemoState(); renderOperationCalendar(); renderOperationDayQuick(dateKey);
      notify("운영을 재개했습니다. 등록된 프로그램과 회차가 고객에게 노출됩니다.");
    }, "운영 재개", "운영을 재개할까요?", true);
  }

  function showView(viewName) {
    var navView = (viewName === "program-edit" || viewName === "program-sessions") ? "programs" : viewName;
    document.querySelectorAll(".admin-view").forEach(function (view) { var visible = view.dataset.view === viewName; view.hidden = !visible; view.classList.toggle("is-visible", visible); });
    document.querySelectorAll("[data-admin-view]").forEach(function (button) { button.classList.toggle("is-active", button.dataset.adminView === navView); });
    document.querySelector(".admin-sidebar").classList.remove("is-open");
    if (viewName === "reservations") renderReservations();
    if (viewName === "operations") { lockOperationRegionSelect(); renderOperationCalendar(); renderOperationExceptions(); }
    if (viewName === "settlement") { refreshSettlementScopeFilter(); renderSettlementSummary(); }
    history.replaceState(null, "", "#" + viewName);
    if (window.DeveloperPolicy) window.DeveloperPolicy.refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function programCatalog() {
    var basePrograms = Object.keys(programs).map(function (key) {
      return Object.assign({ key: key, programKey: key, programName: programs[key].name }, programs[key], catalogState.programOverrides[key] || {});
    });
    return basePrograms.concat(catalogState.addedPrograms).filter(function (item) { return !item.deleted; });
  }

  function sessionsForProgram(programKey) {
    var baseSessions = (sessionData[programKey] || []).map(function (session, index) {
      var key = programKey + "-session-" + index;
      return Object.assign({ key: key, programKey: programKey, start: session[1], end: session[2], capacity: session[4], active: session[5] !== "운영 마감" }, catalogState.sessionOverrides[key] || {});
    });
    return baseSessions.concat(catalogState.addedSessions.filter(function (session) { return session.programKey === programKey; })).filter(function (session) { return !session.deleted; }).sort(function (a, b) { return (a.start + a.end).localeCompare(b.start + b.end); });
  }

  function weekdayText(days) {
    var labels = ["일", "월", "화", "수", "목", "금", "토"];
    var order = [1, 2, 3, 4, 5, 6, 0];
    return order.filter(function (day) { return (days || []).map(Number).includes(day); }).map(function (day) { return labels[day]; }).join("·") || "요일 미설정";
  }

  function renderKioskProducts() {
    var body = byId("kiosk-product-body"); if (!body) return;
    var search = byId("kiosk-product-search").value.trim().toLowerCase();
    var location = byId("kiosk-location-filter").value;
    var department = byId("kiosk-department-filter").value;
    body.replaceChildren();
    var visiblePrograms = programCatalog().filter(function (item) {
      var haystack = [item.location, item.department, item.programType, item.programName].join(" ").toLowerCase();
      return (!location || item.location === location) && (!department || item.department === department) && (!search || haystack.includes(search));
    });
    visiblePrograms.forEach(function (item) {
      var sessions = sessionsForProgram(item.key);
      var activeSessions = sessions.filter(function (session) { return session.active; });
      var appliedDiscounts = discountPolicies.filter(function (discount) { return discountAppliesToProgram(discount, item); }).map(function (discount) { return discount.name; });
      var canManage = canManageRegion(item.location);
      var row = document.createElement("tr"); row.dataset.programKey = item.key;
      row.innerHTML = '<td><strong>' + escapeHtml(item.location || "서울") + '</strong><small>' + escapeHtml(item.department || "담당 부서 미지정") + '</small></td>' +
        '<td><strong>' + escapeHtml(item.programName) + '</strong></td>' +
        '<td><strong>' + money(item.price || 0) + '</strong></td>' +
        '<td><strong>' + escapeHtml(weekdayText(item.saleDays)) + '</strong><small>' + escapeHtml((item.saleStartDate || "미설정") + " ~ " + (item.saleEndDate || "미설정")) + '</small></td>' +
        '<td><strong>' + sessions.length + '개</strong><small>판매중 ' + activeSessions.length + '개</small></td>' +
        '<td>' + escapeHtml(appliedDiscounts.length ? appliedDiscounts.join(", ") : "미적용") + '</td>' +
        '<td><button class="row-state ' + (!item.active ? 'is-off' : '') + '" type="button"' + (canManage ? "" : " disabled") + '>' + (item.active ? '판매중' : '숨김') + '</button></td>' +
        '<td>' + (canManage ? '<div class="row-actions"><button class="row-detail" type="button">프로그램 수정</button><button class="row-sessions" type="button">회차 관리</button><button class="row-delete" type="button">삭제</button></div>' : '<span class="row-readonly">조회만 가능</span>') + '</td>';
      if (canManage) {
        row.querySelector(".row-state").addEventListener("click", function () { var saved = Object.assign({}, item, { active: !item.active }); persistProgram(saved); notify(saved.active ? "프로그램 판매를 시작했습니다." : "프로그램을 숨겼습니다."); });
        row.querySelector(".row-sessions").addEventListener("click", function () { openSessionManager(item.key); });
        row.querySelector(".row-detail").addEventListener("click", function () { openProductDialog(item); });
        row.querySelector(".row-delete").addEventListener("click", function () { requestProgramDeletion(item); });
      }
      body.append(row);
    });
    if (!visiblePrograms.length) body.innerHTML = '<tr><td colspan="8" class="empty-table"><strong>검색 결과가 없습니다.</strong><small>프로그램명이나 지역·부서 조건을 변경해 다시 확인해주세요.</small></td></tr>';
  }

  function openProductDialog(item) {
    activeProgramKey = item.key || null;
    byId("product-dialog-title").textContent = activeProgramKey ? item.programName + " 수정" : "새 프로그램 등록";
    refreshProgramInputs();
    byId("detail-location").value = item.location || "서울";
    refreshDepartmentSelect("detail-department", byId("detail-location").value, item.department || organization[byId("detail-location").value][0]);
    var isRegionLocked = currentAccount && currentAccount.scope === "region";
    byId("detail-location").disabled = isRegionLocked;
    byId("detail-department").disabled = isRegionLocked;
    byId("detail-program").value = item.programName || "";
    byId("detail-price").value = item.price || 0;
    pendingImageDataUrl = null;
    byId("detail-image").value = "";
    var imagePreview = byId("detail-image-preview");
    imagePreview.src = item.image || "";
    imagePreview.hidden = !item.image;
    byId("detail-notice").value = item.noticeText || "";
    byId("detail-sale-start").value = item.saleStartDate || "";
    byId("detail-sale-end").value = item.saleEndDate || "";
    byId("detail-visible-start").value = item.visibleStartAt || (item.saleStartDate ? item.saleStartDate + "T00:00" : "");
    byId("detail-visible-end").value = item.visibleEndAt || (item.saleEndDate ? item.saleEndDate + "T23:59" : "");
    byId("detail-booking-window").value = item.bookingWindow != null ? item.bookingWindow : defaultBookingWindow;
    var saleDays = Array.isArray(item.saleDays) ? item.saleDays.map(Number) : [6, 0];
    document.querySelectorAll(".detail-days input").forEach(function (input) { input.checked = saleDays.includes(Number(input.value)); });
    var cancelMinutes = Number(item.cancelMinutes == null ? defaultCancelMinutes : item.cancelMinutes);
    var cancelUnit = item.cancelOffsetUnit || (cancelMinutes > 0 && cancelMinutes % 1440 === 0 ? "days" : cancelMinutes > 0 && cancelMinutes % 60 === 0 ? "hours" : "minutes");
    var cancelDivisor = cancelUnit === "days" ? 1440 : cancelUnit === "hours" ? 60 : 1;
    byId("detail-cancel-unit").value = cancelUnit;
    byId("detail-cancel-value").value = item.cancelOffsetValue == null ? cancelMinutes / cancelDivisor : item.cancelOffsetValue;
    pendingDiscountAdditions = []; pendingDiscountRemovals = [];
    renderProductDiscountOptions(item);
    showView("program-edit");
  }

  function uniqueProgramNames() {
    return programCatalog().map(function (item) { return item.programName; }).filter(Boolean);
  }

  function manageableProgramNames() {
    var names = uniqueProgramNames();
    if (!currentAccount || currentAccount.scope === "all") return names;
    var ownNames = programCatalog().filter(function (item) { return item.location === currentAccount.region; }).map(function (item) { return item.programName; });
    return names.filter(function (name) { return ownNames.includes(name); });
  }

  // A discount is visible to a region account if it targets at least one of that region's
  // programs (or applies to all programs, since that still affects the region's own sales).
  function discountVisibleToAccount(discount) {
    if (!currentAccount || currentAccount.scope === "all") return true;
    if (discount.allPrograms) return true;
    var ownNames = manageableProgramNames();
    return (discount.programs || []).some(function (name) { return ownNames.includes(name); });
  }

  // For the 할인 관리 list specifically: a region account should only see discounts it
  // actually owns (scoped to its own programs). Discounts belonging to other regions —
  // including another region's "모든 프로그램에 적용" discounts — are hidden entirely
  // rather than shown read-only, so the list looks empty instead of leaking other regions'
  // discount names.
  function discountManageableByAccount(discount) {
    if (!currentAccount || currentAccount.scope === "all") return true;
    if (discount.allPrograms) return false;
    var ownNames = manageableProgramNames();
    return (discount.programs || []).some(function (name) { return ownNames.includes(name); });
  }

  // A region account may only edit a discount that is entirely scoped to its own programs;
  // discounts spanning other regions (or "모든 프로그램에 적용") are shown read-only.
  function discountEditableByAccount(discount) {
    if (!currentAccount || currentAccount.scope === "all") return true;
    if (discount.allPrograms) return false;
    var ownNames = manageableProgramNames();
    return (discount.programs || []).every(function (name) { return ownNames.includes(name); });
  }

  function refreshDepartmentSelect(id, location, selected) {
    var select = byId(id); if (!select) return;
    var names = location ? organization[location] || [] : Object.keys(organization).reduce(function (all, key) { return all.concat(organization[key]); }, []);
    select.innerHTML = (id.indexOf("filter") !== -1 || id.indexOf("reservation") !== -1 ? '<option value="">전체 부서</option>' : "") + names.map(function (name) { return '<option' + (name === selected ? " selected" : "") + '>' + escapeHtml(name) + '</option>'; }).join("");
    if (selected != null) select.value = selected;
  }

  function refreshProgramInputs() {
    byId("program-name-options").innerHTML = uniqueProgramNames().map(function (name) { return '<option value="' + escapeHtml(name) + '">'; }).join("");
  }

  function effectiveConnectedDiscounts(program) {
    if (!program) return [];
    return discountPolicies.filter(function (discount) {
      if (pendingDiscountRemovals.includes(discount.id)) return false;
      if (pendingDiscountAdditions.includes(discount.id)) return true;
      return discountAppliesToProgram(discount, program);
    });
  }

  function renderProductDiscountOptions(program) {
    var wrap = byId("detail-discount-options"); wrap.replaceChildren();
    var activeDiscounts = effectiveConnectedDiscounts(program);
    if (!activeDiscounts.length) { wrap.innerHTML = '<p>연결된 할인이 없습니다. ‘할인 추가’ 버튼으로 적용할 할인을 선택해주세요.</p>'; return; }
    activeDiscounts.forEach(function (discount) {
      var card = document.createElement("article");
      card.innerHTML = '<span><strong>' + escapeHtml(discount.name) + '</strong></span><button type="button" aria-label="' + escapeHtml(discount.name) + ' 연결 해제">×</button>';
      card.querySelector("button").addEventListener("click", function () { disconnectDiscountFromProgram(discount, program); });
      wrap.append(card);
    });
  }

  function disconnectDiscountFromProgram(discount, program) {
    if (!program || !discount) return;
    if (pendingDiscountAdditions.includes(discount.id)) {
      pendingDiscountAdditions = pendingDiscountAdditions.filter(function (id) { return id !== discount.id; });
    } else if (!pendingDiscountRemovals.includes(discount.id)) {
      pendingDiscountRemovals.push(discount.id);
    }
    renderProductDiscountOptions(program);
    notify(discount.name + " 할인 연결 해제를 예약했습니다. 프로그램 저장을 눌러야 실제로 반영됩니다.");
  }

  function discountAppliesToProgram(discount, program) {
    if (!discount.active) return false;
    if (discount.allPrograms) return !(discount.excludedPrograms || []).includes(program.programName);
    if ((discount.programs || []).includes(program.programName)) return true;
    return (program.discountIds || []).includes(discount.id);
  }

  function openDiscountPicker(program) {
    if (!program) { notify("프로그램명을 먼저 입력해주세요."); return; }
    var connectedIds = effectiveConnectedDiscounts(program).map(function (discount) { return discount.id; });
    var candidates = visibleDiscountPolicies().filter(function (discount) { return discount.active && !connectedIds.includes(discount.id); });
    var list = byId("discount-picker-list"); list.replaceChildren();
    if (!candidates.length) {
      list.innerHTML = '<p class="empty-table"><strong>추가할 수 있는 할인이 없습니다.</strong><small>할인 관리에서 새 할인을 먼저 등록해주세요.</small></p>';
    } else {
      candidates.forEach(function (discount) {
        var valueText = discount.type === "percent" ? discount.value + "%" : money(discount.value);
        var label = document.createElement("label");
        label.innerHTML = '<input type="checkbox" value="' + escapeHtml(discount.id) + '"><span><strong>' + escapeHtml(discount.name) + '</strong><small>' + valueText + '</small></span>';
        list.append(label);
      });
    }
    byId("discount-picker-dialog").showModal();
  }

  function applyDiscountPickerSelection(program) {
    var checked = Array.from(document.querySelectorAll("#discount-picker-list input:checked")).map(function (input) { return input.value; });
    if (!checked.length) { byId("discount-picker-dialog").close(); return; }
    checked.forEach(function (id) {
      pendingDiscountRemovals = pendingDiscountRemovals.filter(function (removedId) { return removedId !== id; });
      if (!pendingDiscountAdditions.includes(id)) pendingDiscountAdditions.push(id);
    });
    byId("discount-picker-dialog").close();
    renderProductDiscountOptions(program);
    notify(checked.length + "개 할인을 선택했습니다. 프로그램 저장을 눌러야 실제로 연결됩니다.");
  }

  function commitDiscountDraft(program) {
    pendingDiscountAdditions.forEach(function (id) {
      var discount = discountPolicies.find(function (item) { return item.id === id; });
      if (!discount) return;
      if (discount.allPrograms) {
        discount.excludedPrograms = (discount.excludedPrograms || []).filter(function (name) { return name !== program.programName; });
      } else if (!(discount.programs || []).includes(program.programName)) {
        discount.programs = (discount.programs || []).concat([program.programName]);
      }
    });
    pendingDiscountRemovals.forEach(function (id) {
      var discount = discountPolicies.find(function (item) { return item.id === id; });
      if (!discount) return;
      if (discount.allPrograms) {
        discount.excludedPrograms = Array.from(new Set((discount.excludedPrograms || []).concat(program.programName)));
      } else {
        discount.programs = (discount.programs || []).filter(function (name) { return name !== program.programName; });
      }
    });
    pendingDiscountAdditions = []; pendingDiscountRemovals = [];
  }

  function persistProgram(program) {
    if (program.key.indexOf("custom-program-") === 0) {
      var addedIndex = catalogState.addedPrograms.findIndex(function (item) { return item.key === program.key; });
      if (addedIndex === -1) catalogState.addedPrograms.push(program); else catalogState.addedPrograms[addedIndex] = program;
    } else catalogState.programOverrides[program.key] = program;
    saveDemoState(); renderKioskProducts();
  }

  function requestProgramDeletion(program) {
    if (!canManageRegion(program.location)) { notify("해당 지역의 프로그램을 삭제할 권한이 없습니다."); return; }
    var sessions = sessionsForProgram(program.key);
    var affectedReservations = allReservations().filter(function (item) {
      if (!item || item.status === "취소 완료") return false;
      return item.programKey === program.key || item.program === program.programName || item.name === program.programName;
    });
    pendingProgramDeletion = program;
    byId("program-delete-confirm-scope").textContent = (program.location || "서울") + " · " + program.programName;
    byId("program-delete-impact").textContent = "프로그램 삭제 시 관련 일정 및 예약에 영향을 줄 수 있습니다.";
    byId("program-delete-confirm-dialog").showModal();
  }

  function confirmProgramDeletion() {
    var program = pendingProgramDeletion;
    byId("program-delete-confirm-dialog").close();
    if (!program) return;
    pendingProgramDeletion = null;
    sessionsForProgram(program.key).forEach(function (session) {
      persistSession(Object.assign({}, session, { deleted: true, active: false }));
    });
    var region = byId("operation-region");
    var closureRegion = region && region.value === program.location ? region.value : program.location;
    operationExceptions = operationExceptions.filter(function (item) { return !(item.region === closureRegion && item.programKey === program.key); });
    operationExceptions.push({ id: "operation-" + Date.now() + "-" + program.key, region: closureRegion, programKey: program.key, startDate: "2020-01-01", endDate: "2099-12-31", status: "closed", reason: "프로그램 삭제로 인한 영구 휴장" });
    persistProgram(Object.assign({}, program, { deleted: true, active: false }));
    if (activeProgramKey === program.key) { activeProgramKey = null; byId("product-dialog").close(); byId("session-dialog").close(); }
    saveDemoState(); renderKioskProducts(); renderOperationCalendar(); renderOperationExceptions();
    if (selectedOperationDateKey) renderOperationDayQuick(selectedOperationDateKey);
    notify(program.programName + " 프로그램을 삭제했습니다. 기존 예약은 자동으로 환불되지 않으며, 이 프로그램으로는 신규 예약을 받을 수 없습니다.");
  }

  function saveProductDetail(event) {
    var programName = byId("detail-program").value.trim();
    if (!programName) { event.preventDefault(); notify("프로그램명을 입력해주세요."); return; }
    var existing = activeProgramKey ? programCatalog().find(function (item) { return item.key === activeProgramKey; }) : null;
    var location = byId("detail-location").value;
    var department = byId("detail-department").value;
    var price = Number(byId("detail-price").value);
    if (!location || !department) { event.preventDefault(); notify("지역과 담당 부서를 모두 선택해주세요."); return; }
    if (!Number.isFinite(price) || price < 0 || byId("detail-price").value === "") { event.preventDefault(); notify("기본 가격을 입력해주세요."); return; }
    if (!pendingImageDataUrl && !(existing && existing.image)) { event.preventDefault(); notify("대표 이미지를 업로드해주세요."); return; }
    var saleStartDate = byId("detail-sale-start").value;
    var saleEndDate = byId("detail-sale-end").value;
    var visibleStartAt = byId("detail-visible-start").value;
    var visibleEndAt = byId("detail-visible-end").value;
    var bookingWindow = Number(byId("detail-booking-window").value);
    var saleDays = Array.from(document.querySelectorAll(".detail-days input:checked")).map(function (input) { return Number(input.value); });
    var cancelOffsetValue = Number(byId("detail-cancel-value").value);
    var cancelOffsetUnit = byId("detail-cancel-unit").value;
    if (!saleStartDate || !saleEndDate) { event.preventDefault(); notify("운영 시작일과 종료일을 모두 설정해주세요."); return; }
    if (saleEndDate < saleStartDate) { event.preventDefault(); notify("운영 종료일은 시작일보다 빠를 수 없습니다."); return; }
    if (!visibleStartAt || !visibleEndAt) { event.preventDefault(); notify("프로그램 노출 시작과 종료 일시를 모두 설정해주세요."); return; }
    if (visibleEndAt < visibleStartAt) { event.preventDefault(); notify("프로그램 노출 종료는 시작보다 빨라질 수 없습니다."); return; }
    if (!Number.isFinite(bookingWindow) || bookingWindow < 1) { event.preventDefault(); notify("예약 가능 일수를 1일 이상으로 설정해주세요."); return; }
    if (!saleDays.length) { event.preventDefault(); notify("판매 요일을 하나 이상 선택해주세요."); return; }
    if (!Number.isFinite(cancelOffsetValue) || cancelOffsetValue < 0) { event.preventDefault(); notify("취소 마감 값을 확인해주세요."); return; }
    var cancelMultiplier = cancelOffsetUnit === "days" ? 1440 : cancelOffsetUnit === "hours" ? 60 : 1;
    var program = Object.assign({}, existing || {}, {
      key: activeProgramKey || "custom-program-" + Date.now(),
      programKey: activeProgramKey || "custom-program-" + Date.now(),
      programName: programName,
      location: location, department: department, programType: (existing && existing.programType) || "기타",
      settlementTag: (existing && existing.settlementTag) || location + "-" + department,
      purchaseGroup: (existing && existing.purchaseGroup) || "", conflictGroup: (existing && existing.conflictGroup) || "",
      bookingWindow: bookingWindow,
      cancelMinutes: cancelOffsetValue * cancelMultiplier, cancelOffsetValue: cancelOffsetValue, cancelOffsetUnit: cancelOffsetUnit,
      saleStartDate: saleStartDate, saleEndDate: saleEndDate, visibleStartAt: visibleStartAt, visibleEndAt: visibleEndAt, saleDays: saleDays,
      price: price, image: pendingImageDataUrl || (existing && existing.image),
      noticeText: byId("detail-notice").value.trim(),
      discountIds: existing && Array.isArray(existing.discountIds) ? existing.discountIds : [], active: existing ? existing.active : true
    });
    program.programKey = program.key;
    commitDiscountDraft(program);
    var isNewProgram = !existing;
    persistProgram(program); activeProgramKey = program.key;
    if (isNewProgram) {
      notify(programName + " 프로그램을 저장했습니다. 회차를 등록해주세요.");
      openSessionManager(program.key);
    } else {
      notify(programName + " 프로그램을 저장했습니다.");
      showView("programs");
    }
  }

  function persistSession(session) {
    if (session.key.indexOf("custom-session-") === 0) {
      var addedIndex = catalogState.addedSessions.findIndex(function (item) { return item.key === session.key; });
      if (addedIndex === -1) catalogState.addedSessions.push(session); else catalogState.addedSessions[addedIndex] = session;
    } else catalogState.sessionOverrides[session.key] = session;
    saveDemoState(); renderKioskProducts(); renderSessionList();
  }

  function sessionDeletionReason(session) {
    var program = programCatalog().find(function (item) { return item.key === session.programKey; });
    if (!program || !canManageRegion(program.location)) return "해당 지역의 회차를 삭제할 권한이 없습니다.";
    var store;
    try { store = JSON.parse(localStorage.getItem(reservationStoreKey) || '{"reservations":[]}'); }
    catch (error) { return "예약 이력을 확인할 수 없어 삭제할 수 없습니다."; }
    if (!store || !Array.isArray(store.reservations)) return "예약 이력을 확인할 수 없어 삭제할 수 없습니다.";
    var original = (sessionData[session.programKey] || []).find(function (item, index) { return session.programKey + "-session-" + index === session.key; });
    var times = [session.start + "~" + session.end];
    if (original) times.push(original[1] + "~" + original[2]);
    var hasHistory = demoReservations.concat(store.reservations).some(function (item) {
      if (!item) return false;
      if (item.sessionKey === session.key) return true;
      return (item.programKey === session.programKey || item.program === program.programName || item.name === program.programName) && times.indexOf(String(item.time || "").replace(/\s/g, "")) !== -1;
    });
    return hasHistory ? "예약 이력이 있어 삭제가 제한됩니다. ‘숨김’으로 판매를 중지할 수 있습니다." : "";
  }

  function matchingReservationsForClosure(region, dateKey, programItem, session) {
    var programName = programItem ? programItem.programName : "";
    var sessionTime = session ? (session.start + "~" + session.end).replace(/\s/g, "") : "";
    return allReservations().filter(function (item) {
      if (!item || item.location !== region || item.dateKey !== dateKey || item.status === "취소 완료") return false;
      if (programItem && item.programKey !== programItem.key && item.program !== programName && item.name !== programName) return false;
      return !session || String(item.time || "").replace(/\s/g, "") === sessionTime;
    });
  }

  function operationClosureImpact(region, dateKey, programItem, session) {
    return matchingReservationsForClosure(region, dateKey, programItem, session).reduce(function (impact, item) {
      impact.orders += 1;
      impact.people += Array.isArray(item.tickets) ? item.tickets.filter(function (ticket) { return ticket === "confirmed"; }).length : Number(item.qty || 0);
      return impact;
    }, { orders: 0, people: 0 });
  }

  function cancelReservationForClosure(item, reason) {
    var demoMatch = demoReservations.find(function (candidate) { return candidate.id === item.id; });
    if (demoMatch) {
      var remainingQty = (demoMatch.tickets || []).filter(function (ticket) { return ticket === "confirmed"; }).length;
      var refundAmount = remainingQty * ticketUnitPrice(demoMatch);
      demoMatch.status = "취소 완료";
      demoMatch.tickets = (demoMatch.tickets || []).map(function () { return "cancelled"; });
      demoMatch.cancellationEvents = demoMatch.cancellationEvents || [];
      demoMatch.cancellationEvents.push({ source: "admin", qty: remainingQty, amount: refundAmount, reason: reason, createdAt: new Date().toLocaleString("ko-KR") });
      return;
    }
    try {
      var store = JSON.parse(localStorage.getItem(reservationStoreKey) || "null");
      if (!store || !Array.isArray(store.reservations)) return;
      var target = store.reservations.find(function (candidate) { return candidate.id === item.id; });
      if (!target) return;
      target.cancellationHistory = target.cancellationHistory || [];
      target.cancellationHistory.push({ createdAt: new Date().toISOString(), qty: target.qty, amount: target.price || 0, status: "cancelled", reason: reason });
      target.status = "cancelled";
      target.qty = 0;
      localStorage.setItem(reservationStoreKey, JSON.stringify(store));
    } catch (error) { /* Keep the review prototype usable if browser storage is unavailable. */ }
  }

  function requestOperationClosure(title, scope, region, dateKey, programItem, session, action) {
    var impact = operationClosureImpact(region, dateKey, programItem, session);
    pendingOperationClosureAction = action;
    pendingOperationClosureImpact = { region: region, dateKey: dateKey, programItem: programItem, session: session, orders: impact.orders };
    byId("operation-closure-confirm-title").textContent = title;
    byId("operation-closure-confirm-scope").textContent = dateKey + " · " + region + " · " + scope;
    var impactLine = byId("operation-closure-impact");
    var refundCheck = byId("operation-closure-refund");
    var keepCheck = byId("operation-closure-keep");
    keepCheck.checked = true;
    refundCheck.checked = false;
    if (impact.orders) {
      impactLine.textContent = "유효 예약이 존재합니다.";
      refundCheck.disabled = false;
    } else {
      impactLine.textContent = "현재 유효 예약은 없습니다.";
      refundCheck.disabled = true;
    }
    updateOperationClosureMessage();
    byId("operation-closure-confirm-dialog").showModal();
  }

  function updateOperationClosureMessage() {
    var refundCheck = byId("operation-closure-refund");
    var message = byId("operation-closure-message-text");
    var alert = byId("operation-closure-alert");
    if (refundCheck.checked && !refundCheck.disabled) {
      message.innerHTML = "휴장 처리 시 신규 예약이 즉시 중단되고,<br>현재 유효 예약 " + (pendingOperationClosureImpact ? pendingOperationClosureImpact.orders : 0) + "건을 모두 취소·환불 처리합니다.";
      alert.hidden = false;
    } else {
      message.innerHTML = "휴장 처리 시 신규 예약이 즉시 중단됩니다.<br>기존 예약은 유지되며 자동 취소·환불되지 않습니다.";
      alert.hidden = true;
    }
  }

  function confirmOperationClosure() {
    if (!pendingOperationClosureAction) return;
    var action = pendingOperationClosureAction;
    var impact = pendingOperationClosureImpact;
    var refundCheck = byId("operation-closure-refund");
    var shouldRefund = refundCheck.checked && !refundCheck.disabled;
    pendingOperationClosureAction = null;
    pendingOperationClosureImpact = null;
    byId("operation-closure-confirm-dialog").close();
    var cancelledCount = 0;
    if (shouldRefund && impact) {
      var matches = matchingReservationsForClosure(impact.region, impact.dateKey, impact.programItem, impact.session);
      matches.forEach(function (item) { cancelReservationForClosure(item, "기상·운영상 휴장 처리"); });
      cancelledCount = matches.length;
    }
    action();
    if (cancelledCount) {
      renderReservations();
      var toast = document.querySelector(".toast");
      toast.textContent = toast.textContent + " 예약 " + cancelledCount + "건도 함께 취소·환불 처리했습니다.";
    }
  }

  function deleteSession(session) {
    var reason = sessionDeletionReason(session);
    if (reason) { notify(reason); return; }
    confirmDelete(escapeHtml(session.start + "~" + session.end) + " 회차를 삭제할까요?", function () {
      var reasonNow = sessionDeletionReason(session);
      if (reasonNow) { notify(reasonNow); return; }
      if (activeSessionKey === session.key) { activeSessionKey = null; byId("session-editor").hidden = true; }
      persistSession(Object.assign({}, session, { deleted: true, active: false }));
      notify("회차를 삭제했습니다.");
    });
  }

  function openSessionManager(programKey) {
    var program = programCatalog().find(function (item) { return item.key === programKey; });
    if (!program) return;
    sessionProgramKey = programKey; activeSessionKey = null;
    byId("session-dialog-title").textContent = program.programName + " 회차 관리";
    byId("session-dialog-subtitle").textContent = weekdayText(program.saleDays) + " · " + program.saleStartDate + " ~ " + program.saleEndDate + " 반복 운영";
    byId("session-editor").hidden = true;
    renderSessionList(); showView("program-sessions");
  }

  function renderSessionList() {
    var list = byId("session-list"); if (!list || !sessionProgramKey) return;
    var editor = byId("session-editor");
    if (editor.parentElement === list) list.after(editor);
    var sessions = sessionsForProgram(sessionProgramKey); list.replaceChildren();
    if (!sessions.length) { list.innerHTML = '<div class="session-empty"><strong>등록된 회차가 없습니다.</strong><small>회차 등록을 눌러 시작·종료 시간과 판매 수량을 추가하세요.</small></div>'; return; }
    sessions.forEach(function (session, index) {
      var row = document.createElement("article");
      row.className = "session-row";
      row.innerHTML = '<span class="session-number">' + (index + 1) + '</span><div><strong>' + (index + 1) + '회차 (' + escapeHtml(session.start) + '~' + escapeHtml(session.end) + ')</strong><small>판매 수량 ' + session.capacity + '명</small></div><button class="session-state ' + (session.active ? '' : 'is-off') + '" type="button" aria-pressed="' + session.active + '" aria-label="' + (index + 1) + '회차 판매 상태 변경">' + (session.active ? '판매중' : '숨김') + '</button><button class="session-edit" type="button">수정</button>';
      row.querySelector(".session-state").addEventListener("click", function () {
        var saved = Object.assign({}, session, { active: !session.active });
        if (activeSessionKey === session.key) byId("session-active").checked = saved.active;
        persistSession(saved);
        notify(saved.active ? (index + 1) + "회차 판매를 시작했습니다." : (index + 1) + "회차를 숨겼습니다.");
      });
      row.querySelector(".session-edit").addEventListener("click", function () { editSession(session, row); });
      var deleteButton = document.createElement("button");
      deleteButton.type = "button"; deleteButton.className = "session-delete"; deleteButton.textContent = "삭제";
      var deletionReason = sessionDeletionReason(session);
      deleteButton.disabled = !!deletionReason;
      deleteButton.title = deletionReason || "예약 이력이 없는 회차 삭제";
      deleteButton.setAttribute("aria-label", (index + 1) + "회차 삭제" + (deletionReason ? ": " + deletionReason : ""));
      if (deletionReason) row.querySelector("small").textContent += " · " + deletionReason;
      deleteButton.addEventListener("click", function () { deleteSession(session); });
      row.append(deleteButton);
      list.append(row);
      if (activeSessionKey === session.key && !editor.hidden) row.after(editor);
    });
  }

  function editSession(session, row) {
    activeSessionKey = session ? session.key : null;
    var sessionIndex = session ? sessionsForProgram(sessionProgramKey).findIndex(function (item) { return item.key === session.key; }) + 1 : 0;
    byId("session-editor-title").textContent = session ? sessionIndex + "회차 수정" : "새 회차 등록";
    byId("session-start").value = session ? session.start : "10:00";
    byId("session-end").value = session ? session.end : "10:20";
    byId("session-capacity").value = session ? session.capacity : 8;
    byId("session-active").checked = session ? session.active : true;
    var editor = byId("session-editor");
    editor.hidden = false;
    if (row) row.after(editor); else byId("session-list").after(editor);
    byId("session-start").focus();
  }

  function saveSession() {
    var start = byId("session-start").value;
    var end = byId("session-end").value;
    var capacity = Number(byId("session-capacity").value);
    if (!start || !end || start >= end) { notify("종료 시간은 시작 시간보다 늦게 설정해주세요."); return; }
    if (!Number.isInteger(capacity) || capacity < 1) { notify("판매 수량은 1명 이상으로 설정해주세요."); return; }
    var existing = activeSessionKey ? sessionsForProgram(sessionProgramKey).find(function (session) { return session.key === activeSessionKey; }) : null;
    var saved = Object.assign({}, existing || {}, { key: activeSessionKey || "custom-session-" + Date.now(), programKey: sessionProgramKey, start: start, end: end, capacity: capacity, active: byId("session-active").checked });
    persistSession(saved); byId("session-editor").hidden = true; activeSessionKey = null;
    notify("회차를 저장했습니다. 회차명은 시간 순서대로 자동 반영됩니다.");
  }

  function discountScopeText(scope) {
    return scope === "day" ? "계정당 이용일마다" : scope === "order" ? "주문마다" : scope === "unlimited" ? "수량 제한 없음" : "계정당 전체 기간";
  }

  function updateDiscountConstraintFields() {
    var isPercent = byId("discount-type").value === "percent";
    byId("discount-value-label").textContent = isPercent ? "할인율" : "할인 금액";
    byId("discount-value-unit").textContent = isPercent ? "%" : "원";
    byId("discount-value").max = isPercent ? "100" : "";
    byId("discount-max-amount").disabled = !isPercent;
    if (!isPercent) {
      if (Number(byId("discount-max-amount").value) > 0) byId("discount-max-amount").dataset.lastValue = byId("discount-max-amount").value;
      byId("discount-max-amount").value = 0;
    } else if (Number(byId("discount-max-amount").value) < 1 && byId("discount-max-amount").dataset.lastValue) {
      byId("discount-max-amount").value = byId("discount-max-amount").dataset.lastValue;
    }
    if (Number(byId("discount-max-qty").value) < 1) {
      byId("discount-max-qty").value = byId("discount-max-qty").dataset.lastValue || 1;
    }
  }

  function renderDiscountProgramOptions(selectedPrograms) {
    var wrap = byId("discount-program-options"); wrap.replaceChildren();
    manageableProgramNames().forEach(function (name) {
      var label = document.createElement("label");
      label.innerHTML = '<input type="checkbox" value="' + escapeHtml(name) + '" ' + (selectedPrograms.includes(name) ? "checked" : "") + '><span>' + escapeHtml(name) + '</span>';
      wrap.append(label);
    });
    wrap.classList.toggle("is-disabled", byId("discount-all-programs").checked);
    wrap.querySelectorAll("input").forEach(function (input) { input.disabled = byId("discount-all-programs").checked; });
  }

  function visibleDiscountPolicies() {
    return discountPolicies.filter(discountManageableByAccount);
  }

  function editDiscountPolicy(discount) {
    var isEditable = !discount || discountEditableByAccount(discount);
    byId("discount-id").value = discount ? discount.id : "";
    delete byId("discount-max-amount").dataset.lastValue;
    delete byId("discount-max-qty").dataset.lastValue;
    byId("discount-name").value = discount ? discount.name : "";
    byId("discount-type").value = discount ? discount.type : "percent";
    byId("discount-value").value = discount ? discount.value : 10;
    byId("discount-max-amount").value = discount ? discount.maxAmount || 0 : 0;
    byId("discount-max-qty").value = discount ? discount.maxQty || 0 : 1;
    byId("discount-start-date").value = discount ? discount.startDate || "" : "";
    byId("discount-end-date").value = discount ? discount.endDate || "" : "";
    byId("discount-name").disabled = !isEditable;
    byId("discount-type").disabled = !isEditable;
    byId("discount-value").disabled = !isEditable;
    byId("discount-max-amount").disabled = !isEditable;
    byId("discount-max-qty").disabled = !isEditable;
    byId("discount-start-date").disabled = !isEditable;
    byId("discount-end-date").disabled = !isEditable;
    byId("discount-all-programs").checked = discount ? discount.allPrograms : false;
    byId("discount-all-programs").disabled = !isEditable || (currentAccount && currentAccount.scope === "region");
    byId("discount-active").checked = discount ? discount.active : true;
    byId("discount-active").disabled = !isEditable;
    byId("save-discount-policy").hidden = !isEditable;
    byId("delete-discount-policy").hidden = !isEditable || !discount;
    updateDiscountConstraintFields();
    renderDiscountProgramOptions(discount ? discount.programs || [] : []);
    if (!isEditable) document.querySelectorAll("#discount-program-options input").forEach(function (input) { input.disabled = true; });
  }

  function renderDiscountPolicies() {
    var list = byId("discount-policy-list"); list.replaceChildren();
    visibleDiscountPolicies().forEach(function (discount) {
      var button = document.createElement("button"); button.type = "button";
      var valueText = discount.type === "percent" ? discount.value + "%" : money(discount.value);
      if (discount.type === "percent" && discount.maxAmount > 0) valueText += " · 1매당 최대 " + money(discount.maxAmount);
      var isEditable = discountEditableByAccount(discount);
      button.className = (byId("discount-id").value === discount.id ? "is-selected" : "") + (isEditable ? "" : " is-readonly");
      var quantityText = discount.scope === "unlimited" ? discountScopeText(discount.scope) : discountScopeText(discount.scope) + " " + discount.maxQty + "매";
      button.innerHTML = '<span><strong>' + escapeHtml(discount.name) + '</strong><small>' + valueText + ' · ' + quantityText + (isEditable ? "" : " · 조회만 가능") + '</small></span><em class="' + (discount.active ? "" : "is-off") + '">' + (discount.active ? "활성" : "비활성") + '</em>';
      button.addEventListener("click", function () { editDiscountPolicy(discount); renderDiscountPolicies(); });
      list.append(button);
    });
    if (!visibleDiscountPolicies().length) list.innerHTML = '<p class="empty-table"><strong>표시할 할인이 없습니다.</strong><small>담당 지역의 프로그램에 적용된 할인만 표시합니다.</small></p>';
  }

  function deleteDiscountPolicy() {
    var id = byId("discount-id").value;
    if (!id) return;
    var discount = discountPolicies.find(function (item) { return item.id === id; });
    if (!discount || !discountEditableByAccount(discount)) return;
    confirmDelete(escapeHtml(discount.name) + " 할인을 삭제할까요? 되돌릴 수 없습니다.", function () {
      discountPolicies = discountPolicies.filter(function (item) { return item.id !== id; });
      programCatalog().forEach(function (program) {
        if (!Array.isArray(program.discountIds) || !program.discountIds.includes(id)) return;
        persistProgram(Object.assign({}, program, { discountIds: program.discountIds.filter(function (discountId) { return discountId !== id; }) }));
      });
      saveDemoState(); renderDiscountPolicies(); renderKioskProducts();
      editDiscountPolicy(visibleDiscountPolicies()[0] || null); renderDiscountPolicies();
      var currentProgram = activeProgramKey ? programCatalog().find(function (program) { return program.key === activeProgramKey; }) : null;
      if (currentProgram) renderProductDiscountOptions(currentProgram);
      notify(discount.name + " 할인을 삭제했습니다.");
    });
  }

  function openDiscountManager(discountId) {
    var visible = visibleDiscountPolicies();
    var target = visible.find(function (discount) { return discount.id === discountId; }) || visible[0] || null;
    editDiscountPolicy(target); renderDiscountPolicies(); byId("discount-dialog").showModal();
  }

  function saveDiscountPolicy() {
    var name = byId("discount-name").value.trim();
    if (!name) { notify("할인명을 입력해주세요."); return; }
    var id = byId("discount-id").value || "discount-" + Date.now();
    var type = byId("discount-type").value;
    var value = Number(byId("discount-value").value);
    var maxAmount = type === "fixed" ? 0 : Number(byId("discount-max-amount").value) || 0;
    var scope = "day";
    var maxQty = Number(byId("discount-max-qty").value);
    var startDate = byId("discount-start-date").value;
    var endDate = byId("discount-end-date").value;
    if (!Number.isFinite(value) || value <= 0 || (type === "percent" && value > 100)) { notify(type === "percent" ? "할인율은 1~100%로 입력해주세요." : "할인 금액은 1원 이상 입력해주세요."); return; }
    if (maxAmount < 0) { notify("최대 할인 금액은 0원 이상으로 입력해주세요."); return; }
    if (!Number.isInteger(maxQty) || maxQty < 1) { notify("최대 적용 수량은 1매 이상으로 입력해주세요."); return; }
    if (startDate && endDate && startDate > endDate) { notify("적용 종료일은 시작일보다 빠를 수 없습니다."); return; }
    var allPrograms = byId("discount-all-programs").checked;
    var selectedPrograms = Array.from(document.querySelectorAll("#discount-program-options input:checked")).map(function (input) { return input.value; });
    if (!allPrograms && !selectedPrograms.length) { notify("할인을 적용할 프로그램을 하나 이상 선택해주세요."); return; }
    var existing = discountPolicies.find(function (discount) { return discount.id === id; });
    var saved = {
      id: id, name: name, type: type, value: value, maxAmount: maxAmount, maxQty: maxQty,
      scope: scope, proof: "onsite",
      startDate: startDate, endDate: endDate, stackable: false, restoreOnCancel: existing ? existing.restoreOnCancel : true,
      allPrograms: allPrograms, programs: selectedPrograms,
      excludedPrograms: allPrograms && existing ? existing.excludedPrograms || [] : [],
      active: byId("discount-active").checked
    };
    var index = discountPolicies.findIndex(function (discount) { return discount.id === id; });
    if (index === -1) discountPolicies.push(saved); else discountPolicies[index] = saved;
    byId("discount-id").value = id; saveDemoState(); renderDiscountPolicies(); renderKioskProducts();
    var currentProgram = activeProgramKey ? programCatalog().find(function (program) { return program.key === activeProgramKey; }) : null;
    if (currentProgram) renderProductDiscountOptions(currentProgram);
    byId("discount-dialog").close();
    notify(name + " 할인을 저장했습니다.");
  }

  function settlementScopeKey(location, department) { return location + " · " + department; }

  function settlementScopeOptions() {
    var seen = {};
    return Object.keys(settlementDetails).map(function (key) {
      var program = programs[key]; if (!program) return null;
      var scope = settlementScopeKey(program.location, program.department);
      return { scope: scope, region: program.location };
    }).filter(function (item) {
      if (!item || seen[item.scope]) return false;
      seen[item.scope] = true;
      return canManageRegion(item.region);
    });
  }

  function refreshSettlementScopeFilter() {
    var select = byId("settlement-scope-filter"); if (!select) return;
    var selected = select.value;
    var options = settlementScopeOptions();
    select.innerHTML = '<option value="">전체 지역 · 부서</option>' + options.map(function (item) { return '<option value="' + escapeHtml(item.scope) + '">' + escapeHtml(item.scope) + '</option>'; }).join("");
    var isRegionLocked = currentAccount && currentAccount.scope === "region";
    if (isRegionLocked && options.length === 1) { select.value = options[0].scope; select.disabled = true; }
    else if (isRegionLocked) {
      select.disabled = false;
      var ownScope = settlementScopeKey(currentAccount.region, currentAccount.department);
      var keepSelected = options.some(function (item) { return item.scope === selected; }) ? selected : null;
      select.value = keepSelected || (options.some(function (item) { return item.scope === ownScope; }) ? ownScope : "");
    } else { select.disabled = false; select.value = options.some(function (item) { return item.scope === selected; }) ? selected : ""; }
  }

  function settlementDailyInRange(daily, startDate, endDate) {
    return daily.filter(function (row) {
      var rowDate = row[0].replace(/\./g, "-");
      return (!startDate || rowDate >= startDate) && (!endDate || rowDate <= endDate);
    });
  }

  function settlementTotalsForKey(key, startDate, endDate) {
    var detail = settlementDetails[key];
    var rows = settlementDailyInRange(detail.daily, startDate, endDate);
    return rows.reduce(function (total, row) {
      var fee = row[3], payout = row[4], paid = row[2];
      total.completed += row[1]; total.paid += paid; total.fee += fee; total.payout += payout;
      total.refunded += paid - fee - payout;
      return total;
    }, { completed: 0, paid: 0, fee: 0, payout: 0, refunded: 0 });
  }

  function renderSettlementSummary() {
    var body = byId("settlement-summary-body"), foot = byId("settlement-summary-foot"), metrics = byId("settlement-metrics");
    if (!body) return;
    var startDate = byId("settlement-start-date").value;
    var endDate = byId("settlement-end-date").value;
    var scopeFilter = byId("settlement-scope-filter").value;
    var rows = Object.keys(settlementDetails).map(function (key) {
      var program = programs[key]; if (!program) return null;
      var scope = settlementScopeKey(program.location, program.department);
      return { key: key, program: settlementDetails[key].program, scope: scope, region: program.location, totals: settlementTotalsForKey(key, startDate, endDate) };
    }).filter(function (row) {
      return row && canManageRegion(row.region) && (!scopeFilter || row.scope === scopeFilter);
    });
    var grand = rows.reduce(function (total, row) {
      total.completed += row.totals.completed; total.paid += row.totals.paid; total.fee += row.totals.fee;
      total.payout += row.totals.payout; total.refunded += row.totals.refunded;
      return total;
    }, { completed: 0, paid: 0, fee: 0, payout: 0, refunded: 0 });
    metrics.innerHTML = '<article><small>총 결제액</small><strong>' + money(grand.paid) + '</strong></article><article><small>환불액</small><strong>−' + money(grand.refunded) + '</strong></article><article><small>결제 수수료</small><strong>−' + money(grand.fee) + '</strong></article><article class="is-emphasis"><small>정산 대상 금액</small><strong>' + money(grand.payout) + '</strong></article>';
    body.innerHTML = rows.length ? rows.map(function (row) {
      return '<tr class="settlement-row" data-settlement-program="' + row.key + '" tabindex="0"><td>' + escapeHtml(row.scope) + '</td><td><strong>' + escapeHtml(row.program) + '</strong></td><td>' + row.totals.completed.toLocaleString("ko-KR") + '건</td><td>' + money(row.totals.paid) + '</td><td class="negative">−' + money(row.totals.refunded) + '</td><td>−' + money(row.totals.fee) + '</td><td><strong>' + money(row.totals.payout) + '</strong></td><td><button type="button">상세 보기 <span>›</span></button></td></tr>';
    }).join("") : '<tr><td colspan="8" class="empty-table">조건에 맞는 정산 내역이 없습니다.</td></tr>';
    foot.innerHTML = rows.length ? '<tr><td colspan="2">합계</td><td>' + grand.completed.toLocaleString("ko-KR") + '건</td><td>' + money(grand.paid) + '</td><td>−' + money(grand.refunded) + '</td><td>−' + money(grand.fee) + '</td><td>' + money(grand.payout) + '</td><td></td></tr>' : "";
    body.querySelectorAll(".settlement-row").forEach(function (row) {
      row.addEventListener("click", function () { openSettlementDrawer(row.dataset.settlementProgram); });
      row.addEventListener("keydown", function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openSettlementDrawer(row.dataset.settlementProgram); } });
    });
  }

  function closeSettlementDrawer() {
    byId("settlement-drawer").hidden = true;
    byId("settlement-drawer-backdrop").hidden = true;
    activeSettlementKey = null;
  }

  function filteredSettlementTransactions() {
    var detail = settlementDetails[activeSettlementKey];
    if (!detail) return [];
    var search = byId("settlement-transaction-search").value.trim().toLowerCase();
    var type = byId("settlement-transaction-type").value;
    return detail.transactions.filter(function (row) {
      var matchesSearch = !search || (row[1] + " " + row[2]).toLowerCase().includes(search);
      var matchesType = !type || (type === "refund" ? row[5] > 0 : row[5] === 0);
      return matchesSearch && matchesType;
    });
  }

  function renderSettlementTransactions() {
    var rows = filteredSettlementTransactions();
    byId("settlement-transaction-count").textContent = rows.length.toLocaleString("ko-KR") + "건";
    byId("settlement-transaction-body").innerHTML = rows.length ? rows.map(function (row) {
      var statusClassName = row[5] > 0 ? " is-refund" : "";
      return '<tr><td><strong>' + escapeHtml(row[0]) + '</strong></td><td><strong>' + escapeHtml(row[1]) + '</strong><small>' + escapeHtml(row[2]) + '</small></td><td>' + row[3] + '명</td><td>' + money(row[4]) + '</td><td class="negative">' + (row[5] ? '−' + money(row[5]) : '0원') + '</td><td>−' + money(row[6]) + '</td><td><strong>' + money(row[7]) + '</strong></td><td><span class="ledger-status' + statusClassName + '">' + escapeHtml(row[8]) + '</span></td></tr>';
    }).join("") : '<tr><td colspan="8" class="empty-table">조건에 맞는 거래 내역이 없습니다.</td></tr>';
  }

  function openSettlementDrawer(programKey) {
    var detail = settlementDetails[programKey];
    if (!detail) return;
    activeSettlementKey = programKey;
    byId("settlement-drawer-title").textContent = detail.program;
    byId("settlement-drawer-scope").textContent = detail.scope + " · 2026.09.01 ~ 2026.09.30";
    byId("settlement-detail-metrics").innerHTML = '<article><small>완료 건수</small><strong>' + detail.completed.toLocaleString("ko-KR") + '건</strong></article><article><small>결제액</small><strong>' + money(detail.paid) + '</strong></article><article><small>환불액</small><strong>−' + money(detail.refunded) + '</strong></article><article><small>PG 수수료</small><strong>−' + money(detail.fee) + '</strong></article><article><small>지급 예정액</small><strong>' + money(detail.payout) + '</strong></article>';
    byId("settlement-daily-body").innerHTML = detail.daily.map(function (row) { return '<tr><td><strong>' + row[0] + '</strong></td><td>' + row[1].toLocaleString("ko-KR") + '건</td><td>' + money(row[2]) + '</td><td class="negative">−' + money(row[3]) + '</td><td><strong>' + money(row[4]) + '</strong></td></tr>'; }).join("");
    byId("settlement-transaction-search").value = "";
    byId("settlement-transaction-type").value = "";
    renderSettlementTransactions();
    byId("settlement-refund-list").innerHTML = detail.refunds.map(function (row) { return '<article><strong>' + escapeHtml(row[0]) + '</strong><span>' + escapeHtml(row[1]) + '</span><b>−' + money(row[2]) + '</b></article>'; }).join("");
    byId("settlement-drawer").hidden = false;
    byId("settlement-drawer-backdrop").hidden = false;
    byId("settlement-drawer-close").focus();
  }

  function openDrawer(reservationId) {
    activeReservation = allReservations().find(function (item) { return item.id === reservationId; });
    if (!activeReservation) return;
    byId("drawer-title").textContent = activeReservation.id;
    byId("drawer-summary").innerHTML = '<h3>' + escapeHtml(activeReservation.program) + '</h3><dl><div><dt>예약 식별</dt><dd>' + escapeHtml(activeReservation.id) + '</dd></div><div><dt>예약 상태</dt><dd><span class="table-status ' + statusClass(activeReservation.status) + '">' + activeReservation.status + '</span></dd></div><div><dt>이용일</dt><dd>' + escapeHtml(activeReservation.date) + '</dd></div><div><dt>회차</dt><dd>' + escapeHtml(activeReservation.time) + '</dd></div></dl>';
    renderDrawerTickets();
    byId("payment-detail").innerHTML = '<div><dt>통합 결제번호</dt><dd>' + escapeHtml(activeReservation.orderId) + '</dd></div><div><dt>결제 수단</dt><dd>' + escapeHtml(activeReservation.method) + '</dd></div><div><dt>결제·환불 상태</dt><dd>' + escapeHtml(paymentStatusLabel(activeReservation)) + '</dd></div><div><dt>원 결제금액</dt><dd>' + money(activeReservation.price) + '</dd></div><div><dt>환불 누계</dt><dd>' + money(ticketRefundTotal(activeReservation)) + '</dd></div><div><dt>남은 결제금액</dt><dd>' + money(activeReservation.price - ticketRefundTotal(activeReservation)) + '</dd></div>';
    var cancellationEvents = Array.isArray(activeReservation.cancellationEvents) ? activeReservation.cancellationEvents : [];
    var cancellationHistory = cancellationEvents.map(function (event) {
      var sourceLabel = event.source === "customer" ? "고객 직접 취소" : "관리자 처리";
      var actor = event.source === "admin" && event.actor ? " · " + escapeHtml(event.actor) : "";
      var memo = event.memo ? " · 메모: " + event.memo : "";
      return '<li><strong>' + escapeHtml(sourceLabel) + ' · ' + Number(event.qty || 0) + '명 환불 ' + money(Number(event.amount || 0)) + '</strong><small>' + escapeHtml(event.createdAt || "처리 시간 미기록") + actor + ' · ' + escapeHtml(event.reason || "사유 미기록") + escapeHtml(memo) + '</small></li>';
    }).join("");
    if (!cancellationHistory && activeReservation.tickets.some(function (ticket) { return ticket === "cancelled"; })) cancellationHistory = '<li><strong>관리자 처리 · 개별 티켓 환불</strong><small>기존 처리 건 · 상세 이력 미기록</small></li>';
    byId("history-list").innerHTML = '<li><strong>결제 및 예약 확정</strong><small>' + escapeHtml(activeReservation.createdAt) + ' · 시스템</small></li>' + cancellationHistory;
    byId("drawer-backdrop").hidden = false; byId("reservation-drawer").hidden = false; document.body.style.overflow = "hidden";
  }

  function openPaymentReceipt() {
    if (!activeReservation) return;
    var refund = ticketRefundTotal(activeReservation);
    byId("receipt-booking-info").innerHTML = '<div><dt>결제번호</dt><dd>' + escapeHtml(activeReservation.orderId) + '</dd></div><div><dt>예약번호</dt><dd>' + escapeHtml(activeReservation.id) + '</dd></div><div><dt>예약 상품</dt><dd>' + escapeHtml(activeReservation.program) + ' · ' + activeReservation.qty + '명</dd></div><div><dt>이용 일정</dt><dd>' + escapeHtml(activeReservation.date) + ' ' + escapeHtml(activeReservation.time) + '</dd></div><div><dt>운영 지점</dt><dd>' + escapeHtml(activeReservation.location) + ' · ' + escapeHtml(activeReservation.department) + '</dd></div>';
    byId("receipt-amount-info").innerHTML = '<div><dt>최초 결제금액</dt><dd>' + money(activeReservation.price) + '</dd></div><div><dt>환불금액</dt><dd>' + (refund ? '−' : '') + money(refund) + '</dd></div><div class="receipt-total"><dt>최종 결제금액</dt><dd>' + money(activeReservation.price - refund) + '</dd></div>';
    byId("receipt-payment-info").innerHTML = '<div><dt>결제일시</dt><dd>' + escapeHtml(activeReservation.createdAt) + '</dd></div><div><dt>결제수단</dt><dd>' + escapeHtml(activeReservation.method) + '</dd></div><div><dt>결제상태</dt><dd>' + escapeHtml(paymentStatusLabel(activeReservation)) + '</dd></div>';
    byId("payment-receipt-dialog").showModal();
  }

  function ticketUnitPrice(reservation) { return reservation.qty ? Math.floor(reservation.price / reservation.qty) : 0; }
  function ticketRefundTotal(reservation) {
    var cancelledCount = reservation.tickets.filter(function (ticket) { return ticket === "cancelled"; }).length;
    if (!cancelledCount) return 0;
    if (cancelledCount === reservation.tickets.length) return reservation.price;
    return cancelledCount * ticketUnitPrice(reservation);
  }
  function paymentStatusLabel(reservation) {
    var cancelled = reservation.tickets.filter(function (ticket) { return ticket === "cancelled"; }).length;
    if (cancelled === reservation.tickets.length) return "전액 환불 완료";
    if (cancelled > 0) return "부분 환불 완료";
    return "결제 완료";
  }

  function renderDrawerTickets() {
    var list = byId("individual-tickets"); list.replaceChildren();
    var canManage = canManageRegion(activeReservation.location);
    activeReservation.tickets.forEach(function (status, index) {
      var label = document.createElement("label"); label.className = "individual-ticket" + (status !== "confirmed" ? " is-cancelled" : "");
      label.innerHTML = '<input type="checkbox" value="' + index + '" ' + (status !== "confirmed" || !canManage ? "disabled" : "") + '><span><strong>' + escapeHtml(activeReservation.id) + '-T' + String(index + 1).padStart(2, "0") + '</strong><small>배분 결제액 ' + money(ticketUnitPrice(activeReservation)) + '</small></span>' + (status === "cancelled" ? '<span class="ticket-cancelled-status">취소 완료</span>' : '');
      label.querySelector("input").addEventListener("change", updateSelectedTickets); list.append(label);
    });
    byId("cancel-selected").title = canManage ? "" : "다른 지역 예약은 조회만 가능합니다.";
    updateSelectedTickets();
  }

  function updateSelectedTickets() {
    var selected = document.querySelectorAll("#individual-tickets input:checked");
    byId("selected-ticket-count").textContent = selected.length + "명";
    byId("cancel-selected").disabled = selected.length === 0;
  }

  function closeDrawer() { byId("drawer-backdrop").hidden = true; byId("reservation-drawer").hidden = true; document.body.style.overflow = ""; activeReservation = null; }

  function openCancelDialog() {
    var count = document.querySelectorAll("#individual-tickets input:checked").length;
    byId("refund-count").textContent = count + "명";
    byId("refund-amount").textContent = money(count * ticketUnitPrice(activeReservation));
    byId("cancel-reason").value = ""; byId("cancel-memo").value = ""; byId("cancel-dialog").showModal();
  }

  function confirmCancellation() {
    if (!byId("cancel-reason").value) { notify("취소 사유를 선택해주세요."); return; }
    var selected = Array.from(document.querySelectorAll("#individual-tickets input:checked")).map(function (input) { return Number(input.value); });
    selected.forEach(function (index) { activeReservation.tickets[index] = "cancelled"; });
    activeReservation.cancellationEvents = activeReservation.cancellationEvents || [];
    activeReservation.cancellationEvents.push({ source: "admin", actor: "박지윤 매니저", qty: selected.length, amount: selected.length * ticketUnitPrice(activeReservation), reason: byId("cancel-reason").value, memo: byId("cancel-memo").value.trim(), createdAt: new Date().toLocaleString("ko-KR") });
    var validCount = activeReservation.tickets.filter(function (ticket) { return ticket === "confirmed"; }).length;
    activeReservation.status = validCount === 0 ? "취소 완료" : "부분 취소";
    saveDemoState(); byId("cancel-dialog").close();
    var activeId = activeReservation.id; openDrawer(activeId); renderReservations();
    notify(selected.length + "명의 티켓을 취소하고 " + money(selected.length * ticketUnitPrice(activeReservation)) + " 부분환불 처리했습니다.");
  }

  function downloadCsv(filename, rows) {
    var csv = "\ufeff" + rows.map(function (row) { return row.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
    var url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    var link = document.createElement("a"); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    notify("자료를 내려받았습니다.");
  }

  prepareDiscountFormFields();
  loadSavedDemoState();
  currentAccount = restoreAdminSession();
  setAdminLoginState(!!currentAccount);
  if (currentAccount) renderAdminIdentity();
  lockAccountFilterSelects();
  renderReservations(); renderKioskProducts();

  document.querySelectorAll("[data-admin-view]").forEach(function (button) { button.addEventListener("click", function () { showView(button.dataset.adminView); }); });
  byId("admin-logout").addEventListener("click", function () { saveAdminSession("signed-out"); currentAccount = null; setAdminLoginState(false); lockAccountFilterSelects(); });
  byId("admin-login-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var enteredId = byId("admin-login-id").value.trim();
    var account = adminAccounts.find(function (item) { return item.id === enteredId && item.password === byId("admin-login-password").value; });
    byId("admin-login-error").hidden = !!account;
    if (!account) { byId("admin-login-password").focus(); return; }
    currentAccount = account;
    saveAdminSession(account.id); setAdminLoginState(true); renderAdminIdentity();
    lockAccountFilterSelects();
    renderKioskProducts(); renderReservations(); lockOperationRegionSelect();
    refreshSettlementScopeFilter(); renderSettlementSummary();
    notify("로그인했습니다.");
  });
  document.querySelectorAll("[data-go-view]").forEach(function (button) { button.addEventListener("click", function () { showView(button.dataset.goView); }); });
  ["reservation-search", "reservation-department", "reservation-date", "reservation-end-date", "reservation-program", "reservation-status"].forEach(function (id) { byId(id).addEventListener(id === "reservation-search" ? "input" : "change", function () { reservationPage = 1; renderReservations(); }); });
  byId("reservation-location").addEventListener("change", function () { refreshDepartmentSelect("reservation-department", byId("reservation-location").value, ""); reservationPage = 1; renderReservations(); });
  byId("reset-filters").addEventListener("click", function () { byId("reservation-search").value = ""; byId("reservation-date").value = ""; byId("reservation-end-date").value = ""; byId("reservation-program").value = ""; byId("reservation-status").value = ""; lockLocationFilterSelect("reservation-location", "reservation-department"); reservationPage = 1; renderReservations(); });
  byId("reservation-prev-page").addEventListener("click", function () { if (reservationPage > 1) changeReservationPage(reservationPage - 1); });
  byId("reservation-next-page").addEventListener("click", function () { changeReservationPage(reservationPage + 1); });
  byId("reservation-page-buttons").addEventListener("click", function (event) { var button = event.target.closest("[data-reservation-page]"); if (button) changeReservationPage(Number(button.dataset.reservationPage)); });
  byId("drawer-close").addEventListener("click", closeDrawer); byId("drawer-backdrop").addEventListener("click", closeDrawer);
  byId("open-payment-receipt").addEventListener("click", openPaymentReceipt);
  byId("cancel-selected").addEventListener("click", openCancelDialog); byId("confirm-cancel").addEventListener("click", confirmCancellation);
  byId("mobile-menu").addEventListener("click", function () { document.querySelector(".admin-sidebar").classList.toggle("is-open"); });
  byId("kiosk-product-search-form").addEventListener("submit", function (event) { event.preventDefault(); renderKioskProducts(); });
  byId("kiosk-location-filter").addEventListener("change", function () { refreshDepartmentSelect("kiosk-department-filter", byId("kiosk-location-filter").value, ""); renderKioskProducts(); });
  byId("kiosk-department-filter").addEventListener("change", renderKioskProducts);
  byId("refresh-products").addEventListener("click", function () { byId("kiosk-product-search").value = ""; lockLocationFilterSelect("kiosk-location-filter", "kiosk-department-filter"); renderKioskProducts(); notify("전체 프로그램 목록을 새로고침했습니다."); });
  byId("add-product").addEventListener("click", function () {
    var ownLocation = currentAccount && currentAccount.scope === "region" ? currentAccount.region : "서울";
    var ownDepartment = currentAccount && currentAccount.scope === "region" ? currentAccount.department : "공원화사업추진TF";
    openProductDialog({ location: ownLocation, department: ownDepartment, programType: "기타", settlementTag: "", purchaseGroup: "", conflictGroup: "", bookingWindow: 14, cancelMinutes: 10, cancelOffsetValue: 10, cancelOffsetUnit: "minutes", saleStartDate: "2026-09-01", saleEndDate: "2026-12-31", visibleStartAt: "2026-09-01T00:00", visibleEndAt: "2026-12-31T23:59", saleDays: [6, 0], programName: "", price: 0, image: "", discountIds: [], active: true });
  });
  byId("detail-location").addEventListener("change", function () { var location = byId("detail-location").value; refreshDepartmentSelect("detail-department", location, organization[location][0]); });
  byId("discount-settings").addEventListener("click", function () { openDiscountManager(); });
  byId("add-discount-policy").addEventListener("click", function () { editDiscountPolicy(null); renderDiscountPolicies(); });
  byId("discount-type").addEventListener("change", updateDiscountConstraintFields);
  byId("discount-all-programs").addEventListener("change", function () { renderDiscountProgramOptions(Array.from(document.querySelectorAll("#discount-program-options input:checked")).map(function (input) { return input.value; })); });
  byId("save-discount-policy").addEventListener("click", saveDiscountPolicy);
  byId("delete-discount-policy").addEventListener("click", deleteDiscountPolicy);
  byId("open-discounts-from-product").addEventListener("click", function () {
    var draftProgram = { programName: byId("detail-program").value.trim(), key: activeProgramKey };
    openDiscountPicker(draftProgram);
  });
  byId("apply-discount-picker").addEventListener("click", function () {
    applyDiscountPickerSelection({ programName: byId("detail-program").value.trim(), key: activeProgramKey });
  });
  byId("detail-image").addEventListener("change", function (event) {
    var file = event.target.files && event.target.files[0];
    var imagePreview = byId("detail-image-preview");
    if (!file) { pendingImageDataUrl = null; imagePreview.src = ""; imagePreview.hidden = true; return; }
    var reader = new FileReader();
    reader.onload = function () {
      pendingImageDataUrl = reader.result;
      imagePreview.src = pendingImageDataUrl;
      imagePreview.hidden = false;
    };
    reader.readAsDataURL(file);
  });
  byId("save-product-detail").addEventListener("click", saveProductDetail);
  byId("program-edit-back").addEventListener("click", function () { pendingDiscountAdditions = []; pendingDiscountRemovals = []; showView("programs"); });
  byId("program-sessions-back").addEventListener("click", function () { showView("programs"); });
  byId("add-session").addEventListener("click", function () { editSession(null); });
  byId("cancel-session-edit").addEventListener("click", function () { byId("session-editor").hidden = true; activeSessionKey = null; });
  byId("save-session").addEventListener("click", saveSession);
  document.querySelectorAll('input[name="operation-closure-mode"]').forEach(function (input) { input.addEventListener("change", updateOperationClosureMessage); });
  byId("confirm-operation-closure").addEventListener("click", confirmOperationClosure);
  byId("operation-closure-confirm-dialog").addEventListener("close", function () { pendingOperationClosureAction = null; });
  byId("confirm-program-delete").addEventListener("click", confirmProgramDeletion);
  byId("program-delete-confirm-dialog").addEventListener("close", function () { pendingProgramDeletion = null; });
  byId("apply-settlement").addEventListener("click", function () { renderSettlementSummary(); notify("선택한 기간의 정산 내역을 조회했습니다."); });
  byId("settlement-drawer-close").addEventListener("click", closeSettlementDrawer);
  byId("settlement-drawer-confirm").addEventListener("click", closeSettlementDrawer);
  byId("settlement-drawer-backdrop").addEventListener("click", closeSettlementDrawer);
  byId("settlement-transaction-search").addEventListener("input", renderSettlementTransactions);
  byId("settlement-transaction-type").addEventListener("change", renderSettlementTransactions);
  byId("download-settlement-detail").addEventListener("click", function () {
    var detail = settlementDetails[activeSettlementKey]; if (!detail) return;
    var rows = [["서비스 완료일", "지역·부서", "프로그램", "예약번호", "결제번호", "인원", "결제액", "환불액", "PG 수수료", "지급 예정액", "상태"]];
    filteredSettlementTransactions().forEach(function (row) { rows.push([row[0], detail.scope, detail.program, row[1], row[2], row[3], row[4], -row[5], -row[6], row[7], row[8]]); });
    downloadCsv("렛츠런파크_" + detail.program + "_거래원장.csv", rows);
  });
  byId("operation-region").addEventListener("change", function () { renderOperationCalendar(); renderOperationExceptions(); if (selectedOperationDateKey) renderOperationDayQuick(selectedOperationDateKey); });
  byId("operation-month-prev").addEventListener("click", function () { operationCalendarMonth = new Date(operationCalendarMonth.getFullYear(), operationCalendarMonth.getMonth() - 1, 1); renderOperationCalendar(); });
  byId("operation-month-next").addEventListener("click", function () { operationCalendarMonth = new Date(operationCalendarMonth.getFullYear(), operationCalendarMonth.getMonth() + 1, 1); renderOperationCalendar(); });
  byId("download-reservations").addEventListener("click", function () {
    var items = filteredReservations();
    if (!items.length) { notify("내려받을 예약 내역이 없습니다."); return; }
    var rows = [["예약번호", "지역", "담당부서", "프로그램", "이용일", "회차", "인원", "결제금액", "상태"]];
    items.forEach(function (item) { rows.push([item.id, item.location, item.department, item.program, item.date, item.time, item.qty, item.price, item.status]); });
    downloadCsv("렛츠런플레이_통합예약목록.csv", rows);
  });
  byId("download-settlement").addEventListener("click", function () {
    var startDate = byId("settlement-start-date").value, endDate = byId("settlement-end-date").value, scopeFilter = byId("settlement-scope-filter").value;
    var rows = [["지역", "담당부서", "정산태그", "프로그램", "완료건수", "결제액", "환불액", "PG수수료", "지급예정액"]];
    Object.keys(settlementDetails).forEach(function (key) {
      var program = programs[key]; if (!program || !canManageRegion(program.location)) return;
      var scope = settlementScopeKey(program.location, program.department);
      if (scopeFilter && scope !== scopeFilter) return;
      var totals = settlementTotalsForKey(key, startDate, endDate);
      rows.push([program.location, program.department, program.settlementTag || "", settlementDetails[key].program, totals.completed, totals.paid, -totals.refunded, -totals.fee, totals.payout]);
    });
    downloadCsv("렛츠런플레이_부서별정산_" + (startDate || "전체") + "_" + (endDate || "전체") + ".csv", rows);
  });
  function openDeveloperPolicy() {
    if (window.DeveloperPolicy) { window.DeveloperPolicy.toggle(); return; }
    if (!byId("developer-policy-dialog").open) byId("developer-policy-dialog").showModal();
  }
  document.addEventListener("keydown", function (event) {
    if (event.altKey && !event.metaKey && (event.code === "KeyP" || event.key.toLowerCase() === "p")) {
      event.preventDefault();
      openDeveloperPolicy();
    }
  });

  document.querySelectorAll("dialog").forEach(function (dialog) {
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
  });

  var requestedView = location.hash.replace("#", "");
  if (["reservations", "programs", "operations", "settlement"].includes(requestedView)) showView(requestedView);
  else showView("programs");
})();
