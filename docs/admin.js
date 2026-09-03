(function () {
  "use strict";

  var reservationStoreKey = "ponylandBookingStoreV2";
  var adminStateKey = "letsrunPlayAdminDemoV3";
  var toastTimer;
  var activeReservation = null;
  var deletedReservationIds = [];
  var activeProgramKey = null;
  var activeSessionKey = null;
  var sessionProgramKey = null;
  var activeAdminAccountKey = null;
  var organization = {
    "서울": ["홍보부", "브랜드총괄부", "발매운영부", "서울고객안전부", "공원화사업추진TF"],
    "부산경남": ["부산경주자원관리부", "부산고객안전부", "부산운영지원부"],
    "제주": ["제주경주자원관리부", "제주고객안전부", "제주운영지원부"]
  };
  var defaultBookingWindow = 14;
  var defaultCancelMinutes = 10;
  var discountPolicies = [
    { id: "gwacheon", name: "과천시민 할인", type: "percent", value: 50, maxQty: 2, scope: "lifetime", proof: "onsite", startDate: "", endDate: "", stackable: false, restoreOnCancel: true, allPrograms: false, programs: ["포니 타기", "포니랑 놀기"], active: true }
  ];
  var catalogState = { programOverrides: {}, addedPrograms: [], sessionOverrides: {}, addedSessions: [] };
  var adminAccounts = [
    { key: "account-super", loginId: "letsrun_admin", type: "super", location: "전체", department: "통합 운영", permissions: { programs: true, reservations: true, refunds: true, settlement: true }, active: true, lastLogin: "오늘 09:12", passwordIssued: true },
    { key: "account-seoul-brand", loginId: "seoul_brand", type: "department", location: "서울", department: "브랜드총괄부", permissions: { programs: true, reservations: true, refunds: false, settlement: true }, active: true, lastLogin: "어제 17:40", passwordIssued: true },
    { key: "account-seoul-park", loginId: "seoul_park", type: "department", location: "서울", department: "공원화사업추진TF", permissions: { programs: true, reservations: true, refunds: true, settlement: true }, active: true, lastLogin: "오늘 08:55", passwordIssued: true },
    { key: "account-busan-ops", loginId: "busan_ops", type: "department", location: "부산경남", department: "부산운영지원부", permissions: { programs: true, reservations: true, refunds: true, settlement: true }, active: true, lastLogin: "8월 30일", passwordIssued: true },
    { key: "account-jeju-ops", loginId: "jeju_ops", type: "department", location: "제주", department: "제주운영지원부", permissions: { programs: true, reservations: true, refunds: false, settlement: true }, active: false, lastLogin: "미접속", passwordIssued: true }
  ];

  var demoReservations = [
    { id: "GP-260902-1042", orderId: "PAY-260902-3018", memberId: "demo:카카오:1", programKey: "ride", program: "포니 타기", dateKey: "2026-09-05", date: "2026.09.05 (토)", time: "10:00~10:20", qty: 3, price: 15000, discount: false, status: "예약 확정", createdAt: "2026-09-02 10:42", method: "신용카드", tickets: ["confirmed", "confirmed", "confirmed"] },
    { id: "GP-260902-1036", orderId: "PAY-260902-3012", memberId: "demo:네이버:2", programKey: "play", program: "포니랑 놀기", dateKey: "2026-09-05", date: "2026.09.05 (토)", time: "10:20~10:45", qty: 2, price: 4000, discount: true, status: "부분 취소", createdAt: "2026-09-02 10:36", method: "신용카드", tickets: ["confirmed", "cancelled"] },
    { id: "GP-260902-1019", orderId: "PAY-260902-2998", memberId: "demo:카카오:2", programKey: "ride", program: "포니 타기", dateKey: "2026-09-06", date: "2026.09.06 (일)", time: "11:00~11:20", qty: 1, price: 2500, discount: true, status: "환불 확인", createdAt: "2026-09-02 10:19", method: "신용카드", tickets: ["review"] },
    { id: "GP-260902-0951", orderId: "PAY-260902-2971", memberId: "demo:네이버:1", programKey: "play", program: "포니랑 놀기", dateKey: "2026-09-06", date: "2026.09.06 (일)", time: "13:20~13:45", qty: 4, price: 16000, discount: false, status: "예약 확정", createdAt: "2026-09-02 09:51", method: "신용카드", tickets: ["confirmed", "confirmed", "confirmed", "confirmed"] },
    { id: "GP-260902-0927", orderId: "PAY-260902-2944", memberId: "demo:카카오:1", programKey: "ride", program: "포니 타기", dateKey: "2026-09-12", date: "2026.09.12 (토)", time: "14:20~14:45", qty: 2, price: 5000, discount: true, status: "예약 확정", createdAt: "2026-09-02 09:27", method: "신용카드", tickets: ["confirmed", "confirmed"] },
    { id: "GP-260901-1844", orderId: "PAY-260901-2886", memberId: "demo:네이버:2", programKey: "play", program: "포니랑 놀기", dateKey: "2026-09-12", date: "2026.09.12 (토)", time: "15:00~15:20", qty: 1, price: 4000, discount: false, status: "취소 완료", createdAt: "2026-09-01 18:44", method: "신용카드", tickets: ["cancelled"] }
  ];

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
    ride: { name: "포니 타기", price: 5000, image: "assets/pony/cover.jpg", location: "서울", department: "공원화사업추진TF", programType: "승마체험", settlementTag: "SEOUL-PARK-TF", purchaseGroup: "SEOUL-PONY", conflictGroup: "SEOUL-PONY", bookingWindow: 14, cancelMinutes: 10, cancelOffsetValue: 10, cancelOffsetUnit: "minutes", saleStartDate: "2026-09-01", saleEndDate: "2026-12-31", saleDays: [6, 0], discountIds: ["gwacheon"], active: true },
    play: { name: "포니랑 놀기", price: 4000, image: "assets/pony/gallery-02.jpg", location: "서울", department: "공원화사업추진TF", programType: "승마체험", settlementTag: "SEOUL-PARK-TF", purchaseGroup: "SEOUL-PONY", conflictGroup: "SEOUL-PONY", bookingWindow: 14, cancelMinutes: 10, cancelOffsetValue: 10, cancelOffsetUnit: "minutes", saleStartDate: "2026-09-01", saleEndDate: "2026-12-31", saleDays: [6, 0], discountIds: ["gwacheon"], active: true }
  };

  function byId(id) { return document.getElementById(id); }
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
          if (target && Array.isArray(saved.tickets)) { target.tickets = saved.tickets; target.status = saved.status; }
        });
      }
      if (Array.isArray(state.discounts) && state.discounts.length) discountPolicies = state.discounts;
      discountPolicies = discountPolicies.map(function (discount) {
        return discount.id === "gwacheon" ? Object.assign({}, discount, { name: "과천시민 할인", type: "percent", value: 50, maxQty: 2, scope: "lifetime", proof: "onsite" }) : discount;
      });
      if (state.catalog && typeof state.catalog === "object") {
        catalogState.programOverrides = state.catalog.programOverrides || {};
        catalogState.addedPrograms = Array.isArray(state.catalog.addedPrograms) ? state.catalog.addedPrograms : [];
        catalogState.sessionOverrides = state.catalog.sessionOverrides || {};
        catalogState.addedSessions = Array.isArray(state.catalog.addedSessions) ? state.catalog.addedSessions : [];
      }
      if (Array.isArray(state.deletedReservationIds)) deletedReservationIds = state.deletedReservationIds;
      if (Array.isArray(state.adminAccounts) && state.adminAccounts.length) adminAccounts = state.adminAccounts;
    } catch (error) { /* Keep the review prototype usable if browser storage is unavailable. */ }
  }

  function saveDemoState() {
    try { localStorage.setItem(adminStateKey, JSON.stringify({ reservations: demoReservations.map(function (item) { return { id: item.id, status: item.status, tickets: item.tickets }; }), discounts: discountPolicies, catalog: catalogState, deletedReservationIds: deletedReservationIds, adminAccounts: adminAccounts })); }
    catch (error) { notify("변경사항을 이 브라우저에 저장하지 못했습니다."); }
  }

  function readBookingReservations() {
    try {
      var store = JSON.parse(localStorage.getItem(reservationStoreKey) || "null");
      if (!store || !Array.isArray(store.reservations)) return [];
      return store.reservations.filter(function (item) { return item && item.id && item.qty; }).map(function (item, index) {
        return {
          id: item.id, orderId: item.orderId || "PAY-DEMO-" + (index + 1), memberId: item.memberId,
          location: item.location || "서울", department: item.department || "공원화사업추진TF",
          programKey: item.programKey === "play" ? "play" : "ride",
          program: item.name || (item.programKey === "play" ? "포니랑 놀기" : "포니 타기"), dateKey: item.dateKey,
          date: item.date || item.dateKey, time: item.time, qty: item.qty, price: item.price || 0, discount: !!item.discount,
          status: item.status === "cancelled" ? "취소 완료" : "예약 확정", createdAt: item.createdAt ? new Date(item.createdAt).toLocaleString("ko-KR") : "시연 예약",
          method: item.paymentMethod === "demo-card" ? "신용카드" : "시연 결제", tickets: Array.from({ length: item.qty }, function () { return item.status === "cancelled" ? "cancelled" : "confirmed"; })
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

  function deleteReservation(id) {
    if (!confirm(id + " 예약을 목록에서 삭제할까요? 되돌릴 수 없습니다.")) return;
    deletedReservationIds.push(id);
    saveDemoState();
    renderReservations();
    notify(id + " 예약을 삭제했습니다.");
  }

  function statusClass(status) {
    if (status === "부분 취소") return "is-partial";
    if (status === "환불 확인") return "is-review";
    if (status === "취소 완료") return "is-cancelled";
    return "";
  }

  function reservationRow(item, selectable) {
    var row = document.createElement("tr");
    row.dataset.reservationId = item.id;
    row.innerHTML = (selectable ? '<td><input type="checkbox" aria-label="' + escapeHtml(item.id) + ' 선택"></td>' : "") +
      '<td><strong>' + escapeHtml(item.id) + '</strong><br><small>' + escapeHtml(item.createdAt) + '</small></td>' +
      '<td><span class="table-program"><img src="' + (programs[item.programKey] ? programs[item.programKey].image : "assets/pony/cover.jpg") + '" alt=""><span class="table-program-info"><strong>' + escapeHtml(item.program) + '</strong><small>' + escapeHtml(item.location + " · " + item.department) + '</small></span></span></td>' +
      '<td><strong>' + escapeHtml(item.date) + '</strong><br><small>' + escapeHtml(item.time) + '</small></td>' +
      '<td>' + item.tickets.filter(function (ticket) { return ticket === "confirmed"; }).length + ' / ' + item.qty + '명</td>' +
      '<td><strong>' + money(item.price) + '</strong></td>' +
      '<td><span class="table-status ' + statusClass(item.status) + '">' + item.status + '</span></td>' + (selectable ? '<td><button class="row-delete" type="button">삭제</button><span>›</span></td>' : "");
    row.addEventListener("click", function (event) { if (event.target.type !== "checkbox" && !event.target.closest(".row-delete")) openDrawer(item.id); });
    var deleteButton = row.querySelector(".row-delete");
    if (deleteButton) deleteButton.addEventListener("click", function (event) { event.stopPropagation(); deleteReservation(item.id); });
    return row;
  }

  function filteredReservations() {
    var search = byId("reservation-search").value.trim().toLowerCase();
    var location = byId("reservation-location").value;
    var department = byId("reservation-department").value;
    var date = byId("reservation-date").value;
    var program = byId("reservation-program").value;
    var status = byId("reservation-status").value;
    return allReservations().filter(function (item) {
      return (!search || item.id.toLowerCase().includes(search)) && (!location || item.location === location) && (!department || item.department === department) && (!date || item.dateKey === date) && (!program || item.program === program) && (!status || item.status === status);
    });
  }

  function renderReservations() {
    var items = filteredReservations(); var body = byId("reservation-table-body"); body.replaceChildren();
    items.forEach(function (item) { body.append(reservationRow(item, true)); });
    if (!items.length) { var row = document.createElement("tr"); row.innerHTML = '<td colspan="8" style="padding:42px;text-align:center;color:#78847e">조건에 맞는 예약이 없습니다.</td>'; body.append(row); }
    byId("reservation-count").textContent = items.length;
    byId("reservation-range").textContent = items.length ? "1–" + items.length + " / " + items.length + "건" : "0건";
  }

  function showView(viewName) {
    var navView = (viewName === "program-edit" || viewName === "program-sessions") ? "programs" : viewName;
    document.querySelectorAll(".admin-view").forEach(function (view) { var visible = view.dataset.view === viewName; view.hidden = !visible; view.classList.toggle("is-visible", visible); });
    document.querySelectorAll("[data-admin-view]").forEach(function (button) { button.classList.toggle("is-active", button.dataset.adminView === navView); });
    document.querySelector(".admin-sidebar").classList.remove("is-open");
    if (viewName === "reservations") renderReservations();
    if (viewName === "permissions") renderAdminAccounts();
    history.replaceState(null, "", "#" + viewName);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function programCatalog() {
    var basePrograms = Object.keys(programs).map(function (key) {
      return Object.assign({ key: key, programKey: key, programName: programs[key].name }, programs[key], catalogState.programOverrides[key] || {});
    });
    return basePrograms.concat(catalogState.addedPrograms);
  }

  function sessionsForProgram(programKey) {
    var baseSessions = (sessionData[programKey] || []).map(function (session, index) {
      var key = programKey + "-session-" + index;
      return Object.assign({ key: key, programKey: programKey, start: session[1], end: session[2], capacity: session[4], active: session[5] !== "운영 마감" }, catalogState.sessionOverrides[key] || {});
    });
    return baseSessions.concat(catalogState.addedSessions.filter(function (session) { return session.programKey === programKey; })).sort(function (a, b) { return (a.start + a.end).localeCompare(b.start + b.end); });
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
    var programType = byId("kiosk-type-filter").value;
    body.replaceChildren();
    var visiblePrograms = programCatalog().filter(function (item) {
      var haystack = [item.location, item.department, item.programType, item.programName].join(" ").toLowerCase();
      return (!location || item.location === location) && (!department || item.department === department) && (!programType || item.programType === programType) && (!search || haystack.includes(search));
    });
    visiblePrograms.forEach(function (item) {
      var sessions = sessionsForProgram(item.key);
      var activeSessions = sessions.filter(function (session) { return session.active; });
      var appliedDiscounts = discountPolicies.filter(function (discount) { return discountAppliesToProgram(discount, item); }).map(function (discount) { return discount.name; });
      var row = document.createElement("tr"); row.dataset.programKey = item.key;
      row.innerHTML = '<td><strong>' + escapeHtml(item.location || "서울") + '</strong><small>' + escapeHtml(item.department || "담당 부서 미지정") + '</small></td>' +
        '<td><strong>' + escapeHtml(item.programName) + '</strong><small>' + escapeHtml(item.programType || "기타") + '</small></td>' +
        '<td><strong>' + money(item.price || 0) + '</strong></td>' +
        '<td><strong>' + escapeHtml(weekdayText(item.saleDays)) + '</strong><small>' + escapeHtml((item.saleStartDate || "미설정") + " ~ " + (item.saleEndDate || "미설정")) + '</small></td>' +
        '<td><strong>' + sessions.length + '개</strong><small>판매중 ' + activeSessions.length + '개 · 온라인 수량 설정</small></td>' +
        '<td>' + escapeHtml(appliedDiscounts.length ? appliedDiscounts.join(", ") : "미적용") + '</td>' +
        '<td><button class="row-state ' + (!item.active ? 'is-off' : '') + '" type="button">' + (item.active ? '판매중' : '숨김') + '</button></td>' +
        '<td><div class="row-actions"><button class="row-detail" type="button">프로그램 수정</button><button class="row-sessions" type="button">회차 관리</button></div></td>';
      row.querySelector(".row-state").addEventListener("click", function () { var saved = Object.assign({}, item, { active: !item.active }); persistProgram(saved); notify(saved.active ? "프로그램 판매를 시작했습니다." : "프로그램을 숨겼습니다."); });
      row.querySelector(".row-sessions").addEventListener("click", function () { openSessionManager(item.key); });
      row.querySelector(".row-detail").addEventListener("click", function () { openProductDialog(item); });
      body.append(row);
    });
    if (!visiblePrograms.length) body.innerHTML = '<tr><td colspan="8" class="empty-table">조건에 맞는 프로그램이 없습니다.</td></tr>';
  }

  function openProductDialog(item) {
    activeProgramKey = item.key || null;
    byId("product-dialog-title").textContent = activeProgramKey ? item.programName + " 수정" : "새 프로그램 등록";
    refreshProgramInputs();
    byId("detail-location").value = item.location || "서울";
    refreshDepartmentSelect("detail-department", byId("detail-location").value, item.department || organization[byId("detail-location").value][0]);
    byId("detail-program-type").value = item.programType || "기타";
    byId("detail-program").value = item.programName || "";
    byId("detail-price").value = item.price || 0;
    byId("detail-sale-start").value = item.saleStartDate || "";
    byId("detail-sale-end").value = item.saleEndDate || "";
    var saleDays = Array.isArray(item.saleDays) ? item.saleDays.map(Number) : [6, 0];
    document.querySelectorAll(".detail-days input").forEach(function (input) { input.checked = saleDays.includes(Number(input.value)); });
    var cancelMinutes = Number(item.cancelMinutes == null ? defaultCancelMinutes : item.cancelMinutes);
    var cancelUnit = item.cancelOffsetUnit || (cancelMinutes > 0 && cancelMinutes % 1440 === 0 ? "days" : cancelMinutes > 0 && cancelMinutes % 60 === 0 ? "hours" : "minutes");
    var cancelDivisor = cancelUnit === "days" ? 1440 : cancelUnit === "hours" ? 60 : 1;
    byId("detail-cancel-unit").value = cancelUnit;
    byId("detail-cancel-value").value = item.cancelOffsetValue == null ? cancelMinutes / cancelDivisor : item.cancelOffsetValue;
    renderProductDiscountOptions(item.discountIds || []);
    showView("program-edit");
  }

  function uniqueProgramNames() {
    return programCatalog().map(function (item) { return item.programName; }).filter(Boolean);
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

  function renderProductDiscountOptions(selectedIds) {
    var wrap = byId("detail-discount-options"); wrap.replaceChildren();
    var activeDiscounts = discountPolicies.filter(function (discount) { return discount.active; });
    if (!activeDiscounts.length) { wrap.innerHTML = '<p>등록된 활성 할인이 없습니다.</p>'; return; }
    activeDiscounts.forEach(function (discount) {
      var label = document.createElement("label");
      var valueText = discount.type === "percent" ? discount.value + "%" : money(discount.value);
      label.innerHTML = '<input type="checkbox" value="' + escapeHtml(discount.id) + '" ' + (discount.allPrograms || selectedIds.includes(discount.id) ? "checked" : "") + (discount.allPrograms ? " disabled" : "") + '><span><strong>' + escapeHtml(discount.name) + '</strong><small>' + valueText + ' · ' + (discount.allPrograms ? "모든 프로그램 자동 적용" : "이 상품에 선택 적용") + '</small></span>';
      wrap.append(label);
    });
  }

  function discountAppliesToProgram(discount, program) {
    if (!discount.active) return false;
    if (discount.allPrograms) return true;
    if ((discount.programs || []).includes(program.programName)) return true;
    return (program.discountIds || []).includes(discount.id);
  }

  function persistProgram(program) {
    if (program.key.indexOf("custom-program-") === 0) {
      var addedIndex = catalogState.addedPrograms.findIndex(function (item) { return item.key === program.key; });
      if (addedIndex === -1) catalogState.addedPrograms.push(program); else catalogState.addedPrograms[addedIndex] = program;
    } else catalogState.programOverrides[program.key] = program;
    saveDemoState(); renderKioskProducts();
  }

  function saveProductDetail(event) {
    var programName = byId("detail-program").value.trim();
    if (!programName) { event.preventDefault(); notify("프로그램명을 입력해주세요."); return; }
    var existing = activeProgramKey ? programCatalog().find(function (item) { return item.key === activeProgramKey; }) : null;
    var location = byId("detail-location").value;
    var department = byId("detail-department").value;
    var saleStartDate = byId("detail-sale-start").value;
    var saleEndDate = byId("detail-sale-end").value;
    var saleDays = Array.from(document.querySelectorAll(".detail-days input:checked")).map(function (input) { return Number(input.value); });
    var cancelOffsetValue = Number(byId("detail-cancel-value").value);
    var cancelOffsetUnit = byId("detail-cancel-unit").value;
    if (!saleStartDate || !saleEndDate) { event.preventDefault(); notify("판매 시작일과 종료일을 모두 설정해주세요."); return; }
    if (saleEndDate < saleStartDate) { event.preventDefault(); notify("판매 종료일은 시작일보다 빠를 수 없습니다."); return; }
    if (!saleDays.length) { event.preventDefault(); notify("판매 요일을 하나 이상 선택해주세요."); return; }
    if (!Number.isFinite(cancelOffsetValue) || cancelOffsetValue < 0) { event.preventDefault(); notify("취소 마감 값을 확인해주세요."); return; }
    var cancelMultiplier = cancelOffsetUnit === "days" ? 1440 : cancelOffsetUnit === "hours" ? 60 : 1;
    var discountIds = Array.from(document.querySelectorAll("#detail-discount-options input:checked")).map(function (input) { return input.value; });
    var program = Object.assign({}, existing || {}, {
      key: activeProgramKey || "custom-program-" + Date.now(),
      programKey: activeProgramKey || "custom-program-" + Date.now(),
      programName: programName,
      location: location, department: department, programType: byId("detail-program-type").value,
      settlementTag: (existing && existing.settlementTag) || location + "-" + department,
      purchaseGroup: (existing && existing.purchaseGroup) || "", conflictGroup: (existing && existing.conflictGroup) || "",
      bookingWindow: (existing && existing.bookingWindow) || defaultBookingWindow,
      cancelMinutes: cancelOffsetValue * cancelMultiplier, cancelOffsetValue: cancelOffsetValue, cancelOffsetUnit: cancelOffsetUnit,
      saleStartDate: saleStartDate, saleEndDate: saleEndDate, saleDays: saleDays,
      price: Number(byId("detail-price").value) || 0, image: (existing && existing.image) || "assets/pony/cover.jpg",
      discountIds: discountIds, active: existing ? existing.active : true
    });
    program.programKey = program.key;
    persistProgram(program); activeProgramKey = program.key;
    notify(programName + " 프로그램을 저장했습니다. 회차를 등록해주세요.");
    openSessionManager(program.key);
  }

  function persistSession(session) {
    if (session.key.indexOf("custom-session-") === 0) {
      var addedIndex = catalogState.addedSessions.findIndex(function (item) { return item.key === session.key; });
      if (addedIndex === -1) catalogState.addedSessions.push(session); else catalogState.addedSessions[addedIndex] = session;
    } else catalogState.sessionOverrides[session.key] = session;
    saveDemoState(); renderKioskProducts(); renderSessionList();
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
    var sessions = sessionsForProgram(sessionProgramKey); list.replaceChildren();
    if (!sessions.length) { list.innerHTML = '<div class="session-empty"><strong>등록된 회차가 없습니다.</strong><small>회차 등록을 눌러 시작·종료 시간과 온라인 판매 수량을 추가하세요.</small></div>'; return; }
    sessions.forEach(function (session, index) {
      var row = document.createElement("article");
      row.className = "session-row";
      row.innerHTML = '<span class="session-number">' + (index + 1) + '</span><div><strong>' + (index + 1) + '회차 (' + escapeHtml(session.start) + '~' + escapeHtml(session.end) + ')</strong><small>온라인 판매 수량 ' + session.capacity + '명</small></div><em class="' + (session.active ? '' : 'is-off') + '">' + (session.active ? '판매중' : '숨김') + '</em><button type="button">수정</button>';
      row.querySelector("button").addEventListener("click", function () { editSession(session); });
      list.append(row);
    });
  }

  function editSession(session) {
    activeSessionKey = session ? session.key : null;
    byId("session-editor-title").textContent = session ? "회차 수정" : "새 회차 등록";
    byId("session-start").value = session ? session.start : "10:00";
    byId("session-end").value = session ? session.end : "10:20";
    byId("session-capacity").value = session ? session.capacity : 8;
    byId("session-active").checked = session ? session.active : true;
    byId("session-editor").hidden = false;
    byId("session-start").focus();
  }

  function saveSession() {
    var start = byId("session-start").value;
    var end = byId("session-end").value;
    var capacity = Number(byId("session-capacity").value);
    if (!start || !end || start >= end) { notify("종료 시간은 시작 시간보다 늦게 설정해주세요."); return; }
    if (!Number.isInteger(capacity) || capacity < 1) { notify("온라인 판매 수량은 1명 이상으로 설정해주세요."); return; }
    var existing = activeSessionKey ? sessionsForProgram(sessionProgramKey).find(function (session) { return session.key === activeSessionKey; }) : null;
    var saved = Object.assign({}, existing || {}, { key: activeSessionKey || "custom-session-" + Date.now(), programKey: sessionProgramKey, start: start, end: end, capacity: capacity, active: byId("session-active").checked });
    persistSession(saved); byId("session-editor").hidden = true; activeSessionKey = null;
    notify("회차를 저장했습니다. 회차명은 시간 순서대로 자동 반영됩니다.");
  }

  function discountScopeText(scope) {
    return scope === "day" ? "이용일 하루" : scope === "order" ? "주문당" : scope === "unlimited" ? "제한 없음" : "계정 평생";
  }

  function renderDiscountProgramOptions(selectedPrograms) {
    var wrap = byId("discount-program-options"); wrap.replaceChildren();
    uniqueProgramNames().forEach(function (name) {
      var label = document.createElement("label");
      label.innerHTML = '<input type="checkbox" value="' + escapeHtml(name) + '" ' + (selectedPrograms.includes(name) ? "checked" : "") + '><span>' + escapeHtml(name) + '</span>';
      wrap.append(label);
    });
    wrap.classList.toggle("is-disabled", byId("discount-all-programs").checked);
    wrap.querySelectorAll("input").forEach(function (input) { input.disabled = byId("discount-all-programs").checked; });
  }

  function editDiscountPolicy(discount) {
    var isFixed = !!discount && discount.id === "gwacheon";
    byId("discount-id").value = discount ? discount.id : "";
    byId("discount-name").value = discount ? discount.name : "";
    byId("discount-type").value = discount ? discount.type : "percent";
    byId("discount-value").value = discount ? discount.value : 10;
    byId("discount-name").disabled = isFixed;
    byId("discount-type").disabled = isFixed;
    byId("discount-value").disabled = isFixed;
    byId("fixed-discount-note").hidden = !isFixed;
    byId("discount-all-programs").checked = discount ? discount.allPrograms : false;
    byId("discount-active").checked = discount ? discount.active : true;
    renderDiscountProgramOptions(discount ? discount.programs || [] : []);
  }

  function renderDiscountPolicies() {
    var list = byId("discount-policy-list"); list.replaceChildren();
    discountPolicies.forEach(function (discount) {
      var button = document.createElement("button"); button.type = "button";
      var valueText = discount.type === "percent" ? discount.value + "%" : money(discount.value);
      button.className = byId("discount-id").value === discount.id ? "is-selected" : "";
      button.innerHTML = '<span><strong>' + escapeHtml(discount.name) + '</strong><small>' + valueText + ' · ' + discountScopeText(discount.scope) + '</small></span><em class="' + (discount.active ? "" : "is-off") + '">' + (discount.active ? "사용중" : "중지") + '</em>';
      button.addEventListener("click", function () { editDiscountPolicy(discount); renderDiscountPolicies(); });
      list.append(button);
    });
  }

  function openDiscountManager(discountId) {
    var target = discountPolicies.find(function (discount) { return discount.id === discountId; }) || discountPolicies[0] || null;
    editDiscountPolicy(target); renderDiscountPolicies(); byId("discount-dialog").showModal();
  }

  function saveDiscountPolicy() {
    var name = byId("discount-name").value.trim();
    if (!name) { notify("할인명을 입력해주세요."); return; }
    var allPrograms = byId("discount-all-programs").checked;
    var selectedPrograms = Array.from(document.querySelectorAll("#discount-program-options input:checked")).map(function (input) { return input.value; });
    if (!allPrograms && !selectedPrograms.length) { notify("할인을 적용할 프로그램을 하나 이상 선택해주세요."); return; }
    var id = byId("discount-id").value || "discount-" + Date.now();
    var isFixed = id === "gwacheon";
    var saved = {
      id: id, name: isFixed ? "과천시민 할인" : name, type: isFixed ? "percent" : byId("discount-type").value,
      value: isFixed ? 50 : Number(byId("discount-value").value) || 0, maxQty: isFixed ? 2 : 0,
      scope: isFixed ? "lifetime" : "unlimited", proof: isFixed ? "onsite" : "none",
      startDate: "", endDate: "", stackable: false, restoreOnCancel: true,
      allPrograms: allPrograms, programs: selectedPrograms, active: byId("discount-active").checked
    };
    var index = discountPolicies.findIndex(function (discount) { return discount.id === id; });
    if (index === -1) discountPolicies.push(saved); else discountPolicies[index] = saved;
    byId("discount-id").value = id; saveDemoState(); renderDiscountPolicies(); renderKioskProducts(); notify(name + " 할인을 저장했습니다.");
  }

  function permissionSummary(account) {
    if (account.type === "super") return ["전체 관리", "계정 발급"];
    var labels = ["전체 프로그램 조회"];
    if (account.permissions.programs) labels.push("프로그램·회차");
    if (account.permissions.reservations) labels.push("예약 조회");
    if (account.permissions.refunds) labels.push("취소·환불");
    if (account.permissions.settlement) labels.push("매출·정산");
    return labels;
  }

  function renderAdminAccounts() {
    var body = byId("admin-account-body"); if (!body) return;
    var location = byId("account-location-filter").value;
    var search = byId("account-search").value.trim().toLowerCase();
    var visible = adminAccounts.filter(function (account) {
      var matchesLocation = !location || account.location === location || account.type === "super";
      var haystack = [account.location, account.department, account.loginId].join(" ").toLowerCase();
      return matchesLocation && (!search || haystack.includes(search));
    });
    body.replaceChildren();
    visible.forEach(function (account) {
      var row = document.createElement("tr");
      var permissionChips = permissionSummary(account).map(function (label, index) { return '<span class="' + (index === 0 ? 'is-enabled' : '') + '">' + escapeHtml(label) + '</span>'; }).join("");
      row.innerHTML = '<td><strong>' + escapeHtml(account.location) + '</strong><small>' + escapeHtml(account.department) + '</small></td>' +
        '<td><strong>' + escapeHtml(account.loginId) + '</strong><small>비밀번호 ········</small></td>' +
        '<td><span class="account-type ' + (account.type === "super" ? 'is-super' : '') + '">' + (account.type === "super" ? '통합 관리자' : '부서 공용') + '</span></td>' +
        '<td><div class="account-permission-summary">' + permissionChips + '</div></td>' +
        '<td>' + escapeHtml(account.lastLogin || "미접속") + '</td>' +
        '<td><span class="account-status ' + (account.active ? '' : 'is-off') + '">' + (account.active ? '사용 중' : '사용 중지') + '</span></td>' +
        '<td><button class="account-edit" type="button">계정 설정</button></td>';
      row.querySelector(".account-edit").addEventListener("click", function () { openAdminAccountDialog(account); });
      body.append(row);
    });
    if (!visible.length) body.innerHTML = '<tr><td colspan="7" class="empty-table">조건에 맞는 관리자 계정이 없습니다.</td></tr>';
    byId("issued-account-count").textContent = adminAccounts.length;
    byId("active-account-count").textContent = adminAccounts.filter(function (account) { return account.active; }).length;
  }

  function refreshAccountDepartment(location, selected) {
    var select = byId("account-department");
    var departments = location === "전체" ? ["통합 운영"] : organization[location] || [];
    select.innerHTML = departments.map(function (department) { return '<option>' + escapeHtml(department) + '</option>'; }).join("");
    if (selected && departments.includes(selected)) select.value = selected;
  }

  function openAdminAccountDialog(account) {
    activeAdminAccountKey = account ? account.key : null;
    var isSuper = !!account && account.type === "super";
    var locationSelect = byId("account-location");
    var allOption = Array.from(locationSelect.options).find(function (option) { return option.value === "전체"; });
    if (isSuper && !allOption) locationSelect.insertAdjacentHTML("afterbegin", '<option>전체</option>');
    if (!isSuper && allOption) allOption.remove();
    byId("account-dialog-title").textContent = account ? account.department + " 계정 설정" : "부서 계정 발급";
    byId("account-key").value = account ? account.key : "";
    locationSelect.value = account ? account.location : "서울";
    locationSelect.disabled = isSuper;
    refreshAccountDepartment(locationSelect.value, account ? account.department : organization["서울"][0]);
    byId("account-department").disabled = isSuper;
    byId("account-login-id").value = account ? account.loginId : "";
    byId("account-password").value = "";
    byId("account-password").type = "password";
    byId("account-password").placeholder = account ? "재발급할 때만 입력" : "8자 이상 임시 비밀번호";
    ["programs", "reservations", "refunds", "settlement"].forEach(function (permission) {
      var input = byId("permission-" + permission);
      input.checked = isSuper || (account ? !!account.permissions[permission] : true);
      input.disabled = isSuper;
    });
    byId("account-active").checked = account ? account.active : true;
    byId("account-dialog").showModal();
  }

  function generateAccountPassword() {
    var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    var values = new Uint32Array(12);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(values);
    else values.forEach(function (_, index) { values[index] = Math.floor(Math.random() * alphabet.length); });
    byId("account-password").value = Array.from(values, function (value) { return alphabet[value % alphabet.length]; }).join("");
    byId("account-password").type = "text";
    notify("임시 비밀번호를 생성했습니다. 저장 전에 안전하게 전달할 값을 확인하세요.");
  }

  function saveAdminAccount() {
    var existing = activeAdminAccountKey ? adminAccounts.find(function (account) { return account.key === activeAdminAccountKey; }) : null;
    var isSuper = !!existing && existing.type === "super";
    var location = isSuper ? "전체" : byId("account-location").value;
    var department = isSuper ? "통합 운영" : byId("account-department").value;
    var loginId = byId("account-login-id").value.trim();
    var password = byId("account-password").value;
    if (!/^[a-zA-Z0-9._-]{4,32}$/.test(loginId)) { notify("로그인 ID는 영문·숫자와 . _ - 기호로 4~32자 입력해주세요."); return; }
    if (adminAccounts.some(function (account) { return account.key !== activeAdminAccountKey && account.loginId.toLowerCase() === loginId.toLowerCase(); })) { notify("이미 사용 중인 로그인 ID입니다."); return; }
    if (!isSuper && adminAccounts.some(function (account) { return account.key !== activeAdminAccountKey && account.type === "department" && account.location === location && account.department === department; })) { notify("해당 부서에는 이미 발급된 계정이 있습니다."); return; }
    if (!existing && password.length < 8) { notify("최초 발급용 임시 비밀번호를 8자 이상 입력해주세요."); return; }
    if (password && password.length < 8) { notify("임시 비밀번호는 8자 이상이어야 합니다."); return; }
    if (byId("permission-refunds").checked && !byId("permission-reservations").checked) { notify("취소·환불 권한에는 예약·결제 조회 권한이 필요합니다."); return; }
    var saved = Object.assign({}, existing || {}, {
      key: activeAdminAccountKey || "department-account-" + Date.now(), loginId: loginId, type: isSuper ? "super" : "department",
      location: location, department: department, permissions: {
        programs: isSuper || byId("permission-programs").checked,
        reservations: isSuper || byId("permission-reservations").checked,
        refunds: isSuper || byId("permission-refunds").checked,
        settlement: isSuper || byId("permission-settlement").checked
      }, active: byId("account-active").checked, lastLogin: existing ? existing.lastLogin : "미접속", passwordIssued: existing ? existing.passwordIssued || !!password : true
    });
    var index = adminAccounts.findIndex(function (account) { return account.key === saved.key; });
    if (index === -1) adminAccounts.push(saved); else adminAccounts[index] = saved;
    saveDemoState(); renderAdminAccounts(); byId("account-dialog").close();
    notify(department + " 관리자 계정과 권한을 저장했습니다.");
  }

  function openDrawer(reservationId) {
    activeReservation = allReservations().find(function (item) { return item.id === reservationId; });
    if (!activeReservation) return;
    byId("drawer-title").textContent = activeReservation.id;
    byId("drawer-summary").innerHTML = '<h3>' + escapeHtml(activeReservation.program) + '</h3><dl><div><dt>예약 식별</dt><dd>' + escapeHtml(activeReservation.id) + '</dd></div><div><dt>예약 상태</dt><dd><span class="table-status ' + statusClass(activeReservation.status) + '">' + activeReservation.status + '</span></dd></div><div><dt>이용일</dt><dd>' + escapeHtml(activeReservation.date) + '</dd></div><div><dt>회차</dt><dd>' + escapeHtml(activeReservation.time) + '</dd></div></dl>';
    renderDrawerTickets();
    byId("payment-detail").innerHTML = '<div><dt>통합 결제번호</dt><dd>' + escapeHtml(activeReservation.orderId) + '</dd></div><div><dt>결제 수단</dt><dd>' + escapeHtml(activeReservation.method) + '</dd></div><div><dt>원 결제금액</dt><dd>' + money(activeReservation.price) + '</dd></div><div><dt>환불 누계</dt><dd>' + money(ticketRefundTotal(activeReservation)) + '</dd></div><div><dt>남은 결제금액</dt><dd>' + money(activeReservation.price - ticketRefundTotal(activeReservation)) + '</dd></div>';
    byId("history-list").innerHTML = '<li><strong>결제 및 예약 확정</strong><small>' + escapeHtml(activeReservation.createdAt) + ' · 시스템</small></li>' + (activeReservation.tickets.some(function (ticket) { return ticket === "cancelled"; }) ? '<li><strong>개별 티켓 취소 · 부분환불 완료</strong><small>관리자 처리 · 시연 이력</small></li>' : "");
    byId("drawer-backdrop").hidden = false; byId("reservation-drawer").hidden = false; document.body.style.overflow = "hidden";
  }

  function ticketUnitPrice(reservation) { return reservation.qty ? Math.floor(reservation.price / reservation.qty) : 0; }
  function ticketRefundTotal(reservation) { return reservation.tickets.filter(function (ticket) { return ticket === "cancelled"; }).length * ticketUnitPrice(reservation); }

  function renderDrawerTickets() {
    var list = byId("individual-tickets"); list.replaceChildren();
    activeReservation.tickets.forEach(function (status, index) {
      var label = document.createElement("label"); label.className = "individual-ticket" + (status !== "confirmed" ? " is-cancelled" : "");
      var statusText = status === "confirmed" ? "예약 유효" : status === "review" ? "환불 확인" : "취소 완료";
      label.innerHTML = '<input type="checkbox" value="' + index + '" ' + (status !== "confirmed" ? "disabled" : "") + '><span><strong>' + escapeHtml(activeReservation.id) + '-T' + String(index + 1).padStart(2, "0") + '</strong><small>배분 결제액 ' + money(ticketUnitPrice(activeReservation)) + '</small></span><span>' + statusText + '</span>';
      label.querySelector("input").addEventListener("change", updateSelectedTickets); list.append(label);
    });
    byId("drawer-ticket-count").textContent = activeReservation.tickets.length + "장 · 유효 " + activeReservation.tickets.filter(function (ticket) { return ticket === "confirmed"; }).length + "장";
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

  loadSavedDemoState();
  refreshDepartmentSelect("reservation-department", "", "");
  refreshDepartmentSelect("kiosk-department-filter", "", "");
  renderReservations(); renderKioskProducts(); renderAdminAccounts();

  document.querySelectorAll("[data-admin-view]").forEach(function (button) { button.addEventListener("click", function () { showView(button.dataset.adminView); }); });
  document.querySelectorAll("[data-go-view]").forEach(function (button) { button.addEventListener("click", function () { showView(button.dataset.goView); }); });
  ["reservation-search", "reservation-department", "reservation-date", "reservation-program", "reservation-status"].forEach(function (id) { byId(id).addEventListener(id === "reservation-search" ? "input" : "change", renderReservations); });
  byId("reservation-location").addEventListener("change", function () { refreshDepartmentSelect("reservation-department", byId("reservation-location").value, ""); renderReservations(); });
  byId("reset-filters").addEventListener("click", function () { byId("reservation-search").value = ""; byId("reservation-location").value = ""; byId("reservation-date").value = ""; byId("reservation-program").value = ""; byId("reservation-status").value = ""; refreshDepartmentSelect("reservation-department", "", ""); renderReservations(); });
  byId("drawer-close").addEventListener("click", closeDrawer); byId("drawer-backdrop").addEventListener("click", closeDrawer);
  byId("cancel-selected").addEventListener("click", openCancelDialog); byId("confirm-cancel").addEventListener("click", confirmCancellation);
  byId("mobile-menu").addEventListener("click", function () { document.querySelector(".admin-sidebar").classList.toggle("is-open"); });
  byId("kiosk-product-search").addEventListener("input", renderKioskProducts);
  byId("kiosk-location-filter").addEventListener("change", function () { refreshDepartmentSelect("kiosk-department-filter", byId("kiosk-location-filter").value, ""); renderKioskProducts(); });
  byId("kiosk-department-filter").addEventListener("change", renderKioskProducts);
  byId("kiosk-type-filter").addEventListener("change", renderKioskProducts);
  byId("refresh-products").addEventListener("click", function () { byId("kiosk-product-search").value = ""; byId("kiosk-location-filter").value = ""; byId("kiosk-type-filter").value = ""; refreshDepartmentSelect("kiosk-department-filter", "", ""); renderKioskProducts(); notify("전체 프로그램 목록을 새로고침했습니다."); });
  byId("add-product").addEventListener("click", function () { openProductDialog({ location: "서울", department: "공원화사업추진TF", programType: "기타", settlementTag: "", purchaseGroup: "", conflictGroup: "", bookingWindow: 14, cancelMinutes: 10, cancelOffsetValue: 10, cancelOffsetUnit: "minutes", saleStartDate: "2026-09-01", saleEndDate: "2026-12-31", saleDays: [6, 0], programName: "", price: 0, image: "", discountIds: [], active: true }); });
  byId("detail-location").addEventListener("change", function () { var location = byId("detail-location").value; refreshDepartmentSelect("detail-department", location, organization[location][0]); });
  byId("discount-settings").addEventListener("click", function () { openDiscountManager(); });
  byId("add-discount-policy").addEventListener("click", function () { editDiscountPolicy(null); renderDiscountPolicies(); });
  byId("discount-all-programs").addEventListener("change", function () { renderDiscountProgramOptions(Array.from(document.querySelectorAll("#discount-program-options input:checked")).map(function (input) { return input.value; })); });
  byId("save-discount-policy").addEventListener("click", saveDiscountPolicy);
  byId("open-discounts-from-product").addEventListener("click", function () { openDiscountManager(); notify("할인을 저장한 뒤 프로그램 수정 화면에서 적용할 수 있습니다."); });
  byId("save-product-detail").addEventListener("click", saveProductDetail);
  byId("program-edit-back").addEventListener("click", function () { showView("programs"); });
  byId("program-sessions-back").addEventListener("click", function () { showView("programs"); });
  byId("add-session").addEventListener("click", function () { editSession(null); });
  byId("cancel-session-edit").addEventListener("click", function () { byId("session-editor").hidden = true; activeSessionKey = null; });
  byId("save-session").addEventListener("click", saveSession);
  byId("scope-button").addEventListener("click", function () { notify("전체 지역의 프로그램은 조회할 수 있고 수정은 담당 부서 권한으로 제한됩니다."); });
  byId("bulk-cancel").addEventListener("click", function () { byId("operation-cancel-dialog").showModal(); });
  byId("confirm-operation-cancel").addEventListener("click", function () { byId("operation-cancel-dialog").close(); notify("선택한 회차를 운영 취소하고 대상 예약의 환불 처리를 시작했습니다."); });
  byId("invite-admin").addEventListener("click", function () { openAdminAccountDialog(null); });
  byId("account-location-filter").addEventListener("change", renderAdminAccounts);
  byId("account-search").addEventListener("input", renderAdminAccounts);
  byId("account-location").addEventListener("change", function () { refreshAccountDepartment(byId("account-location").value, ""); });
  byId("generate-account-password").addEventListener("click", generateAccountPassword);
  byId("save-admin-account").addEventListener("click", saveAdminAccount);
  byId("apply-settlement").addEventListener("click", function () { notify("선택한 기간의 정산 내역을 조회했습니다."); });
  byId("download-reservations").addEventListener("click", function () { var rows = [["예약번호", "지역", "담당부서", "프로그램", "이용일", "회차", "인원", "결제금액", "상태"]]; filteredReservations().forEach(function (item) { rows.push([item.id, item.location, item.department, item.program, item.date, item.time, item.qty, item.price, item.status]); }); downloadCsv("렛츠런플레이_통합예약목록.csv", rows); });
  byId("download-settlement").addEventListener("click", function () { downloadCsv("렛츠런플레이_부서별정산_2026-09.csv", [["서비스완료월", "지역", "담당부서", "정산태그", "프로그램", "완료건수", "결제액", "환불액", "PG수수료", "지급예정액"], ["2026-09", "서울", "공원화사업추진TF", "SEOUL-PARK-TF", "포니 타기", 982, 5210000, -210000, -150000, 4850000], ["2026-09", "서울", "공원화사업추진TF", "SEOUL-PARK-TF", "포니랑 놀기", 604, 3210000, -116000, -92820, 3001180]]); });
  document.addEventListener("keydown", function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p") {
      event.preventDefault();
      if (!byId("developer-policy-dialog").open) byId("developer-policy-dialog").showModal();
    }
  });

  var requestedView = location.hash.replace("#", "");
  if (["reservations", "programs", "settlement", "permissions"].includes(requestedView)) showView(requestedView);
  else showView("programs");
})();
