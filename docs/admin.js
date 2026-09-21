(function () {
  "use strict";

  var reservationStoreKey = "ponylandBookingStoreV3";
  var adminStateKey = "letsrunPlayAdminDemoV4";
  var adminSessionKey = "letsrunPlayAdminSessionV1";
  try {
    localStorage.removeItem("ponylandBookingStoreV2");
    localStorage.removeItem("letsrunPlayAdminDemoV3");
  } catch (error) { /* Storage cleanup is best-effort in restricted browsers. */ }
  var toastTimer;
  var activeReservation = null;
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
    { id: "admin", password: "1234", scope: "all" },
    { id: "seoul_brand", password: "brand1234", scope: "department", region: "서울", department: "브랜드총괄부" },
    { id: "seoul_park", password: "park1234", scope: "department", region: "서울", department: "공원화사업추진TF" },
    { id: "busan_ops", password: "busan1234", scope: "department", region: "부산경남", department: "부산운영지원부" },
    { id: "jeju_ops", password: "jeju1234", scope: "department", region: "제주", department: "제주운영지원부" }
  ];
  var currentAccount = null;

  function canManageDepartment(region, department) {
    return !!currentAccount && (currentAccount.scope === "all" || (currentAccount.region === region && currentAccount.department === department));
  }

  // Department accounts start from their own region, but may browse other departments'
  // programs. Mutation controls remain locked by canManageDepartment.
  function lockOperationRegionSelect() {
    var select = byId("operation-region"); if (!select) return;
    var isDepartmentAccount = currentAccount && currentAccount.scope === "department";
    select.disabled = false;
    if (isDepartmentAccount && !select.dataset.scopeInitialized) {
      select.value = currentAccount.region;
      select.dataset.scopeInitialized = "true";
    }
  }

  // Reservations and settlement contain private operational data and are limited to the
  // account's department. The program catalog remains visible across departments as read-only.
  function lockLocationFilterSelect(locationId, departmentId, ownDepartmentOnly) {
    var locationSelect = byId(locationId); if (!locationSelect) return;
    var isDepartmentLocked = currentAccount && currentAccount.scope === "department" && ownDepartmentOnly;
    if (isDepartmentLocked) {
      locationSelect.innerHTML = '<option>' + escapeHtml(currentAccount.region) + '</option>';
      locationSelect.value = currentAccount.region;
      locationSelect.disabled = true;
      if (departmentId) {
        var departmentSelect = byId(departmentId);
        departmentSelect.innerHTML = '<option>' + escapeHtml(currentAccount.department) + '</option>';
        departmentSelect.value = currentAccount.department;
        departmentSelect.disabled = true;
      }
    } else {
      locationSelect.innerHTML = '<option value="">전체 지역</option>' + Object.keys(organization).map(function (region) { return '<option>' + escapeHtml(region) + '</option>'; }).join("");
      locationSelect.value = "";
      locationSelect.disabled = false;
      if (departmentId) { byId(departmentId).disabled = false; refreshDepartmentSelect(departmentId, "", ""); }
    }
  }

  function lockAccountFilterSelects() {
    lockLocationFilterSelect("reservation-location", "reservation-department", true);
    lockLocationFilterSelect("kiosk-location-filter", "kiosk-department-filter", false);
  }

  var defaultBookingWindow = 14;
  var defaultCancelMinutes = 10;
  var defaultArrivalLeadMinutes = 20;
  var discountPolicies = [];
  var catalogState = { programOverrides: {}, addedPrograms: [], sessionOverrides: {}, addedSessions: [] };

  var demoReservations = [
    { id: "LRP-260902-00005-G01", reservationId: "LRP-260902-00005", legacyId: "LRP-260902-00005-1", orderId: "PAY-260902-3018", memberId: "demo:카카오:1", programKey: "ride", program: "포니 타기", dateKey: "2026-09-05", date: "2026.09.05 (토)", time: "10:00~10:20", qty: 3, price: 15000, discount: false, status: "예약 확정", createdAt: "2026-09-02 10:42", method: "신용카드", tickets: ["confirmed", "confirmed", "confirmed"] },
    { id: "LRP-260902-00004-G01", reservationId: "LRP-260902-00004", legacyId: "LRP-260902-00004-1", orderId: "PAY-260902-3012", memberId: "demo:네이버:2", programKey: "play", program: "포니랑 놀기", dateKey: "2026-09-05", date: "2026.09.05 (토)", time: "10:20~10:45", qty: 2, price: 4000, discount: true, discountQty: 2, discountPolicyId: "gwacheon", discountLabel: "과천시민 50% 할인", status: "부분 취소", createdAt: "2026-09-02 10:36", method: "신용카드", tickets: ["confirmed", "cancelled"], cancellationEvents: [{ source: "customer", qty: 1, amount: 2000, reason: "고객 직접 취소", createdAt: "2026-09-03 14:20" }] },
    { id: "LRP-260902-00003-G01", reservationId: "LRP-260902-00003", legacyId: "LRP-260902-00003-1", orderId: "PAY-260902-2998", memberId: "demo:카카오:2", programKey: "ride", program: "포니 타기", dateKey: "2026-09-06", date: "2026.09.06 (일)", time: "11:00~11:20", qty: 1, price: 2500, discount: true, discountQty: 1, discountPolicyId: "gwacheon", discountLabel: "과천시민 50% 할인", status: "취소 완료", paymentStatus: "전액 환불 완료", createdAt: "2026-09-02 10:19", method: "신용카드", tickets: ["cancelled"] },
    { id: "LRP-260902-00002-G01", reservationId: "LRP-260902-00002", legacyId: "LRP-260902-00002-1", orderId: "PAY-260902-2971", memberId: "demo:네이버:1", programKey: "play", program: "포니랑 놀기", dateKey: "2026-09-06", date: "2026.09.06 (일)", time: "13:20~13:45", qty: 4, price: 16000, discount: false, status: "예약 확정", createdAt: "2026-09-02 09:51", method: "신용카드", tickets: ["confirmed", "confirmed", "confirmed", "confirmed"] },
    { id: "LRP-260902-00001-G01", reservationId: "LRP-260902-00001", legacyId: "LRP-260902-00001-1", orderId: "PAY-260902-2944", memberId: "demo:카카오:1", programKey: "ride", program: "포니 타기", dateKey: "2026-09-12", date: "2026.09.12 (토)", time: "14:20~14:45", qty: 2, price: 5000, discount: true, discountQty: 2, discountPolicyId: "gwacheon", discountLabel: "과천시민 50% 할인", status: "예약 확정", createdAt: "2026-09-02 09:27", method: "신용카드", tickets: ["confirmed", "confirmed"] },
    { id: "LRP-260902-00001-G02", reservationId: "LRP-260902-00001", legacyId: "LRP-260902-00001-2", orderId: "PAY-260902-2944", memberId: "demo:카카오:1", programKey: "play", program: "포니랑 놀기", dateKey: "2026-09-12", date: "2026.09.12 (토)", time: "15:20~15:45", qty: 1, price: 4000, discount: false, status: "예약 확정", createdAt: "2026-09-02 09:27", method: "신용카드", tickets: ["confirmed"] },
    { id: "LRP-260901-00001-G01", reservationId: "LRP-260901-00001", legacyId: "LRP-260901-00001-1", orderId: "PAY-260901-2886", memberId: "demo:네이버:2", programKey: "play", program: "포니랑 놀기", dateKey: "2026-09-12", date: "2026.09.12 (토)", time: "15:00~15:20", qty: 1, price: 4000, discount: false, status: "취소 완료", createdAt: "2026-09-01 18:44", method: "신용카드", tickets: ["cancelled"], cancellationEvents: [{ source: "admin", qty: 1, amount: 4000, reason: "운영사 사정", createdAt: "2026-09-02 09:10" }] }
  ];

  if (window.HolidayDemo) demoReservations = demoReservations.concat(window.HolidayDemo.reservations);

  var settlementDetails = {
    ride: { program: "포니 타기", scope: "서울 · 공원화사업추진TF", completed: 982, paid: 5210000, refunded: 210000, fee: 150000, payout: 4850000, daily: [["2026.09.05", 324, 1720000, 60000, 1610000], ["2026.09.12", 346, 1830000, 90000, 1686000], ["2026.09.19", 312, 1660000, 60000, 1554000]], transactions: [["2026.09.05", "LRP-260902-00005", "PAY-260902-3018", 3, 15000, 0, 450, 14550, "결제 완료"], ["2026.09.06", "LRP-260902-00003", "PAY-260902-2998", 1, 2500, 2500, 0, 0, "전체 환불"], ["2026.09.12", "LRP-260902-00001", "PAY-260902-2944", 2, 5000, 0, 150, 4850, "결제 완료"], ["2026.09.12", "LRP-260912-00003", "PAY-260912-3811", 4, 20000, 5000, 450, 14550, "부분 환불"], ["2026.09.19", "LRP-260919-00001", "PAY-260919-4172", 2, 10000, 0, 300, 9700, "결제 완료"]], refunds: [["2026.09.05 · 전체 환불 8건", "고객 요청 외 2개 사유", 60000], ["2026.09.12 · 부분 환불 14건", "인원별 부분취소", 90000], ["2026.09.19 · 전체·부분 환불 9건", "운영 취소 포함", 60000]] },
    play: { program: "포니랑 놀기", scope: "서울 · 공원화사업추진TF", completed: 604, paid: 3210000, refunded: 116000, fee: 92820, payout: 3001180, daily: [["2026.09.05", 204, 1080000, 36000, 1012000], ["2026.09.12", 216, 1120000, 40000, 1047000], ["2026.09.19", 184, 1010000, 40000, 942180]], transactions: [["2026.09.05", "LRP-260902-00004", "PAY-260902-3012", 2, 8000, 4000, 120, 3880, "부분 환불"], ["2026.09.06", "LRP-260902-00002", "PAY-260902-2971", 4, 16000, 0, 480, 15520, "결제 완료"], ["2026.09.12", "LRP-260912-00001", "PAY-260912-3758", 2, 8000, 0, 240, 7760, "결제 완료"], ["2026.09.12", "LRP-260912-00002", "PAY-260912-3884", 3, 12000, 4000, 240, 7760, "부분 환불"], ["2026.09.19", "LRP-260919-00002", "PAY-260919-4263", 1, 4000, 4000, 0, 0, "전체 환불"]], refunds: [["2026.09.05 · 부분 환불 6건", "인원별 부분취소", 36000], ["2026.09.12 · 전체 환불 5건", "고객 요청", 40000], ["2026.09.19 · 전체·부분 환불 7건", "운영 취소 포함", 40000]] }
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
    ride: { name: "포니 타기", price: 5000, image: "assets/pony/cover.jpg", location: "서울", department: "공원화사업추진TF", programType: "승마체험", settlementTag: "SEOUL-PARK-TF", purchaseGroup: "SEOUL-PONY", conflictGroup: "SEOUL-PONY", bookingWindow: 14, arrivalLeadMinutes: 20, cancelMinutes: 10, cancelOffsetValue: 10, cancelOffsetUnit: "minutes", saleStartDate: "2026-09-01", saleEndDate: "2026-12-31", visibleStartAt: "2026-08-25T09:00", visibleEndAt: "2026-12-31T23:59", saleDays: [6, 0], guidanceText: "[이용 대상] 키 100cm 이상, 초등학생 이하 어린이만 이용할 수 있습니다.\n[체험 방법] 안전장구를 착용하고 진행요원의 안내에 따라 체험해주세요.\n[준비 사항] 활동하기 편한 복장과 운동화를 착용해주세요.", requiresGuidanceConfirmation: false, discountIds: [], active: true },
    play: { name: "포니랑 놀기", price: 4000, image: "assets/pony/gallery-02.jpg", location: "서울", department: "공원화사업추진TF", programType: "승마체험", settlementTag: "SEOUL-PARK-TF", purchaseGroup: "SEOUL-PONY", conflictGroup: "SEOUL-PONY", bookingWindow: 14, arrivalLeadMinutes: 20, cancelMinutes: 10, cancelOffsetValue: 10, cancelOffsetUnit: "minutes", saleStartDate: "2026-09-01", saleEndDate: "2026-12-31", visibleStartAt: "2026-08-25T09:00", visibleEndAt: "2026-12-31T23:59", saleDays: [6, 0], guidanceText: "[이용 대상] 연령 제한 없이 누구나 이용할 수 있습니다.\n[체험 방법] 포니 빗질하기, 꾸며주기, 산책하기 순서로 진행됩니다.\n[준비 사항] 어린이는 보호자와 함께 방문해주세요.", requiresGuidanceConfirmation: false, discountIds: [], noticeText: "포니의 건강을 위해 먹이주기는 진행하지 않습니다.", active: true }
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
    user.querySelector("strong").textContent = currentAccount.scope === "all" ? "통합 운영 관리자" : currentAccount.department;
    user.querySelector("small").textContent = currentAccount.scope === "all" ? "전체 지역·부서" : currentAccount.region + " · 관리자";
  }
  function currentAdminActor() { return currentAccount ? currentAccount.id : "admin"; }
  function renderAdminNavigation() {
    var isIntegratedAdmin = !!currentAccount && currentAccount.scope === "all";
    document.querySelectorAll("[data-integrated-admin-only]").forEach(function (item) { item.hidden = !isIntegratedAdmin; });
  }
  function prepareDiscountFormFields() {
    var form = document.querySelector(".discount-form-grid");
    if (!form) return;
    form.innerHTML = '<label><span>할인명 *</span><input id="discount-name" placeholder="예: 어린이 무료 할인" required></label>' +
      '<label><span>할인 방식 *</span><select id="discount-type" required><option value="percent">정률 할인 (%)</option><option value="fixed">정액 할인 (원)</option></select></label>' +
      '<label class="field-wide"><span id="discount-value-label">할인율 *</span><span class="discount-input-suffix"><input id="discount-value" type="number" min="0" value="50" required><em id="discount-value-unit">%</em></span></label>' +
      '<label class="field-wide"><span>할인 안내 문구</span><input id="discount-notice" type="text" maxlength="120" placeholder="예: 체험 전 증빙서류를 반드시 지참해주세요."><small class="field-help">사용자 예약 화면의 할인 항목 아래에 표시됩니다. 비워두면 노출하지 않습니다.</small></label>' +
      '<div class="discount-section-title field-wide"><strong>사용 제한</strong><small>수량 한도는 계정당 이용일마다 합산하며, 증빙은 현장에서 확인합니다.</small></div>' +
      '<label><span>최대 적용 수량 *</span><span class="discount-input-suffix"><input id="discount-max-qty" type="number" min="1" step="1" value="1" required><em>매</em></span></label>' +
      '<label style="grid-column:1"><span>할인 적용 시작일</span><input id="discount-start-date" type="date"><small class="field-help">이용일 기준입니다. 비워두면 시작일 제한이 없습니다.</small></label>' +
      '<label><span>할인 적용 종료일</span><input id="discount-end-date" type="date"><small class="field-help">이용일 기준입니다. 비워두면 종료일 제한이 없습니다.</small></label>' +
      '<fieldset class="field-wide" aria-required="true"><legend>적용 프로그램 *</legend><label class="policy-toggle"><input id="discount-all-programs" type="checkbox"><span><strong>모든 프로그램에 적용</strong><small>체크하지 않으면 아래에서 적용할 프로그램을 선택합니다.</small></span></label><div id="discount-program-options" class="discount-program-options"></div></fieldset>' +
      '<label class="policy-toggle field-wide"><input id="discount-active" type="checkbox" checked><span><strong>할인 활성화</strong><small>활성화한 할인만 신규 예약에 적용됩니다. 기존 예약의 할인 금액은 변경되지 않습니다.</small></span></label>';
  }
  function prepareProgramGuidanceFields() {
    var noticeField = byId("detail-notice").closest("label");
    if (!noticeField || byId("program-guidance-editor")) return;
    var section = document.createElement("section");
    section.id = "program-guidance-editor";
    section.className = "program-guidance-editor field-wide";
    section.innerHTML = '<h3 class="program-guidance-title">이용 전 확인사항</h3><p class="program-guidance-intro">예약 화면에 표시할 확인사항을 입력해주세요. 미입력 시 노출되지 않습니다.<br>입력된 경우 사용자는 확인 체크 후 결제할 수 있습니다.</p><label class="program-guidance-content"><textarea id="program-guidance-text" rows="8" maxlength="1000" aria-label="이용 전 확인사항 내용" placeholder="예: [이용 대상] 키 100cm 이상, 초등학생 이하 어린이만 이용할 수 있습니다.\n[준비 사항] 활동하기 편한 복장과 운동화를 착용해주세요."></textarea></label>';
    noticeField.after(section);
  }
  function guidanceItemsToText(items) {
    return (Array.isArray(items) ? items : []).map(function (item) {
      var title = String(item && item.title || "").trim();
      var content = String(item && item.content || "").trim();
      return [title ? "[" + title + "]" : "", content].filter(Boolean).join(" ");
    }).filter(Boolean).join("\n");
  }
  function renderProgramGuidanceEditor(text, legacyItems) {
    byId("program-guidance-text").value = typeof text === "string" ? text : guidanceItemsToText(legacyItems);
  }
  function money(value) { return new Intl.NumberFormat("ko-KR").format(value) + "원"; }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, function (char) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]; }); }
  function notify(message) {
    var toast = document.querySelector(".toast");
    toast.textContent = message; toast.classList.add("is-on"); clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 3200);
  }
  var programCreatedToastKey = "letsrunProgramCreatedToast";
  var programCreatedToastMessage = "프로그램이 등록되었습니다. 예약 가능한 회차를 등록해 주세요.";

  function loadSavedDemoState() {
    try {
      var state = JSON.parse(localStorage.getItem(adminStateKey) || "null");
      if (!state) return;
      if (Array.isArray(state.reservations)) {
        state.reservations.forEach(function (saved) {
          var target = demoReservations.find(function (item) { return item.id === saved.id || item.legacyId === saved.id; });
          if (target && Array.isArray(saved.tickets)) { target.tickets = saved.tickets.map(function (ticket) { return ticket === "review" ? "cancelled" : ticket; }); target.status = saved.status === "환불 확인" || saved.status === "취소 처리 중" ? "취소 완료" : saved.status; target.paymentStatus = saved.status === "환불 확인" || saved.status === "취소 처리 중" ? "전액 환불 완료" : saved.paymentStatus || target.paymentStatus; if (Array.isArray(saved.cancellationEvents)) target.cancellationEvents = saved.cancellationEvents; }
        });
      }
      if (Array.isArray(state.discountsV2)) discountPolicies = state.discountsV2;
      discountPolicies = discountPolicies.map(function (discount) {
        var policy = Object.assign({ maxQty: 1, noticeText: "", scope: "day", proof: "onsite", startDate: "", endDate: "", stackable: false, restoreOnCancel: true }, discount);
        delete policy.maxAmount;
        return policy;
      });
      if (state.catalog && typeof state.catalog === "object") {
        catalogState.programOverrides = state.catalog.programOverrides || {};
        catalogState.addedPrograms = Array.isArray(state.catalog.addedPrograms) ? state.catalog.addedPrograms : [];
        catalogState.sessionOverrides = state.catalog.sessionOverrides || {};
        catalogState.addedSessions = Array.isArray(state.catalog.addedSessions) ? state.catalog.addedSessions : [];
      }
      if (Array.isArray(state.operationExceptions)) operationExceptions = state.operationExceptions.filter(function (item) { return item.status !== "open"; }).map(function (item) { return Object.assign({ programKey: "all", status: "closed" }, item); });
    } catch (error) { /* Keep the review prototype usable if browser storage is unavailable. */ }
  }

  function saveDemoState() {
    try { localStorage.setItem(adminStateKey, JSON.stringify({ reservations: demoReservations.map(function (item) { return { id: item.id, status: item.status, paymentStatus: item.paymentStatus || "결제 완료", tickets: item.tickets, cancellationEvents: item.cancellationEvents || [] }; }), discountsV2: discountPolicies, catalog: catalogState, operationExceptions: operationExceptions })); }
    catch (error) { notify("변경사항을 이 브라우저에 저장하지 못했습니다."); }
  }

  function storedTicketRecords(store) {
    if (!store || !Array.isArray(store.reservations)) return [];
    return store.reservations.reduce(function (records, reservation) {
      if (!reservation) return records;
      if (Array.isArray(reservation.tickets) && reservation.tickets.some(function (ticket) { return ticket && typeof ticket === "object"; })) {
        reservation.tickets.forEach(function (ticket) {
          records.push(Object.assign({ memberId: reservation.memberId, reservationId: reservation.id, paymentId: reservation.paymentId, createdAt: reservation.createdAt, paymentMethod: reservation.paymentMethod }, ticket));
        });
      } else records.push(reservation);
      return records;
    }, []);
  }

  function readBookingReservations() {
    try {
      var store = JSON.parse(localStorage.getItem(reservationStoreKey) || "null");
      if (!store || !Array.isArray(store.reservations)) return [];
      var ticketRecords = storedTicketRecords(store);
      return ticketRecords.filter(function (item) { return item && item.id && Number.isInteger(item.qty); }).map(function (item, index) {
        return {
          id: item.id, reservationId: item.reservationId || item.orderId || item.id, orderId: item.paymentId || item.orderId || "PAY-ORDER-" + (index + 1), memberId: item.memberId,
          location: item.location || "서울", department: item.department || "공원화사업추진TF",
          programKey: item.programKey || "ride",
          program: item.name || (item.programKey === "play" ? "포니랑 놀기" : "포니 타기"), dateKey: item.dateKey,
          date: item.date || item.dateKey, time: item.time, qty: item.qty, price: item.originalPrice || item.price || 0, discount: !!item.discount,
          discountQty: Number.isInteger(item.discountQty) ? item.discountQty : item.discount ? item.qty : 0,
          discountPolicyId: item.discountPolicyId || "",
          discountLabel: item.discountLabel || "", discountType: item.discountType || "", discountValue: Number(item.discountValue || 0),
          cancelMinutes: Number.isFinite(item.cancelMinutes) ? item.cancelMinutes : undefined,
          status: item.status === "cancelled" ? "취소 완료" : "예약 확정", createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString("ko-KR") : "예약 생성", createdTimestamp: item.createdAt ? new Date(item.createdAt).getTime() : 0,
          method: item.paymentMethod === "demo-card" ? "신용카드" : "기타 결제", stored: true,
          ticketIds: (item.originalTicketIds || item.ticketIds || []).slice(),
          unitAmounts: (item.originalUnitAmounts || item.unitAmounts || []).slice(),
          discountFlags: (item.originalDiscountFlags || []).slice(),
          tickets: Array.isArray(item.adminTicketStatuses) ? item.adminTicketStatuses.slice() : Array.from({ length: item.qty }, function () { return item.status === "cancelled" ? "cancelled" : "confirmed"; }),
          cancellationEvents: (item.cancellationHistory || []).map(function (event) { return { source: event.source || "customer", actor: event.actor || "", memo: event.memo || "", qty: Number(event.qty || 0), amount: Number(event.amount || 0), reason: event.reason || "고객 직접 취소", createdAt: event.createdAt ? new Date(event.createdAt).toLocaleString("ko-KR") : "접수 시간 미기록" }; })
        };
      });
    } catch (error) { return []; }
  }

  function allTicketGroups() {
    var ids = {};
    return demoReservations.concat(readBookingReservations()).filter(function (item) { if (ids[item.id]) return false; ids[item.id] = true; return true; }).map(function (item) {
      if (!item.location) item.location = "서울";
      if (!item.department) item.department = "공원화사업추진TF";
      return item;
    });
  }

  function groupReservationItems(items) {
    var groups = {};
    items.forEach(function (item) {
      var number = reservationNumber(item);
      if (!groups[number]) groups[number] = [];
      groups[number].push(item);
    });
    return Object.keys(groups).map(function (number) {
      var sourceItems = groups[number];
      var first = sourceItems[0];
      var ticketDetails = [];
      sourceItems.forEach(function (sourceItem) {
        sourceItem.tickets.forEach(function (status, sourceIndex) {
          var ticketId = Array.isArray(sourceItem.ticketIds) && sourceItem.ticketIds[sourceIndex]
            ? sourceItem.ticketIds[sourceIndex]
            : number + "-T" + String(ticketDetails.length + 1).padStart(2, "0");
          ticketDetails.push({
            id: ticketId,
            status: status,
            program: sourceItem.program,
            date: sourceItem.date,
            time: sourceItem.time,
            amount: ticketUnitPrice(sourceItem, sourceIndex),
            discountLabel: ticketDiscountLabel(sourceItem, sourceIndex),
            sourceItem: sourceItem,
            sourceIndex: sourceIndex
          });
        });
      });
      var programNames = Array.from(new Set(sourceItems.map(function (item) { return item.program; })));
      var schedules = sourceItems.map(function (item) { return item.program + " " + item.time; });
      var cancelledCount = ticketDetails.filter(function (ticket) { return ticket.status === "cancelled"; }).length;
      return Object.assign({}, first, {
        id: number,
        reservationId: number,
        sourceItems: sourceItems,
        ticketDetails: ticketDetails,
        ticketIds: ticketDetails.map(function (ticket) { return ticket.id; }),
        tickets: ticketDetails.map(function (ticket) { return ticket.status; }),
        programNames: programNames,
        program: programNames.join(", "),
        programKey: programNames.length === 1 ? first.programKey : "",
        time: schedules.join(" · "),
        qty: ticketDetails.length,
        price: sourceItems.reduce(function (sum, item) { return sum + Number(item.price || 0); }, 0),
        cancellationEvents: sourceItems.reduce(function (events, item) { return events.concat(item.cancellationEvents || []); }, []),
        status: cancelledCount === ticketDetails.length ? "취소 완료" : cancelledCount ? "부분 취소" : "예약 확정"
      });
    });
  }

  function allReservations() {
    return groupReservationItems(allTicketGroups());
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

  function statusClass(status) {
    if (status === "부분 취소") return "is-partial";
    if (status === "취소 완료") return "is-cancelled";
    return "";
  }

  function reservationNumber(item) {
    return item.reservationId || item.id.replace(/-G\d+$/, "").replace(/-\d+$/, "");
  }

  function reservationRow(item) {
    var row = document.createElement("tr");
    row.dataset.reservationId = item.id;
    var catalogProgram = programCatalog().find(function (programItem) { return programItem.key === item.programKey; });
    var programImage = catalogProgram && catalogProgram.image || "assets/pony/cover.jpg";
    row.innerHTML = '<td><strong>' + escapeHtml(reservationNumber(item)) + '</strong></td>' +
      '<td><strong>' + escapeHtml(item.location) + '</strong><br><small>' + escapeHtml(item.department) + '</small></td>' +
      '<td><span class="table-program"><img src="' + escapeHtml(programImage) + '" alt=""><span class="table-program-info"><strong>' + escapeHtml(item.program) + '</strong></span></span></td>' +
      '<td><strong>' + escapeHtml(item.date) + '</strong><br><small>' + escapeHtml(item.time) + '</small></td>' +
      '<td><strong>' + item.tickets.filter(function (ticket) { return ticket === "confirmed"; }).length + '명</strong></td>' +
      '<td><strong>' + money(item.price) + '</strong></td>' +
      '<td><strong>' + money(item.price - ticketRefundTotal(item)) + '</strong></td>' +
      '<td><span class="table-status ' + statusClass(item.status) + '">' + paymentStatusLabel(item) + '</span></td>' +
      '<td><strong>' + escapeHtml(item.createdAt) + '</strong></td>' +
      '<td><div class="reservation-row-actions"><button class="reservation-detail-button" type="button">상세보기</button></div></td>';
    row.addEventListener("click", function () { openDrawer(item.id); });
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
      var inAccountScope = !currentAccount || currentAccount.scope === "all" || canManageDepartment(item.location, item.department);
      return inAccountScope && (!search || (reservationNumber(item) + " " + item.orderId + " " + item.program).toLowerCase().includes(search)) && (!location || item.location === location) && (!department || item.department === department) && (!date || item.dateKey >= date) && (!endDate || item.dateKey <= endDate) && (!program || item.programNames.includes(program)) && (!status || item.status === status);
    }).sort(function (a, b) { return (b.createdTimestamp || Date.parse(b.createdAt) || 0) - (a.createdTimestamp || Date.parse(a.createdAt) || 0); });
  }

  function hasReservationFilters() {
    return ["reservation-search", "reservation-location", "reservation-department", "reservation-date", "reservation-end-date", "reservation-program", "reservation-status"].some(function (id) {
      return Boolean(byId(id).value);
    });
  }

  function syncReservationProgramFilter() {
    var select = byId("reservation-program");
    var selected = select.value;
    var names = programCatalog().map(function (item) { return item.programName; });
    allReservations().forEach(function (item) { names = names.concat(item.programNames || [item.program]); });
    names = Array.from(new Set(names.filter(Boolean))).sort(function (a, b) { return a.localeCompare(b, "ko"); });
    select.innerHTML = '<option value="">전체 프로그램</option>' + names.map(function (name) { return '<option value="' + escapeHtml(name) + '">' + escapeHtml(name) + '</option>'; }).join("");
    select.value = names.includes(selected) ? selected : "";
  }

  function renderReservations() {
    syncReservationProgramFilter();
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
      row.innerHTML = '<td colspan="10" class="empty-table"><span class="admin-empty-icon" aria-hidden="true"><img src="assets/icons/' + (hasReservationFilters() ? 'empty-search.svg' : 'empty-reservation.svg') + '" alt=""></span><strong>' + emptyTitle + '</strong><small>' + emptyHelp + '</small></td>';
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
      var canManage = canManageDepartment(item.location, item.department) && (!allClosure || currentAccount.scope === "all");
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
      headButton.disabled = !canManage;
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
          chip.disabled = programClosed || !canManage;
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
    closeAllButton.hidden = !currentAccount || currentAccount.scope !== "all";
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
    if (!canManageDepartment(programItem.location, programItem.department)) return;
    var existing = operationExceptions.find(function (item) { return item.region === region && item.programKey === programItem.key && !item.sessionKey && item.startDate === dateKey && item.endDate === dateKey; });
    var allClosure = operationExceptions.find(function (item) { return item.region === region && item.programKey === "all" && item.startDate <= dateKey && item.endDate >= dateKey; });
    if (allClosure && currentAccount.scope !== "all") { notify("통합 관리자가 지정한 전체 휴장은 해제할 수 없습니다."); return; }
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
    if (!canManageDepartment(programItem.location, programItem.department)) return;
    var existing = operationExceptions.find(function (item) { return item.region === region && item.programKey === programItem.key && item.sessionKey === session.key && item.startDate === dateKey && item.endDate === dateKey; });
    var programClosure = operationExceptions.find(function (item) { return item.region === region && item.programKey === programItem.key && !item.sessionKey && item.startDate <= dateKey && item.endDate >= dateKey; });
    var allClosure = operationExceptions.find(function (item) { return item.region === region && item.programKey === "all" && item.startDate <= dateKey && item.endDate >= dateKey; });
    if (allClosure && currentAccount.scope !== "all") { notify("통합 관리자가 지정한 전체 휴장은 해제할 수 없습니다."); return; }
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
    if (!currentAccount || currentAccount.scope !== "all") return;
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
    if (!currentAccount || currentAccount.scope !== "all") return;
    confirmDelete("휴장을 해제하면 등록된 프로그램과 판매 중인 회차가<br>고객 예약 화면에 즉시 노출됩니다.<br>그래도 운영을 재개할까요?", function () {
      operationExceptions = operationExceptions.filter(function (item) { return !(item.region === region && item.startDate === dateKey && item.endDate === dateKey && (item.programKey === "all" || operatingPrograms.some(function (program) { return program.key === item.programKey; }))); });
      saveDemoState(); renderOperationCalendar(); renderOperationDayQuick(dateKey);
      notify("운영을 재개했습니다. 등록된 프로그램과 회차가 고객에게 노출됩니다.");
    }, "운영 재개", "운영을 재개할까요?", true);
  }

  var adminPageFiles = {
    programs: "admin.html", reservations: "admin-reservations.html", operations: "admin-operations.html", settlement: "admin-settlement.html",
    "program-edit": "admin-program-edit.html", "program-sessions": "admin-program-sessions.html"
  };

  function adminViewUrl(viewName) {
    var url = new URL(adminPageFiles[viewName] || "admin.html", window.location.href);
    if (viewName === "program-edit" && activeProgramKey) url.searchParams.set("program", activeProgramKey);
    if (viewName === "program-sessions" && sessionProgramKey) url.searchParams.set("program", sessionProgramKey);
    return url;
  }

  function showView(viewName, options) {
    var target = adminViewUrl(viewName);
    if ((!options || options.navigate !== false) && target.href !== window.location.href) {
      window.location.assign(target.href); return;
    }
    var navView = (viewName === "program-edit" || viewName === "program-sessions") ? "programs" : viewName;
    document.querySelectorAll(".admin-view").forEach(function (view) { var visible = view.dataset.view === viewName; view.hidden = !visible; view.classList.toggle("is-visible", visible); });
    document.querySelectorAll("[data-admin-view]").forEach(function (button) { button.classList.toggle("is-active", button.dataset.adminView === navView); });
    document.querySelector(".admin-sidebar").classList.remove("is-open");
    if (viewName === "reservations") renderReservations();
    if (viewName === "operations") { lockOperationRegionSelect(); renderOperationCalendar(); renderOperationExceptions(); }
    if (viewName === "settlement") { refreshSettlementScopeFilter(); renderSettlementSummary(); }
    var titles = { programs: "프로그램 · 회차", reservations: "예약 · 티켓", operations: "운영일 관리", settlement: "매출 · 정산", "program-edit": "프로그램 등록 · 수정", "program-sessions": "회차 관리" };
    document.title = (titles[viewName] || "관리자") + " | 렛츠런파크 관리자";
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
      var canManage = canManageDepartment(item.location, item.department);
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
    if (!visiblePrograms.length) body.innerHTML = '<tr><td colspan="8" class="empty-table"><span class="admin-empty-icon" aria-hidden="true"><img src="assets/icons/empty-search.svg" alt=""></span><strong>검색 결과가 없습니다.</strong><small>프로그램명이나 지역·부서 조건을 변경해 다시 확인해주세요.</small></td></tr>';
  }

  function openProductDialog(item) {
    activeProgramKey = item.key || null;
    byId("product-dialog-title").textContent = activeProgramKey ? item.programName + " 수정" : "새 프로그램 등록";
    refreshProgramInputs();
    byId("detail-location").value = item.location || "서울";
    refreshDepartmentSelect("detail-department", byId("detail-location").value, item.department || organization[byId("detail-location").value][0]);
    var isDepartmentLocked = currentAccount && currentAccount.scope === "department";
    byId("detail-location").disabled = isDepartmentLocked;
    byId("detail-department").disabled = isDepartmentLocked;
    byId("detail-program").value = item.programName || "";
    byId("detail-price").value = item.price || 0;
    pendingImageDataUrl = null;
    byId("detail-image").value = "";
    var imagePreview = byId("detail-image-preview");
    imagePreview.src = item.image || "";
    imagePreview.hidden = !item.image;
    byId("detail-notice").value = item.noticeText || "";
    renderProgramGuidanceEditor(item.guidanceText, item.guidanceItems);
    byId("detail-sale-start").value = item.saleStartDate || "";
    byId("detail-sale-end").value = item.saleEndDate || "";
    byId("detail-visible-start").value = item.visibleStartAt || (item.saleStartDate ? item.saleStartDate + "T00:00" : "");
    byId("detail-visible-end").value = item.visibleEndAt || (item.saleEndDate ? item.saleEndDate + "T23:59" : "");
    byId("detail-purchase-max-qty").value = item.purchaseMaxQty != null ? item.purchaseMaxQty : 4;
    byId("detail-booking-window").value = item.bookingWindow != null ? item.bookingWindow : defaultBookingWindow;
    byId("detail-arrival-lead-minutes").value = item.arrivalLeadMinutes != null ? item.arrivalLeadMinutes : defaultArrivalLeadMinutes;
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
    var ownNames = programCatalog().filter(function (item) { return item.location === currentAccount.region && item.department === currentAccount.department; }).map(function (item) { return item.programName; });
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
    var applyButton = byId("apply-discount-picker");
    var pickerIntro = document.querySelector("#discount-picker-dialog .field-help");
    applyButton.textContent = "선택한 할인 추가";
    pickerIntro.hidden = !candidates.length;
    if (!candidates.length) {
      if (!activeProgramKey) {
        list.innerHTML = '<div class="empty-table"><strong>현재 등록된 할인이 없습니다.</strong><small>아래 순서로 진행해 주세요.</small><ol class="discount-empty-steps"><li>현재 프로그램 등록을 완료합니다.</li><li>할인 관리에서 새 할인을 등록합니다.</li><li>프로그램 수정 화면에서 등록한 할인을 연결합니다.</li></ol></div>';
        applyButton.textContent = "프로그램 등록 계속하기";
      } else {
        list.innerHTML = '<p class="empty-table"><strong>추가할 수 있는 할인이 없습니다.</strong><small>할인 관리에서 새 할인을 등록한 뒤, 프로그램 수정 화면에서 연결할 수 있습니다.</small></p>';
        applyButton.textContent = "확인";
      }
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
    if (catalogState.addedPrograms.some(function (item) { return item.key === program.key; }) || program.key.indexOf("custom-program-") === 0) {
      var addedIndex = catalogState.addedPrograms.findIndex(function (item) { return item.key === program.key; });
      if (addedIndex === -1) catalogState.addedPrograms.push(program); else catalogState.addedPrograms[addedIndex] = program;
    } else catalogState.programOverrides[program.key] = program;
    saveDemoState(); renderKioskProducts();
  }

  function requestProgramDeletion(program) {
    if (!canManageDepartment(program.location, program.department)) { notify("해당 부서의 프로그램을 삭제할 권한이 없습니다."); return; }
    var sessions = sessionsForProgram(program.key);
    var affectedReservations = allTicketGroups().filter(function (item) {
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
    if (currentAccount && currentAccount.scope === "department") {
      if (existing && !canManageDepartment(existing.location, existing.department)) { event.preventDefault(); notify("다른 부서의 프로그램은 수정할 수 없습니다."); return; }
      location = currentAccount.region;
      department = currentAccount.department;
    }
    var price = Number(byId("detail-price").value);
    if (!location || !department) { event.preventDefault(); notify("지역과 담당 부서를 모두 선택해주세요."); return; }
    if (!Number.isFinite(price) || price < 0 || byId("detail-price").value === "") { event.preventDefault(); notify("기본 가격을 입력해주세요."); return; }
    if (!pendingImageDataUrl && !(existing && existing.image)) { event.preventDefault(); notify("대표 이미지를 업로드해주세요."); return; }
    var saleStartDate = byId("detail-sale-start").value;
    var saleEndDate = byId("detail-sale-end").value;
    var visibleStartAt = byId("detail-visible-start").value;
    var visibleEndAt = byId("detail-visible-end").value;
    var purchaseMaxQty = Number(byId("detail-purchase-max-qty").value);
    if (!Number.isInteger(purchaseMaxQty) || purchaseMaxQty < 1) { event.preventDefault(); notify("최대 구매 수량은 1 이상의 정수로 입력해주세요."); return; }
    var bookingWindow = Number(byId("detail-booking-window").value);
    var arrivalLeadMinutes = Number(byId("detail-arrival-lead-minutes").value);
    var guidanceText = byId("program-guidance-text").value.trim();
    var saleDays = Array.from(document.querySelectorAll(".detail-days input:checked")).map(function (input) { return Number(input.value); });
    var cancelOffsetValue = Number(byId("detail-cancel-value").value);
    var cancelOffsetUnit = byId("detail-cancel-unit").value;
    if (!saleStartDate || !saleEndDate) { event.preventDefault(); notify("운영 시작일과 종료일을 모두 설정해주세요."); return; }
    if (saleEndDate < saleStartDate) { event.preventDefault(); notify("운영 종료일은 시작일보다 빠를 수 없습니다."); return; }
    if (!visibleStartAt || !visibleEndAt) { event.preventDefault(); notify("프로그램 노출 시작과 종료 일시를 모두 설정해주세요."); return; }
    if (visibleEndAt < visibleStartAt) { event.preventDefault(); notify("프로그램 노출 종료는 시작보다 빨라질 수 없습니다."); return; }
    if (!Number.isFinite(bookingWindow) || bookingWindow < 1) { event.preventDefault(); notify("예약 가능 일수를 1일 이상으로 설정해주세요."); return; }
    if (!Number.isInteger(arrivalLeadMinutes) || arrivalLeadMinutes < 0 || arrivalLeadMinutes > 100) { event.preventDefault(); notify("입장 대기 시간은 0~100분 사이의 정수로 입력해주세요."); return; }
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
      purchaseMaxQty: purchaseMaxQty,
      bookingWindow: bookingWindow,
      arrivalLeadMinutes: arrivalLeadMinutes,
      cancelMinutes: cancelOffsetValue * cancelMultiplier, cancelOffsetValue: cancelOffsetValue, cancelOffsetUnit: cancelOffsetUnit,
      saleStartDate: saleStartDate, saleEndDate: saleEndDate, visibleStartAt: visibleStartAt, visibleEndAt: visibleEndAt, saleDays: saleDays,
      price: price, image: pendingImageDataUrl || (existing && existing.image),
      noticeText: byId("detail-notice").value.trim(),
      guidanceText: guidanceText,
      guidanceItems: [],
      requiresGuidanceConfirmation: !!guidanceText,
      discountIds: existing && Array.isArray(existing.discountIds) ? existing.discountIds : [], active: existing ? existing.active : true
    });
    program.programKey = program.key;
    commitDiscountDraft(program);
    var isNewProgram = !existing;
    persistProgram(program); activeProgramKey = program.key;
    if (isNewProgram) {
      try { sessionStorage.setItem(programCreatedToastKey, program.key); }
      catch (error) { notify(programCreatedToastMessage); }
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
    if (!program || !canManageDepartment(program.location, program.department)) return "해당 부서의 회차를 삭제할 권한이 없습니다.";
    var store;
    try { store = JSON.parse(localStorage.getItem(reservationStoreKey) || '{"reservations":[]}'); }
    catch (error) { return "예약 이력을 확인할 수 없어 삭제할 수 없습니다."; }
    if (!store || !Array.isArray(store.reservations)) return "예약 이력을 확인할 수 없어 삭제할 수 없습니다.";
    var original = (sessionData[session.programKey] || []).find(function (item, index) { return session.programKey + "-session-" + index === session.key; });
    var times = [session.start + "~" + session.end];
    if (original) times.push(original[1] + "~" + original[2]);
    var storedItems = store.reservations.reduce(function (items, reservation) {
      if (reservation && Array.isArray(reservation.tickets) && reservation.tickets.some(function (ticket) { return ticket && typeof ticket === "object"; })) return items.concat(reservation.tickets);
      if (reservation) items.push(reservation);
      return items;
    }, []);
    var hasHistory = demoReservations.concat(storedItems).some(function (item) {
      if (!item) return false;
      if (item.sessionKey === session.key) return true;
      return (item.programKey === session.programKey || item.program === program.programName || item.name === program.programName) && times.indexOf(String(item.time || "").replace(/\s/g, "")) !== -1;
    });
    return hasHistory ? "예약 이력이 있어 삭제가 제한됩니다. ‘숨김’으로 판매를 중지할 수 있습니다." : "";
  }

  function matchingReservationsForClosure(region, dateKey, programItem, session) {
    var programName = programItem ? programItem.programName : "";
    var sessionTime = session ? (session.start + "~" + session.end).replace(/\s/g, "") : "";
    return allTicketGroups().filter(function (item) {
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
      var parent = store.reservations.find(function (candidate) { return candidate.id === item.reservationId && Array.isArray(candidate.tickets); });
      var target = parent ? parent.tickets.find(function (candidate) { return candidate.id === item.id; }) : store.reservations.find(function (candidate) { return candidate.id === item.id; });
      if (!target) return;
      var originalTicketIds = (target.originalTicketIds || target.ticketIds || Array.from({ length: target.qty }, function (_, index) { return (target.reservationId || target.id) + "-T" + String(index + 1).padStart(2, "0"); })).slice();
      var originalUnitAmounts = (target.originalUnitAmounts || target.unitAmounts || Array.from({ length: target.qty }, function (_, index) {
        var base = Math.floor(Number(target.price || 0) / target.qty);
        return base + (index < Number(target.price || 0) % target.qty ? 1 : 0);
      })).slice();
      var originalDiscountFlags = (target.originalDiscountFlags || Array.from({ length: originalTicketIds.length }, function (_, index) { return index < (target.discountQty || (target.discount ? target.qty : 0)); })).slice();
      var remainingQty = target.qty;
      var refundAmount = Number(target.price || 0);
      target.cancellationHistory = target.cancellationHistory || [];
      target.cancellationHistory.push({ source: "admin", actor: currentAdminActor(), createdAt: new Date().toISOString(), qty: remainingQty, amount: refundAmount, status: "cancelled", reason: reason });
      target.originalPrice = Number.isFinite(target.originalPrice) ? target.originalPrice : refundAmount;
      target.originalTicketIds = originalTicketIds;
      target.originalUnitAmounts = originalUnitAmounts;
      target.originalDiscountFlags = originalDiscountFlags;
      target.adminTicketStatuses = originalTicketIds.map(function () { return "cancelled"; });
      target.status = "cancelled";
      target.qty = 0;
      target.price = 0;
      target.discountQty = 0;
      target.discount = false;
      target.ticketIds = [];
      target.unitAmounts = [];
      if (parent) {
        parent.total = parent.tickets.reduce(function (sum, ticket) { return sum + Number(ticket.price || 0); }, 0);
        parent.status = parent.tickets.every(function (ticket) { return ticket.status === "cancelled" || ticket.qty === 0; }) ? "cancelled" : "confirmed";
      }
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
    setEmptySessionRegistrationMode(false);
    var editor = byId("session-editor");
    if (editor.parentElement === list) list.after(editor);
    var sessions = sessionsForProgram(sessionProgramKey); list.replaceChildren();
    if (!sessions.length) {
      list.innerHTML = '<div class="session-empty"><span class="session-empty__icon" aria-hidden="true"><img src="assets/icons/empty-session.svg" alt=""></span><strong>등록된 회차가 없습니다.</strong><small>회차 등록을 눌러 운영 시간과 판매 수량을 추가해 주세요.</small><button class="admin-button admin-button--primary session-empty__action" type="button">회차 등록</button></div>';
      list.querySelector(".session-empty__action").addEventListener("click", function () { editSession(null); });
      return;
    }
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

  function setEmptySessionRegistrationMode(enabled) {
    var list = byId("session-list");
    var manager = list && list.closest(".session-manager");
    var head = manager && manager.querySelector(".session-list-head");
    if (list) list.hidden = enabled;
    if (head) head.hidden = enabled;
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
    setEmptySessionRegistrationMode(!session && !sessionsForProgram(sessionProgramKey).length);
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
    byId("discount-value-label").textContent = isPercent ? "할인율 *" : "할인 금액 *";
    byId("discount-value-unit").textContent = isPercent ? "%" : "원";
    byId("discount-value").max = isPercent ? "100" : "";
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
    delete byId("discount-max-qty").dataset.lastValue;
    byId("discount-name").value = discount ? discount.name : "";
    byId("discount-type").value = discount ? discount.type : "percent";
    byId("discount-value").value = discount ? discount.value : 10;
    byId("discount-notice").value = discount ? discount.noticeText || "" : "";
    byId("discount-max-qty").value = discount ? discount.maxQty || 0 : 1;
    byId("discount-start-date").value = discount ? discount.startDate || "" : "";
    byId("discount-end-date").value = discount ? discount.endDate || "" : "";
    byId("discount-name").disabled = !isEditable;
    byId("discount-type").disabled = !isEditable;
    byId("discount-value").disabled = !isEditable;
    byId("discount-notice").disabled = !isEditable;
    byId("discount-max-qty").disabled = !isEditable;
    byId("discount-start-date").disabled = !isEditable;
    byId("discount-end-date").disabled = !isEditable;
    byId("discount-all-programs").checked = discount ? discount.allPrograms : false;
    byId("discount-all-programs").disabled = !isEditable || (currentAccount && currentAccount.scope === "department");
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
    var noticeText = byId("discount-notice").value.trim();
    var scope = "day";
    var maxQty = Number(byId("discount-max-qty").value);
    var startDate = byId("discount-start-date").value;
    var endDate = byId("discount-end-date").value;
    if (!Number.isFinite(value) || value <= 0 || (type === "percent" && value > 100)) { notify(type === "percent" ? "할인율은 1~100%로 입력해주세요." : "할인 금액은 1원 이상 입력해주세요."); return; }
    if (!Number.isInteger(maxQty) || maxQty < 1) { notify("최대 적용 수량은 1매 이상으로 입력해주세요."); return; }
    if (startDate && endDate && startDate > endDate) { notify("적용 종료일은 시작일보다 빠를 수 없습니다."); return; }
    var allPrograms = byId("discount-all-programs").checked;
    var selectedPrograms = Array.from(document.querySelectorAll("#discount-program-options input:checked")).map(function (input) { return input.value; });
    if (!allPrograms && !selectedPrograms.length) { notify("할인을 적용할 프로그램을 하나 이상 선택해주세요."); return; }
    var existing = discountPolicies.find(function (discount) { return discount.id === id; });
    var saved = {
      id: id, name: name, type: type, value: value, maxQty: maxQty, noticeText: noticeText,
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
      return { scope: scope, region: program.location, department: program.department };
    }).filter(function (item) {
      if (!item || seen[item.scope]) return false;
      seen[item.scope] = true;
      return canManageDepartment(item.region, item.department);
    });
  }

  function refreshSettlementDepartmentFilter(selectedDepartment) {
    var regionSelect = byId("settlement-region-filter");
    var departmentSelect = byId("settlement-department-filter");
    if (!regionSelect || !departmentSelect) return;
    var region = regionSelect.value;
    var departments = settlementScopeOptions().filter(function (item) { return !region || item.region === region; }).map(function (item) { return item.department; });
    departments = Array.from(new Set(departments));
    departmentSelect.innerHTML = '<option value="">전체 부서</option>' + departments.map(function (department) { return '<option>' + escapeHtml(department) + '</option>'; }).join("");
    departmentSelect.value = departments.includes(selectedDepartment) ? selectedDepartment : "";
  }

  function refreshSettlementScopeFilter() {
    var regionSelect = byId("settlement-region-filter");
    var departmentSelect = byId("settlement-department-filter");
    if (!regionSelect || !departmentSelect) return;
    var cardSelect = byId("settlement-card-filter");
    if (cardSelect && cardSelect.options.length === 1) cardSelect.innerHTML += Array.from(new Set(SettlementLedger.payments.map(function (p) { return p.card; }))).map(function (card) { return '<option>' + escapeHtml(card) + '</option>'; }).join("");
    var selectedRegion = regionSelect.value;
    var selectedDepartment = departmentSelect.value;
    var options = settlementScopeOptions();
    var regions = Array.from(new Set(options.map(function (item) { return item.region; })));
    regionSelect.innerHTML = '<option value="">전체 지역</option>' + regions.map(function (region) { return '<option>' + escapeHtml(region) + '</option>'; }).join("");
    var isDepartmentLocked = currentAccount && currentAccount.scope === "department";
    if (isDepartmentLocked) {
      regionSelect.value = currentAccount.region;
      regionSelect.disabled = true;
      refreshSettlementDepartmentFilter(currentAccount.department);
      departmentSelect.value = currentAccount.department;
      departmentSelect.disabled = true;
    } else {
      regionSelect.disabled = false;
      departmentSelect.disabled = false;
      regionSelect.value = regions.includes(selectedRegion) ? selectedRegion : "";
      refreshSettlementDepartmentFilter(selectedDepartment);
    }
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

  function settlementFilters() {
    var holidayPreview = typeof window !== "undefined" && window.location && /(?:[?&])example=chuseok(?:&|$)/.test(window.location.search);
    return { asOf: holidayPreview ? "2026-10-01T00:00:00+09:00" : undefined, basis: "service", start: byId("settlement-start-date").value, end: byId("settlement-end-date").value, card: byId("settlement-card-filter").value, region: byId("settlement-region-filter").value, department: byId("settlement-department-filter").value, search: byId("settlement-detail-search").value.trim() };
  }

  function settlementEventTimelineItem(event) {
    var payment = SettlementLedger.payment(event), cancelled = event.type === "취소";
    var status = cancelled ? SettlementLedger.state(event) : "승인";
    var amountText = (cancelled ? "−" : "+") + money(Math.abs(event.amount));
    var meta = [["결제수단", payment.easyPay || payment.method], ["카드사", payment.card === "해당 없음" ? "—" : payment.card], ["포트원 거래번호", payment.impUid || "—"], ["지역·담당부서", payment.region + " · " + payment.department]];
    if (cancelled) {
      meta.push(["취소 티켓 번호", Array.isArray(event.ticketIds) && event.ticketIds.length ? event.ticketIds.join(", ") : "—"]);
      meta.push(["취소사유", event.reason || "—"]);
    } else {
      meta.push(["지급예정일", event.paidOutDate || "—"]);
    }
    return '<li class="settlement-timeline-item"><div class="settlement-timeline-main"><time><strong>' + escapeHtml(event.at.slice(0, 10)) + '</strong><small>' + escapeHtml(event.at.slice(11)) + '</small></time><span class="settlement-status' + (cancelled ? ' is-cancelled' : '') + '">' + escapeHtml(status) + '</span><div class="settlement-timeline-amount"><strong class="' + (cancelled ? 'is-negative' : '') + '">' + amountText + '</strong></div></div><dl>' + meta.map(function (field) { return '<div><dt>' + field[0] + '</dt><dd>' + escapeHtml(String(field[1])) + '</dd></div>'; }).join('') + '</dl></li>';
  }

  function renderSettlementSummary() {
    var f = settlementFilters();
    var invalid = f.start && f.end && f.start > f.end;
    byId("download-settlement").disabled = !!invalid;
    byId("settlement-date-error").hidden = !invalid;
    var rows = invalid ? [] : SettlementLedger.filter(f, canManageDepartment), t = SettlementLedger.totals(rows);
    var metrics = [["승인금액", t.approved, "승인 " + t.approvals + "건"], ["취소금액", t.cancelled, "전체·부분 취소 " + t.cancels + "건"], ["수수료", t.fee, "취소 수수료 조정 반영 완료"], ["지급예정액", t.payout, "순매출 - 수수료"]];
    byId("settlement-metrics").innerHTML = metrics.map(function(m){return '<article><small>'+m[0]+'</small><strong>'+(typeof m[1] === 'number' ? money(m[1]) : m[1])+'</strong><p>'+m[2]+'</p></article>';}).join("");
    var groups = Array.from(new Set(rows.map(function(e){var p=SettlementLedger.payment(e);return p.region+' · '+p.department+' · '+p.program;})));
    function cells(group, v) { return '<tr><td>'+escapeHtml(group)+'</td><td>'+money(v.approved)+'<small class="settlement-summary-count">승인 '+v.approvals+'건</small></td><td>'+money(v.cancelled)+'<small class="settlement-summary-count">취소 '+v.cancels+'건</small></td><td>'+money(v.net)+'</td><td>'+money(v.fee)+'</td><td>'+money(v.payout)+'</td></tr>'; }
    var reservationGroups = SettlementLedger.groups(rows);
    byId("settlement-card-count").textContent = reservationGroups.length + "건 결제 · " + rows.length + "개 거래";
    byId("settlement-summary-body").innerHTML = groups.length ? groups.map(function(group){return cells(group,SettlementLedger.totals(rows.filter(function(e){var p=SettlementLedger.payment(e);return p.region+' · '+p.department+' · '+p.program===group;})));}).join("") : '<tr><td colspan="6" class="empty-table"><span class="admin-empty-icon" aria-hidden="true"><img src="assets/icons/empty-settlement.svg" alt=""></span><strong>조건에 맞는 거래가 없습니다.</strong></td></tr>';
    byId("settlement-summary-foot").innerHTML = groups.length ? cells("합계",t) : "";
    byId("settlement-detail-body").innerHTML = reservationGroups.length ? reservationGroups.map(function(group, index) {
      var totals = SettlementLedger.totals(group.events);
      var detailId = 'settlement-ledger-' + index;
      return '<tr class="settlement-ledger-row"><td><strong>' + escapeHtml(group.reservation) + '</strong><small>' + escapeHtml(group.programs.join(' · ')) + '</small></td><td>' + escapeHtml(group.serviceDates.join(' · ')) + '</td><td class="money-cell">' + money(totals.approved) + '</td><td class="money-cell' + (totals.cancelled ? ' is-negative' : '') + '">' + (totals.cancelled ? '−' + money(totals.cancelled) : '0원') + '</td><td class="money-cell settlement-net' + (totals.net < 0 ? ' is-negative' : '') + '">' + money(totals.net) + '</td><td class="money-cell">' + money(totals.fee) + '</td><td class="money-cell settlement-payout' + (totals.payout < 0 ? ' is-negative' : '') + '">' + money(totals.payout) + '</td><td>' + escapeHtml(group.payoutDates.join(' · ') || '—') + '</td><td><button type="button" class="settlement-expand" aria-expanded="false" aria-controls="' + detailId + '" aria-label="거래 ' + group.events.length + '건 펼치기"><span>거래 ' + group.events.length + '건</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button></td></tr>' +
        '<tr id="' + detailId + '" class="settlement-event-detail" hidden><td colspan="9"><div class="settlement-timeline-head"><strong>승인 · 취소 거래 이력</strong><small>최신 거래순</small></div><ol class="settlement-timeline">' + group.events.map(settlementEventTimelineItem).join('') + '</ol></td></tr>';
    }).join('') : '<tr><td colspan="9" class="empty-table"><span class="admin-empty-icon" aria-hidden="true"><img src="assets/icons/empty-settlement.svg" alt=""></span><strong>조건에 맞는 거래가 없습니다.</strong></td></tr>';
    return !invalid;
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
    }).join("") : '<tr><td colspan="8" class="empty-table"><span class="admin-empty-icon" aria-hidden="true"><img src="assets/icons/empty-settlement.svg" alt=""></span><strong>조건에 맞는 거래 내역이 없습니다.</strong></td></tr>';
  }

  function openSettlementDrawer(programKey) {
    var detail = settlementDetails[programKey];
    if (!detail) return;
    var program = programs[programKey];
    if (!program || !canManageDepartment(program.location, program.department)) return;
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
    byId("drawer-title").textContent = reservationNumber(activeReservation);
    byId("drawer-summary").innerHTML = '<h3>' + escapeHtml(activeReservation.program) + '</h3><dl><div><dt>예약번호</dt><dd>' + escapeHtml(reservationNumber(activeReservation)) + '</dd></div><div><dt>예약 상태</dt><dd><span class="table-status ' + statusClass(activeReservation.status) + '">' + activeReservation.status + '</span></dd></div><div><dt>이용일</dt><dd>' + escapeHtml(activeReservation.date) + '</dd></div><div><dt>상품 · 회차</dt><dd>' + escapeHtml(activeReservation.time) + '</dd></div></dl>';
    renderDrawerTickets();
    byId("payment-detail").innerHTML = '<div><dt>통합 결제번호</dt><dd>' + escapeHtml(activeReservation.orderId) + '</dd></div><div><dt>결제 수단</dt><dd>' + escapeHtml(activeReservation.method) + '</dd></div><div><dt>결제·환불 상태</dt><dd>' + escapeHtml(paymentStatusLabel(activeReservation)) + '</dd></div><div><dt>구매금액</dt><dd>' + money(activeReservation.price) + '</dd></div><div><dt>환불 누계</dt><dd>' + money(ticketRefundTotal(activeReservation)) + '</dd></div><div><dt>결제금액</dt><dd>' + money(activeReservation.price - ticketRefundTotal(activeReservation)) + '</dd></div>';
    var cancellationEvents = Array.isArray(activeReservation.cancellationEvents) ? activeReservation.cancellationEvents : [];
    var cancellationHistory = cancellationEvents.map(function (event) {
      var sourceLabel = event.source === "customer" ? "고객 직접 취소" : "관리자 처리";
      var memo = event.memo ? " · 메모: " + event.memo : "";
      return '<li><strong>' + escapeHtml(sourceLabel) + ' · ' + Number(event.qty || 0) + '명 환불 ' + money(Number(event.amount || 0)) + '</strong><small>' + escapeHtml(event.createdAt || "처리 시간 미기록") + ' · ' + escapeHtml(event.reason || "사유 미기록") + escapeHtml(memo) + '</small></li>';
    }).join("");
    if (!cancellationHistory && activeReservation.tickets.some(function (ticket) { return ticket === "cancelled"; })) cancellationHistory = '<li><strong>관리자 처리 · 개별 티켓 환불</strong><small>기존 처리 건 · 상세 이력 미기록</small></li>';
    byId("history-list").innerHTML = '<li><strong>결제 및 예약 확정</strong><small>' + escapeHtml(activeReservation.createdAt) + ' · 시스템</small></li>' + cancellationHistory;
    byId("drawer-backdrop").hidden = false; byId("reservation-drawer").hidden = false; document.body.style.overflow = "hidden";
  }

  function openPaymentReceipt() {
    if (!activeReservation) return;
    var refund = ticketRefundTotal(activeReservation);
    byId("receipt-booking-info").innerHTML = '<div><dt>결제번호</dt><dd>' + escapeHtml(activeReservation.orderId) + '</dd></div><div><dt>예약번호</dt><dd>' + escapeHtml(reservationNumber(activeReservation)) + '</dd></div><div><dt>예약 상품</dt><dd>' + escapeHtml(activeReservation.program) + ' · ' + activeReservation.qty + '명</dd></div><div><dt>이용 일정</dt><dd>' + escapeHtml(activeReservation.date) + ' ' + escapeHtml(activeReservation.time) + '</dd></div><div><dt>운영 지점</dt><dd>' + escapeHtml(activeReservation.location) + ' · ' + escapeHtml(activeReservation.department) + '</dd></div>';
    byId("receipt-amount-info").innerHTML = '<div><dt>구매금액</dt><dd>' + money(activeReservation.price) + '</dd></div><div><dt>환불금액</dt><dd>' + (refund ? '−' : '') + money(refund) + '</dd></div><div class="receipt-total"><dt>결제금액</dt><dd>' + money(activeReservation.price - refund) + '</dd></div>';
    byId("receipt-payment-info").innerHTML = '<div><dt>결제일시</dt><dd>' + escapeHtml(activeReservation.createdAt) + '</dd></div><div><dt>결제수단</dt><dd>' + escapeHtml(activeReservation.method) + '</dd></div><div><dt>결제상태</dt><dd>' + escapeHtml(paymentStatusLabel(activeReservation)) + '</dd></div>';
    byId("payment-receipt-dialog").showModal();
  }

  function ticketUnitPrice(reservation, index) {
    if (Number.isInteger(index) && Array.isArray(reservation.unitAmounts) && Number.isFinite(reservation.unitAmounts[index])) return reservation.unitAmounts[index];
    if (Number.isInteger(index) && Array.isArray(reservation.ticketDetails) && reservation.ticketDetails[index]) return reservation.ticketDetails[index].amount;
    return reservation.qty ? Math.floor(reservation.price / reservation.qty) : 0;
  }
  function ticketDiscountLabel(reservation, index) {
    var discountQty = Number.isInteger(reservation.discountQty) ? reservation.discountQty : reservation.discount ? reservation.qty : 0;
    var discounted = Array.isArray(reservation.discountFlags) && reservation.discountFlags.length ? !!reservation.discountFlags[index] : reservation.discount && index < discountQty;
    if (!discounted) return "";
    if (reservation.discountLabel) return reservation.discountLabel;
    var policy = discountPolicies.find(function (item) { return item.id === reservation.discountPolicyId; }) || discountPolicies.find(function (item) { return item.id === "gwacheon"; });
    var name = policy ? policy.name.replace(/\s*할인$/, "") : "할인";
    if (policy && policy.type === "percent") return name + " " + policy.value + "% 할인";
    if (policy && policy.type === "fixed") return name + " " + money(policy.value) + " 할인";
    var programPrice = programs[reservation.programKey] ? programs[reservation.programKey].price : 0;
    var rate = programPrice ? Math.round((1 - ticketUnitPrice(reservation, index) / programPrice) * 100) : 0;
    return name + (rate > 0 ? " " + rate + "%" : "") + " 할인";
  }
  function ticketRefundTotal(reservation) {
    return reservation.tickets.reduce(function (sum, ticket, index) { return sum + (ticket === "cancelled" ? ticketUnitPrice(reservation, index) : 0); }, 0);
  }
  function paymentStatusLabel(reservation) {
    var cancelled = reservation.tickets.filter(function (ticket) { return ticket === "cancelled"; }).length;
    if (cancelled === reservation.tickets.length) return "전액 환불 완료";
    if (cancelled > 0) return "부분 환불 완료";
    return "결제 완료";
  }

  function renderDrawerTickets() {
    var list = byId("individual-tickets"); list.replaceChildren();
    var canManage = canManageDepartment(activeReservation.location, activeReservation.department);
    activeReservation.tickets.forEach(function (status, index) {
      var label = document.createElement("label"); label.className = "individual-ticket" + (status !== "confirmed" ? " is-cancelled" : "");
      var ticketId = Array.isArray(activeReservation.ticketIds) && activeReservation.ticketIds[index] ? activeReservation.ticketIds[index] : reservationNumber(activeReservation) + '-T' + String(index + 1).padStart(2, "0");
      var detail = activeReservation.ticketDetails[index];
      var canCancel = canManage && status === "confirmed" && adminTicketCanCancel(detail, new Date());
      var discountText = detail.discountLabel ? ' · ' + escapeHtml(detail.discountLabel) : '';
      label.innerHTML = '<input type="checkbox" value="' + index + '" ' + (canCancel ? "" : "disabled") + '><span><strong>' + escapeHtml(detail.program) + ' · ' + escapeHtml(ticketId) + '</strong><small>' + escapeHtml(detail.date + " · " + detail.time) + ' · ' + money(ticketUnitPrice(activeReservation, index)) + discountText + '</small></span>' + (status === "cancelled" ? '<span class="ticket-cancelled-status">취소 완료</span>' : !canCancel && status === "confirmed" ? '<span class="ticket-cancelled-status">취소 불가</span>' : '');
      label.querySelector("input").addEventListener("change", updateSelectedTickets); list.append(label);
    });
    byId("cancel-selected").title = canManage ? "" : "다른 지역 예약은 조회만 가능합니다.";
    updateSelectedTickets();
  }

  function adminTicketCanCancel(detail, now) {
    var item = detail && detail.sourceItem;
    if (!item || !item.dateKey || !item.time) return false;
    var dateParts = item.dateKey.split("-").map(Number);
    var timeParts = item.time.split("~")[0].split(":").map(Number);
    var sessionStart = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);
    var programData = programs[item.programKey] || {};
    var cancelMinutes = Number.isFinite(item.cancelMinutes) ? item.cancelMinutes : Number.isFinite(programData.cancelMinutes) ? programData.cancelMinutes : 10;
    return now < new Date(sessionStart.getTime() - cancelMinutes * 60000);
  }

  function updateSelectedTickets() {
    var selected = document.querySelectorAll("#individual-tickets input:checked");
    byId("selected-ticket-count").textContent = selected.length + "명";
    byId("cancel-selected").disabled = selected.length === 0;
  }

  function closeDrawer() { byId("drawer-backdrop").hidden = true; byId("reservation-drawer").hidden = true; document.body.style.overflow = ""; activeReservation = null; }

  function openCancelDialog() {
    var selected = Array.from(document.querySelectorAll("#individual-tickets input:checked")).map(function (input) { return Number(input.value); });
    var count = selected.length;
    byId("refund-count").textContent = count + "명";
    byId("refund-amount").textContent = money(selected.reduce(function (sum, index) { return sum + ticketUnitPrice(activeReservation, index); }, 0));
    byId("cancel-reason").value = ""; byId("cancel-memo").value = ""; byId("cancel-dialog").showModal();
  }

  function confirmCancellation() {
    if (!byId("cancel-reason").value) { notify("취소 사유를 선택해주세요."); return; }
    var selected = Array.from(document.querySelectorAll("#individual-tickets input:checked")).map(function (input) { return Number(input.value); });
    if (!selected.length) return;
    if (selected.some(function (index) { return !adminTicketCanCancel(activeReservation.ticketDetails[index], new Date()); })) {
      byId("cancel-dialog").close();
      renderDrawerTickets();
      notify("취소 가능 시간이 지나 처리할 수 없습니다.");
      return;
    }
    var refundAmount = selected.reduce(function (sum, index) { return sum + ticketUnitPrice(activeReservation, index); }, 0);
    var affectedItems = [];
    selected.forEach(function (index) {
      var detail = activeReservation.ticketDetails[index];
      activeReservation.tickets[index] = "cancelled";
      detail.sourceItem.tickets[detail.sourceIndex] = "cancelled";
      if (!affectedItems.includes(detail.sourceItem)) affectedItems.push(detail.sourceItem);
    });
    affectedItems.forEach(function (item) {
      var itemIndexes = selected.filter(function (index) { return activeReservation.ticketDetails[index].sourceItem === item; });
      var itemRefund = itemIndexes.reduce(function (sum, index) { return sum + ticketUnitPrice(activeReservation, index); }, 0);
      item.cancellationEvents = item.cancellationEvents || [];
      item.cancellationEvents.push({ source: "admin", actor: currentAdminActor(), qty: itemIndexes.length, amount: itemRefund, reason: byId("cancel-reason").value, memo: byId("cancel-memo").value.trim(), createdAt: new Date().toLocaleString("ko-KR") });
      var validCount = item.tickets.filter(function (ticket) { return ticket === "confirmed"; }).length;
      item.status = validCount === 0 ? "취소 완료" : "부분 취소";
    });
    persistStoredTicketCancellations(affectedItems);
    saveDemoState(); byId("cancel-dialog").close();
    var activeId = activeReservation.id; openDrawer(activeId); renderReservations();
    notify(selected.length + "명의 티켓을 취소하고 " + money(refundAmount) + " 부분환불 처리했습니다.");
  }

  function persistStoredTicketCancellations(items) {
    var storedItems = items.filter(function (item) { return item.stored; });
    if (!storedItems.length) return;
    try {
      var store = JSON.parse(localStorage.getItem(reservationStoreKey) || "null");
      if (!store || !Array.isArray(store.reservations)) return;
      storedItems.forEach(function (item) {
        var parent = store.reservations.find(function (candidate) { return candidate.id === item.reservationId && Array.isArray(candidate.tickets); });
        var target = parent ? parent.tickets.find(function (candidate) { return candidate.id === item.id; }) : store.reservations.find(function (candidate) { return candidate.id === item.id; });
        if (!target) return;
        var originalTicketIds = (target.originalTicketIds || target.ticketIds || item.ticketIds || []).slice();
        var originalUnitAmounts = (target.originalUnitAmounts || target.unitAmounts || item.unitAmounts || []).slice();
        var originalDiscountFlags = (target.originalDiscountFlags || item.discountFlags || Array.from({ length: originalTicketIds.length }, function (_, index) { return index < (target.discountQty || (target.discount ? target.qty : 0)); })).slice();
        var confirmedIndexes = item.tickets.reduce(function (indexes, status, index) { if (status === "confirmed") indexes.push(index); return indexes; }, []);
        var latestEvent = item.cancellationEvents[item.cancellationEvents.length - 1];
        target.originalTicketIds = originalTicketIds;
        target.originalUnitAmounts = originalUnitAmounts;
        target.originalDiscountFlags = originalDiscountFlags;
        target.originalPrice = target.originalPrice || target.price || 0;
        target.adminTicketStatuses = item.tickets.slice();
        target.ticketIds = confirmedIndexes.map(function (index) { return originalTicketIds[index]; });
        target.unitAmounts = confirmedIndexes.map(function (index) { return originalUnitAmounts[index]; });
        target.discountQty = confirmedIndexes.filter(function (index) { return originalDiscountFlags[index]; }).length;
        target.discount = target.discountQty > 0;
        target.qty = confirmedIndexes.length;
        target.price = target.unitAmounts.reduce(function (sum, amount) { return sum + Number(amount || 0); }, 0);
        target.status = confirmedIndexes.length ? "confirmed" : "cancelled";
        target.cancellationHistory = target.cancellationHistory || [];
        target.cancellationHistory.push({ source: "admin", actor: latestEvent.actor, memo: latestEvent.memo, qty: latestEvent.qty, amount: latestEvent.amount, reason: latestEvent.reason, createdAt: new Date().toISOString(), status: "cancelled" });
        if (parent) {
          parent.total = parent.tickets.reduce(function (sum, ticket) { return sum + Number(ticket.price || 0); }, 0);
          parent.status = parent.tickets.every(function (ticket) { return ticket.status === "cancelled" || ticket.qty === 0; }) ? "cancelled" : "confirmed";
        }
      });
      store.revision = Number.isInteger(store.revision) ? store.revision + 1 : 1;
      localStorage.setItem(reservationStoreKey, JSON.stringify(store));
    } catch (error) { notify("예약 취소 정보를 저장하지 못했습니다."); }
  }

  function downloadCsv(filename, rows) {
    var csv = "\ufeff" + rows.map(function (row) { return row.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
    var url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    var link = document.createElement("a"); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    notify("자료를 내려받았습니다.");
  }

  prepareDiscountFormFields();
  prepareProgramGuidanceFields();
  if (new URLSearchParams(window.location.search).get("example") === "chuseok") {
    byId("settlement-start-date").value = "2026-09-01";
    byId("settlement-end-date").value = "2026-09-30";
    byId("holiday-settlement-note").hidden = false;
    var breakdown = document.querySelector(".settlement-card-breakdown");
    breakdown.open = true;
    byId("settlement-metrics").after(breakdown);
  }
  loadSavedDemoState();
  currentAccount = restoreAdminSession();
  setAdminLoginState(!!currentAccount);
  if (currentAccount) renderAdminIdentity();
  renderAdminNavigation();
  lockAccountFilterSelects();
  renderReservations(); renderKioskProducts();

  document.querySelectorAll("[data-admin-view]").forEach(function (button) { button.addEventListener("click", function () { showView(button.dataset.adminView); }); });
  document.querySelectorAll("[data-admin-href]").forEach(function (button) { button.addEventListener("click", function () { window.location.href = button.dataset.adminHref; }); });
  byId("admin-logout").addEventListener("click", function () { saveAdminSession("signed-out"); currentAccount = null; delete byId("operation-region").dataset.scopeInitialized; setAdminLoginState(false); renderAdminNavigation(); lockAccountFilterSelects(); });
  byId("admin-login-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var enteredId = byId("admin-login-id").value.trim();
    var account = adminAccounts.find(function (item) { return item.id === enteredId && item.password === byId("admin-login-password").value; });
    byId("admin-login-error").hidden = !!account;
    if (!account) { byId("admin-login-password").focus(); return; }
    currentAccount = account;
    delete byId("operation-region").dataset.scopeInitialized;
    saveAdminSession(account.id); setAdminLoginState(true); renderAdminIdentity();
    renderAdminNavigation();
    lockAccountFilterSelects();
    renderKioskProducts(); renderReservations(); lockOperationRegionSelect();
    refreshSettlementScopeFilter(); renderSettlementSummary();
    restoreAdminRoute();
    notify("로그인했습니다.");
  });
  document.querySelectorAll("[data-go-view]").forEach(function (button) { button.addEventListener("click", function () { showView(button.dataset.goView); }); });
  ["reservation-search", "reservation-department", "reservation-date", "reservation-end-date", "reservation-program", "reservation-status"].forEach(function (id) { byId(id).addEventListener(id === "reservation-search" ? "input" : "change", function () { reservationPage = 1; renderReservations(); }); });
  byId("reservation-location").addEventListener("change", function () { refreshDepartmentSelect("reservation-department", byId("reservation-location").value, ""); reservationPage = 1; renderReservations(); });
  byId("reset-filters").addEventListener("click", function () { byId("reservation-search").value = ""; byId("reservation-date").value = ""; byId("reservation-end-date").value = ""; byId("reservation-program").value = ""; byId("reservation-status").value = ""; lockLocationFilterSelect("reservation-location", "reservation-department", true); reservationPage = 1; renderReservations(); });
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
  byId("refresh-products").addEventListener("click", function () { byId("kiosk-product-search").value = ""; lockLocationFilterSelect("kiosk-location-filter", "kiosk-department-filter", false); renderKioskProducts(); notify("전체 프로그램 목록을 새로고침했습니다."); });
  byId("add-product").addEventListener("click", function () {
    var ownLocation = currentAccount && currentAccount.scope === "department" ? currentAccount.region : "서울";
    var ownDepartment = currentAccount && currentAccount.scope === "department" ? currentAccount.department : "공원화사업추진TF";
    openProductDialog({ location: ownLocation, department: ownDepartment, programType: "기타", settlementTag: "", purchaseGroup: "", conflictGroup: "", bookingWindow: 14, arrivalLeadMinutes: defaultArrivalLeadMinutes, cancelMinutes: 10, cancelOffsetValue: 10, cancelOffsetUnit: "minutes", saleStartDate: "2026-09-01", saleEndDate: "2026-12-31", visibleStartAt: "2026-09-01T00:00", visibleEndAt: "2026-12-31T23:59", saleDays: [6, 0], programName: "", price: 0, image: "", discountIds: [], active: true });
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
  byId("cancel-session-edit").addEventListener("click", function () { byId("session-editor").hidden = true; activeSessionKey = null; renderSessionList(); });
  byId("save-session").addEventListener("click", saveSession);
  document.querySelectorAll('input[name="operation-closure-mode"]').forEach(function (input) { input.addEventListener("change", updateOperationClosureMessage); });
  byId("confirm-operation-closure").addEventListener("click", confirmOperationClosure);
  byId("operation-closure-confirm-dialog").addEventListener("close", function () { pendingOperationClosureAction = null; });
  byId("confirm-program-delete").addEventListener("click", confirmProgramDeletion);
  byId("program-delete-confirm-dialog").addEventListener("close", function () { pendingProgramDeletion = null; });
  byId("apply-settlement").addEventListener("click", function () { if (renderSettlementSummary()) notify("선택한 조건의 거래 내역을 조회했습니다."); });
  ["settlement-start-date", "settlement-end-date", "settlement-department-filter"].forEach(function(id){ byId(id).addEventListener("change", renderSettlementSummary); });
  byId("settlement-region-filter").addEventListener("change", function () { refreshSettlementDepartmentFilter(""); renderSettlementSummary(); });
  byId("settlement-card-filter").addEventListener("change", renderSettlementSummary);
  byId("settlement-detail-search-form").addEventListener("submit", function (event) { event.preventDefault(); if (renderSettlementSummary()) notify("상품명 검색 결과를 조회했습니다."); });
  byId("settlement-detail-body").addEventListener("click", function(event) {
    var button = event.target.closest('.settlement-expand');
    if (!button) return;
    var detail = byId(button.getAttribute('aria-controls'));
    detail.hidden = !detail.hidden;
    button.setAttribute('aria-expanded', String(!detail.hidden));
    button.setAttribute('aria-label', button.querySelector('span').textContent + (detail.hidden ? ' 펼치기' : ' 접기'));
  });
  byId("settlement-drawer-close").addEventListener("click", closeSettlementDrawer);
  byId("settlement-drawer-confirm").addEventListener("click", closeSettlementDrawer);
  byId("settlement-drawer-backdrop").addEventListener("click", closeSettlementDrawer);
  byId("settlement-transaction-search").addEventListener("input", renderSettlementTransactions);
  byId("settlement-transaction-type").addEventListener("change", renderSettlementTransactions);
  byId("download-settlement-detail").addEventListener("click", function () {
    var detail = settlementDetails[activeSettlementKey]; if (!detail) return;
    var program = programs[activeSettlementKey]; if (!program || !canManageDepartment(program.location, program.department)) return;
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
    var rows = [["예약번호", "지역", "담당부서", "프로그램", "이용일", "회차", "인원", "구매금액", "결제금액", "상태"]];
    items.forEach(function (item) { rows.push([reservationNumber(item), item.location, item.department, item.program, item.date, item.time, item.tickets.filter(function (ticket) { return ticket === "confirmed"; }).length, item.price, item.price - ticketRefundTotal(item), item.status]); });
    downloadCsv("렛츠런플레이_통합예약목록.csv", rows);
  });
  byId("download-settlement").addEventListener("click", function () {
    if (!renderSettlementSummary()) return;
    var f = settlementFilters(), rows = SettlementLedger.filter(f, canManageDepartment);
    var blob = SettlementXlsx.workbook(SettlementLedger.sheets(rows, f));
    var url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = "렛츠런플레이_매출정산_예시_" + (f.start || "전체") + "_" + (f.end || "전체") + ".xlsx";
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function(){URL.revokeObjectURL(url);}, 1000);
    notify("현재 조회 조건의 엑셀 파일을 내려받았습니다.");
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

  function restoreAdminRoute() {
    var page = window.location.pathname.split("/").pop();
    var legacyView = window.location.hash.replace("#", "");
    if (page === "admin.html" && adminPageFiles[legacyView]) {
      window.location.replace(adminViewUrl(legacyView).href); return;
    }
    var view = Object.keys(adminPageFiles).find(function (key) { return adminPageFiles[key] === page; }) || "programs";
    var programKey = new URLSearchParams(window.location.search).get("program");
    if (view === "program-edit") {
      var item = programKey && programCatalog().find(function (program) { return program.key === programKey; });
      if (programKey && !item) { window.location.replace(adminViewUrl("programs").href); return; }
      if (item) openProductDialog(item);
      else {
        var ownLocation = currentAccount && currentAccount.scope === "department" ? currentAccount.region : "서울";
        var ownDepartment = currentAccount && currentAccount.scope === "department" ? currentAccount.department : "공원화사업추진TF";
        openProductDialog({ location: ownLocation, department: ownDepartment, saleStartDate: "2026-09-01", saleEndDate: "2026-12-31", saleDays: [6, 0], discountIds: [], active: true });
      }
    } else if (view === "program-sessions") {
      if (!programCatalog().some(function (item) { return item.key === programKey; })) { window.location.replace(adminViewUrl("programs").href); return; }
      openSessionManager(programKey);
      try {
        if (sessionStorage.getItem(programCreatedToastKey) === programKey) {
          sessionStorage.removeItem(programCreatedToastKey);
          notify(programCreatedToastMessage);
        }
      } catch (error) { /* Storage may be unavailable in private browsing. */ }
    } else showView(view, { navigate: false });
  }
  restoreAdminRoute();
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    loadSavedDemoState(); currentAccount = restoreAdminSession();
    setAdminLoginState(!!currentAccount); renderAdminNavigation(); lockAccountFilterSelects();
    renderKioskProducts(); renderReservations(); restoreAdminRoute();
  });
})();
