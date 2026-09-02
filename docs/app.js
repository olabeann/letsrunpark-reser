(function () {
  "use strict";

  var toast = document.querySelector(".toast");
  var toastTimer;

  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("is-on"); }, 4500);
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
    loginDialogTitle.textContent = "시연 계정 로그인";
    loginDialogDescription.textContent = "선택한 계정의 장바구니와 예약 시간을 함께 확인합니다.";
    loginDialogNote.textContent = "실제 간편 로그인은 연결되지 않습니다. 같은 제공자·회원 번호는 같은 시연 계정입니다.";
    loginDialog.showModal();
  }

  if (loginDialog && reservationLogin) {
    reservationLogin.addEventListener("click", function () {
      if (currentMember) showMyTickets(); else openLoginDialog("lookup");
    });
    loginDialogClose.addEventListener("click", function () { loginDialog.close(); });
    loginDialog.addEventListener("click", function (event) {
      if (event.target === loginDialog) loginDialog.close();
    });
    loginDialog.querySelectorAll("[data-login-provider]").forEach(function (button) {
      button.addEventListener("click", function () {
        var provider = button.getAttribute("data-login-provider");
        var memberNumber = document.getElementById("demo-member").value;
        var nextMember = { id: "demo:" + provider + ":" + memberNumber, label: provider + " · 회원 " + memberNumber };
        try { window.sessionStorage.setItem("ponylandDemoMember", JSON.stringify(nextMember)); }
        catch (error) { notify("계정을 저장할 수 없습니다. 브라우저 저장 공간을 확인해주세요."); return; }
        currentMember = nextMember;
        checkoutSnapshot = "";
        completedOrder = null;
        ticketReservation = null;
        loginDialog.close();
        // Do not silently change the user's selected session before checking it for the new account.
        if (loginIntent === "add") { addToCart(false); return; }
        if (loginIntent === "reserve") { addToCart(true); return; }
        renderSlots(); update(); renderCart();
        if (loginIntent === "lookup") showMyTickets();
        else if (loginIntent === "checkout") startCheckout();
        else goToStep(state.step === 2 ? 4 : state.step === 3 ? 1 : state.step);
        notify(nextMember.label + " 계정으로 전환했습니다.");
      });
    });
  }

  if (document.body.getAttribute("data-page") !== "booking") return;

  var ponySlots = [
        { time: "10:00~10:20", stock: "1회차 · 8자리" },
        { time: "10:20~10:45", stock: "2회차 · 6자리" },
        { time: "11:00~11:20", stock: "3회차 · 7자리" },
        { time: "11:20~11:45", stock: "4회차 · 4자리" },
        { time: "13:00~13:20", stock: "5회차 · 8자리" },
        { time: "13:20~13:45", stock: "6회차 · 5자리" },
        { time: "14:00~14:20", stock: "7회차 · 6자리" },
        { time: "14:20~14:45", stock: "8회차 · 3자리", capacity: 3 },
        { time: "15:00~15:20", stock: "9회차 · 8자리" },
        { time: "15:20~15:45", stock: "10회차 · 6자리" },
        { time: "16:00~16:20", stock: "11회차 · 4자리" },
        { time: "16:20~16:45", stock: "12회차 · 마감", disabled: true }
  ];

  var programs = {
    ride: {
      key: "ride",
      name: "포니 타기",
      meta: "서울 렛츠런파크 · 1인 5,000원",
      price: 5000,
      tag: "어린이 전용",
      tagClass: "tag--exp",
      image: "assets/pony/cover.jpg",
      character: "assets/characters/pony-rider.png",
      detail: "pony.html",
      subtitle: "작은 포니와 함께하는 어린이 승마 체험",
      description: "어린이를 위한 포니 승마 체험입니다. 이용 조건과 복장을 확인한 뒤 방문해주세요.",
      notes: ["키 100cm 이상 · 몸무게 75kg 이하", "초등학생까지 체험 가능", "안전모와 안전조끼 필수 착용", "치마·샌들보다 활동하기 편한 복장 권장"],
      discountPolicy: { rate: 0.5, maxQty: 2, label: "과천시민 50% 할인" },
      slots: ponySlots
    },
    play: {
      key: "play",
      name: "포니랑 놀기",
      meta: "서울 렛츠런파크 · 1인 4,000원",
      price: 4000,
      tag: "누구나 체험",
      tagClass: "tag--exp",
      image: "assets/pony/gallery-02.jpg",
      character: "assets/characters/cowboy-child.png",
      detail: "pony.html",
      subtitle: "빗질하고 꾸며주며 함께 산책하는 교감 체험",
      description: "포니를 빗질하고 꾸며준 뒤 함께 산책하며 가까이에서 교감해보세요.",
      notes: ["연령 제한 없이 누구나 체험 가능", "어린이는 보호자 동반을 권장", "포니 빗질하기·꾸며주기·산책하기", "카우보이 의상 무료 이용 가능", "동물복지를 위해 먹이주기는 진행하지 않음"],
      discountPolicy: { rate: 0.5, maxQty: 2, label: "과천시민 50% 할인" },
      slots: ponySlots
    },
    pony: {
      key: "pony",
      name: "포니 승마체험",
      price: 5000,
      image: "assets/pony/cover.jpg",
      discountPolicy: { rate: 0.5, maxQty: 2, label: "과천시민 50% 할인" },
      experiences: {
        ride: { name: "포니 타기", price: 5000, image: "assets/pony/cover.jpg" },
        play: { name: "포니랑 놀기", price: 4000, image: "assets/pony/gallery-02.jpg" }
      },
      slots: ponySlots
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
        { time: "11:00~12:20", stock: "12자리 · 80분" },
        { time: "14:00~15:20", stock: "5자리 · 80분" },
        { time: "15:30~16:50", stock: "마감", disabled: true }
      ]
    }
  };

  var query = new URLSearchParams(window.location.search);
  // Each sellable experience has its own route and cart identity. `pony` remains for legacy saved records.
  var initialProgramKey = ["ride", "play"].includes(query.get("product")) ? query.get("product") : "ride";
  var program = programs[initialProgramKey];
  var weekdayNames = ["일", "월", "화", "수", "목", "금", "토"];
  var bookingStart = new Date();
  bookingStart.setHours(0, 0, 0, 0);
  var bookingEnd = new Date(bookingStart);
  bookingEnd.setDate(bookingEnd.getDate() + 14);
  var firstBookableDate = new Date(bookingStart);
  while (firstBookableDate <= bookingEnd && !isWeekend(firstBookableDate)) firstBookableDate.setDate(firstBookableDate.getDate() + 1);
  var calendarFirstMonth = new Date(firstBookableDate.getFullYear(), firstBookableDate.getMonth(), 1);
  var calendarMonth = new Date(calendarFirstMonth);

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
    var range = BookingRules.interval(reservation);
    return new Date(range ? range.end : sessionStart.getTime());
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

  var state = { date: "", dateKey: "", time: "", qty: 1, discount: false, programKey: initialProgramKey, paymentMethod: "card", step: 0 };
  var byId = function (id) { return document.getElementById(id); };
  var money = function (value) { return new Intl.NumberFormat("ko-KR").format(value) + "원"; };
  var currentName = function () { return program.name; };
  var currentPrice = function () { return program.price; };
  var amount = function () { return Math.round(currentPrice() * state.qty * (state.discount ? program.discountPolicy.rate : 1)); };
  var reservationStorageKey = "ponylandBookingStoreV2";
  var currentMember = readMember();
  var checkoutSnapshot = "";
  var completedOrder = null;
  var isPaying = false;
  var ticketReservation = null;
  var ticketReservations = readReservations();

  function readMember() {
    try {
      var member = JSON.parse(window.sessionStorage.getItem("ponylandDemoMember") || "null");
      return member && /^demo:(카카오|네이버):[12]$/.test(member.id) ? member : null;
    } catch (error) { return null; }
  }

  function readStore() {
    try {
      var raw = window.localStorage.getItem(reservationStorageKey);
      if (raw === null) return { revision: 0, reservations: [], carts: {} };
      var store = JSON.parse(raw);
      if (!store || !Number.isInteger(store.revision) || !Array.isArray(store.reservations) || !store.carts || typeof store.carts !== "object" || Array.isArray(store.carts)) throw new Error("Invalid store");
      if (!store.reservations.every(function (item) { return item && typeof item === "object"; })) throw new Error("Invalid reservation");
      if (!Object.keys(store.carts).every(function (key) { return Array.isArray(store.carts[key]) && store.carts[key].every(function (item) { return item && typeof item === "object"; }); })) throw new Error("Invalid cart");
      return store;
    } catch (error) {
      notify("저장된 예약 정보를 읽을 수 없습니다. 데이터를 덮어쓰지 않고 작업을 중단합니다.");
      return null;
    }
  }

  function readReservations() {
    var store = readStore();
    return currentMember && store ? store.reservations.filter(function (item) { return item && item.memberId === currentMember.id && BookingRules.isActive(item); }) : [];
  }

  function writeStore(store) {
    try {
      window.localStorage.setItem(reservationStorageKey, JSON.stringify(store));
      return true;
    } catch (error) {
      notify("저장하지 못했습니다. 결제는 완료되지 않았으며 장바구니는 유지됩니다.");
      return false;
    }
  }

  function withStoreLock(action) {
    // Serialize read/validate/write across same-origin tabs when Web Locks are available.
    if (navigator.locks) return navigator.locks.request(reservationStorageKey, action);
    return Promise.resolve().then(action);
  }

  function newId(prefix) {
    return prefix + "-" + (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2));
  }

  function ownCart(store) {
    return currentMember && store ? store.carts[currentMember.id] || [] : [];
  }

  function makeCartItem() {
    return {
      id: newId("CART"), memberId: currentMember.id,
      programKey: program.key,
      name: currentName(),
      dateKey: state.dateKey,
      date: state.date,
      time: state.time,
      qty: state.qty,
      price: amount(),
      discount: state.discount
    };
  }

  async function addToCart(continueToCheckout) {
    if (!currentMember) { openLoginDialog(continueToCheckout ? "reserve" : "add"); return; }
    var item = makeCartItem();
    var added = false;
    try { await withStoreLock(function () {
      if (!currentMember || currentMember.id !== item.memberId) return;
      var store = readStore(); if (!store) return;
      var cart = ownCart(store);
      var matchingItem = cart.find(function (entry) {
        return entry.programKey === item.programKey && entry.dateKey === item.dateKey && entry.time === item.time;
      });
      if (matchingItem) item.id = matchingItem.id;
      var nextCart = matchingItem ? cart.map(function (entry) { return entry.id === matchingItem.id ? item : entry; }) : cart.concat(item);
      var error = BookingRules.validationError(nextCart, store.reservations, currentMember.id, programs, new Date());
      if (error) { notify(error); return; }
      store.carts[currentMember.id] = nextCart.map(function (entry) { return BookingRules.quoteItem(entry, programs); });
      store.revision += 1;
      added = writeStore(store);
    }); } catch (error) { notify("장바구니에 담지 못했습니다. 다시 시도해주세요."); }
    renderSlots(); update(); renderCart();
    if (added) {
      if (continueToCheckout) startCheckout();
      else notify("장바구니에 담았습니다.");
    }
  }

  async function changeCartItem(id, delta) {
    if (!currentMember) return;
    var memberId = currentMember.id;
    await withStoreLock(function () {
      if (!currentMember || memberId !== currentMember.id) return;
      var store = readStore(); if (!store) return;
      var cart = ownCart(store), item = cart.find(function (entry) { return entry.id === id; });
      if (!item) return;
      if (delta === null) cart = cart.filter(function (entry) { return entry.id !== id; });
      else {
        var changed = Object.assign({}, item, { qty: item.qty + delta });
        try { changed = BookingRules.quoteItem(changed, programs); }
        catch (error) { notify(error.message); return; }
        cart = cart.map(function (entry) { return entry.id === id ? changed : entry; });
      }
      store.carts[memberId] = cart; store.revision += 1;
      if (writeStore(store)) { checkoutSnapshot = state.step === 2 ? JSON.stringify(cart) : ""; byId("terms").checked = false; }
    });
    renderSlots(); update(); renderCart();
  }

  function renderBookingItems(container, items, editable) {
    container.replaceChildren();
    items.forEach(function (item) {
      var card = document.createElement("article"); card.className = "cart-item";
      var thumbnail = document.createElement("img"); thumbnail.className = "cart-item__image";
      var itemProgram = programs[item.programKey] || programs.ride;
      var itemProduct = itemProgram.experiences && itemProgram.experiences[item.experience];
      thumbnail.src = itemProduct ? itemProduct.image : itemProgram.image;
      thumbnail.alt = "";
      var body = document.createElement("div"); body.className = "cart-item__body";
      body.append(createTextElement("strong", "", item.name));
      body.append(createTextElement("p", "", item.date + " · " + item.time));
      body.append(createTextElement("small", "", item.qty + "명" + (item.discount ? " · 과천시민 할인" : "")));
      card.append(thumbnail, body, createTextElement("strong", "cart-item__price", money(item.price)));
      if (editable) {
        var actions = document.createElement("div"); actions.className = "cart-item__actions";
        [["−", -1, "인원 줄이기"], ["＋", 1, "인원 늘리기"], ["삭제", null, "삭제"]].forEach(function (control) {
          var button = createTextElement("button", "", control[0]); button.type = "button";
          button.setAttribute("aria-label", item.name + " " + item.dateKey + " " + item.time + " " + control[2]);
          button.disabled = control[1] === -1 && item.qty <= 1;
          if (control[1] === 1) {
            try { BookingRules.quoteItem(Object.assign({}, item, { qty: item.qty + 1 }), programs); }
            catch (error) { button.disabled = true; }
          }
          button.addEventListener("click", function () { changeCartItem(item.id, control[1]); });
          actions.append(button);
          if (control[1] === -1) actions.append(createTextElement("span", "cart-item__quantity", item.qty + "명"));
        });
        card.append(actions);
      }
      container.append(card);
    });
  }

  function renderCart() {
    var store = readStore(), cart = ownCart(store);
    var pricedCart = cart.map(function (item) {
      try { return BookingRules.quoteItem(item, programs); } catch (error) { return item; }
    });
    var total = pricedCart.reduce(function (sum, item) { return sum + item.price; }, 0);
    var subtotal = pricedCart.reduce(function (sum, item) {
      try { return sum + BookingRules.quoteItem(Object.assign({}, item, { discount: false }), programs).price; }
      catch (error) { return sum + item.price; }
    }, 0);
    byId("cart-count").textContent = cart.length;
    byId("header-cart-count").textContent = cart.length;
    byId("view-cart").hidden = cart.length === 0;
    byId("cart-total").textContent = money(total);
    byId("cart-subtotal").textContent = money(subtotal);
    byId("cart-discount").textContent = (subtotal > total ? "−" : "") + money(subtotal - total);
    byId("cart-checkout-count").textContent = cart.length;
    byId("cart-empty").hidden = cart.length > 0;
    byId("cart-empty-message").textContent = currentMember ? "마음에 드는 체험을 담아보세요." : "로그인하면 계정에 담아둔 상품을 확인할 수 있어요.";
    byId("to-checkout").disabled = !cart.length || !store;
    renderBookingItems(byId("cart-items"), pricedCart, true);
    renderBookingItems(byId("confirm-items"), pricedCart, false);
    byId("final-price").textContent = money(total);
    byId("checkout-account").textContent = currentMember ? currentMember.label + " · " + cart.length + "개 회차 일괄결제" : "";
    var error = store && cart.length ? BookingRules.validationError(cart, store.reservations, currentMember.id, programs, new Date()) : "";
    byId("cart-error").textContent = error;
    byId("cart-error").hidden = !error;
    byId("cart-page-error").textContent = error;
    byId("cart-page-error").hidden = !error;
    byId("to-checkout").disabled = !cart.length || !store || !!error;
    byId("complete-payment").disabled = isPaying || !cart.length || !!error;
  }

  function startCheckout() {
    if (!currentMember) { openLoginDialog("checkout"); return; }
    var store = readStore(); if (!store) return;
    var cart = ownCart(store);
    var error = BookingRules.validationError(cart, store.reservations, currentMember.id, programs, new Date());
    if (error) { notify(error); renderCart(); return; }
    checkoutSnapshot = JSON.stringify(cart);
    byId("terms").checked = false;
    renderCart(); goToStep(2);
  }

  async function completePayment() {
    if (isPaying || state.step !== 2) return;
    if (!currentMember) { openLoginDialog("checkout"); return; }
    if (!byId("terms").checked) { notify("필수 약관에 동의해주세요."); return; }
    isPaying = true; byId("complete-payment").disabled = true;
    var memberId = currentMember.id;
    try {
      await withStoreLock(function () {
        if (!currentMember || currentMember.id !== memberId) return;
        var store = readStore(); if (!store) return;
        if (JSON.stringify(ownCart(store)) !== checkoutSnapshot) {
          checkoutSnapshot = JSON.stringify(ownCart(store)); byId("terms").checked = false;
          notify("예약 정보가 변경되었습니다. 금액과 일정을 다시 확인하고 동의해주세요."); return;
        }
        var order = BookingRules.buildOrder(store, memberId, programs, new Date(), newId("GP"));
        // One storage write commits all session tickets and clears the cart together.
        if (!writeStore(order.store)) return;
        completedOrder = order; ticketReservation = null;
        renderBookingItems(byId("complete-items"), order.tickets, false);
        byId("complete-order-id").textContent = order.orderId;
        byId("complete-total").textContent = money(order.total);
        byId("complete-count").textContent = order.tickets.length + "개 회차의 예약이 완료되었어요.";
        goToStep(3); notify("결제가 완료되었습니다.");
      });
    } catch (error) { notify(error.message || "결제 처리 중 문제가 생겼습니다. 다시 시도해주세요."); }
    finally { isPaying = false; renderSlots(); update(); renderCart(); }
  }

  function createTextElement(tagName, className, textContent) {
    var element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = textContent;
    return element;
  }

  function ticketReservationId(date, time) {
    return "GP-" + dateKey(date).slice(2).replace(/-/g, "") + "-" + time.split("~")[0].replace(":", "");
  }

  function slotDateTime(date, timeText) {
    var parts = timeText.split(":");
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Number(parts[0]), Number(parts[1]), 0, 0);
  }

  function activeSlotForNow(now) {
    var slots = programs.ride.slots.filter(function (slot) { return !slot.disabled; });
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

  function defaultTicketReservations(now) {
    now = now || new Date();
    var active = activeSlotForNow(now);
    var upcomingDate = new Date(now);
    upcomingDate.setHours(0, 0, 0, 0);
    var secondSlot = programs.play.slots[5].time;
    var endedSlot = programs.ride.slots[2].time;
    // Keep the next reservation in the waiting state, including on weekend afternoons.
    while (!isWeekend(upcomingDate) || now >= new Date(slotDateTime(upcomingDate, secondSlot.split("~")[0]).getTime() - 10 * 60 * 1000)) {
      upcomingDate.setDate(upcomingDate.getDate() + 1);
    }
    var endedDate = new Date(now);
    endedDate.setDate(endedDate.getDate() - 1);
    while (!isWeekend(endedDate)) endedDate.setDate(endedDate.getDate() - 1);
    return [
      { id: ticketReservationId(now, active.slot.time), programKey: "ride", name: "포니 타기", dateKey: dateKey(now), date: formatBookingDate(now), time: active.slot.time, qty: 2, price: 5000, discount: true, forceActive: active.forceActive },
      { id: ticketReservationId(upcomingDate, secondSlot), programKey: "play", name: "포니랑 놀기", dateKey: dateKey(upcomingDate), date: formatBookingDate(upcomingDate), time: secondSlot, qty: 1, price: 4000, discount: false },
      { id: ticketReservationId(endedDate, endedSlot), programKey: "ride", name: "포니 타기", dateKey: dateKey(endedDate), date: formatBookingDate(endedDate), time: endedSlot, qty: 2, price: 10000, discount: false }
    ];
  }

  function ticketListReservations(now) {
    now = now || new Date();
    var reservations = readReservations();
    var visibleReservations = reservations.slice();
    var includedStates = {};
    visibleReservations.forEach(function (reservation) {
      includedStates[ticketTiming(reservation, now).accessState] = true;
    });
    defaultTicketReservations(now).forEach(function (reservation) {
      var accessState = ticketTiming(reservation, now).accessState;
      if (includedStates[accessState]) return;
      visibleReservations.push(reservation);
      includedStates[accessState] = true;
    });
    var stateOrder = { upcoming: 0, active: 1, ended: 2 };
    return visibleReservations.sort(function (first, second) {
      return stateOrder[ticketTiming(first, now).accessState] - stateOrder[ticketTiming(second, now).accessState];
    });
  }

  function hasTimeConflict(dateValue, timeValue) {
    if (!currentMember) return false;
    var store = readStore(); if (!store) return true;
    return !!BookingRules.findConflict({ dateKey: dateValue, time: timeValue, programKey: program.key }, store.reservations.concat(ownCart(store)), currentMember.id);
  }

  function notifyTimeConflict() {
    notify("이 계정의 기존 예약 또는 장바구니와 시간이 겹칩니다. 다른 회차를 선택해주세요.");
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
      var programData = programs[reservation.programKey] || programs.ride;
      var timing = ticketTiming(reservation, new Date());
      var card = document.createElement("button");
      card.type = "button";
      card.className = "ticket-list-card";
      card.setAttribute("data-reservation-id", reservation.id);
      card.setAttribute("aria-label", reservation.name + " 티켓 보기");

      var image = document.createElement("img");
      var experienceData = programData.experiences && programData.experiences[reservation.experience];
      image.src = experienceData ? experienceData.image : programData.image;
      image.alt = "";
      var body = document.createElement("span");
      body.className = "ticket-list-card__body";
      var status = createTextElement("small", "ticket-list-card__status ticket-list-card__status--" + timing.accessState, timing.status.label);
      status.setAttribute("data-ticket-status", "");
      card.setAttribute("data-access-state", timing.accessState);
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
    if (byId("my-tickets-screen").hidden || byId("my-tickets-list-view").hidden) return;
    var now = new Date();
    document.querySelectorAll(".ticket-list-card").forEach(function (card) {
      var reservation = ticketReservations.find(function (item) { return item.id === card.getAttribute("data-reservation-id"); });
      if (!reservation) return;
      var timing = ticketTiming(reservation, now);
      card.setAttribute("data-access-state", timing.accessState);
      var badge = card.querySelector("[data-ticket-status]");
      badge.className = "ticket-list-card__status ticket-list-card__status--" + timing.accessState;
      badge.textContent = timing.status.label;
    });
  }

  function showMyTickets() {
    if (!currentMember) { openLoginDialog("lookup"); return; }
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
    byId("slot-placeholder").hidden = !!state.dateKey;
    byId("booking-slots").hidden = !state.dateKey;
    if (!state.dateKey) { byId("booking-slots").replaceChildren(); return; }
    var selectedSlot = program.slots.find(function (slot) { return slot.time === state.time; });
    if (!selectedSlot || selectedSlot.disabled || slotHasStarted(selectedSlot) || hasTimeConflict(state.dateKey, selectedSlot.time)) {
      state.time = "";
    }
    byId("booking-slots").innerHTML = program.slots.map(function (slot, index) {
      var booked = hasTimeConflict(state.dateKey, slot.time);
      var selected = slot.time === state.time;
      var className = "chip chip--slots" + (selected ? " is-selected" : "") + (booked ? " is-booked" : "");
      var stockText = booked ? "이미 선택한 시간" : slotHasStarted(slot) ? "시작된 회차" : slot.stock;
      return '<button type="button" class="' + className + '" data-time="' + slot.time + '" data-booked="' + booked + '" aria-pressed="' + selected + '"' + (slot.disabled || booked || slotHasStarted(slot) ? ' disabled' : '') + '><strong>' + slot.time + '</strong><small>' + stockText + '</small></button>';
    }).join("");
    document.querySelectorAll("#booking-slots button:not([disabled])").forEach(function (button) {
      button.addEventListener("click", function () {
        if (button.getAttribute("data-booked") === "true") { notifyTimeConflict(); return; }
        state.time = button.getAttribute("data-time");
        state.qty = Math.min(state.qty, selectedMaxQty());
        document.querySelectorAll("#booking-slots button").forEach(function (item) {
          var selected = item === button;
          item.classList.toggle("is-selected", selected);
          item.setAttribute("aria-pressed", String(selected));
        });
        update();
      });
    });
  }

  function slotHasStarted(slot) {
    var range = BookingRules.interval({ dateKey: state.dateKey, time: slot.time, programKey: program.key });
    return !range || range.start <= Date.now();
  }

  function selectProgram(key, reset) {
    state.programKey = ["ride", "play"].includes(key) ? key : "ride";
    program = programs[state.programKey];
    if (reset !== false) {
      state.date = ""; state.dateKey = ""; state.time = ""; state.qty = 1; state.discount = false;
      calendarMonth = new Date(calendarFirstMonth);
    }
    byId("citizen-discount").checked = state.discount;
    byId("date-picker").open = false;
    byId("booking-program-tag").textContent = program.tag;
    byId("booking-page-title").textContent = program.name + " 예약";
    byId("booking-page-description").textContent = program.subtitle;
    byId("booking-program-character").src = program.character;
    byId("booking-animal-note").hidden = program.key !== "play";
    var experienceLink = byId("back-to-experience");
    experienceLink.innerHTML = '<span aria-hidden="true">←</span> 포니 체험 소개 보기';
    if (typeof experienceLink.setAttribute === "function") experienceLink.setAttribute("href", program.detail || "pony.html");
    byId("product-title").textContent = program.name;
    byId("product-subtitle").textContent = program.subtitle;
    byId("product-unit-price").textContent = money(program.price);
    byId("booking-review-image").src = program.image;
    byId("booking-review-image").alt = program.name + " 체험 현장";
    renderCalendar(); renderSlots(); update();
  }

  function renderCalendar() {
    var grid = byId("calendar-grid");
    var year = calendarMonth.getFullYear();
    var month = calendarMonth.getMonth();
    var firstWeekday = new Date(year, month, 1).getDay();
    var lastDate = new Date(year, month + 1, 0).getDate();
    var cells = [];

    byId("calendar-title").textContent = year + "년 " + (month + 1) + "월";
    byId("calendar-prev").disabled = year === calendarFirstMonth.getFullYear() && month === calendarFirstMonth.getMonth();
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
        state.time = "";
        byId("date-picker").open = false;
        byId("date-picker").querySelector("summary").focus();
        renderCalendar();
        renderSlots();
        update();
      });
    });
  }

  function update() {
    var price = amount();
    var unitPrice = currentPrice();
    byId("booking-unit-price").textContent = "1인 " + money(unitPrice);
    byId("booking-qty").textContent = state.qty;
    byId("selected-date-label").textContent = state.date || "날짜를 선택해주세요";
    byId("selected-option-summary").textContent = state.dateKey && state.time ? state.date + " · " + state.time + " · " + state.qty + "명" : "날짜와 시간을 선택해주세요.";
    byId("summary-price").textContent = money(price);
    byId("add-to-cart").disabled = !state.dateKey || !state.time;
    byId("book-now").disabled = !state.dateKey || !state.time;
    byId("qty-minus").disabled = state.qty <= 1;
    byId("qty-plus").disabled = state.qty >= selectedMaxQty();
  }

  function selectedMaxQty() {
    var slot = program.slots.find(function (entry) { return entry.time === state.time; });
    return Math.min(state.discount ? 2 : 4, slot && slot.capacity || 4);
  }

  function goToStep(step, options) {
    options = options || {};
    state.step = step;
    byId("my-tickets-screen").hidden = true;
    document.querySelector(".reservation-steps").hidden = step === 1;
    document.querySelectorAll("[data-booking-step]").forEach(function (section) {
      var visible = Number(section.getAttribute("data-booking-step")) === step;
      section.hidden = !visible;
      section.classList.toggle("is-visible", visible);
    });
    var progress = step === 4 ? 1 : step;
    document.querySelectorAll("[data-step-label]").forEach(function (label) {
      var labelStep = Number(label.getAttribute("data-step-label"));
      label.classList.toggle("is-current", labelStep === progress);
      label.classList.toggle("is-done", labelStep < progress);
      label.querySelector("i").textContent = labelStep < progress ? "✓" : labelStep;
    });
    document.title = (step === 1 ? program.name + " 예약" : step === 4 ? "장바구니" : step === 2 ? "예약 내용 확인" : "예약 완료") + " | 포니랜드";
    if (options.history !== false) {
      var url = new URL(window.location.href);
      url.searchParams.delete("program"); url.searchParams.delete("product"); url.searchParams.delete("view");
      if (step === 1) url.searchParams.set("product", program.key);
      else if (step === 4) url.searchParams.set("view", "cart");
      else if (step === 2) url.searchParams.set("view", "checkout");
      else if (step === 3) url.searchParams.set("view", "complete");
      if (url.href !== window.location.href) window.history[options.replace ? "replaceState" : "pushState"](null, "", url);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function restoreShopRoute() {
    var route = new URLSearchParams(window.location.search);
    if (["ride", "play"].includes(route.get("product"))) {
      selectProgram(route.get("product"), state.programKey !== route.get("product"));
      goToStep(1, { history: false });
    } else if (route.get("view") === "complete" && completedOrder) goToStep(3, { history: false });
    else if (["cart", "checkout", "complete"].includes(route.get("view"))) {
      // Returning to checkout always requires a fresh review from the cart.
      renderCart(); goToStep(4, { replace: true });
    } else {
      selectProgram(state.programKey, false);
      goToStep(1, { history: false });
    }
  }

  document.querySelectorAll("[data-shop-home]").forEach(function (button) {
    button.addEventListener("click", function () { goToStep(1); });
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
  byId("qty-plus").addEventListener("click", function () { state.qty = Math.min(selectedMaxQty(), state.qty + 1); update(); });
  byId("citizen-discount").addEventListener("change", function (event) { state.discount = event.target.checked; if (state.discount && state.qty > 2) state.qty = 2; update(); });
  byId("add-to-cart").addEventListener("click", function () { addToCart(false); });
  byId("book-now").addEventListener("click", function () { addToCart(true); });
  byId("to-checkout").addEventListener("click", startCheckout);
  byId("view-cart").addEventListener("click", function () {
    renderCart(); goToStep(4);
  });
  byId("back-to-select").addEventListener("click", function () { goToStep(1); });
  byId("complete-payment").addEventListener("click", completePayment);
  byId("view-my-tickets").addEventListener("click", function () {
    showMyTickets();
  });
  byId("new-booking").addEventListener("click", function () { selectProgram(program.key); goToStep(1); });
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

  window.addEventListener("storage", function (event) {
    if (event.key !== reservationStorageKey && event.key !== null) return;
    var store = readStore();
    var latestCart = JSON.stringify(ownCart(store));
    if (state.step === 2 && latestCart !== checkoutSnapshot) {
      byId("terms").checked = false; checkoutSnapshot = latestCart;
      notify("다른 창에서 장바구니가 변경되었습니다. 변경된 금액과 일정을 확인해주세요.");
    }
    renderSlots(); update(); renderCart();
    if (!byId("my-tickets-screen").hidden && !byId("my-tickets-list-view").hidden) renderTicketList();
  });
  selectProgram(initialProgramKey);
  renderCart();
  restoreShopRoute();
  window.addEventListener("popstate", restoreShopRoute);
  setInterval(function () { updateTicketAccess(); updateTicketListStatuses(); }, 1000);
  setInterval(function () { renderSlots(); update(); renderCart(); }, 30000);
})();
