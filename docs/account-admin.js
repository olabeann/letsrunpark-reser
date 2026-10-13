(function () {
  "use strict";

  var storeKey = "letsrunParkDepartmentAccountsV3";
  var toastTimer;
  var activeAccountKey = null;
  var pendingDeletionKey = null;
  var pendingOtpRegistered = false;
  var seededProgramCounts = {
    "서울|공원화사업추진TF": 2
  };
  var organization = {
    "서울": ["홍보부", "브랜드총괄부", "발매운영부", "서울고객안전부", "공원화사업추진TF"],
    "부산경남": ["부산경주자원관리부", "부산고객안전부", "부산운영지원부"],
    "제주": ["제주경주자원관리부", "제주고객안전부", "제주운영지원부"]
  };
  var accounts = [
    { key: "account-super", loginId: "letsrun_admin", type: "super", location: "전체", department: "통합 운영", access: { ownDepartment: "crud", otherDepartments: "crud" }, permissions: { programs: true, reservations: true, refunds: true, settlement: true }, active: true, lastLogin: "오늘 09:12" },
    { key: "account-seoul-brand", loginId: "seoul_brand", type: "department", location: "서울", department: "브랜드총괄부", access: { ownDepartment: "crud", otherDepartments: "read" }, permissions: { programs: true, reservations: true, refunds: true, settlement: true }, active: true, lastLogin: "어제 17:40" },
    { key: "account-seoul-park", loginId: "seoul_park", type: "department", location: "서울", department: "공원화사업추진TF", access: { ownDepartment: "crud", otherDepartments: "read" }, permissions: { programs: true, reservations: true, refunds: true, settlement: true }, active: true, lastLogin: "오늘 08:55" },
    { key: "account-busan-ops", loginId: "busan_ops", type: "department", location: "부산경남", department: "부산운영지원부", access: { ownDepartment: "crud", otherDepartments: "read" }, permissions: { programs: true, reservations: true, refunds: true, settlement: true }, active: true, lastLogin: "8월 30일" },
    { key: "account-jeju-ops", loginId: "jeju_ops", type: "department", location: "제주", department: "제주운영지원부", access: { ownDepartment: "crud", otherDepartments: "read" }, permissions: { programs: true, reservations: true, refunds: true, settlement: true }, active: true, lastLogin: "미접속" }
  ];

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, function (character) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]; }); }
  function notify(message) {
    var toast = byId("account-toast");
    toast.textContent = message; toast.classList.add("is-on"); clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 3200);
  }
  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(storeKey) || "null");
      if (Array.isArray(saved) && saved.length) accounts = saved;
    } catch (error) { /* Keep the review prototype usable when storage is unavailable. */ }
  }
  function canManageCommercePermission() {
    var loginId;
    try { loginId = sessionStorage.getItem("letsrunPlayAdminSessionV1"); }
    catch (error) { return false; }
    // Match the reservation prototype's default integrated-admin session.
    if (!loginId) return true;
    return loginId === "admin" || accounts.some(function (account) {
      return account.type === "super" && account.active !== false && account.loginId === loginId;
    });
  }
  function hasCommercePermission(account) {
    return !!account && (account.type === "super" || !!(account.permissions && account.permissions.commerce));
  }
  function renderCommercePermission(account) {
    var isSuper = !!account && account.type === "super";
    var checkbox = byId("account-commerce-permission");
    checkbox.checked = hasCommercePermission(account);
    checkbox.disabled = isSuper || !canManageCommercePermission();
    byId("account-commerce-help").textContent = isSuper
      ? "통합관리자는 커머스 권한이 기본 부여됩니다."
      : !canManageCommercePermission()
        ? "커머스 권한은 통합관리자만 변경할 수 있습니다."
        : "상품·주문·배송·반품·정산과 스토어 운영 기능을 관리할 수 있습니다.";
  }
  function save() {
    try { localStorage.setItem(storeKey, JSON.stringify(accounts)); }
    catch (error) { notify("이 브라우저에 계정 설정을 저장하지 못했습니다."); }
  }
  function render() {
    var location = byId("account-location-filter").value;
    var search = byId("account-search").value.trim().toLowerCase();
    var visible = accounts.filter(function (account) {
      var locationMatch = !location || account.location === location || account.type === "super";
      return locationMatch && (!search || [account.location, account.department, account.loginId].join(" ").toLowerCase().includes(search));
    });
    var body = byId("admin-account-body"); body.replaceChildren();
    visible.forEach(function (account) {
      var row = document.createElement("tr");
      row.innerHTML = '<td><strong>' + escapeHtml(account.location) + '</strong><small>' + escapeHtml(account.department) + '</small></td>' +
        '<td><strong>' + escapeHtml(account.loginId) + '</strong></td>' +
        '<td><span class="account-type ' + (account.type === "super" ? 'is-super' : '') + '">' + (account.type === "super" ? '통합 관리자' : '관리자') + '</span></td>' +
        '<td><span class="account-type ' + (hasCommercePermission(account) ? 'is-super' : '') + '">' + (account.type === "super" ? '기본 부여' : hasCommercePermission(account) ? '부여' : '미부여') + '</span></td>' +
        '<td><span class="account-type">' + (account.otpRegistered ? '등록 완료' : '등록 대기') + '</span></td>' +
        '<td><button class="account-edit" type="button">계정 정보</button></td>';
      row.querySelector(".account-edit").addEventListener("click", function () { openDialog(account); });
      body.append(row);
    });
    if (!visible.length) body.innerHTML = '<tr><td colspan="6" class="empty-table"><span class="admin-empty-icon" aria-hidden="true"><img src="assets/icons/empty-account.svg" alt=""></span><strong>조건에 맞는 관리자 계정이 없습니다.</strong><small>지역이나 계정 검색어를 변경해 다시 확인해주세요.</small></td></tr>';
  }
  function refreshDepartments(location, selected) {
    var departments = location === "전체" ? ["통합 운영"] : organization[location] || [];
    byId("account-department").innerHTML = departments.map(function (department) { return '<option>' + escapeHtml(department) + '</option>'; }).join("");
    if (selected && departments.includes(selected)) byId("account-department").value = selected;
  }
  function renderFixedAccessPolicy(isSuper, location, department) {
    var cards = byId("fixed-access-policy-cards");
    if (isSuper) {
      cards.innerHTML = '<article><span>모든 지역 · 부서</span><strong>모든 기능을 사용할 수 있어요</strong><small>서울·부산경남·제주의 모든 부서 데이터를 보고 관리할 수 있습니다.</small></article>';
      return;
    }
    cards.innerHTML = '<article><span>담당 부서 · ' + escapeHtml(location) + ' · ' + escapeHtml(department) + '</span><strong>담당 부서 내용을 관리할 수 있어요</strong><small>자기 부서의 프로그램·회차, 예약·환불, 운영일과 정산을 관리할 수 있습니다.</small></article>' +
      '<article class="is-readonly"><span>다른 부서</span><strong>프로그램은 보기만 할 수 있어요</strong><small>다른 부서가 운영하는 프로그램은 확인할 수 있지만 추가하거나 변경할 수 없습니다.</small></article>';
  }
  function accountDeletionBlockers(account) {
    if (!account) return ["계정 정보를 찾을 수 없음"];
    if (account.type === "super") return ["통합 관리자 계정"];
    var blockers = [];
    var programCount = seededProgramCounts[account.location + "|" + account.department] || 0;
    if (programCount) blockers.push("연결된 프로그램 " + programCount + "개");
    if (account.operationHistoryCount > 0) blockers.push("운영 이력 " + account.operationHistoryCount + "건");
    return blockers;
  }
  function openDialog(account) {
    activeAccountKey = account ? account.key : null;
    var isSuper = !!account && account.type === "super";
    var locationSelect = byId("account-location");
    var allOption = Array.from(locationSelect.options).find(function (option) { return option.value === "전체"; });
    if (isSuper && !allOption) locationSelect.insertAdjacentHTML("afterbegin", '<option>전체</option>');
    if (!isSuper && allOption) allOption.remove();
    byId("account-dialog-title").textContent = account ? account.department + " 계정 정보" : "부서 계정 발급";
    locationSelect.value = account ? account.location : "서울"; locationSelect.disabled = isSuper;
    refreshDepartments(locationSelect.value, account ? account.department : organization["서울"][0]);
    locationSelect.disabled = !!account;
    byId("account-department").disabled = !!account;
    byId("account-login-id").value = account ? account.loginId : "";
    byId("account-password").value = ""; byId("account-password").type = "text";
    byId("account-password").placeholder = account ? "재발급할 때만 입력" : "8자 이상 임시 비밀번호";
    byId("delete-admin-account").hidden = !account || isSuper;
    renderFixedAccessPolicy(isSuper, locationSelect.value, byId("account-department").value);
    renderCommercePermission(account);
    pendingOtpRegistered = !!(account && account.otpRegistered);
    renderOtpSettings();
    byId("account-dialog").showModal();
  }
  function requestAccountDeletion() {
    var account = accounts.find(function (item) { return item.key === activeAccountKey; });
    if (!account || account.type === "super") { notify("통합 관리자 계정은 삭제할 수 없습니다."); return; }
    var blockers = accountDeletionBlockers(account);
    var blocked = blockers.length > 0;
    pendingDeletionKey = blocked ? null : account.key;
    byId("account-delete-title").textContent = blocked ? "관리자 계정을 삭제할 수 없습니다" : "관리자 계정을 삭제할까요?";
    byId("account-delete-scope").textContent = account.location + " · " + account.department;
    byId("account-delete-impact").textContent = blocked ? "삭제 제한: " + blockers.join(", ") : "로그인 ID " + account.loginId;
    byId("account-delete-message").textContent = blocked
      ? "연결된 프로그램 또는 예약·결제·환불·정산 등\n운영 이력이 있어 계정을 삭제할 수 없습니다."
      : "연결된 프로그램과 운영 이력이 없는 계정만 삭제할 수 있습니다.\n삭제한 계정은 복구할 수 없습니다.";
    byId("confirm-account-delete").hidden = blocked;
    byId("account-delete-close").textContent = blocked ? "확인" : "취소";
    byId("account-delete-dialog").showModal();
  }
  function confirmAccountDeletion() {
    var index = accounts.findIndex(function (account) { return account.key === pendingDeletionKey; });
    if (index === -1) { notify("삭제할 계정 정보를 찾을 수 없습니다."); return; }
    var account = accounts[index];
    var blockers = accountDeletionBlockers(account);
    if (blockers.length) {
      pendingDeletionKey = null;
      byId("account-delete-dialog").close();
      notify("연결된 프로그램이나 운영 이력이 생겨 계정을 삭제할 수 없습니다.");
      return;
    }
    accounts.splice(index, 1);
    save(); render();
    activeAccountKey = null; pendingDeletionKey = null;
    byId("account-delete-dialog").close(); byId("account-dialog").close();
    notify(account.department + " 관리자 계정을 삭제했습니다.");
  }
  function saveAccount() {
    var existing = activeAccountKey ? accounts.find(function (account) { return account.key === activeAccountKey; }) : null;
    var isSuper = !!existing && existing.type === "super";
    var location = isSuper ? "전체" : byId("account-location").value;
    var department = isSuper ? "통합 운영" : byId("account-department").value;
    var loginId = byId("account-login-id").value.trim();
    var password = byId("account-password").value;
    if (!/^[a-zA-Z0-9._-]{4,32}$/.test(loginId)) { notify("로그인 ID는 영문·숫자와 . _ - 기호로 4~32자 입력해주세요."); return; }
    if (accounts.some(function (account) { return account.key !== activeAccountKey && account.loginId.toLowerCase() === loginId.toLowerCase(); })) { notify("이미 사용 중인 로그인 ID입니다."); return; }
    if (!isSuper && accounts.some(function (account) { return account.key !== activeAccountKey && account.type === "department" && account.location === location && account.department === department; })) { notify("해당 부서에는 이미 발급된 관리자 계정이 있습니다."); return; }
    if ((!existing || password) && password.length < 8) { notify("임시 비밀번호는 8자 이상이어야 합니다."); return; }
    var saved = Object.assign({}, existing || {}, {
      key: activeAccountKey || "department-account-" + Date.now(), loginId: loginId, type: isSuper ? "super" : "department", access: isSuper ? { ownDepartment: "crud", otherDepartments: "crud" } : { ownDepartment: "crud", otherDepartments: "read" },
      location: location, department: department, permissions: Object.assign({}, existing && existing.permissions, { programs: true, reservations: true, refunds: true, settlement: true, commerce: isSuper || (canManageCommercePermission() ? byId("account-commerce-permission").checked : hasCommercePermission(existing)) }),
      otpRegistered: !!(existing && existing.otpRegistered), active: true, lastLogin: existing ? existing.lastLogin : "미접속"
    });
    var index = accounts.findIndex(function (account) { return account.key === saved.key; });
    if (index === -1) accounts.push(saved); else accounts[index] = saved;
    save(); render(); byId("account-password").value = ""; byId("account-dialog").close(); notify(department + " 관리자 계정과 권한을 저장했습니다.");
  }

  function renderOtpCard(prefix, enabled, feedback) {
    byId(prefix + "-badge").textContent = enabled ? "사용 중" : "등록 대기";
    byId(prefix + "-badge").classList.toggle("is-enabled", enabled);
    byId(prefix + "-status").textContent = enabled
      ? "인증 기기를 변경하려면 기존 휴대폰의 현재 인증 코드를 먼저 확인해 주세요."
      : "QR코드 또는 수동 입력 키로 등록한 뒤 6자리 인증 코드를 확인해 주세요.";
    byId(prefix + "-enroll").hidden = enabled;
    byId(prefix + "-verify").hidden = enabled;
    byId(prefix + "-reset").hidden = !enabled;
    byId(prefix + "-verify").disabled = !/^[0-9]{6}$/.test(byId(prefix + "-code").value);
    byId(prefix + "-reset").disabled = !/^[0-9]{6}$/.test(byId(prefix + "-code").value);
    if (feedback !== undefined) {
      byId(prefix + "-feedback").textContent = feedback;
      byId(prefix + "-feedback").classList.toggle("is-success", false);
    }
  }
  function renderOtpSettings() {
    byId("account-otp-badge").textContent = pendingOtpRegistered ? "등록 완료" : "등록 대기";
    byId("account-otp-badge").classList.toggle("is-enabled", pendingOtpRegistered);
    byId("account-otp-status").textContent = pendingOtpRegistered
      ? "담당자가 직접 등록한 OTP입니다. 인증 기기 변경은 담당자의 ‘내 계정 · 보안’에서 진행합니다."
      : "계정을 저장하면 OTP 등록 대기로 발급됩니다. 담당자가 최초 로그인할 때 본인 휴대폰으로 등록해야 관리자 기능을 사용할 수 있습니다.";
  }
  function checkOtpCode(prefix) {
    if (byId(prefix + "-code").value !== "123456") {
      byId(prefix + "-feedback").classList.remove("is-success");
      byId(prefix + "-feedback").textContent = "인증 코드가 올바르지 않거나 만료되었습니다. 시연용 코드 123456으로 다시 시도해 주세요.";
      byId(prefix + "-code").setAttribute("aria-invalid", "true");
      byId(prefix + "-code").focus();
      return false;
    }
    byId(prefix + "-code").removeAttribute("aria-invalid");
    return true;
  }
  function bindOtpInput(prefix, renderState) {
    byId(prefix + "-code").addEventListener("input", function () {
      this.value = this.value.replace(/[^0-9]/g, "").slice(0, 6);
      this.removeAttribute("aria-invalid");
      renderState();
    });
  }
  function mountPersonalSecurity() {
    if (!byId("account-security-main")) return;
    var sessionId = sessionStorage.getItem("letsrunPlayAdminSessionV1") || "admin";
    var account = accounts.find(function (item) { return item.loginId === sessionId || (sessionId === "admin" && item.type === "super"); });
    if (!account || account.active === false) {
      byId("account-security-main").innerHTML = '<h1>내 계정 · 보안</h1><p>로그인 후 보안 설정을 관리할 수 있습니다.</p><a href="admin.html">관리자 로그인</a>';
      return;
    }
    byId("security-login-id").textContent = account.loginId;
    var enabled = !!account.otpRegistered;
    // Preserve the login demo's legacy registration for seeded accounts.
    if (!Object.prototype.hasOwnProperty.call(account, "otpRegistered")) {
      try { enabled = JSON.parse(localStorage.getItem("letsrunParkOtpDemoV1") || "{}")[sessionId] === true; } catch (error) {}
    }
    var changingDevice = false;
    function renderSecurity() {
      renderOtpCard("security-otp", enabled && !changingDevice);
      byId("security-otp-verify").textContent = changingDevice ? "새 기기 등록 완료" : "등록 완료";
      if (changingDevice) {
        byId("security-otp-badge").textContent = "기기 변경 중";
        byId("security-otp-status").textContent = "새 휴대폰으로 QR을 등록하고 새 기기의 코드를 확인해 주세요. 완료 전까지 기존 OTP가 유지됩니다.";
      }
    }
    function updateSecurity(next) {
      if (!checkOtpCode("security-otp")) return;
      var updated = accounts.map(function (item) { return item.key === account.key ? Object.assign({}, item, {otpRegistered: next}) : item; });
      try { localStorage.setItem(storeKey, JSON.stringify(updated)); }
      catch (error) { byId("security-otp-feedback").textContent = "저장하지 못했습니다. 브라우저 저장소 설정을 확인해 주세요."; return; }
      accounts = updated; account.otpRegistered = next; enabled = next; changingDevice = false;
      byId("security-otp-code").value = "";
      renderSecurity(); render();
      byId("security-otp-feedback").textContent = "OTP 등록을 완료했습니다. 이후 로그인에는 등록한 휴대폰의 코드를 입력해 주세요.";
      byId("security-otp-feedback").classList.add("is-success");
    }
    byId("security-otp-copy").addEventListener("click", function () {
      if (!navigator.clipboard) { byId("security-otp-feedback").textContent = "표시된 키를 직접 선택해 복사해 주세요."; return; }
      navigator.clipboard.writeText("JBSWY3DPEHPK3PXP").then(function () {
        byId("security-otp-feedback").textContent = "수동 입력 키를 복사했습니다.";
      }).catch(function () { byId("security-otp-feedback").textContent = "복사할 수 없습니다. 표시된 키를 직접 선택해 복사해 주세요."; });
    });
    bindOtpInput("security-otp", renderSecurity);
    byId("security-otp-verify").addEventListener("click", function () { updateSecurity(true); });
    byId("security-otp-reset").addEventListener("click", function () {
      if (!checkOtpCode("security-otp")) return;
      changingDevice = true;
      byId("security-otp-code").value = "";
      byId("security-otp-feedback").textContent = "";
      renderSecurity();
    });
    byId("security-otp-cancel").addEventListener("click", function () {
      changingDevice = false; byId("security-otp-code").value = ""; renderSecurity(); byId("security-otp-feedback").textContent = "변경을 취소했습니다.";
    });
    renderSecurity();
  }
  load(); render(); mountPersonalSecurity();
  document.querySelectorAll("[data-admin-href]").forEach(function (button) { button.addEventListener("click", function () { window.location.href = button.dataset.adminHref; }); });
  byId("mobile-menu").addEventListener("click", function () { document.querySelector(".admin-sidebar").classList.toggle("is-open"); });
  byId("account-admin-logout").addEventListener("click", function () {
    try { sessionStorage.setItem("letsrunPlayAdminSessionV1", "signed-out"); } catch (error) {}
    window.location.href = "admin.html";
  });
  byId("issue-account").addEventListener("click", function () { openDialog(null); });
  byId("account-location-filter").addEventListener("change", render);
  byId("account-search").addEventListener("input", render);
  byId("account-location").addEventListener("change", function () { refreshDepartments(byId("account-location").value, ""); renderFixedAccessPolicy(false, byId("account-location").value, byId("account-department").value); });
  byId("account-department").addEventListener("change", function () { renderFixedAccessPolicy(false, byId("account-location").value, byId("account-department").value); });
  byId("save-admin-account").addEventListener("click", saveAccount);
  byId("delete-admin-account").addEventListener("click", requestAccountDeletion);
  byId("confirm-account-delete").addEventListener("click", confirmAccountDeletion);
  byId("account-delete-dialog").addEventListener("close", function () { pendingDeletionKey = null; });
  document.querySelectorAll("dialog").forEach(function (dialog) {
    dialog.addEventListener("click", function (event) { if (event.target === dialog) dialog.close(); });
  });
  document.addEventListener("keydown", function (event) {
    if (event.altKey && !event.metaKey && !event.ctrlKey && (event.code === "KeyP" || event.key.toLowerCase() === "p")) {
      event.preventDefault();
      if (window.DeveloperPolicy) window.DeveloperPolicy.toggle();
    }
  });
})();
