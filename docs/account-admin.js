(function () {
  "use strict";

  var storeKey = "letsrunParkRegionalAccountsV2";
  var toastTimer;
  var activeAccountKey = null;
  var organization = {
    "서울": ["홍보부", "브랜드총괄부", "발매운영부", "서울고객안전부", "공원화사업추진TF"],
    "부산경남": ["부산경주자원관리부", "부산고객안전부", "부산운영지원부"],
    "제주": ["제주경주자원관리부", "제주고객안전부", "제주운영지원부"]
  };
  var accounts = [
    { key: "account-super", loginId: "letsrun_admin", type: "super", location: "전체", department: "통합 운영", access: { ownRegion: "crud", otherRegions: "crud" }, permissions: { programs: true, reservations: true, refunds: true, settlement: true }, active: true, lastLogin: "오늘 09:12" },
    { key: "account-seoul", loginId: "seoul_admin", type: "region", location: "서울", department: "지역 통합 운영", access: { ownRegion: "crud", otherRegions: "read" }, permissions: { programs: true, reservations: true, refunds: true, settlement: true }, active: true, lastLogin: "미접속" },
    { key: "account-busan", loginId: "busan_admin", type: "region", location: "부산경남", department: "지역 통합 운영", access: { ownRegion: "crud", otherRegions: "read" }, permissions: { programs: true, reservations: true, refunds: true, settlement: true }, active: true, lastLogin: "미접속" },
    { key: "account-jeju", loginId: "jeju_admin", type: "region", location: "제주", department: "지역 통합 운영", access: { ownRegion: "crud", otherRegions: "read" }, permissions: { programs: true, reservations: true, refunds: true, settlement: true }, active: true, lastLogin: "미접속" }
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
        '<td><strong>' + escapeHtml(account.loginId) + '</strong><small>초기 비밀번호 발급 완료</small></td>' +
        '<td><span class="account-type ' + (account.type === "super" ? 'is-super' : '') + '">' + (account.type === "super" ? '통합 관리자' : account.type === "region" ? '지역 관리자' : '부서 공용') + '</span></td>' +
        '<td>' + escapeHtml(account.lastLogin || "미접속") + '</td>' +
        '<td><button class="account-edit" type="button">계정 정보</button></td>';
      row.querySelector(".account-edit").addEventListener("click", function () { openDialog(account); });
      body.append(row);
    });
    if (!visible.length) body.innerHTML = '<tr><td colspan="5" class="empty-table">조건에 맞는 관리자 계정이 없습니다.</td></tr>';
  }
  function refreshDepartments(location, selected) {
    var departments = location === "전체" ? ["통합 운영"] : organization[location] || [];
    byId("account-department").innerHTML = departments.map(function (department) { return '<option>' + escapeHtml(department) + '</option>'; }).join("");
    if (selected && departments.includes(selected)) byId("account-department").value = selected;
  }
  function renderFixedAccessPolicy(isSuper, location) {
    var cards = byId("fixed-access-policy-cards");
    if (isSuper) {
      cards.innerHTML = '<article><span>모든 지역</span><strong>모든 기능을 사용할 수 있어요</strong><small>서울·부산경남·제주의 예약과 프로그램 등 모든 내용을 보고 관리할 수 있습니다.</small></article>';
      return;
    }
    cards.innerHTML = '<article><span>담당 지역 · ' + escapeHtml(location) + '</span><strong>모든 내용을 관리할 수 있어요</strong><small>프로그램, 예약, 환불, 운영일과 정산 내용을 보고 추가하거나 변경할 수 있습니다.</small></article>' +
      '<article class="is-readonly"><span>다른 지역</span><strong>보기만 할 수 있어요</strong><small>다른 지역의 내용은 확인할 수 있지만 추가하거나 변경할 수 없습니다.</small></article>';
  }
  function openDialog(account) {
    activeAccountKey = account ? account.key : null;
    var isSuper = !!account && account.type === "super";
    var isRegion = !isSuper;
    var locationSelect = byId("account-location");
    var allOption = Array.from(locationSelect.options).find(function (option) { return option.value === "전체"; });
    if (isSuper && !allOption) locationSelect.insertAdjacentHTML("afterbegin", '<option>전체</option>');
    if (!isSuper && allOption) allOption.remove();
    byId("account-dialog-title").textContent = account ? (account.type === "region" ? account.location + " 지역 계정 정보" : account.department + " 계정 정보") : "지역 계정 발급";
    locationSelect.value = account ? account.location : "서울"; locationSelect.disabled = isSuper;
    refreshDepartments(locationSelect.value, account && account.type !== "region" ? account.department : "");
    if (isRegion) byId("account-department").innerHTML = '<option>지역 통합 운영</option>';
    locationSelect.disabled = !!account;
    byId("account-department").disabled = true;
    byId("account-login-id").value = account ? account.loginId : "";
    byId("account-password").value = ""; byId("account-password").type = "password";
    byId("account-password").placeholder = account ? "재발급할 때만 입력" : "8자 이상 임시 비밀번호";
    renderFixedAccessPolicy(isSuper, locationSelect.value);
    byId("account-dialog").showModal();
  }
  function generatePassword() {
    var alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    var values = new Uint32Array(12); window.crypto.getRandomValues(values);
    byId("account-password").value = Array.from(values, function (value) { return alphabet[value % alphabet.length]; }).join("");
    byId("account-password").type = "text";
    notify("임시 비밀번호를 생성했습니다. 저장 전에 전달할 값을 확인하세요.");
  }
  function saveAccount() {
    var existing = activeAccountKey ? accounts.find(function (account) { return account.key === activeAccountKey; }) : null;
    var isSuper = !!existing && existing.type === "super";
    var location = isSuper ? "전체" : byId("account-location").value;
    var department = isSuper ? "통합 운영" : "지역 통합 운영";
    var loginId = byId("account-login-id").value.trim();
    var password = byId("account-password").value;
    if (!/^[a-zA-Z0-9._-]{4,32}$/.test(loginId)) { notify("로그인 ID는 영문·숫자와 . _ - 기호로 4~32자 입력해주세요."); return; }
    if (accounts.some(function (account) { return account.key !== activeAccountKey && account.loginId.toLowerCase() === loginId.toLowerCase(); })) { notify("이미 사용 중인 로그인 ID입니다."); return; }
    if (!isSuper && accounts.some(function (account) { return account.key !== activeAccountKey && account.type === "region" && account.location === location; })) { notify("해당 지역에는 이미 발급된 관리자 계정이 있습니다."); return; }
    if ((!existing || password) && password.length < 8) { notify("임시 비밀번호는 8자 이상이어야 합니다."); return; }
    var saved = Object.assign({}, existing || {}, {
      key: activeAccountKey || "region-account-" + Date.now(), loginId: loginId, type: isSuper ? "super" : "region", access: isSuper ? { ownRegion: "crud", otherRegions: "crud" } : { ownRegion: "crud", otherRegions: "read" },
      location: location, department: department, permissions: { programs: true, reservations: true, refunds: true, settlement: true },
      active: true, lastLogin: existing ? existing.lastLogin : "미접속"
    });
    var index = accounts.findIndex(function (account) { return account.key === saved.key; });
    if (index === -1) accounts.push(saved); else accounts[index] = saved;
    save(); render(); byId("account-dialog").close(); notify((isSuper ? department : location) + " 관리자 계정과 권한을 저장했습니다.");
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
  byId("account-location").addEventListener("change", function () { byId("account-department").innerHTML = '<option>지역 통합 운영</option>'; renderFixedAccessPolicy(false, byId("account-location").value); });
  byId("generate-account-password").addEventListener("click", generatePassword);
  byId("save-admin-account").addEventListener("click", saveAccount);
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
