(function () {
  "use strict";

  if (!document.querySelector(".demo-only-controls")) return;

  function syncWithPolicy() {
    if (!window.DeveloperPolicy) return;
    document.body.classList.toggle("demo-controls-visible", document.body.classList.contains("policy-inspector-on"));
  }

  document.addEventListener("keydown", function (event) {
    if (event.altKey && !event.metaKey && !event.ctrlKey && (event.code === "KeyP" || event.key.toLowerCase() === "p")) {
      window.setTimeout(function () {
        if (window.DeveloperPolicy) syncWithPolicy();
        else document.body.classList.toggle("demo-controls-visible");
      }, 0);
    }
    if (event.key === "Escape") window.setTimeout(function () {
      if (window.DeveloperPolicy) syncWithPolicy();
      else document.body.classList.remove("demo-controls-visible");
    }, 0);
  });

  new MutationObserver(syncWithPolicy).observe(document.body, { attributes: true, attributeFilter: ["class"] });
})();
