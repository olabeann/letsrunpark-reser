(function () {
  "use strict";

  var toast = document.querySelector(".toast");
  var toastTimer;

  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 1800);
  }

  document.querySelectorAll("[data-toast]").forEach(function (button) {
    button.addEventListener("click", function () { notify(button.getAttribute("data-toast")); });
  });

  if (document.body.getAttribute("data-page") !== "booking") return;

  var programs = {
    pony: {
      key: "pony",
      name: "포니 승마체험",
      meta: "서울 렛츠런파크 · 1인 5,000원",
      price: 5000,
      tag: "승마체험",
      tagClass: "tag--exp",
      image: "assets/pony/cover.jpg",
      detail: "pony.html",
      experiences: {
        ride: { name: "어린이 포니타기", price: 5000, tag: "어린이 전용" },
        play: { name: "포니랑 놀기", price: 4000, tag: "누구나 체험" }
      },
      slots: [
        { time: "10:00~10:20", stock: "1회차 · 8자리" },
        { time: "10:20~10:45", stock: "2회차 · 6자리" },
        { time: "11:00~11:20", stock: "3회차 · 7자리" },
        { time: "11:20~11:45", stock: "4회차 · 4자리" },
        { time: "13:00~13:20", stock: "5회차 · 8자리" },
        { time: "13:20~13:45", stock: "6회차 · 5자리" },
        { time: "14:00~14:20", stock: "7회차 · 6자리" },
        { time: "14:20~14:45", stock: "8회차 · 3자리" },
        { time: "15:00~15:20", stock: "9회차 · 8자리" },
        { time: "15:20~15:45", stock: "10회차 · 6자리" },
        { time: "16:00~16:20", stock: "11회차 · 4자리" },
        { time: "16:20~16:45", stock: "12회차 · 마감", disabled: true }
      ]
    },
    tour: {
      key: "tour",
      name: "렛츠런파크 투어",
      meta: "서울 렛츠런파크 · 1인 8,000원",
      price: 8000,
      tag: "가이드 투어",
      tagClass: "tag--fac",
      image: "assets/tour/cover.jpg",
      detail: "tour.html",
      slots: [
        { time: "11:00", stock: "12자리 남음" },
        { time: "14:00", stock: "5자리 남음" },
        { time: "15:30", stock: "마감", disabled: true }
      ]
    }
  };

  var query = new URLSearchParams(window.location.search);
  var program = programs[query.get("program")] || programs.pony;
  var weekdayNames = ["일", "월", "화", "수", "목", "금", "토"];
  var bookingStart = new Date();
  bookingStart.setHours(0, 0, 0, 0);
  var bookingEnd = new Date(bookingStart);
  bookingEnd.setDate(bookingEnd.getDate() + 14);
  var calendarMonth = new Date(bookingStart.getFullYear(), bookingStart.getMonth(), 1);

  function dateKey(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function formatBookingDate(date) {
    return date.getFullYear() + "." + String(date.getMonth() + 1).padStart(2, "0") + "." + String(date.getDate()).padStart(2, "0") + " (" + weekdayNames[date.getDay()] + ")";
  }

  var state = { date: formatBookingDate(bookingStart), dateKey: dateKey(bookingStart), time: program.slots[0].time, qty: 2, discount: false, experience: "ride", step: 1 };
  var byId = function (id) { return document.getElementById(id); };
  var money = function (value) { return new Intl.NumberFormat("ko-KR").format(value) + "원"; };
  var currentExperience = function () { return program.experiences ? program.experiences[state.experience] : null; };
  var currentName = function () { return currentExperience() ? currentExperience().name : program.name; };
  var currentPrice = function () { return currentExperience() ? currentExperience().price : program.price; };
  var amount = function () { return Math.round(currentPrice() * state.qty * (state.discount ? 0.5 : 1)); };

  function renderSlots() {
    byId("booking-slots").innerHTML = program.slots.map(function (slot, index) {
      return '<button type="button" class="chip chip--slots' + (index === 0 ? ' is-selected' : '') + '" data-time="' + slot.time + '" aria-pressed="' + (index === 0) + '"' + (slot.disabled ? ' disabled' : '') + '><strong>' + slot.time + '</strong><small>' + slot.stock + '</small></button>';
    }).join("");
    document.querySelectorAll("#booking-slots button:not([disabled])").forEach(function (button) {
      button.addEventListener("click", function () {
        state.time = button.getAttribute("data-time");
        document.querySelectorAll("#booking-slots button").forEach(function (item) {
          var selected = item === button;
          item.classList.toggle("is-selected", selected);
          item.setAttribute("aria-pressed", String(selected));
        });
        update();
      });
    });
  }

  function renderCalendar() {
    var grid = byId("calendar-grid");
    var year = calendarMonth.getFullYear();
    var month = calendarMonth.getMonth();
    var firstWeekday = new Date(year, month, 1).getDay();
    var lastDate = new Date(year, month + 1, 0).getDate();
    var cells = [];

    byId("calendar-title").textContent = year + "년 " + (month + 1) + "월";
    byId("calendar-prev").disabled = year === bookingStart.getFullYear() && month === bookingStart.getMonth();
    byId("calendar-next").disabled = year === bookingEnd.getFullYear() && month === bookingEnd.getMonth();

    for (var empty = 0; empty < firstWeekday; empty += 1) {
      cells.push('<span class="calendar-empty" aria-hidden="true"></span>');
    }

    for (var day = 1; day <= lastDate; day += 1) {
      var date = new Date(year, month, day);
      var key = dateKey(date);
      var available = date >= bookingStart && date <= bookingEnd;
      var selected = key === state.dateKey;
      var today = key === dateKey(bookingStart);
      var classNames = [];
      if (available) classNames.push("is-available");
      if (selected) classNames.push("is-selected");
      if (today) classNames.push("is-today");
      cells.push('<button type="button" data-date-key="' + key + '" data-weekday="' + date.getDay() + '" class="' + classNames.join(" ") + '" aria-label="' + formatBookingDate(date) + (available ? ' 예약 가능' : ' 예약 불가') + '"' + (selected ? ' aria-pressed="true"' : ' aria-pressed="false"') + (available ? '' : ' disabled') + '><span>' + day + '</span>' + (selected ? '<small>선택</small>' : '') + '</button>');
    }

    while (cells.length % 7 !== 0) {
      cells.push('<span class="calendar-empty" aria-hidden="true"></span>');
    }

    grid.innerHTML = cells.join("");
    grid.querySelectorAll("button:not([disabled])").forEach(function (button) {
      button.addEventListener("click", function () {
        var parts = button.getAttribute("data-date-key").split("-");
        var selectedDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        state.dateKey = button.getAttribute("data-date-key");
        state.date = formatBookingDate(selectedDate);
        renderCalendar();
        update();
      });
    });
  }

  function update() {
    var price = amount();
    var displayName = currentName();
    var unitPrice = currentPrice();
    byId("booking-program-name").textContent = displayName;
    byId("booking-program-meta").textContent = "서울 렛츠런파크 · 1인 " + money(unitPrice);
    byId("booking-unit-price").textContent = "1인 " + money(unitPrice);
    byId("booking-qty").textContent = state.qty;
    byId("summary-image").src = program.image;
    byId("summary-tag").textContent = currentExperience() ? currentExperience().tag : program.tag;
    byId("summary-tag").className = "tag--cat " + program.tagClass;
    byId("summary-name").textContent = displayName;
    byId("summary-date").textContent = state.date;
    byId("summary-time").textContent = state.time;
    byId("summary-people").textContent = state.qty + "명";
    byId("summary-price").textContent = money(price);
    byId("confirm-image").src = program.image;
    byId("confirm-name").textContent = displayName;
    byId("confirm-date").textContent = state.date;
    byId("confirm-time").textContent = state.time;
    byId("confirm-people").textContent = state.qty + "명";
    byId("confirm-price").textContent = money(price);
    byId("final-price").textContent = money(price);
    byId("ticket-image").src = program.image;
    byId("ticket-name").textContent = displayName;
    byId("ticket-date").textContent = state.date;
    byId("ticket-time").textContent = state.time;
    byId("ticket-people").textContent = state.qty + "명";
    byId("ticket-price").textContent = "결제금액 " + money(price);
  }

  function goToStep(step) {
    state.step = step;
    document.querySelectorAll("[data-booking-step]").forEach(function (section) {
      section.classList.toggle("is-visible", Number(section.getAttribute("data-booking-step")) === step);
    });
    document.querySelectorAll("[data-step-label]").forEach(function (label) {
      var labelStep = Number(label.getAttribute("data-step-label"));
      label.classList.toggle("is-current", labelStep === step);
      label.classList.toggle("is-done", labelStep < step);
      label.querySelector("i").textContent = labelStep < step ? "✓" : labelStep;
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll("[data-experience]").forEach(function (button) {
    button.addEventListener("click", function () {
      state.experience = button.getAttribute("data-experience");
      document.querySelectorAll("[data-experience]").forEach(function (item) {
        var selected = item === button;
        item.classList.toggle("is-selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      update();
    });
  });

  byId("calendar-prev").addEventListener("click", function () {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  byId("calendar-next").addEventListener("click", function () {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  byId("qty-minus").addEventListener("click", function () { state.qty = Math.max(1, state.qty - 1); update(); });
  byId("qty-plus").addEventListener("click", function () { state.qty = Math.min(state.discount ? 2 : 4, state.qty + 1); update(); });
  byId("citizen-discount").addEventListener("change", function (event) { state.discount = event.target.checked; if (state.discount && state.qty > 2) state.qty = 2; update(); });
  byId("to-confirm").addEventListener("click", function () { goToStep(2); });
  byId("back-to-select").addEventListener("click", function () { goToStep(1); });
  byId("complete-payment").addEventListener("click", function () {
    if (!byId("terms").checked) { notify("필수 약관에 동의해주세요."); return; }
    goToStep(3);
    notify("예약과 결제가 완료되었습니다.");
  });
  document.querySelectorAll(".payment-options button").forEach(function (button) {
    button.addEventListener("click", function () {
      document.querySelectorAll(".payment-options button").forEach(function (item) { item.classList.remove("is-selected"); });
      button.classList.add("is-selected");
    });
  });

  byId("pony-experience-panel").hidden = !program.experiences;
  byId("pony-slot-guide").hidden = !program.experiences;
  byId("pony-weather-note").hidden = !program.experiences;
  document.querySelector(".discount-check").hidden = !program.experiences;
  renderCalendar();
  renderSlots();
  update();
})();
