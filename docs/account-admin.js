(function () {
  "use strict";

  var storeKey = "letsrunParkDepartmentAccountsV3";
  var toastTimer;
  var activeAccountKey = null;
  var pendingDeletionKey = null;
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
        '<td><button class="account-edit" type="button">계정 정보</button></td>';
      row.querySelector(".account-edit").addEventListener("click", function () { openDialog(account); });
      body.append(row);
    });
    if (!visible.length) body.innerHTML = '<tr><td colspan="4" class="empty-table">조건에 맞는 관리자 계정이 없습니다.</td></tr>';
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
    if (account.lastLogin && account.lastLogin !== "미접속") blockers.push("로그인 및 관리자 작업 이력");
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
      ? "프로그램 또는 예약·결제·환불·정산·감사 이력이 있는 계정은 완전 삭제하지 않고 사용 중지로 보존해야 합니다. 연결 데이터를 먼저 확인해주세요."
      : "아직 사용하지 않았고 연결된 운영 데이터가 없는 계정만 삭제할 수 있습니다. 삭제한 계정은 복구할 수 없습니다.";
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
      notify("연결 데이터나 사용 이력이 생겨 계정을 삭제할 수 없습니다.");
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
      location: location, department: department, permissions: { programs: true, reservations: true, refunds: true, settlement: true },
      active: true, lastLogin: existing ? existing.lastLogin : "미접속"
    });
    var index = accounts.findIndex(function (account) { return account.key === saved.key; });
    if (index === -1) accounts.push(saved); else accounts[index] = saved;
    save(); render(); byId("account-password").value = ""; byId("account-dialog").close(); notify(department + " 관리자 계정과 권한을 저장했습니다.");
  }

  load(); render();
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
