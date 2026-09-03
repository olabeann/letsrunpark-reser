(function () {
  "use strict";

  var storeKey = "letsrunPlayAccountAdminDemoV1";
  var toastTimer;
  var activeAccountKey = null;
  var organization = {
    "서울": ["홍보부", "브랜드총괄부", "발매운영부", "서울고객안전부", "공원화사업추진TF"],
    "부산경남": ["부산경주자원관리부", "부산고객안전부", "부산운영지원부"],
    "제주": ["제주경주자원관리부", "제주고객안전부", "제주운영지원부"]
  };
  var accounts = [
    { key: "account-super", loginId: "letsrun_admin", type: "super", location: "전체", department: "통합 운영", permissions: { programs: true, reservations: true, refunds: true, settlement: true }, active: true, lastLogin: "오늘 09:12" },
    { key: "account-seoul-brand", loginId: "seoul_brand", type: "department", location: "서울", department: "브랜드총괄부", permissions: { programs: true, reservations: true, refunds: false, settlement: true }, active: true, lastLogin: "어제 17:40" },
    { key: "account-seoul-park", loginId: "seoul_park", type: "department", location: "서울", department: "공원화사업추진TF", permissions: { programs: true, reservations: true, refunds: true, settlement: true }, active: true, lastLogin: "오늘 08:55" },
    { key: "account-busan-ops", loginId: "busan_ops", type: "department", location: "부산경남", department: "부산운영지원부", permissions: { programs: true, reservations: true, refunds: true, settlement: true }, active: true, lastLogin: "8월 30일" },
    { key: "account-jeju-ops", loginId: "jeju_ops", type: "department", location: "제주", department: "제주운영지원부", permissions: { programs: true, reservations: true, refunds: false, settlement: true }, active: false, lastLogin: "미접속" }
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
  function permissionSummary(account) {
    if (account.type === "super") return ["전체 관리", "계정 발급"];
    var labels = ["전체 프로그램 조회"];
    if (account.permissions.programs) labels.push("프로그램·회차");
    if (account.permissions.reservations) labels.push("예약 조회");
    if (account.permissions.refunds) labels.push("취소·환불");
    if (account.permissions.settlement) labels.push("매출·정산");
    return labels;
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
      var chips = permissionSummary(account).map(function (label, index) { return '<span class="' + (index === 0 ? 'is-enabled' : '') + '">' + escapeHtml(label) + '</span>'; }).join("");
      row.innerHTML = '<td><strong>' + escapeHtml(account.location) + '</strong><small>' + escapeHtml(account.department) + '</small></td>' +
        '<td><strong>' + escapeHtml(account.loginId) + '</strong><small>비밀번호 ········</small></td>' +
        '<td><span class="account-type ' + (account.type === "super" ? 'is-super' : '') + '">' + (account.type === "super" ? '통합 관리자' : '부서 공용') + '</span></td>' +
        '<td><div class="account-permission-summary">' + chips + '</div></td><td>' + escapeHtml(account.lastLogin || "미접속") + '</td>' +
        '<td><span class="account-status ' + (account.active ? '' : 'is-off') + '">' + (account.active ? '사용 중' : '사용 중지') + '</span></td>' +
        '<td><button class="account-edit" type="button">계정 설정</button></td>';
      row.querySelector(".account-edit").addEventListener("click", function () { openDialog(account); });
      body.append(row);
    });
    if (!visible.length) body.innerHTML = '<tr><td colspan="7" class="empty-table">조건에 맞는 관리자 계정이 없습니다.</td></tr>';
    byId("issued-account-count").textContent = accounts.length;
    byId("active-account-count").textContent = accounts.filter(function (account) { return account.active; }).length;
  }
  function refreshDepartments(location, selected) {
    var departments = location === "전체" ? ["통합 운영"] : organization[location] || [];
    byId("account-department").innerHTML = departments.map(function (department) { return '<option>' + escapeHtml(department) + '</option>'; }).join("");
    if (selected && departments.includes(selected)) byId("account-department").value = selected;
  }
  function openDialog(account) {
    activeAccountKey = account ? account.key : null;
    var isSuper = !!account && account.type === "super";
    var locationSelect = byId("account-location");
    var allOption = Array.from(locationSelect.options).find(function (option) { return option.value === "전체"; });
    if (isSuper && !allOption) locationSelect.insertAdjacentHTML("afterbegin", '<option>전체</option>');
    if (!isSuper && allOption) allOption.remove();
    byId("account-dialog-title").textContent = account ? account.department + " 계정 설정" : "부서 계정 발급";
    locationSelect.value = account ? account.location : "서울"; locationSelect.disabled = isSuper;
    refreshDepartments(locationSelect.value, account ? account.department : organization["서울"][0]);
    byId("account-department").disabled = isSuper;
    byId("account-login-id").value = account ? account.loginId : "";
    byId("account-password").value = ""; byId("account-password").type = "password";
    byId("account-password").placeholder = account ? "재발급할 때만 입력" : "8자 이상 임시 비밀번호";
    ["programs", "reservations", "refunds", "settlement"].forEach(function (permission) {
      var input = byId("permission-" + permission);
      input.checked = isSuper || (account ? !!account.permissions[permission] : true); input.disabled = isSuper;
    });
    byId("account-active").checked = account ? account.active : true;
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
    var department = isSuper ? "통합 운영" : byId("account-department").value;
    var loginId = byId("account-login-id").value.trim();
    var password = byId("account-password").value;
    if (!/^[a-zA-Z0-9._-]{4,32}$/.test(loginId)) { notify("로그인 ID는 영문·숫자와 . _ - 기호로 4~32자 입력해주세요."); return; }
    if (accounts.some(function (account) { return account.key !== activeAccountKey && account.loginId.toLowerCase() === loginId.toLowerCase(); })) { notify("이미 사용 중인 로그인 ID입니다."); return; }
    if (!isSuper && accounts.some(function (account) { return account.key !== activeAccountKey && account.type === "department" && account.location === location && account.department === department; })) { notify("해당 부서에는 이미 발급된 계정이 있습니다."); return; }
    if ((!existing || password) && password.length < 8) { notify("임시 비밀번호는 8자 이상이어야 합니다."); return; }
    if (byId("permission-refunds").checked && !byId("permission-reservations").checked) { notify("취소·환불 권한에는 예약·결제 조회 권한이 필요합니다."); return; }
    var saved = Object.assign({}, existing || {}, {
      key: activeAccountKey || "department-account-" + Date.now(), loginId: loginId, type: isSuper ? "super" : "department",
      location: location, department: department, permissions: {
        programs: isSuper || byId("permission-programs").checked, reservations: isSuper || byId("permission-reservations").checked,
        refunds: isSuper || byId("permission-refunds").checked, settlement: isSuper || byId("permission-settlement").checked
      }, active: byId("account-active").checked, lastLogin: existing ? existing.lastLogin : "미접속"
    });
    var index = accounts.findIndex(function (account) { return account.key === saved.key; });
    if (index === -1) accounts.push(saved); else accounts[index] = saved;
    save(); render(); byId("account-dialog").close(); notify(department + " 관리자 계정과 권한을 저장했습니다.");
  }

  load(); render();
  byId("issue-account").addEventListener("click", function () { openDialog(null); });
  byId("account-location-filter").addEventListener("change", render);
  byId("account-search").addEventListener("input", render);
  byId("account-location").addEventListener("change", function () { refreshDepartments(byId("account-location").value, ""); });
  byId("generate-account-password").addEventListener("click", generatePassword);
  byId("save-admin-account").addEventListener("click", saveAccount);
})();
