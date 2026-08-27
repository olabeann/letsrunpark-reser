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

  var loginDialog = document.getElementById("login-dialog");
  var reservationLogin = document.getElementById("reservation-login");
  var loginDialogClose = document.getElementById("login-dialog-close");
  var loginDialogTitle = document.getElementById("login-dialog-title");
  var loginDialogDescription = document.getElementById("login-dialog-description");
  var loginDialogNote = document.getElementById("login-dialog-note");
  var loginIntent = "lookup";

  function openLoginDialog(intent) {
    loginIntent = intent;
    var isBooking = intent === "booking";
    loginDialogTitle.textContent = isBooking ? "간편 로그인 후 예약하기" : "간편 로그인";
    loginDialogDescription.textContent = isBooking ? "로그인하면 선택한 일정으로 예약을 계속할 수 있어요." : "예약 내역을 확인하려면 로그인해주세요.";
    loginDialogNote.textContent = isBooking ? "로그인 후 예약 확인과 결제를 진행합니다." : "로그인 후 예약 내역을 확인하고 취소할 수 있습니다.";
    loginDialog.showModal();
  }

  if (loginDialog && reservationLogin) {
    reservationLogin.addEventListener("click", function () { openLoginDialog("lookup"); });
    loginDialogClose.addEventListener("click", function () { loginDialog.close(); });
    loginDialog.addEventListener("click", function (event) {
      if (event.target === loginDialog) loginDialog.close();
    });
    loginDialog.querySelectorAll("[data-login-provider]").forEach(function (button) {
      button.addEventListener("click", function () {
        var provider = button.getAttribute("data-login-provider");
        var shouldContinueBooking = loginIntent === "booking";
        loginDialog.close();
        if (shouldContinueBooking) {
          goToStep(2);
          notify(provider + " 간편 로그인을 선택했습니다.");
        } else {
          showMyTickets();
          notify(provider + " 로그인으로 내 티켓을 불러왔습니다.");
        }
      });
    });
  }

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

  function formatTime(date, includeSeconds) {
    var time = String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
    return includeSeconds ? time + ":" + String(date.getSeconds()).padStart(2, "0") : time;
  }

  function ticketSessionStart(reservation) {
    var dateParts = reservation.dateKey.split("-");
    var timeParts = reservation.time.split("~")[0].split(":");
    return new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]), Number(timeParts[0]), Number(timeParts[1]), 0, 0);
  }

  function ticketSessionEnd(reservation, sessionStart) {
    var endText = reservation.time.split("~")[1];
    if (!endText) return new Date(sessionStart.getTime() + 10 * 60 * 1000);
    var endParts = endText.split(":");
    return new Date(sessionStart.getFullYear(), sessionStart.getMonth(), sessionStart.getDate(), Number(endParts[0]), Number(endParts[1]), 0, 0);
  }

  function ticketTiming(reservation, now) {
    var sessionStart = ticketSessionStart(reservation);
    var entryOpen = new Date(sessionStart.getTime() - 10 * 60 * 1000);
    var entryClose = ticketSessionEnd(reservation, sessionStart);
    var accessState = reservation.forceActive ? "active" : now < entryOpen ? "upcoming" : now <= entryClose ? "active" : "ended";
    var status = {
      upcoming: { label: "입장 대기", title: "입장 가능 시간이 아닙니다.", detail: formatTime(entryOpen, false) + "부터 입장할 수 있습니다.", live: "입장 시간에 자동으로 활성화됩니다." },
      active: { label: "입장 가능", title: "지금 입장할 수 있습니다.", detail: formatTime(entryClose, false) + "까지 입장 가능합니다.", live: "활성화된 티켓입니다. 입장 시 보여주세요." },
      ended: { label: "입장 종료", title: "입장 시간이 지났습니다.", detail: formatTime(sessionStart, false) + " 회차 입장이 마감되었습니다.", live: "사용할 수 없는 티켓입니다." }
    }[accessState];

    return { sessionStart: sessionStart, entryOpen: entryOpen, entryClose: entryClose, accessState: accessState, status: status };
  }

  function updateTicketAccess() {
    var ticket = byId("entry-ticket");
    if (!ticket || !ticketReservation) return;

    var now = new Date();
    var timing = ticketTiming(ticketReservation, now);

    ticket.setAttribute("data-access-state", timing.accessState);
    byId("ticket-current-time").textContent = formatTime(now, true);
    byId("ticket-status-label").textContent = timing.status.label;
    byId("ticket-access-title").textContent = timing.status.title;
    byId("ticket-access-detail").textContent = timing.status.detail;
    byId("ticket-live-message").textContent = timing.status.live;
    byId("ticket-session-summary").textContent = ticketReservation.date + " · " + ticketReservation.name;
    byId("ticket-window-open").textContent = formatTime(timing.entryOpen, false);
    byId("ticket-window-session").textContent = formatTime(timing.sessionStart, false);
    byId("ticket-window-close").textContent = formatTime(timing.entryClose, false);
    byId("ticket-name").textContent = ticketReservation.name;
    byId("ticket-date").textContent = ticketReservation.date;
    byId("ticket-time").textContent = ticketReservation.time;
    byId("ticket-people").textContent = ticketReservation.qty + "명";
    byId("ticket-admission-count").textContent = "총 " + ticketReservation.qty + "명";
    byId("ticket-reservation-number").textContent = ticketReservation.id;
    byId("ticket-price").textContent = money(ticketReservation.price);
    byId("ticket-citizen-discount").hidden = !ticketReservation.discount;
  }

  function isWeekend(date) {
    return date.getDay() === 0 || date.getDay() === 6;
  }

  function firstAvailableDate() {
    var date = new Date(bookingStart);
    while (date <= bookingEnd && !isWeekend(date)) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  }

  var initialDate = firstAvailableDate();
  var state = { date: formatBookingDate(initialDate), dateKey: dateKey(initialDate), time: program.slots[0].time, qty: 2, discount: false, experience: "ride", paymentMethod: "card", step: 1 };
  var byId = function (id) { return document.getElementById(id); };
  var money = function (value) { return new Intl.NumberFormat("ko-KR").format(value) + "원"; };
  var currentExperience = function () { return program.experiences ? program.experiences[state.experience] : null; };
  var currentName = function () { return currentExperience() ? currentExperience().name : program.name; };
  var currentPrice = function () { return currentExperience() ? currentExperience().price : program.price; };
  var amount = function () { return Math.round(currentPrice() * state.qty * (state.discount ? 0.5 : 1)); };
  var reservationStorageKey = "ponylandReservations";
  var ticketReservation = null;
  var ticketReservations = readReservations();

  function readReservations() {
    try {
      var saved = JSON.parse(window.localStorage.getItem(reservationStorageKey) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      return [];
    }
  }

  function writeReservations(reservations) {
    try {
      window.localStorage.setItem(reservationStorageKey, JSON.stringify(reservations));
    } catch (error) {
      notify("이 브라우저에서는 티켓을 저장할 수 없습니다.");
    }
  }

  function makeReservation() {
    var createdAt = new Date();
    var sessionCode = state.dateKey.slice(2).replace(/-/g, "") + "-" + state.time.split("~")[0].replace(":", "");
    return {
      id: "GP-" + sessionCode + "-" + String(createdAt.getTime()).slice(-4),
      programKey: program.key,
      name: currentName(),
      dateKey: state.dateKey,
      date: state.date,
      time: state.time,
      qty: state.qty,
      price: amount(),
      discount: state.discount,
      paymentMethod: state.paymentMethod,
      createdAt: createdAt.toISOString()
    };
  }

  function saveCurrentReservation() {
    var reservation = makeReservation();
    ticketReservations = readReservations();
    ticketReservations.unshift(reservation);
    writeReservations(ticketReservations);
    return reservation;
  }

  function createTextElement(tagName, className, textContent) {
    var element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = textContent;
    return element;
  }

  function demoReservationId(date, time) {
    return "GP-" + dateKey(date).slice(2).replace(/-/g, "") + "-" + time.split("~")[0].replace(":", "");
  }

  function slotDateTime(date, timeText) {
    var parts = timeText.split(":");
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Number(parts[0]), Number(parts[1]), 0, 0);
  }

  function activeSlotForNow(now) {
    var slots = programs.pony.slots.filter(function (slot) { return !slot.disabled; });
    var activeSlot = slots.find(function (slot) {
      var range = slot.time.split("~");
      var start = slotDateTime(now, range[0]);
      var end = slotDateTime(now, range[1]);
      return now >= new Date(start.getTime() - 10 * 60 * 1000) && now <= end;
    });
    if (activeSlot) return { slot: activeSlot, forceActive: false };
    var closestSlot = slots.reduce(function (closest, slot) {
      var slotStart = slotDateTime(now, slot.time.split("~")[0]);
      var distance = Math.abs(now.getTime() - slotStart.getTime());
      return !closest || distance < closest.distance ? { slot: slot, distance: distance } : closest;
    }, null);
    return { slot: closestSlot.slot, forceActive: true };
  }

  function stateExampleReservations() {
    var now = new Date();
    var active = activeSlotForNow(now);
    var upcomingDate = new Date(initialDate);
    var endedDate = new Date(initialDate);
    endedDate.setDate(endedDate.getDate() - 7);
    var secondSlot = programs.pony.slots[5].time;
    var endedSlot = programs.pony.slots[2].time;
    return [
      { id: demoReservationId(now, active.slot.time), programKey: "pony", name: "어린이 포니타기", dateKey: dateKey(now), date: formatBookingDate(now), time: active.slot.time, qty: 2, price: 5000, discount: true, forceActive: active.forceActive },
      { id: demoReservationId(upcomingDate, secondSlot), programKey: "pony", name: "포니랑 놀기", dateKey: dateKey(upcomingDate), date: formatBookingDate(upcomingDate), time: secondSlot, qty: 1, price: 4000, discount: false },
      { id: demoReservationId(endedDate, endedSlot), programKey: "pony", name: "어린이 포니타기", dateKey: dateKey(endedDate), date: formatBookingDate(endedDate), time: endedSlot, qty: 2, price: 10000, discount: false }
    ];
  }

  function uniqueReservations(reservations) {
    var seen = {};
    return reservations.filter(function (reservation) {
      var key = reservation.dateKey + "|" + reservation.time.split("~")[0];
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function allReservations() {
    return uniqueReservations(readReservations().concat(stateExampleReservations()));
  }

  function ticketListReservations() {
    var examples = stateExampleReservations();
    return uniqueReservations([examples[0]].concat(readReservations(), examples.slice(1))).slice(0, 3);
  }

  function hasTimeConflict(dateValue, timeValue) {
    var startTime = timeValue.split("~")[0];
    return allReservations().some(function (reservation) {
      return reservation.dateKey === dateValue && reservation.time.split("~")[0] === startTime;
    });
  }

  function notifyTimeConflict() {
    notify("이미 같은 시간대에 예약된 티켓이 있습니다. 다른 회차를 선택해주세요.");
  }

  function renderTicketList() {
    var list = byId("ticket-list");
    ticketReservations = ticketListReservations();
    list.replaceChildren();
    byId("ticket-count").textContent = ticketReservations.length + "개의 티켓";

    if (!ticketReservations.length) {
      var empty = document.createElement("div");
      empty.className = "ticket-list-empty";
      empty.append(createTextElement("strong", "", "아직 예약한 티켓이 없어요."));
      empty.append(createTextElement("p", "", "예약을 완료하면 이곳에서 입장권을 확인할 수 있습니다."));
      var reserveButton = createTextElement("button", "btn btn--cta", "예약하러 가기");
      reserveButton.type = "button";
      reserveButton.addEventListener("click", function () { goToStep(1); });
      empty.append(reserveButton);
      list.append(empty);
      return;
    }

    ticketReservations.forEach(function (reservation) {
      var programData = programs[reservation.programKey] || programs.pony;
      var timing = ticketTiming(reservation, new Date());
      var card = document.createElement("button");
      card.type = "button";
      card.className = "ticket-list-card";
      card.setAttribute("data-reservation-id", reservation.id);
      card.setAttribute("aria-label", reservation.name + " 티켓 보기");

      var image = document.createElement("img");
      image.src = programData.image;
      image.alt = "";
      var body = document.createElement("span");
      body.className = "ticket-list-card__body";
      var status = createTextElement("small", "ticket-list-card__status ticket-list-card__status--" + timing.accessState, timing.status.label);
      status.setAttribute("data-ticket-status", "");
      body.append(status);
      body.append(createTextElement("strong", "ticket-list-card__title", reservation.name));
      body.append(createTextElement("span", "ticket-list-card__schedule", reservation.date + " · " + reservation.time));
      var metaText = reservation.qty + "명 · " + money(reservation.price) + (reservation.discount ? " · 과천시민 할인" : "");
      var meta = createTextElement("span", "ticket-list-card__meta", metaText);
      body.append(meta);
      card.append(image, body, createTextElement("span", "ticket-list-card__arrow", "티켓 보기 →"));
      card.addEventListener("click", function () { showTicketDetail(reservation.id); });
      list.append(card);
    });
  }

  function updateTicketListStatuses() {
    document.querySelectorAll(".ticket-list-card").forEach(function (card) {
      var reservation = ticketReservations.find(function (item) { return item.id === card.getAttribute("data-reservation-id"); });
      if (!reservation) return;
      var timing = ticketTiming(reservation, new Date());
      var badge = card.querySelector("[data-ticket-status]");
      badge.className = "ticket-list-card__status ticket-list-card__status--" + timing.accessState;
      badge.textContent = timing.status.label;
    });
  }

  function showMyTickets() {
    document.querySelector(".reservation-steps").hidden = true;
    document.querySelectorAll("[data-booking-step]").forEach(function (section) { section.hidden = true; });
    byId("my-tickets-screen").hidden = false;
    byId("my-tickets-list-view").hidden = false;
    byId("ticket-detail-view").hidden = true;
    renderTicketList();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showTicketDetail(reservationId) {
    var selectedReservation = ticketReservations.find(function (reservation) { return reservation.id === reservationId; });
    if (!selectedReservation && ticketReservation && ticketReservation.id === reservationId) selectedReservation = ticketReservation;
    if (!selectedReservation) return;
    ticketReservation = selectedReservation;
    byId("my-tickets-list-view").hidden = true;
    byId("ticket-detail-view").hidden = false;
    updateTicketAccess();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderSlots() {
    var selectableSlots = program.slots.filter(function (slot) {
      return !slot.disabled && !hasTimeConflict(state.dateKey, slot.time);
    });
    var selectedSlot = program.slots.find(function (slot) { return slot.time === state.time; });
    if (!selectedSlot || selectedSlot.disabled || hasTimeConflict(state.dateKey, selectedSlot.time)) {
      state.time = selectableSlots.length ? selectableSlots[0].time : "";
    }
    byId("booking-slots").innerHTML = program.slots.map(function (slot, index) {
      var booked = hasTimeConflict(state.dateKey, slot.time);
      var selected = slot.time === state.time;
      var className = "chip chip--slots" + (selected ? " is-selected" : "") + (booked ? " is-booked" : "");
      var stockText = booked ? "이미 예약됨" : slot.stock;
      return '<button type="button" class="' + className + '" data-time="' + slot.time + '" data-booked="' + booked + '" aria-pressed="' + selected + '"' + (slot.disabled ? ' disabled' : '') + '><strong>' + slot.time + '</strong><small>' + stockText + '</small></button>';
    }).join("");
    document.querySelectorAll("#booking-slots button:not([disabled])").forEach(function (button) {
      button.addEventListener("click", function () {
        if (button.getAttribute("data-booked") === "true") { notifyTimeConflict(); return; }
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
      var available = date >= bookingStart && date <= bookingEnd && isWeekend(date);
      var selected = key === state.dateKey;
      var today = key === dateKey(bookingStart);
      var classNames = [];
      if (available) classNames.push("is-available");
      if (selected) classNames.push("is-selected");
      if (today) classNames.push("is-today");
      cells.push('<button type="button" data-date-key="' + key + '" data-weekday="' + date.getDay() + '" class="' + classNames.join(" ") + '" aria-label="' + formatBookingDate(date) + (available ? ' 예약 가능' : ' 예약 불가') + '"' + (selected ? ' aria-pressed="true"' : ' aria-pressed="false"') + (available ? '' : ' disabled') + '><span>' + day + '</span></button>');
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
        renderSlots();
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
    byId("complete-image").src = program.image;
    byId("complete-name").textContent = displayName;
    byId("complete-date").textContent = state.date;
    byId("complete-time").textContent = state.time;
    byId("complete-people").textContent = state.qty + "명";
    byId("complete-price").textContent = money(price);
  }

  function goToStep(step) {
    state.step = step;
    byId("my-tickets-screen").hidden = true;
    document.querySelector(".reservation-steps").hidden = false;
    document.querySelectorAll("[data-booking-step]").forEach(function (section) {
      section.hidden = false;
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
  byId("to-confirm").addEventListener("click", function () {
    if (!state.time || hasTimeConflict(state.dateKey, state.time)) { notifyTimeConflict(); return; }
    openLoginDialog("booking");
  });
  byId("back-to-select").addEventListener("click", function () { goToStep(1); });
  byId("complete-payment").addEventListener("click", function () {
    if (!byId("terms").checked) { notify("필수 약관에 동의해주세요."); return; }
    if (!state.time || hasTimeConflict(state.dateKey, state.time)) { notifyTimeConflict(); return; }
    ticketReservation = saveCurrentReservation();
    goToStep(3);
    notify("예약이 완료되었습니다.");
  });
  byId("view-my-tickets").addEventListener("click", function () {
    showMyTickets();
    if (ticketReservation) showTicketDetail(ticketReservation.id);
  });
  byId("new-booking").addEventListener("click", function () { goToStep(1); renderSlots(); update(); });
  byId("back-from-tickets").addEventListener("click", function () { goToStep(1); });
  byId("back-to-ticket-list").addEventListener("click", function () {
    byId("ticket-detail-view").hidden = true;
    byId("my-tickets-list-view").hidden = false;
    renderTicketList();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  document.querySelectorAll(".payment-options button").forEach(function (button) {
    button.addEventListener("click", function () {
      state.paymentMethod = button.getAttribute("data-payment-method");
      document.querySelectorAll(".payment-options button").forEach(function (item) {
        var selected = item === button;
        item.classList.toggle("is-selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
    });
  });

  byId("pony-experience-panel").hidden = !program.experiences;
  byId("pony-slot-guide").hidden = !program.experiences;
  byId("pony-weather-note").hidden = !program.experiences;
  document.querySelector(".discount-check").hidden = !program.experiences;
  renderCalendar();
  renderSlots();
  update();
  setInterval(function () { updateTicketAccess(); updateTicketListStatuses(); }, 1000);
})();
