(function () {
  "use strict";
  var params = new URLSearchParams(window.location.search);
  var from = params.get("from");
  function goBack() {
    if (from) window.location.href = from;
    else if (window.history.length > 1) window.history.back();
    else window.location.href = "index.html";
  }
  function selectTab(key) {
    document.querySelectorAll("[data-tab]").forEach(function (button) {
      var active = button.dataset.tab === key;
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll("[data-panel]").forEach(function (panel) { panel.classList.toggle("is-active", panel.dataset.panel === key); });
    window.history.replaceState(null, "", "#" + key);
  }
  document.querySelectorAll("[data-tab]").forEach(function (button) { button.addEventListener("click", function () { selectTab(button.dataset.tab); }); });
  document.querySelector(".empty-gallery-tabs").addEventListener("keydown", function (event) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    var tabs = Array.from(document.querySelectorAll("[data-tab]"));
    var next = (tabs.indexOf(document.activeElement) + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault(); tabs[next].click(); tabs[next].focus();
  });
  document.getElementById("empty-gallery-close").addEventListener("click", goBack);
  document.addEventListener("keydown", function (event) {
    var shortcut = ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "e") || (event.altKey && !event.metaKey && !event.ctrlKey && event.key.toLowerCase() === "e");
    if (shortcut) { event.preventDefault(); goBack(); }
  });
  var initial = window.location.hash.slice(1);
  if (document.querySelector('[data-tab="' + initial + '"]')) selectTab(initial);
})();
