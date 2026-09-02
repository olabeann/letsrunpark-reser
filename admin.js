(function () {
  "use strict";

  var reservationStoreKey = "ponylandBookingStoreV2";
  var adminStateKey = "ponylandAdminDemoV1";
  var toastTimer;
  var activeReservation = null;

  var demoReservations = [
    { id: "GP-260902-1042", orderId: "PAY-260902-3018", memberId: "demo:카카오:1", customer: "김하늘", contact: "010-42**-18**", programKey: "ride", program: "포니 타기", dateKey: "2026-09-05", date: "2026.09.05 (토)", time: "10:00~10:20", qty: 3, price: 15000, discount: false, status: "예약 확정", createdAt: "2026-09-02 10:42", method: "신용카드", tickets: ["confirmed", "confirmed", "confirmed"] },
    { id: "GP-260902-1036", orderId: "PAY-260902-3012", memberId: "demo:네이버:2", customer: "이유진", contact: "010-73**-02**", programKey: "play", program: "포니랑 놀기", dateKey: "2026-09-05", date: "2026.09.05 (토)", time: "10:20~10:45", qty: 2, price: 4000, discount: true, status: "부분 취소", createdAt: "2026-09-02 10:36", method: "신용카드", tickets: ["confirmed", "cancelled"] },
    { id: "GP-260902-1019", orderId: "PAY-260902-2998", memberId: "demo:카카오:2", customer: "최서준", contact: "010-11**-63**", programKey: "ride", program: "포니 타기", dateKey: "2026-09-06", date: "2026.09.06 (일)", time: "11:00~11:20", qty: 1, price: 2500, discount: true, status: "환불 확인", createdAt: "2026-09-02 10:19", method: "신용카드", tickets: ["review"] },
    { id: "GP-260902-0951", orderId: "PAY-260902-2971", memberId: "demo:네이버:1", customer: "박도윤", contact: "010-89**-25**", programKey: "play", program: "포니랑 놀기", dateKey: "2026-09-06", date: "2026.09.06 (일)", time: "13:20~13:45", qty: 4, price: 16000, discount: false, status: "예약 확정", createdAt: "2026-09-02 09:51", method: "신용카드", tickets: ["confirmed", "confirmed", "confirmed", "confirmed"] },
    { id: "GP-260902-0927", orderId: "PAY-260902-2944", memberId: "demo:카카오:1", customer: "정지아", contact: "010-54**-70**", programKey: "ride", program: "포니 타기", dateKey: "2026-09-12", date: "2026.09.12 (토)", time: "14:20~14:45", qty: 2, price: 5000, discount: true, status: "예약 확정", createdAt: "2026-09-02 09:27", method: "신용카드", tickets: ["confirmed", "confirmed"] },
    { id: "GP-260901-1844", orderId: "PAY-260901-2886", memberId: "demo:네이버:2", customer: "한예린", contact: "010-90**-13**", programKey: "play", program: "포니랑 놀기", dateKey: "2026-09-12", date: "2026.09.12 (토)", time: "15:00~15:20", qty: 1, price: 4000, discount: false, status: "취소 완료", createdAt: "2026-09-01 18:44", method: "신용카드", tickets: ["cancelled"] }
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
    ride: { name: "포니 타기", price: 5000, image: "assets/pony/cover.jpg" },
    play: { name: "포니랑 놀기", price: 4000, image: "assets/pony/gallery-02.jpg" }
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
      if (!state || !Array.isArray(state.reservations)) return;
      state.reservations.forEach(function (saved) {
        var target = demoReservations.find(function (item) { return item.id === saved.id; });
        if (target && Array.isArray(saved.tickets)) { target.tickets = saved.tickets; target.status = saved.status; }
      });
    } catch (error) { /* Keep the review prototype usable if browser storage is unavailable. */ }
  }

  function saveDemoState() {
    try { localStorage.setItem(adminStateKey, JSON.stringify({ reservations: demoReservations.map(function (item) { return { id: item.id, status: item.status, tickets: item.tickets }; }) })); }
    catch (error) { notify("변경사항을 이 브라우저에 저장하지 못했습니다."); }
  }

  function readBookingReservations() {
    try {
      var store = JSON.parse(localStorage.getItem(reservationStoreKey) || "null");
      if (!store || !Array.isArray(store.reservations)) return [];
      return store.reservations.filter(function (item) { return item && item.id && item.qty; }).map(function (item, index) {
        var memberBits = String(item.memberId || "demo:카카오:1").split(":");
        var customer = (memberBits[1] || "시연") + " 회원 " + (memberBits[2] || "1");
        return {
          id: item.id, orderId: item.orderId || "PAY-DEMO-" + (index + 1), memberId: item.memberId,
          customer: customer, contact: "간편로그인 계정", programKey: item.programKey === "play" ? "play" : "ride",
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
    return demoReservations.concat(readBookingReservations()).filter(function (item) { if (ids[item.id]) return false; ids[item.id] = true; return true; });
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
      '<td><strong>' + escapeHtml(item.customer) + '</strong><br><small>' + escapeHtml(item.contact) + '</small></td>' +
      '<td><span class="table-program"><img src="' + programs[item.programKey].image + '" alt=""><strong>' + escapeHtml(item.program) + '</strong></span></td>' +
      '<td><strong>' + escapeHtml(item.date) + '</strong><br><small>' + escapeHtml(item.time) + '</small></td>' +
      '<td>' + item.tickets.filter(function (ticket) { return ticket === "confirmed"; }).length + ' / ' + item.qty + '명</td>' +
      '<td><strong>' + money(item.price) + '</strong></td>' +
      '<td><span class="table-status ' + statusClass(item.status) + '">' + item.status + '</span></td>' + (selectable ? '<td>›</td>' : "");
    row.addEventListener("click", function (event) { if (event.target.type !== "checkbox") openDrawer(item.id); });
    return row;
  }

  function renderRecent() {
    var body = byId("recent-table-body"); body.replaceChildren();
    allReservations().slice(0, 5).forEach(function (item) { body.append(reservationRow(item, false)); });
  }

  function filteredReservations() {
    var search = byId("reservation-search").value.trim().toLowerCase();
    var date = byId("reservation-date").value;
    var program = byId("reservation-program").value;
    var status = byId("reservation-status").value;
    return allReservations().filter(function (item) {
      return (!search || (item.id + " " + item.customer).toLowerCase().includes(search)) && (!date || item.dateKey === date) && (!program || item.program === program) && (!status || item.status === status);
    });
  }

  function renderReservations() {
    var items = filteredReservations(); var body = byId("reservation-table-body"); body.replaceChildren();
    items.forEach(function (item) { body.append(reservationRow(item, true)); });
    if (!items.length) { var row = document.createElement("tr"); row.innerHTML = '<td colspan="9" style="padding:42px;text-align:center;color:#78847e">조건에 맞는 예약이 없습니다.</td>'; body.append(row); }
    byId("reservation-count").textContent = items.length;
    byId("reservation-range").textContent = items.length ? "1–" + items.length + " / " + items.length + "건" : "0건";
  }

  function showView(viewName) {
    document.querySelectorAll(".admin-view").forEach(function (view) { var visible = view.dataset.view === viewName; view.hidden = !visible; view.classList.toggle("is-visible", visible); });
    document.querySelectorAll("[data-admin-view]").forEach(function (button) { button.classList.toggle("is-active", button.dataset.adminView === viewName); });
    document.querySelector(".admin-sidebar").classList.remove("is-open");
    if (viewName === "reservations") renderReservations();
    history.replaceState(null, "", viewName === "dashboard" ? location.pathname : "#" + viewName);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderSessions(programKey) {
    var list = byId("session-list"); list.replaceChildren();
    sessionData[programKey].slice(0, 7).forEach(function (session) {
      var ratio = Math.round(session[3] / session[4] * 100);
      var stateClass = session[5] === "마감" || session[5] === "운영 마감" ? "is-closed" : session[5].includes("잔여") ? "is-warning" : "";
      var row = document.createElement("div"); row.className = "session-row";
      row.innerHTML = '<strong>' + session[1] + '–' + session[2] + '</strong><div class="capacity-bar ' + stateClass + '"><span><i style="width:' + ratio + '%"></i></span><b>' + session[3] + '/' + session[4] + '명</b></div><span>' + session[0] + '</span><span class="status-chip ' + stateClass + '">' + session[5] + '</span>';
      list.append(row);
    });
  }

  function renderSessionEditor(programKey) {
    var editor = byId("session-editor"); editor.replaceChildren();
    sessionData[programKey].forEach(function (session, index) {
      var row = document.createElement("div"); row.className = "session-editor-row";
      row.innerHTML = '<strong>' + (index + 1) + '</strong><input type="time" value="' + session[1] + '" aria-label="' + session[0] + ' 시작"><input type="time" value="' + session[2] + '" aria-label="' + session[0] + ' 종료"><input type="number" min="0" max="99" value="' + session[4] + '" aria-label="' + session[0] + ' 온라인 수량"><select aria-label="' + session[0] + ' 상태"><option' + (session[5] === "판매중" ? " selected" : "") + '>판매중</option><option' + (session[5] === "마감" ? " selected" : "") + '>마감</option><option' + (session[5] === "운영 마감" ? " selected" : "") + '>운영 마감</option></select><button type="button" aria-label="' + session[0] + ' 삭제">×</button>';
      row.querySelector("button").addEventListener("click", function () { row.remove(); notify("회차를 삭제했습니다. 저장 전까지 공개 화면에는 반영되지 않습니다."); });
      editor.append(row);
    });
  }

  function selectProgram(programKey) {
    document.querySelectorAll("[data-program-tab]").forEach(function (button) { button.classList.toggle("is-active", button.dataset.programTab === programKey); });
    byId("program-settings-title").textContent = programs[programKey].name + " 운영 설정";
    byId("program-price").value = programs[programKey].price;
    renderSessionEditor(programKey);
    byId("session-editor").dataset.program = programKey;
  }

  function openDrawer(reservationId) {
    activeReservation = allReservations().find(function (item) { return item.id === reservationId; });
    if (!activeReservation) return;
    byId("drawer-title").textContent = activeReservation.id;
    byId("drawer-summary").innerHTML = '<h3>' + escapeHtml(activeReservation.program) + '</h3><dl><div><dt>예약자</dt><dd>' + escapeHtml(activeReservation.customer) + ' · ' + escapeHtml(activeReservation.contact) + '</dd></div><div><dt>예약 상태</dt><dd><span class="table-status ' + statusClass(activeReservation.status) + '">' + activeReservation.status + '</span></dd></div><div><dt>이용일</dt><dd>' + escapeHtml(activeReservation.date) + '</dd></div><div><dt>회차</dt><dd>' + escapeHtml(activeReservation.time) + '</dd></div></dl>';
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
    var activeId = activeReservation.id; openDrawer(activeId); renderRecent(); renderReservations();
    notify(selected.length + "명의 티켓을 취소하고 " + money(selected.length * ticketUnitPrice(activeReservation)) + " 부분환불 처리했습니다.");
  }

  function downloadCsv(filename, rows) {
    var csv = "\ufeff" + rows.map(function (row) { return row.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
    var url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    var link = document.createElement("a"); link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    notify("자료를 내려받았습니다.");
  }

  loadSavedDemoState();
  renderSessions("ride"); renderRecent(); renderReservations(); selectProgram("ride");
  byId("today-label").textContent = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(new Date());

  document.querySelectorAll("[data-admin-view]").forEach(function (button) { button.addEventListener("click", function () { showView(button.dataset.adminView); }); });
  document.querySelectorAll("[data-go-view]").forEach(function (button) { button.addEventListener("click", function () { showView(button.dataset.goView); }); });
  document.querySelectorAll("[data-session-program]").forEach(function (button) { button.addEventListener("click", function () { document.querySelectorAll("[data-session-program]").forEach(function (item) { item.classList.toggle("is-selected", item === button); }); renderSessions(button.dataset.sessionProgram); }); });
  document.querySelectorAll("[data-program-tab]").forEach(function (button) { button.addEventListener("click", function () { selectProgram(button.dataset.programTab); }); });
  ["reservation-search", "reservation-date", "reservation-program", "reservation-status"].forEach(function (id) { byId(id).addEventListener(id === "reservation-search" ? "input" : "change", renderReservations); });
  byId("reset-filters").addEventListener("click", function () { byId("reservation-search").value = ""; byId("reservation-date").value = ""; byId("reservation-program").value = ""; byId("reservation-status").value = ""; renderReservations(); });
  byId("drawer-close").addEventListener("click", closeDrawer); byId("drawer-backdrop").addEventListener("click", closeDrawer);
  byId("cancel-selected").addEventListener("click", openCancelDialog); byId("confirm-cancel").addEventListener("click", confirmCancellation);
  byId("mobile-menu").addEventListener("click", function () { document.querySelector(".admin-sidebar").classList.toggle("is-open"); });
  byId("save-programs").addEventListener("click", function () { notify("프로그램과 회차 변경사항을 저장했습니다."); });
  byId("add-session").addEventListener("click", function () { var key = byId("session-editor").dataset.program; sessionData[key].push([sessionData[key].length + 1 + "회차", "17:00", "17:20", 0, 8, "판매중"]); renderSessionEditor(key); notify("새 회차를 추가했습니다."); });
  byId("copy-sessions").addEventListener("click", function () { notify("현재 회차 구성을 다음 운영일에 복사했습니다."); });
  byId("scope-button").addEventListener("click", function () { notify("현재 시연에서는 서울 · 공원지원부 범위로 고정되어 있습니다."); });
  byId("notice-button").addEventListener("click", function () { notify("환불 확인 1건과 잔여 수량 주의 1건이 있습니다."); });
  byId("bulk-cancel").addEventListener("click", function () { notify("운영 취소는 날짜와 회차를 선택한 뒤 대상 예약을 확인하도록 설계되어 있습니다."); });
  byId("invite-admin").addEventListener("click", function () { notify("관리자 초대와 실제 권한 부여는 인증 연동 후 제공됩니다."); });
  byId("apply-settlement").addEventListener("click", function () { notify("선택한 기간의 정산 내역을 조회했습니다."); });
  byId("download-reservations").addEventListener("click", function () { var rows = [["예약번호", "예약자", "프로그램", "이용일", "회차", "인원", "결제금액", "상태"]]; filteredReservations().forEach(function (item) { rows.push([item.id, item.customer, item.program, item.date, item.time, item.qty, item.price, item.status]); }); downloadCsv("포니랜드_예약목록.csv", rows); });
  byId("download-settlement").addEventListener("click", function () { downloadCsv("포니랜드_정산자료_2026-09.csv", [["귀속", "프로그램", "결제건수", "결제액", "환불액", "수수료", "정산대상"], ["서울·공원지원부", "포니 타기", 982, 5210000, -210000, -150000, 4850000], ["서울·공원지원부", "포니랑 놀기", 604, 3210000, -116000, -92820, 3001180]]); });

  var requestedView = location.hash.replace("#", "");
  if (["dashboard", "reservations", "programs", "settlement", "permissions"].includes(requestedView)) showView(requestedView);
  else showView("reservations");
})();
