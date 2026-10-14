(function () {
  "use strict";
  var storeKey = "letsrunParkDepartmentAccountsV3";
  var accounts = [
    { key: "account-super", loginId: "letsrun_admin", type: "super", location: "전체", department: "통합 운영", access: { ownDepartment: "crud", otherDepartments: "crud" }, permissions: { programs: true, reservations: true, refunds: true, settlement: true }, otpRegistered: true, active: true, lastLogin: "오늘 09:12" },
    { key: "account-seoul-brand", loginId: "seoul_brand", type: "department", location: "서울", department: "브랜드총괄부", access: { ownDepartment: "crud", otherDepartments: "read" }, permissions: { programs: true, reservations: true, refunds: true, settlement: true }, otpRegistered: true, active: true, lastLogin: "어제 17:40" },
    { key: "account-seoul-park", loginId: "seoul_park", type: "department", location: "서울", department: "공원화사업추진TF", access: { ownDepartment: "crud", otherDepartments: "read" }, permissions: { programs: true, reservations: true, refunds: true, settlement: true }, otpRegistered: true, active: true, lastLogin: "오늘 08:55" },
    { key: "account-busan-ops", loginId: "busan_ops", type: "department", location: "부산경남", department: "부산운영지원부", access: { ownDepartment: "crud", otherDepartments: "read" }, permissions: { programs: true, reservations: true, refunds: true, settlement: true }, otpRegistered: true, active: true, lastLogin: "8월 30일" },
    { key: "account-jeju-ops", loginId: "jeju_ops", type: "department", location: "제주", department: "제주운영지원부", access: { ownDepartment: "crud", otherDepartments: "read" }, permissions: { programs: true, reservations: true, refunds: true, settlement: true }, otpRegistered: true, active: true, lastLogin: "미접속" }
  ];

  function byId(id) { return document.getElementById(id); }
  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(storeKey) || "null");
      if (Array.isArray(saved) && saved.length) accounts = saved;
    } catch (error) { /* Keep the review prototype usable when storage is unavailable. */ }
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
    var stage = enabled ? "idle" : "enroll";
    function renderSecurity() {
      var entering = stage === "enroll", idle = stage === "idle";
      byId("security-otp-badge").textContent = enabled ? "사용 중" : "등록 대기";
      byId("security-otp-badge").classList.toggle("is-enabled", enabled);
      byId("security-otp-change").hidden = !idle;
      byId("security-otp-progress").hidden = idle || !enabled;
      ["security-otp-step-existing", "security-otp-step-new"].forEach(function (id, index) {
        var active = index === (entering ? 1 : 0);
        byId(id).classList.toggle("is-current", active);
        if (active) byId(id).setAttribute("aria-current", "step"); else byId(id).removeAttribute("aria-current");
      });
      byId("security-otp-flow").hidden = idle;
      byId("security-otp-flow").classList.toggle("is-enrolling", entering);
      byId("security-otp-enroll").hidden = !entering;
      byId("security-otp-status").hidden = idle;
      byId("security-otp-status").textContent = entering
        ? (enabled ? "2. 새 기기 등록 · 완료 전까지 기존 OTP가 유지됩니다." : "인증 앱을 연결하고 코드를 확인해 주세요.")
        : "1. 본인 확인 · 현재 사용 중인 앱의 OTP를 입력해 주세요.";
      byId("security-otp-step-title").textContent = entering ? "새 OTP 확인" : "기존 OTP 확인";
      byId("security-otp-code-label").textContent = entering ? "새로 연결한 앱의 인증 코드" : "현재 휴대폰의 인증 코드";
      byId("security-otp-reset").hidden = stage !== "verify";
      byId("security-otp-verify").hidden = !entering;
      byId("security-otp-cancel").hidden = !enabled;
      var validLength = /^[0-9]{6}$/.test(byId("security-otp-code").value);
      byId("security-otp-reset").disabled = !validLength;
      byId("security-otp-verify").disabled = !validLength;
      byId("security-otp-demo").hidden = idle;
    }
    byId("security-otp-change").addEventListener("click", function () {
      if (!enabled) return;
      stage = "verify";
      byId("security-otp-code").value = "";
      byId("security-otp-feedback").textContent = "";
      byId("security-otp-feedback").classList.remove("is-success");
      byId("security-otp-code").removeAttribute("aria-invalid");
      renderSecurity(); byId("security-otp-code").focus();
    });
    function updateSecurity(next) {
      if (stage !== "enroll" || !checkOtpCode("security-otp")) return;
      var updated = accounts.map(function (item) { return item.key === account.key ? Object.assign({}, item, {otpRegistered: next}) : item; });
      try { localStorage.setItem(storeKey, JSON.stringify(updated)); }
      catch (error) { byId("security-otp-feedback").textContent = "저장하지 못했습니다. 브라우저 저장소 설정을 확인해 주세요."; return; }
      accounts = updated; account.otpRegistered = next; enabled = next; stage = "idle";
      byId("security-otp-code").value = "";
      renderSecurity();
      byId("security-otp-feedback").textContent = "OTP 등록을 완료했습니다.";
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
      stage = "enroll";
      byId("security-otp-code").value = "";
      byId("security-otp-feedback").textContent = "";
      renderSecurity();
    });
    byId("security-otp-cancel").addEventListener("click", function () {
      stage = enabled ? "idle" : "enroll"; byId("security-otp-code").value = ""; byId("security-otp-code").removeAttribute("aria-invalid"); renderSecurity(); byId("security-otp-feedback").textContent = "";
    });
    renderSecurity();
  }

  load();
  var sessionId = sessionStorage.getItem("letsrunPlayAdminSessionV1") || "admin";
  var current = accounts.find(function (item) { return item.loginId === sessionId || (sessionId === "admin" && item.type === "super"); });
  var isIntegrated = !!current && current.active !== false && current.type === "super";
  document.querySelectorAll("[data-integrated-admin-only]").forEach(function (item) { item.hidden = !isIntegrated; });
  var profile = document.querySelector(".admin-user");
  if (profile && current) {
    profile.querySelector("strong").textContent = isIntegrated ? "통합 운영 관리자" : current.department;
    profile.querySelector("small").textContent = isIntegrated ? "전체 지역·부서" : current.location + " · 관리자";
  }
  mountPersonalSecurity();
  document.querySelectorAll("[data-admin-href]").forEach(function (button) { button.addEventListener("click", function () { window.location.href = button.dataset.adminHref; }); });
  byId("mobile-menu").addEventListener("click", function () { document.querySelector(".admin-sidebar").classList.toggle("is-open"); });
  byId("account-admin-logout").addEventListener("click", function () {
    sessionStorage.setItem("letsrunPlayAdminSessionV1", "signed-out"); window.location.href = "admin.html";
  });
})();
