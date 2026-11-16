(function () {
  "use strict";

  // Apply the requested reference content once, including to existing demo browsers.
  // Keep a backup and leave reservations, carts, sessions and added programs intact.
  var storageKey = "letsrunPlayAdminDemoV4";
  var revision = "20261113-reference-content";
  try {
    var raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    var state = JSON.parse(raw);
    if (!state || !state.catalog || state.catalog.referenceContentRevision === revision) return;
    var overrides = state.catalog.programOverrides || {};
    var fields = {
      ride: ["programName", "name", "price", "image", "noticeText", "guidanceText", "guidanceItems", "requiresGuidanceConfirmation", "cancelMinutes", "cancelOffsetValue", "cancelOffsetUnit", "active", "visibleStartAt", "visibleEndAt"],
      play: ["programName", "name", "price"]
    };
    window.localStorage.setItem(storageKey + ":before:" + revision, raw);
    Object.keys(fields).forEach(function (key) {
      if (!overrides[key]) return;
      fields[key].forEach(function (field) { delete overrides[key][field]; });
    });
    state.catalog.referenceContentRevision = revision;
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) { /* Do not interrupt booking when browser storage is unavailable. */ }
})();

(function () {
  "use strict";
  var storageKey = "letsrunPlayAdminDemoV4";
  var revision = "20261114-weather-cancellation-compact";
  var previousNotice = "★★11월 14일 ‘포니 타기’는 기상 악화로 이용일 전날 일괄 취소되었습니다. 취소된 티켓은 예약조회에 표시되지 않습니다.★★\n예약조회에서 티켓 표시 여부를 확인해 주세요. 취소된 티켓의 결제 금액은 전액 환불 처리됩니다.";
  var spacedNotice = "⚠️ 11월 14일 ‘포니 타기’ 기상 악화로 취소 안내\n\n기상 악화로 이용일 전날 일괄 취소되었습니다. 취소된 티켓은 예약조회에 표시되지 않으며, 결제 금액은 전액 환불 처리됩니다.\n\n예약조회에서 티켓 표시 여부를 확인해 주세요.";
  var notice = "⚠️ 11월 14일 ‘포니 타기’ 기상 악화로 취소 안내\n기상 악화로 이용일 전날 일괄 취소되었습니다. 취소된 티켓은 예약조회에 표시되지 않으며, 결제 금액은 전액 환불 처리됩니다.\n예약조회에서 티켓 표시 여부를 확인해 주세요.";
  try {
    var raw = window.localStorage.getItem(storageKey);
    if (!raw) return;
    var state = JSON.parse(raw);
    if (!state || !state.catalog || state.catalog.weatherNoticeRevision === revision) return;
    window.localStorage.setItem(storageKey + ":before:" + revision, raw);
    var ride = (state.catalog.programOverrides || {}).ride;
    if (ride) {
      ["noticeText", "guidanceText"].forEach(function (field) {
        if (typeof ride[field] === "string" && !ride[field].startsWith(notice)) {
          var remaining = ride[field].startsWith(spacedNotice) ? ride[field].slice(spacedNotice.length).trimStart() : ride[field].startsWith(previousNotice) ? ride[field].slice(previousNotice.length).trimStart() : ride[field];
          ride[field] = notice + (remaining.trim() ? "\n\n" + remaining : "");
        }
      });
    }
    state.catalog.weatherNoticeRevision = revision;
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) { /* Keep the page usable when browser storage is unavailable. */ }
})();

(function () {
  "use strict";
  var key = "letsrunPlayAdminDemoV4";
  try {
    var raw = window.localStorage.getItem(key);
    if (!raw) return;
    var state = JSON.parse(raw);
    var overrides = state.catalog && state.catalog.programOverrides || {};
    Object.keys(overrides).forEach(function (id) {
      ["noticeText", "guidanceText"].forEach(function (field) {
        if (typeof overrides[id][field] !== "string") return;
        overrides[id][field] = overrides[id][field]
          .replace(/취소된 티켓은 예약조회에 표시되지 않으며,/g, "취소된 티켓은 예약조회에 ‘취소 완료’로 표시되며,")
          .replace(/취소된 티켓은 예약조회에 표시되지 않습니다\./g, "취소된 티켓은 예약조회에 ‘취소 완료’로 표시됩니다.")
          .replace(/예약조회에서 티켓 표시 여부를 확인해 주세요\./g, "예약조회에서 티켓의 취소 상태와 환불 내역을 확인해 주세요.");
      });
    });
    var updated = JSON.stringify(state);
    if (updated !== raw) window.localStorage.setItem(key, updated);
  } catch (error) { /* Keep booking available if browser storage is unavailable. */ }
})();
