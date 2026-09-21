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

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (character) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character];
    });
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
    loginDialogTitle.textContent = "계정 로그인";
    loginDialogDescription.textContent = "로그인하면 장바구니와 예약 시간을 함께 확인할 수 있습니다.";
    loginDialogNote.textContent = "로그인 서비스를 선택해주세요.";
    loginDialog.showModal();
  }

  if (loginDialog && reservationLogin) {
    reservationLogin.addEventListener("click", function () {
      showMyTickets();
    });
    loginDialogClose.addEventListener("click", function () { loginDialog.close(); });
    loginDialog.addEventListener("click", function (event) {
      if (event.target === loginDialog) loginDialog.close();
    });
    loginDialog.querySelectorAll("[data-login-provider]").forEach(function (button) {
      button.addEventListener("click", function () {
        var provider = button.getAttribute("data-login-provider");
        var nextMember = { id: "demo:" + provider + ":1", label: provider + " 계정" };
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
        { time: "10:00~10:20", stock: "1회차 · 8자리", capacity: 8 },
        { time: "10:20~10:45", stock: "2회차 · 6자리", capacity: 6 },
        { time: "11:00~11:20", stock: "3회차 · 8자리", capacity: 8 },
        { time: "11:20~11:45", stock: "4회차 · 4자리", capacity: 4 },
        { time: "13:00~13:20", stock: "5회차 · 8자리", capacity: 8 },
        { time: "13:20~13:45", stock: "6회차 · 5자리", capacity: 5 },
        { time: "14:00~14:20", stock: "7회차 · 6자리", capacity: 6 },
        { time: "14:20~14:45", stock: "8회차 · 3자리", capacity: 3 },
        { time: "15:00~15:20", stock: "9회차 · 8자리", capacity: 8 },
        { time: "15:20~15:45", stock: "10회차 · 6자리", capacity: 6 },
        { time: "16:00~16:20", stock: "11회차 · 4자리", capacity: 4 },
        { time: "16:20~16:45", stock: "12회차 · 마감", capacity: 4, disabled: true }
  ];
  var playSlots = [
        { time: "10:00~10:20", stock: "1회차 · 8자리", capacity: 8 },
        { time: "10:20~10:45", stock: "2회차 · 8자리", capacity: 8 },
        { time: "11:00~11:20", stock: "3회차 · 8자리", capacity: 8 },
        { time: "11:20~11:45", stock: "4회차 · 8자리", capacity: 8 },
        { time: "13:00~13:20", stock: "5회차 · 8자리", capacity: 8 },
        { time: "13:20~13:45", stock: "6회차 · 8자리", capacity: 8 },
        { time: "14:00~14:20", stock: "7회차 · 8자리", capacity: 8 },
        { time: "14:20~14:45", stock: "8회차 · 8자리", capacity: 8 }
  ];

  var programs = {
    ride: {
      key: "ride",
      userBookable: true,
      name: "포니 타기",
      meta: "서울 렛츠런파크 · 1인 5,000원",
      price: 5000,
      tag: "어린이 전용",
      tagClass: "tag--exp",
      image: "assets/pony/cover.jpg",
      character: "assets/characters/pony-rider.png",
      subtitle: "작은 포니와 함께하는 어린이 승마 체험",
      region: "서울",
      department: "공원화사업추진TF",
      description: "어린이를 위한 포니 승마 체험입니다. 이용 조건과 복장을 확인한 뒤 방문해주세요.",
      notes: ["키 100cm 이상 · 몸무게 75kg 이하", "초등학생까지 체험 가능", "안전모와 안전조끼 필수 착용", "치마·샌들보다 활동하기 편한 복장 권장"],
      guidanceText: "[이용 대상] 키 100cm 이상, 초등학생 이하 어린이만 이용할 수 있습니다.\n[체험 방법] 안전장구를 착용하고 진행요원의 안내에 따라 체험해주세요.\n[준비 사항] 활동하기 편한 복장과 운동화를 착용해주세요.",
      requiresGuidanceConfirmation: false,
      discountPolicy: { id: "gwacheon", type: "percent", value: 50, rate: 0.5, maxQty: 2, maxQtyPerDate: 2, label: "과천시민 50% 할인" },
      discountPolicies: [
        { id: "gwacheon", type: "percent", value: 50, rate: 0.5, maxQty: 2, maxQtyPerDate: 2, label: "과천시민 50% 할인", noticeText: "체험 전 증빙서류(신분증, 주민등록초본 등)를 반드시 지참해주세요." },
        { id: "multi-child", type: "percent", value: 20, rate: 0.2, maxQty: 1, maxQtyPerDate: 1, label: "다자녀 가족 20% 할인", noticeText: "다자녀 가족 증빙서류를 현장에서 확인합니다." }
      ],
      purchasePolicy: { maxQty: 4 },
      bookingWindow: 14,
      arrivalLeadMinutes: 20,
      cancelMinutes: 10,
      slots: ponySlots
    },
    play: {
      key: "play",
      userBookable: true,
      name: "포니랑 놀기",
      meta: "서울 렛츠런파크 · 1인 4,000원",
      price: 4000,
      tag: "누구나 체험",
      tagClass: "tag--exp",
      image: "assets/pony/gallery-02.jpg",
      character: "assets/characters/cowboy-child.png",
      subtitle: "빗질하고 꾸며주며 함께 산책하는 교감 체험",
      region: "서울",
      department: "공원화사업추진TF",
      noticeText: "포니의 건강을 위해 먹이주기는 진행하지 않습니다.",
      description: "포니를 빗질하고 꾸며준 뒤 함께 산책하며 가까이에서 교감해보세요.",
      notes: ["연령 제한 없이 누구나 체험 가능", "어린이는 보호자 동반을 권장", "포니 빗질하기·꾸며주기·산책하기", "카우보이 의상 무료 이용 가능", "동물복지를 위해 먹이주기는 진행하지 않음"],
      guidanceText: "[이용 대상] 연령 제한 없이 누구나 이용할 수 있습니다.\n[체험 방법] 포니 빗질하기, 꾸며주기, 산책하기 순서로 진행됩니다.\n[준비 사항] 어린이는 보호자와 함께 방문해주세요.",
      requiresGuidanceConfirmation: false,
      discountPolicy: { id: "gwacheon", type: "percent", value: 50, rate: 0.5, maxQty: 2, maxQtyPerDate: 2, label: "과천시민 50% 할인" },
      discountPolicies: [
        { id: "gwacheon", type: "percent", value: 50, rate: 0.5, maxQty: 2, maxQtyPerDate: 2, label: "과천시민 50% 할인", noticeText: "체험 전 증빙서류(신분증, 주민등록초본 등)를 반드시 지참해주세요." },
        { id: "multi-child", type: "percent", value: 20, rate: 0.2, maxQty: 1, maxQtyPerDate: 1, label: "다자녀 가족 20% 할인", noticeText: "다자녀 가족 증빙서류를 현장에서 확인합니다." }
      ],
      purchasePolicy: { maxQty: 4 },
      bookingWindow: 14,
      arrivalLeadMinutes: 20,
      cancelMinutes: 10,
      slots: playSlots
    },
    pony: {
      key: "pony",
      name: "포니 승마체험",
      region: "서울",
      department: "공원화사업추진TF",
      price: 5000,
      image: "assets/pony/cover.jpg",
      discountPolicy: { id: "GWACHEON-CITIZEN", rate: 0.5, maxQty: 2, maxQtyPerDate: 2, label: "과천시민 50% 할인" },
      experiences: {
        ride: { name: "포니 타기", price: 5000, image: "assets/pony/cover.jpg" },
        play: { name: "포니랑 놀기", price: 4000, image: "assets/pony/gallery-02.jpg" }
      },
      slots: ponySlots
    },
    tour: {
      key: "tour",
      name: "렛츠런파크 투어",
      region: "서울",
      department: "공원화사업추진TF",
      meta: "서울 렛츠런파크 · 1인 8,000원",
      price: 8000,
      tag: "가이드 투어",
      tagClass: "tag--fac",
      image: "assets/tour/cover.jpg",
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
  var baseBookingWindowDays = { ride: programs.ride.bookingWindow, play: programs.play.bookingWindow };
  var baseCancelMinutes = { ride: programs.ride.cancelMinutes, play: programs.play.cancelMinutes };
  var baseProgramSettings = {
    ride: { name: programs.ride.name, price: programs.ride.price, image: programs.ride.image, noticeText: programs.ride.noticeText || "", guidanceText: programs.ride.guidanceText, requiresGuidanceConfirmation: programs.ride.requiresGuidanceConfirmation, arrivalLeadMinutes: programs.ride.arrivalLeadMinutes, purchaseGroup: "SEOUL-PONY", saleStartDate: "2026-09-01", saleEndDate: "2026-12-31", visibleStartAt: "2026-08-25T09:00", visibleEndAt: "2026-12-31T23:59", saleDays: [6, 0], active: true, slots: ponySlots.map(function (slot) { return Object.assign({}, slot); }), discountPolicy: Object.assign({}, programs.ride.discountPolicy), discountPolicies: programs.ride.discountPolicies.map(function (policy) { return Object.assign({}, policy); }) },
    play: { name: programs.play.name, price: programs.play.price, image: programs.play.image, noticeText: programs.play.noticeText || "", guidanceText: programs.play.guidanceText, requiresGuidanceConfirmation: programs.play.requiresGuidanceConfirmation, arrivalLeadMinutes: programs.play.arrivalLeadMinutes, purchaseGroup: "SEOUL-PONY", saleStartDate: "2026-09-01", saleEndDate: "2026-12-31", visibleStartAt: "2026-08-25T09:00", visibleEndAt: "2026-12-31T23:59", saleDays: [6, 0], active: true, slots: playSlots.map(function (slot) { return Object.assign({}, slot); }), discountPolicy: Object.assign({}, programs.play.discountPolicy), discountPolicies: programs.play.discountPolicies.map(function (policy) { return Object.assign({}, policy); }) }
  };
  var operationExceptions = [];
  var bookingStart, bookingEnd, calendarFirstMonth, calendarMonths = [];

  function applyBookingWindowOverrides() {
    try {
      var adminState = JSON.parse(window.localStorage.getItem("letsrunPlayAdminDemoV4") || "null");
      var catalog = adminState && adminState.catalog;
      operationExceptions = adminState && Array.isArray(adminState.operationExceptions) ? adminState.operationExceptions : [];
      Object.keys(programs).forEach(function (key) {
        if (programs[key].adminCreated) { delete programs[key]; delete baseProgramSettings[key]; delete baseBookingWindowDays[key]; delete baseCancelMinutes[key]; }
      });
      (catalog && catalog.addedPrograms || []).filter(function (item) { return !item.deleted && item.location === "서울"; }).forEach(function (item) {
        var key = item.key;
        programs[key] = {
          key: key, userBookable: true, adminCreated: true, name: item.programName, price: item.price,
          image: item.image || "assets/pony/cover.jpg", subtitle: item.noticeText || "렛츠런파크 체험 프로그램",
          noticeText: item.noticeText || "", guidanceText: typeof item.guidanceText === "string" ? item.guidanceText : guidanceItemsToText(item.guidanceItems), requiresGuidanceConfirmation: !!item.requiresGuidanceConfirmation, region: item.location, department: item.department,
          bookingWindow: item.bookingWindow || 14, arrivalLeadMinutes: Number.isInteger(item.arrivalLeadMinutes) && item.arrivalLeadMinutes >= 0 && item.arrivalLeadMinutes <= 100 ? item.arrivalLeadMinutes : 20, cancelMinutes: Number.isFinite(item.cancelMinutes) ? item.cancelMinutes : 10,
          slots: []
        };
        baseBookingWindowDays[key] = programs[key].bookingWindow;
        baseCancelMinutes[key] = programs[key].cancelMinutes;
        baseProgramSettings[key] = {
          name: item.programName, price: item.price, image: programs[key].image, noticeText: programs[key].noticeText, guidanceText: programs[key].guidanceText, requiresGuidanceConfirmation: programs[key].requiresGuidanceConfirmation, arrivalLeadMinutes: programs[key].arrivalLeadMinutes,
          purchaseGroup: item.purchaseGroup || "", purchaseMaxQty: item.purchaseMaxQty, saleStartDate: item.saleStartDate || "", saleEndDate: item.saleEndDate || "",
          visibleStartAt: item.visibleStartAt || "", visibleEndAt: item.visibleEndAt || "", saleDays: Array.isArray(item.saleDays) ? item.saleDays.map(Number) : [6, 0],
          active: item.active !== false, slots: [], discountPolicy: null
        };
      });
      Object.keys(baseBookingWindowDays).forEach(function (key) {
        var override = catalog && catalog.programOverrides && catalog.programOverrides[key];
        var added = catalog && (catalog.addedPrograms || []).find(function (item) { return item.key === key; });
        var source = override || added || {};
        var base = baseProgramSettings[key];
        programs[key].name = source.programName || base.name;
        programs[key].bookingWindow = source && Number.isFinite(source.bookingWindow) && source.bookingWindow > 0 ? source.bookingWindow : baseBookingWindowDays[key];
        programs[key].arrivalLeadMinutes = source && Number.isInteger(source.arrivalLeadMinutes) && source.arrivalLeadMinutes >= 0 && source.arrivalLeadMinutes <= 100 ? source.arrivalLeadMinutes : base.arrivalLeadMinutes;
        programs[key].cancelMinutes = source && Number.isFinite(source.cancelMinutes) && source.cancelMinutes >= 0 ? source.cancelMinutes : baseCancelMinutes[key];
        programs[key].price = Number.isFinite(source.price) ? source.price : base.price;
        programs[key].image = source.image || base.image;
        programs[key].noticeText = typeof source.noticeText === "string" ? source.noticeText : base.noticeText;
        programs[key].guidanceText = typeof source.guidanceText === "string" ? source.guidanceText : Array.isArray(source.guidanceItems) ? guidanceItemsToText(source.guidanceItems) : base.guidanceText || "";
        programs[key].requiresGuidanceConfirmation = source.requiresGuidanceConfirmation !== undefined ? !!source.requiresGuidanceConfirmation : !!base.requiresGuidanceConfirmation;
        programs[key].saleStartDate = source.saleStartDate || base.saleStartDate;
        programs[key].saleEndDate = source.saleEndDate || base.saleEndDate;
        programs[key].visibleStartAt = source.visibleStartAt || base.visibleStartAt;
        programs[key].visibleEndAt = source.visibleEndAt || base.visibleEndAt;
        programs[key].saleDays = Array.isArray(source.saleDays) ? source.saleDays.map(Number) : base.saleDays.slice();
        programs[key].active = source.active !== undefined ? source.active : base.active;
        var purchaseGroup = source.purchaseGroup !== undefined ? source.purchaseGroup : base.purchaseGroup;
        programs[key].purchasePolicy = { maxQty: Number.isInteger(source.purchaseMaxQty) && source.purchaseMaxQty > 0 ? source.purchaseMaxQty : 4 };
        var sessionOverrides = catalog && catalog.sessionOverrides || {};
        var configuredSlots = base.slots.map(function (slot, index) {
          var configured = sessionOverrides[key + "-session-" + index] || {};
          return Object.assign({}, slot, {
            key: key + "-session-" + index,
            time: configured.start && configured.end ? configured.start + "~" + configured.end : slot.time,
            capacity: Number.isFinite(configured.capacity) ? configured.capacity : slot.capacity,
            disabled: configured.deleted || (configured.active === undefined ? !!slot.disabled : configured.active === false)
          });
        }).filter(function (slot, index) { return !(sessionOverrides[key + "-session-" + index] || {}).deleted; });
        (catalog && catalog.addedSessions || []).filter(function (session) { return session.programKey === key && !session.deleted; }).forEach(function (session) {
          configuredSlots.push({ key: session.key, time: session.start + "~" + session.end, capacity: session.capacity, disabled: session.active === false });
        });
        configuredSlots.sort(function (a, b) { return a.time.localeCompare(b.time); });
        programs[key].slots = configuredSlots.map(function (slot, index) {
          return Object.assign({}, slot, { stock: (index + 1) + "회차 · " + (slot.disabled ? "마감" : slot.capacity + "자리") });
        });
        var savedDiscounts = adminState && Array.isArray(adminState.discounts) ? adminState.discounts : null;
        if (savedDiscounts) {
          var discountIds = Array.isArray(source.discountIds) ? source.discountIds : base.discountPolicy ? ["gwacheon"] : [];
          programs[key].discountPolicies = savedDiscounts.filter(function (discount) {
            var included = discount.allPrograms ? !(discount.excludedPrograms || []).includes(programs[key].name) : discountIds.includes(discount.id) || (discount.programs || []).includes(programs[key].name);
            return discount.active !== false && included;
          }).map(function (discount) {
            var discountName = String(discount.name || "할인").replace(/\s*할인$/, "");
            return { id: discount.id, type: discount.type, value: discount.value, rate: discount.type === "percent" ? discount.value / 100 : 0, maxQty: discount.maxQty || 1, maxQtyPerDate: discount.maxQty || 1, startDate: discount.startDate || "", endDate: discount.endDate || "", noticeText: discount.noticeText || "", label: discountName + (discount.type === "percent" ? " " + discount.value + "% 할인" : " " + Number(discount.value || 0).toLocaleString("ko-KR") + "원 할인") };
          });
          (base.discountPolicies || []).forEach(function (samplePolicy) {
            if (!programs[key].discountPolicies.some(function (policy) { return policy.id === samplePolicy.id; })) programs[key].discountPolicies.push(Object.assign({}, samplePolicy));
          });
          programs[key].discountPolicy = programs[key].discountPolicies[0] || null;
        } else {
          programs[key].discountPolicies = Array.isArray(base.discountPolicies) ? base.discountPolicies.map(function (policy) { return Object.assign({}, policy); }) : base.discountPolicy ? [Object.assign({}, base.discountPolicy)] : [];
          programs[key].discountPolicy = programs[key].discountPolicies[0];
        }
        programs[key].operationExceptions = operationExceptions;
      });
    } catch (error) { /* keep base booking window if admin storage is unavailable */ }
  }

  function refreshBookingWindow(programKey) {
    applyBookingWindowOverrides();
    var days = (programs[programKey] && programs[programKey].bookingWindow) || 14;
    bookingStart = new Date();
    bookingStart.setHours(0, 0, 0, 0);
    bookingEnd = new Date(bookingStart);
    bookingEnd.setDate(bookingEnd.getDate() + days);
    calendarMonths = [];
    for (var date = new Date(bookingStart); date <= bookingEnd; date.setDate(date.getDate() + 1)) {
      var key = dateKey(date);
      if (!programOperatesOn(programs[programKey], key, date.getDay()) || operationExceptionFor(key, programKey)) continue;
      var month = new Date(date.getFullYear(), date.getMonth(), 1);
      if (!calendarMonths.some(function (availableMonth) { return availableMonth.getTime() === month.getTime(); })) calendarMonths.push(month);
    }
    calendarFirstMonth = calendarMonths[0] || new Date(bookingStart.getFullYear(), bookingStart.getMonth(), 1);
  }

  refreshBookingWindow(initialProgramKey);
  // Administrator-created programs must also survive direct links and page reloads.
  var requestedProgramKey = query.get("product");
  if (requestedProgramKey && programs[requestedProgramKey] && programs[requestedProgramKey].userBookable) {
    initialProgramKey = requestedProgramKey;
    program = programs[initialProgramKey];
    refreshBookingWindow(initialProgramKey);
  }
  var calendarMonth = new Date(calendarFirstMonth);

  function dateKey(date) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  }

  function operationExceptionFor(dateKeyValue, programKey) {
    var selectedProgramKey = programKey || program.key;
    return operationExceptions.find(function (item) { return item.status !== "open" && !item.sessionKey && item.region === "서울" && (!item.programKey || item.programKey === "all" || item.programKey === selectedProgramKey) && item.startDate <= dateKeyValue && item.endDate >= dateKeyValue; }) || null;
  }

  function slotOperationException(slot) {
    return operationExceptions.find(function (item) {
      return item.status !== "open" && item.sessionKey && item.region === program.region && item.programKey === program.key && item.sessionKey === slot.key && item.startDate <= state.dateKey && item.endDate >= state.dateKey;
    }) || null;
  }

  function programIsVisible(programData, now) {
    now = now || new Date();
    var start = programData.visibleStartAt ? new Date(programData.visibleStartAt) : null;
    var end = programData.visibleEndAt ? new Date(programData.visibleEndAt) : null;
    return programData.active !== false && Array.isArray(programData.slots) && programData.slots.some(function (slot) { return !slot.disabled; }) && (!start || Number.isNaN(start.getTime()) || now >= start) && (!end || Number.isNaN(end.getTime()) || now <= end);
  }

  function programOperatesOn(programData, key, weekday) {
    return (!programData.saleStartDate || key >= programData.saleStartDate) && (!programData.saleEndDate || key <= programData.saleEndDate) && (programData.saleDays || [6, 0]).includes(weekday);
  }

  function formatBookingDate(date) {
    return date.getFullYear() + "." + String(date.getMonth() + 1).padStart(2, "0") + "." + String(date.getDate()).padStart(2, "0") + " (" + weekdayNames[date.getDay()] + ")";
  }

  function formatTime(date, includeSeconds) {
    var time = String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
    return includeSeconds ? time + ":" + String(date.getSeconds()).padStart(2, "0") : time;
  }

  function formatPaymentDate(value) {
    if (!value) return "결제 정보 준비 중";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "결제 정보 준비 중";
    return date.getFullYear() + "." + String(date.getMonth() + 1).padStart(2, "0") + "." + String(date.getDate()).padStart(2, "0") + " " + formatTime(date, false);
  }

  function formatTicketGroupDate(value) {
    if (!value) return "결제일 확인 중";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "결제일 확인 중";
    return formatBookingDate(date);
  }

  function paymentMethodLabel(method) {
    return method === "demo-card" || method === "card" || !method ? "신용카드" : method;
  }

  function ticketPaymentStatus(reservation) {
    if (reservation.status === "cancelled" || reservation.qty === 0) return "취소완료";
    return Array.isArray(reservation.cancellationHistory) && reservation.cancellationHistory.length ? "부분환불 완료" : "결제완료";
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
    var arrivalLeadMinutes = Number.isInteger(reservation.arrivalLeadMinutes) && reservation.arrivalLeadMinutes >= 0 ? reservation.arrivalLeadMinutes : 20;
    var entryOpen = new Date(sessionStart.getTime() - arrivalLeadMinutes * 60 * 1000);
    var entryClose = ticketSessionEnd(reservation, sessionStart);
    var accessState = reservation.forceActive ? "active" : now < entryOpen ? "upcoming" : now <= entryClose ? "active" : "ended";
    var arrivalGuidance = arrivalLeadMinutes === 0 ? "예약 시간까지 방문하셔서 입장을 대기해주세요." : arrivalLeadMinutes + "분 전까지 방문하셔서 입장을 대기해주세요.";
    var status = {
      upcoming: { label: "입장 대기", title: "입장 가능 시간이 아닙니다.", detail: arrivalGuidance, live: "입장 시간에 자동으로 활성화됩니다." },
      active: { label: "입장 가능", title: "지금 입장할 수 있습니다.", detail: arrivalGuidance, live: "활성화된 티켓입니다. 입장 시 보여주세요." },
      ended: { label: "입장 종료", title: "입장 시간이 지났습니다.", detail: formatTime(sessionStart, false) + " 회차 입장이 마감되었습니다.", live: "사용할 수 없는 티켓입니다." }
    }[accessState];

    return { sessionStart: sessionStart, entryOpen: entryOpen, entryClose: entryClose, arrivalLeadMinutes: arrivalLeadMinutes, accessState: accessState, status: status };
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
    byId("ticket-window-note").textContent = "입장 가능 시간은 회차 시작 " + timing.arrivalLeadMinutes + "분 전부터 회차 종료 전까지입니다. 시간과 티켓 상태는 자동으로 갱신됩니다.";
    byId("ticket-name").textContent = ticketReservation.name;
    byId("ticket-admission-title").textContent = ticketReservation.name + " 입장권";
    byId("ticket-date").textContent = ticketReservation.date;
    byId("ticket-time").textContent = ticketReservation.time;
    byId("ticket-people").textContent = ticketReservation.qty + "명";
    byId("ticket-admission-count").textContent = "총 " + ticketReservation.qty + "명";
    byId("ticket-reservation-number").textContent = ticketReservationNumber(ticketReservation);
    byId("ticket-order-number").textContent = ticketReservationNumber(ticketReservation);
    byId("ticket-payment-date").textContent = formatPaymentDate(ticketReservation.createdAt);
    byId("ticket-payment-method").textContent = paymentMethodLabel(ticketReservation.paymentMethod);
    byId("ticket-payment-status").textContent = ticketPaymentStatus(ticketReservation);
    byId("ticket-price").textContent = money(ticketReservation.price);
    var hasDiscount = ticketDiscountQty(ticketReservation) > 0;
    byId("ticket-discount-proof").hidden = !hasDiscount;
    byId("ticket-discount-proof").setAttribute("aria-label", "할인 증빙 검토가 필요한 티켓입니다.");
    byId("ticket-discount-label").textContent = "할인 증빙 검토 필요";
    renderTicketCancellation(timing, now);
  }

  function ticketReservationNumber(reservation) {
    var value = reservation && (reservation.reservationId || reservation.id);
    if (typeof value !== "string" || !value) return "-";
    value = value.replace(/-G\d+$/, "");
    var legacyLrp = /^(LRP-\d{6}-\d{5})-\d+$/.exec(value);
    if (legacyLrp) return legacyLrp[1];
    var legacyUuid = /^((?:[^-]+-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-\d+$/i.exec(value);
    return legacyUuid ? legacyUuid[1] : value;
  }

  function ticketDiscountQty(reservation) {
    if (Number.isInteger(reservation.discountQty)) return Math.max(0, Math.min(reservation.qty, reservation.discountQty));
    return reservation.discount ? reservation.qty : 0;
  }

  function ticketCancellationDeadline(reservation) {
    var programData = programs[reservation.programKey] || programs.ride;
    var cancelMinutes = Number.isFinite(reservation.cancelMinutes) ? reservation.cancelMinutes : Number.isFinite(programData.cancelMinutes) ? programData.cancelMinutes : 10;
    return new Date(ticketSessionStart(reservation).getTime() - cancelMinutes * 60000);
  }

  function formatCancellationDeadline(date) {
    return date.getFullYear() + "." + String(date.getMonth() + 1).padStart(2, "0") + "." + String(date.getDate()).padStart(2, "0") + " " + formatTime(date, false);
  }

  function ticketCanCancel(reservation, timing, now) {
    return timing.accessState === "upcoming" && now < ticketCancellationDeadline(reservation) && reservation.qty > 0;
  }

  function ticketPaidAmounts(reservation) {
    if (Array.isArray(reservation.unitAmounts) && reservation.unitAmounts.length === reservation.qty) return reservation.unitAmounts.slice();
    var discountQty = ticketDiscountQty(reservation);
    var programData = programs[reservation.programKey] || programs.ride;
    var rate = programData.discountPolicy ? programData.discountPolicy.rate : 0;
    var weights = Array.from({ length: reservation.qty }, function (_, index) { return index < discountQty ? 1 - rate : 1; });
    var weightTotal = weights.reduce(function (sum, weight) { return sum + weight; }, 0);
    var amounts = weights.map(function (weight) { return Math.floor(reservation.price * weight / weightTotal); });
    var remainder = reservation.price - amounts.reduce(function (sum, amount) { return sum + amount; }, 0);
    for (var index = 0; index < remainder; index += 1) amounts[index % amounts.length] += 1;
    return amounts;
  }

  function renderTicketCancelOptions() {
    var wrap = byId("ticket-cancel-options"); wrap.replaceChildren();
    var discountQty = ticketDiscountQty(ticketReservation);
    var paidAmounts = ticketPaidAmounts(ticketReservation);
    for (var index = 0; index < ticketReservation.qty; index += 1) {
      var discounted = index < discountQty;
      var label = document.createElement("label"); label.className = "ticket-cancel-option";
      label.innerHTML = '<input type="checkbox" data-index="' + index + '" data-discounted="' + discounted + '" data-amount="' + paidAmounts[index] + '"><span><strong>' + (index + 1) + '번째 입장권</strong><small>' + (discounted ? (ticketReservation.discountLabel || "할인 적용") : "정상가") + ' · ' + money(paidAmounts[index]) + '</small></span>';
      label.querySelector("input").addEventListener("change", updateTicketCancelSelection);
      wrap.append(label);
    }
    updateTicketCancelSelection();
  }

  function updateTicketCancelSelection() {
    var selected = Array.from(document.querySelectorAll("#ticket-cancel-options input:checked"));
    var refund = selected.reduce(function (sum, input) { return sum + Number(input.dataset.amount); }, 0);
    byId("ticket-cancel-count").textContent = selected.length + "명";
    byId("ticket-refund-preview").textContent = money(refund);
    byId("confirm-ticket-cancel").disabled = !selected.length;
  }

  function renderTicketRefundHistory() {
    var history = Array.isArray(ticketReservation.cancellationHistory) ? ticketReservation.cancellationHistory : [];
    var cancelledQty = history.reduce(function (sum, item) { return sum + Number(item.qty || 0); }, 0);
    var refundedAmount = history.reduce(function (sum, item) { return sum + Number(item.amount || 0); }, 0);
    var originalQty = Number(ticketReservation.qty || 0) + cancelledQty;
    var originalPrice = Number(ticketReservation.price || 0) + refundedAmount;
    byId("ticket-refund-history").hidden = !history.length;
    byId("ticket-confirmation-message").textContent = history.length ? originalQty + "명 중 " + cancelledQty + "명 취소 · " + ticketReservation.qty + "명 이용 가능" : "예약이 확정되었습니다.";
    byId("ticket-refund-summary-text").textContent = history.length ? "총 " + originalQty + "명 중 " + cancelledQty + "명의 취소를 접수했어요." : "";
    byId("ticket-original-price").textContent = money(originalPrice);
    byId("ticket-refunded-price").textContent = "−" + money(refundedAmount);
    byId("ticket-remaining-price").textContent = money(ticketReservation.price);
    byId("ticket-refund-history-list").innerHTML = history.map(function (item) {
      var detail = [item.regularQty ? "정상가 " + item.regularQty + "명" : "", item.discountQty ? (item.discountLabel || "할인 적용") + " " + item.discountQty + "명" : ""].filter(Boolean).join(" · ");
      var requestedAt = new Date(item.createdAt).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      return '<article><span><strong>' + item.qty + '명 취소 완료</strong><small>' + escapeHtml(detail) + '</small><small>처리 ' + escapeHtml(requestedAt) + '</small></span><div><em>환불 완료</em><b>−' + money(item.amount) + '</b></div></article>';
    }).join("");
  }

  function renderTicketCancellation(timing, now) {
    var canCancel = ticketCanCancel(ticketReservation, timing, now);
    var deadline = ticketCancellationDeadline(ticketReservation);
    byId("open-ticket-cancel").disabled = !canCancel;
    byId("ticket-cancel-deadline").textContent = canCancel ? formatCancellationDeadline(deadline) + "까지 취소할 수 있어요." : timing.accessState !== "upcoming" ? "입장 대기 상태에서만 취소할 수 있어요." : "관리자가 설정한 취소 가능 시간이 지났어요.";
    if (!canCancel) byId("ticket-cancel-panel").hidden = true;
    renderTicketRefundHistory();
  }

  function isWeekend(date) {
    return date.getDay() === 0 || date.getDay() === 6;
  }

  var state = { date: "", dateKey: "", time: "", qty: 1, discount: false, discountQty: 0, discountPolicyId: "", guidanceConfirmed: false, programKey: initialProgramKey, paymentMethod: "card", step: 0 };
  var byId = function (id) { return document.getElementById(id); };
  var money = function (value) { return new Intl.NumberFormat("ko-KR").format(value) + "원"; };
  var currentName = function () { return program.name; };
  var currentPrice = function () { return program.price; };
  function guidanceItemsToText(items) {
    return (Array.isArray(items) ? items : []).map(function (item) {
      var title = String(item && item.title || "").trim();
      var content = String(item && item.content || "").trim();
      return [title ? "[" + title + "]" : "", content].filter(Boolean).join(" ");
    }).filter(Boolean).join("\n");
  }
  var selectedDiscountPolicy = function () {
    var policies = Array.isArray(program.discountPolicies) ? program.discountPolicies : program.discountPolicy ? [program.discountPolicy] : [];
    return policies.find(function (policy) { return policy.id === state.discountPolicyId && (!state.dateKey || ((!policy.startDate || state.dateKey >= policy.startDate) && (!policy.endDate || state.dateKey <= policy.endDate))); }) || null;
  };
  var amount = function () {
    var policy = selectedDiscountPolicy();
    if (!policy) return currentPrice() * state.qty;
    var perPersonDiscount = policy.type === "fixed" ? Number(policy.value || 0) : Math.round(currentPrice() * Number(policy.rate || 0));
    return Math.max(0, currentPrice() * state.qty - perPersonDiscount * selectedDiscountQty());
  };

  function selectedDiscountQty() {
    var policy = selectedDiscountPolicy();
    return policy ? state.qty : 0;
  }

  function bookingSelectionError() {
    if (!state.dateKey) return "이용 날짜를 먼저 선택해주세요.";
    if (!state.time) return "이용 시간을 먼저 선택해주세요.";
    if (typeof program !== "undefined" && String(program.guidanceText || "").trim() && !state.guidanceConfirmed) return "이용 전 확인사항을 확인해주세요.";
    return "";
  }

  function setExplainedButtonState(button, blocked, reason) {
    button.disabled = false;
    button.setAttribute("aria-disabled", String(!!blocked));
    button.title = blocked ? reason : "";
  }

  function syncQuantityWithDiscount() {
    var maxQty = selectedMaxQty();
    state.qty = Math.max(1, Math.min(state.qty, maxQty));
    state.discountQty = selectedDiscountQty();
  }

  function remainingDiscountQty(policy) {
    var maxQty = Number(policy && (policy.maxQtyPerDate || policy.maxQty));
    if (!Number.isFinite(maxQty)) return Infinity;
    if (!currentMember || !state.dateKey) return maxQty;
    var store = readStore();
    if (!store) return 0;
    var used = BookingRules.ticketRecords(store.reservations).concat(ownCart(store)).reduce(function (sum, item) {
      if (!item || item.memberId !== currentMember.id || !item.discount || !BookingRules.isActive(item) || item.dateKey !== state.dateKey) return sum;
      var itemProgram = programs[item.programKey];
      var policies = itemProgram && (Array.isArray(itemProgram.discountPolicies) ? itemProgram.discountPolicies : itemProgram.discountPolicy ? [itemProgram.discountPolicy] : []);
      var itemPolicy = policies && policies.find(function (candidate) { return !item.discountPolicyId || candidate.id === item.discountPolicyId; });
      if (!itemPolicy || itemPolicy.id !== policy.id) return sum;
      return sum + (Number.isInteger(item.discountQty) ? item.discountQty : Number(item.qty || 0));
    }, 0);
    return Math.max(0, maxQty - used);
  }
  var reservationStorageKey = "ponylandBookingStoreV3";
  var demoCancellationStorageKey = "ponylandDemoTicketCancellationsV2";
  try {
    window.localStorage.removeItem("ponylandBookingStoreV2");
    window.localStorage.removeItem("letsrunPlayAdminDemoV3");
    window.sessionStorage.removeItem("ponylandDemoTicketCancellationsV1");
  } catch (error) { /* Storage cleanup is best-effort in restricted browsers. */ }
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
    return currentMember && store ? BookingRules.ticketRecords(store.reservations).filter(function (item) {
      return item && item.memberId === currentMember.id && item.status !== "cancelled" && item.status !== "canceled" && item.qty !== 0;
    }) : [];
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

  function readDemoCancellations() {
    try { return JSON.parse(window.sessionStorage.getItem(demoCancellationStorageKey) || "{}"); }
    catch (error) { return {}; }
  }

  function saveDemoCancellation(reservation) {
    try { var saved = readDemoCancellations(); saved[reservation.id] = reservation; window.sessionStorage.setItem(demoCancellationStorageKey, JSON.stringify(saved)); }
    catch (error) { notify("티켓 취소 내역을 저장하지 못했습니다."); }
  }

  function applyPartialTicketCancellation() {
    var selected = Array.from(document.querySelectorAll("#ticket-cancel-options input:checked"));
    if (!selected.length || !ticketReservation) return;
    var cancellationNow = new Date();
    if (!ticketCanCancel(ticketReservation, ticketTiming(ticketReservation, cancellationNow), cancellationNow)) {
      byId("ticket-cancel-panel").hidden = true;
      updateTicketAccess();
      notify("취소 가능 시간이 지나 처리할 수 없습니다.");
      return;
    }
    var discountedCancelled = selected.filter(function (input) { return input.dataset.discounted === "true"; }).length;
    var regularCancelled = selected.length - discountedCancelled;
    var refundAmount = selected.reduce(function (sum, input) { return sum + Number(input.dataset.amount); }, 0);
    var paidAmounts = ticketPaidAmounts(ticketReservation);
    var cancelledIndexes = selected.map(function (input) { return Number(input.dataset.index); });
    var currentTicketIds = Array.isArray(ticketReservation.ticketIds) ? ticketReservation.ticketIds.slice() : Array.from({ length: ticketReservation.qty }, function (_, index) { return ticketReservation.id + "-T" + String(index + 1).padStart(2, "0"); });
    var currentDiscountFlags = Array.from({ length: ticketReservation.qty }, function (_, index) { return index < ticketDiscountQty(ticketReservation); });
    var originalTicketIds = (ticketReservation.originalTicketIds || currentTicketIds).slice();
    var originalUnitAmounts = (ticketReservation.originalUnitAmounts || paidAmounts).slice();
    var originalDiscountFlags = (ticketReservation.originalDiscountFlags || currentDiscountFlags).slice();
    var adminTicketStatuses = (ticketReservation.adminTicketStatuses || originalTicketIds.map(function () { return "confirmed"; })).slice();
    cancelledIndexes.forEach(function (index) {
      var originalIndex = originalTicketIds.indexOf(currentTicketIds[index]);
      if (originalIndex >= 0) adminTicketStatuses[originalIndex] = "cancelled";
    });
    var remainingUnitAmounts = paidAmounts.filter(function (_, index) { return !cancelledIndexes.includes(index); });
    var remainingTicketIds = currentTicketIds.filter(function (_, index) { return !cancelledIndexes.includes(index); });
    var historyItem = { source: "customer", reason: "고객 직접 취소", createdAt: new Date().toISOString(), qty: selected.length, discountQty: discountedCancelled, discountLabel: ticketReservation.discountLabel || "", regularQty: regularCancelled, amount: refundAmount, status: "cancelled" };
    var updated = Object.assign({}, ticketReservation, {
      qty: ticketReservation.qty - selected.length,
      price: Math.max(0, ticketReservation.price - refundAmount),
      discountQty: Math.max(0, ticketDiscountQty(ticketReservation) - discountedCancelled),
      unitAmounts: remainingUnitAmounts,
      ticketIds: remainingTicketIds,
      originalPrice: Number.isFinite(ticketReservation.originalPrice) ? ticketReservation.originalPrice : ticketReservation.price,
      originalTicketIds: originalTicketIds,
      originalUnitAmounts: originalUnitAmounts,
      originalDiscountFlags: originalDiscountFlags,
      adminTicketStatuses: adminTicketStatuses,
      cancellationHistory: (ticketReservation.cancellationHistory || []).concat(historyItem)
    });
    updated.discount = updated.discountQty > 0;
    if (updated.qty === 0) updated.status = "cancelled";

    var store = readStore();
    var storedReservation = store && store.reservations.find(function (item) {
      return item.id === ticketReservation.reservationId && Array.isArray(item.tickets);
    });
    var storedTicketIndex = storedReservation && storedReservation.tickets.findIndex(function (item) { return item.id === ticketReservation.id; });
    var legacyIndex = store && store.reservations.findIndex(function (item) { return item.id === ticketReservation.id; });
    if (storedReservation && storedTicketIndex >= 0) {
      storedReservation.tickets[storedTicketIndex] = updated;
      storedReservation.total = storedReservation.tickets.reduce(function (sum, item) { return sum + Number(item.price || 0); }, 0);
      storedReservation.status = storedReservation.tickets.every(function (item) { return item.status === "cancelled" || item.qty === 0; }) ? "cancelled" : "confirmed";
      store.revision += 1;
      if (!writeStore(store)) return;
    } else if (store && legacyIndex >= 0) {
      store.reservations[legacyIndex] = updated; store.revision += 1;
      if (!writeStore(store)) return;
    } else saveDemoCancellation(updated);

    ticketReservation = updated;
    byId("ticket-cancel-panel").hidden = true;
    notify(selected.length + "명 취소가 완료되었습니다. 카드사 반영까지 영업일 기준 5~7일이 걸릴 수 있습니다.");
    if (!updated.qty) { showMyTickets(); return; }
    updateTicketAccess(); renderTicketList();
  }

  function withStoreLock(action) {
    // Serialize read/validate/write across same-origin tabs when Web Locks are available.
    if (navigator.locks) return navigator.locks.request(reservationStorageKey, action);
    return Promise.resolve().then(action);
  }

  function newId(prefix) {
    return prefix + "-" + (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2));
  }

  var orderSeqStorageKey = "letsrunPlayOrderSeqV1";
  // LRP-YYMMDD-NNNNN: 결제일 기준 날짜별 5자리 순번. 짧고 사람이 읽기 쉬우며, 날짜+순번 조합으로 중복이 나지 않는다.
  function nextOrderId(now) {
    var day = dateKey(now).slice(2).replace(/-/g, "");
    var seqState = null;
    try { seqState = JSON.parse(localStorage.getItem(orderSeqStorageKey) || "null"); } catch (error) { seqState = null; }
    var seq = (seqState && seqState.day === day ? seqState.seq : 0) + 1;
    try { localStorage.setItem(orderSeqStorageKey, JSON.stringify({ day: day, seq: seq })); } catch (error) {}
    return "LRP-" + day + "-" + String(seq).padStart(5, "0");
  }

  function ownCart(store) {
    if (!currentMember || !store) return [];
    var items = store.carts[currentMember.id] || [];
    var unitItems = items.reduce(function (result, item) {
      if (!item || !Number.isInteger(item.qty) || item.qty <= 1) { result.push(item); return result; }
      var discountedQty = item.discount ? Math.min(item.qty, Number.isInteger(item.discountQty) ? item.discountQty : item.qty) : 0;
      for (var index = 0; index < item.qty; index += 1) {
        var discounted = index < discountedQty;
        result.push(Object.assign({}, item, {
          id: item.id + "-P" + String(index + 1).padStart(2, "0"),
          qty: 1,
          discount: discounted,
          discountQty: discounted ? 1 : 0,
          price: Array.isArray(item.unitAmounts) && Number.isFinite(item.unitAmounts[index]) ? item.unitAmounts[index] : Math.round(Number(item.price || 0) / item.qty)
        }));
      }
      return result;
    }, []);
    store.carts[currentMember.id] = unitItems;
    return unitItems;
  }

  function makeCartItem() {
    return {
      id: newId("CART"), memberId: currentMember.id,
      programKey: program.key,
      region: program.region,
      department: program.department,
      name: currentName(),
      dateKey: state.dateKey,
      date: state.date,
      time: state.time,
      qty: state.qty,
      price: amount(),
      discount: state.discount,
      discountQty: selectedDiscountQty(),
      discountPolicyId: state.discountPolicyId
    };
  }

  async function addToCart(continueToCheckout) {
    var selectionError = bookingSelectionError();
    if (selectionError) { notify(selectionError); return; }
    if (!currentMember) { openLoginDialog(continueToCheckout ? "reserve" : "add"); return; }
    var item = makeCartItem();
    var added = false;
    var continueInCart = false;
    var reviewExistingCart = false;
    var cartLimitMessage = "";
    try { await withStoreLock(function () {
      if (!currentMember || currentMember.id !== item.memberId) return;
      var store = readStore(); if (!store) return;
      var cart = ownCart(store);
      reviewExistingCart = continueToCheckout && cart.length > 0;
      // Cart rows are person tickets: selecting N people creates N independent
      // one-person cards, including when the product/date/session are identical.
      var unitItems = Array.from({ length: item.qty }, function (_, index) {
        return Object.assign({}, item, {
          id: item.id + "-P" + String(index + 1).padStart(2, "0"),
          qty: 1,
          discountQty: item.discount ? 1 : 0
        });
      });
      var nextCart = cart.concat(unitItems);
      var error = BookingRules.validationError(nextCart, store.reservations, currentMember.id, programs, new Date());
      if (error) {
        if (continueToCheckout && cart.length && error.indexOf("같은 프로그램은 이용일 기준 계정당 최대") !== -1) {
          continueInCart = true;
          cartLimitMessage = "선택한 " + item.name + " " + item.qty + "명은 구매 한도를 초과해 장바구니에 담기지 않았습니다. 기존 상품 확인 후 결제해주세요.";
          return;
        }
        notify(error); return;
      }
      store.carts[currentMember.id] = nextCart.map(function (entry) { return BookingRules.quoteItem(entry, programs); });
      store.revision += 1;
      added = writeStore(store);
    }); } catch (error) { notify("장바구니에 담지 못했습니다. 다시 시도해주세요."); }
    if (added && !continueToCheckout) {
      state.qty = 1; state.discount = false; state.discountQty = 0; state.discountPolicyId = "";
      renderDiscountOptions();
    }
    renderSlots(); update(); renderCart();
    if (continueInCart) {
      goToStep(4);
      byId("cart-page-error").textContent = cartLimitMessage;
      byId("cart-page-error").hidden = false;
      notify(cartLimitMessage);
      return;
    }
    if (added) {
      if (continueToCheckout && reviewExistingCart) {
        goToStep(4);
        notify("기존 장바구니 상품과 함께 확인해주세요.");
      } else if (continueToCheckout) startCheckout();
      else notify("장바구니에 담았습니다.");
    }
  }

  async function changeCartItem(id) {
    if (!currentMember) return;
    var memberId = currentMember.id;
    await withStoreLock(function () {
      if (!currentMember || memberId !== currentMember.id) return;
      var store = readStore(); if (!store) return;
      var cart = ownCart(store), item = cart.find(function (entry) { return entry.id === id; });
      if (!item) return;
      cart = cart.filter(function (entry) { return entry.id !== id; });
      store.carts[memberId] = cart; store.revision += 1;
      if (writeStore(store)) { checkoutSnapshot = state.step === 2 ? JSON.stringify(cart) : ""; byId("terms").checked = false; }
    });
    renderSlots(); update(); renderCart();
  }

  function renderBookingItems(container, items, editable) {
    container.replaceChildren();
    var displayItems = editable ? items : Array.from(items.reduce(function (groups, item) {
      var key = [item.programKey, item.experience || "", item.dateKey || item.date, item.time, item.discountPolicyId || "", item.discount ? "discount" : "regular"].join("|");
      var grouped = groups.get(key);
      if (!grouped) {
        groups.set(key, Object.assign({}, item));
      } else {
        grouped.qty += item.qty;
        grouped.price += item.price;
        grouped.discountQty = (grouped.discountQty || 0) + (item.discountQty || 0);
      }
      return groups;
    }, new Map()).values());
    displayItems.forEach(function (item) {
      var card = document.createElement("article"); card.className = "cart-item";
      var thumbnail = document.createElement("img"); thumbnail.className = "cart-item__image";
      var itemProgram = programs[item.programKey] || programs.ride;
      var itemProduct = itemProgram.experiences && itemProgram.experiences[item.experience];
      thumbnail.src = itemProduct ? itemProduct.image : itemProgram.image;
      thumbnail.alt = "";
      var body = document.createElement("div"); body.className = "cart-item__body";
      body.append(createTextElement("strong", "", item.name));
      body.append(createTextElement("p", "", item.date + " · " + item.time));
      body.append(createTextElement("small", "", item.qty + "명" + (item.discount ? " · " + (item.discountLabel || "할인 적용") : "")));
      var meta = document.createElement("div"); meta.className = "cart-item__meta";
      meta.append(createTextElement("strong", "cart-item__price", money(item.price)));
      if (editable) {
        var deleteButton = createTextElement("button", "", "삭제"); deleteButton.type = "button";
        deleteButton.setAttribute("aria-label", item.name + " " + item.dateKey + " " + item.time + " 1명 삭제");
        deleteButton.addEventListener("click", function () { changeCartItem(item.id); });
        meta.append(deleteButton);
      }
      card.append(thumbnail, body, meta);
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
    byId("header-logout").hidden = !currentMember;
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
    var checkoutTotal = byId("checkout-total");
    if (checkoutTotal) checkoutTotal.textContent = money(total);
    var error = store && cart.length ? BookingRules.validationError(cart, store.reservations, currentMember.id, programs, new Date()) : "";
    byId("cart-error").textContent = error;
    byId("cart-error").hidden = !error;
    byId("cart-page-error").textContent = error;
    byId("cart-page-error").hidden = !error;
    byId("to-checkout").disabled = !cart.length || !store || !!error;
    byId("complete-payment").disabled = isPaying || !cart.length || !!error;
    var cartedProgramKeys = cart.map(function (item) { return item.programKey; });
    var addLinks = document.querySelectorAll("#cart-program-links [data-program-key]");
    var addProgramsLabel = document.querySelector("#cart-program-links > span");
    if (addProgramsLabel) addProgramsLabel.textContent = cart.length ? "다른 체험 추가" : "체험 둘러보기";
    addLinks.forEach(function (link) {
      var key = link.getAttribute("data-program-key");
      link.hidden = cartedProgramKeys.includes(key) || !programs[key] || !programIsVisible(programs[key]);
    });
    byId("cart-program-links").hidden = Array.from(addLinks).every(function (link) { return link.hidden; });
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
        var order = BookingRules.buildOrder(store, memberId, programs, new Date(), nextOrderId(new Date()));
        // One storage write commits one reservation containing all session tickets.
        if (!writeStore(order.store)) return;
        completedOrder = order; ticketReservation = null;
        renderBookingItems(byId("complete-items"), order.tickets, false);
        byId("complete-order-id").textContent = order.reservationId;
        byId("complete-total").textContent = money(order.total);
        byId("complete-count").textContent = "예약 1건에 " + order.tickets.length + "개 티켓이 발급되었어요.";
        goToStep(3); notify("결제가 완료되었습니다.");
      });
    } catch (error) {
      if (error && error.code === "SESSION_TAKEN") { window.location.href = "payment-failed.html?product=" + encodeURIComponent(program.key); return; }
      notify(error.message || "결제 처리 중 문제가 생겼습니다. 다시 시도해주세요.");
    } finally { isPaying = false; renderSlots(); update(); renderCart(); }
  }

  function createTextElement(tagName, className, textContent) {
    var element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = textContent;
    return element;
  }

  function ticketReservationId(paymentDate, sequence) {
    return "LRP-" + dateKey(paymentDate).slice(2).replace(/-/g, "") + "-" + String(90000 + sequence).padStart(5, "0");
  }

  function slotDateTime(date, timeText) {
    var parts = timeText.split(":");
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Number(parts[0]), Number(parts[1]), 0, 0);
  }

  function activeSlotForNow(now) {
    var slots = programs.ride.slots.filter(function (slot) { return !slot.disabled; });
    var arrivalLeadMinutes = Number.isInteger(programs.ride.arrivalLeadMinutes) ? programs.ride.arrivalLeadMinutes : 20;
    var activeSlot = slots.find(function (slot) {
      var range = slot.time.split("~");
      var start = slotDateTime(now, range[0]);
      var end = slotDateTime(now, range[1]);
      return now >= new Date(start.getTime() - arrivalLeadMinutes * 60 * 1000) && now <= end;
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
    var samplePaidDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    var samplePaidAt = samplePaidDate.toISOString();
    var active = activeSlotForNow(now);
    var upcomingDate = new Date(now);
    upcomingDate.setHours(0, 0, 0, 0);
    var secondSlot = programs.play.slots[5].time;
    var endedSlot = programs.ride.slots[2].time;
    var playArrivalLeadMinutes = Number.isInteger(programs.play.arrivalLeadMinutes) ? programs.play.arrivalLeadMinutes : 20;
    // Keep the next reservation in the waiting state, including on weekend afternoons.
    while (!isWeekend(upcomingDate) || now >= new Date(slotDateTime(upcomingDate, secondSlot.split("~")[0]).getTime() - playArrivalLeadMinutes * 60 * 1000)) {
      upcomingDate.setDate(upcomingDate.getDate() + 1);
    }
    var endedDate = new Date(now);
    endedDate.setDate(endedDate.getDate() - 1);
    while (!isWeekend(endedDate)) endedDate.setDate(endedDate.getDate() - 1);
    var groupedReservationId = ticketReservationId(samplePaidDate, 1);
    var defaults = [
      { id: groupedReservationId + "-G01", reservationId: groupedReservationId, programKey: "ride", name: "포니 타기", dateKey: dateKey(upcomingDate), date: formatBookingDate(upcomingDate), time: active.slot.time, qty: 2, price: 5000, discount: true, discountQty: 2, discountPolicyId: "gwacheon", discountLabel: "과천시민 50% 할인", arrivalLeadMinutes: programs.ride.arrivalLeadMinutes, forceActive: true, paymentMethod: "demo-card", createdAt: samplePaidAt },
      { id: groupedReservationId + "-G02", reservationId: groupedReservationId, programKey: "play", name: "포니랑 놀기", dateKey: dateKey(upcomingDate), date: formatBookingDate(upcomingDate), time: secondSlot, qty: 2, price: 8000, discount: false, discountQty: 0, arrivalLeadMinutes: programs.play.arrivalLeadMinutes, paymentMethod: "demo-card", createdAt: samplePaidAt },
      { id: ticketReservationId(samplePaidDate, 2) + "-G01", reservationId: ticketReservationId(samplePaidDate, 2), programKey: "ride", name: "포니 타기", dateKey: dateKey(endedDate), date: formatBookingDate(endedDate), time: endedSlot, qty: 2, price: 10000, discount: false, arrivalLeadMinutes: programs.ride.arrivalLeadMinutes, paymentMethod: "demo-card", createdAt: samplePaidAt }
    ];
    var savedCancellations = readDemoCancellations();
    return defaults.map(function (reservation) { return savedCancellations[reservation.id] || reservation; }).filter(function (reservation) { return reservation.qty > 0; });
  }

  function exampleTicketsNeedRefresh(records) {
    if (!records.length || !records.every(function (item) { return item.isExample; })) return false;
    if (!ticketListGroups(records).some(function (group) { return group.tickets.length > 1; })) return true;
    var byUsageDate = new Map();
    records.forEach(function (item) {
      var totals = byUsageDate.get(item.dateKey) || { qty: 0, discountQty: 0 };
      totals.qty += Number(item.qty) || 0;
      totals.discountQty += ticketDiscountQty(item);
      byUsageDate.set(item.dateKey, totals);
    });
    return Array.from(byUsageDate.values()).some(function (totals) {
      return totals.qty > 4 || totals.discountQty > 2;
    });
  }

  function persistDefaultTicketReservations(tickets) {
    if (!currentMember || !tickets.length) return tickets;
    var store = readStore();
    if (!store) return tickets;
    var memberRecords = BookingRules.ticketRecords(store.reservations).filter(function (item) { return item && item.memberId === currentMember.id; });
    if (memberRecords.length) {
      var activeMemberRecords = memberRecords.filter(function (item) {
        return item.status !== "cancelled" && item.status !== "canceled" && item.qty !== 0;
      });
      var shouldRefreshExamples = exampleTicketsNeedRefresh(activeMemberRecords);
      if (!shouldRefreshExamples) return activeMemberRecords;
      store.reservations = store.reservations.filter(function (reservation) {
        return !(reservation && reservation.isExample && reservation.memberId === currentMember.id);
      });
    }
    var parentsById = new Map();
    tickets.forEach(function (ticket) {
      var parent = parentsById.get(ticket.reservationId);
      if (!parent) {
        parent = {
          id: ticket.reservationId,
          memberId: currentMember.id,
          paymentId: "DEMO-PAY-" + ticket.reservationId,
          paymentMethod: "demo-card",
          createdAt: ticket.createdAt,
          status: "confirmed",
          total: 0,
          isExample: true,
          tickets: [],
          personSequence: 0
        };
        parentsById.set(ticket.reservationId, parent);
      }
      var discountQty = Number.isInteger(ticket.discountQty) ? ticket.discountQty : ticket.discount ? ticket.qty : 0;
      var regularAmount = (programs[ticket.programKey] || programs.ride).price;
      var discountAmount = discountQty ? Math.round((ticket.price - regularAmount * (ticket.qty - discountQty)) / discountQty) : regularAmount;
      var unitAmounts = Array.from({ length: ticket.qty }, function (_, index) { return index < discountQty ? discountAmount : regularAmount; });
      var ticketIds = Array.from({ length: ticket.qty }, function () {
        parent.personSequence += 1;
        return ticket.reservationId + "-T" + String(parent.personSequence).padStart(2, "0");
      });
      var savedTicket = Object.assign({}, ticket, {
        memberId: currentMember.id,
        isExample: true,
        status: "confirmed",
        ticketIds: ticketIds,
        unitAmounts: unitAmounts
      });
      parent.total += ticket.price;
      parent.tickets.push(savedTicket);
    });
    var parents = Array.from(parentsById.values()).map(function (parent) {
      delete parent.personSequence;
      return parent;
    });
    store.reservations = parents.concat(store.reservations);
    store.revision += 1;
    return writeStore(store) ? BookingRules.ticketRecords(parents) : tickets;
  }

  function ticketListReservations(now) {
    now = now || new Date();
    var reservations = readReservations();
    // Persist the first demo tickets in the same reservation store the admin reads,
    // so both screens always show the exact same reservation number.
    var needsExampleRefresh = exampleTicketsNeedRefresh(reservations);
    var visibleReservations = !reservations.length || needsExampleRefresh ? persistDefaultTicketReservations(defaultTicketReservations(now)) : reservations;
    var stateOrder = { upcoming: 0, active: 1, ended: 2 };
    return visibleReservations.sort(function (first, second) {
      return stateOrder[ticketTiming(first, now).accessState] - stateOrder[ticketTiming(second, now).accessState];
    });
  }

  function ticketListGroups(reservations) {
    var now = new Date();
    var stateOrder = { active: 0, upcoming: 1, ended: 2 };
    var groups = [];
    var byReservationId = new Map();
    reservations.forEach(function (reservation) {
      var groupId = reservation.reservationId || ticketReservationNumber(reservation);
      var group = byReservationId.get(groupId);
      if (!group) {
        group = { id: groupId, tickets: [], date: reservation.date || formatTicketGroupDate(reservation.createdAt), total: 0 };
        byReservationId.set(groupId, group);
        groups.push(group);
      }
      group.tickets.push(reservation);
      group.total += Number(reservation.price) || 0;
      if ((!group.date || group.date === "결제일 확인 중") && reservation.date) group.date = reservation.date;
    });
    groups.forEach(function (group) {
      group.tickets.sort(function (first, second) {
        return stateOrder[ticketTiming(first, now).accessState] - stateOrder[ticketTiming(second, now).accessState];
      });
    });
    return groups;
  }

  function createTicketListCard(reservation) {
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
    body.append(createTextElement("span", "ticket-list-card__meta", reservation.qty + "명 · " + money(reservation.price)));
    card.append(image, body, createTextElement("span", "ticket-list-card__arrow", "티켓 보기 →"));
    card.addEventListener("click", function () { showTicketDetail(reservation.id); });
    return card;
  }

  function renderTicketList() {
    var list = byId("ticket-list");
    ticketReservations = ticketListReservations();
    list.replaceChildren();

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

    ticketListGroups(ticketReservations).forEach(function (group) {
      var groupCard = document.createElement("article");
      groupCard.className = "ticket-list-group";
      groupCard.setAttribute("aria-label", group.date + " 예약 티켓 " + group.tickets.length + "개");
      var header = document.createElement("header");
      header.className = "ticket-list-group__header";
      header.append(createTextElement("span", "ticket-list-group__date", group.date));
      header.append(createTextElement("strong", "ticket-list-group__total", money(group.total)));
      var items = document.createElement("div");
      items.className = "ticket-list-group__items";
      group.tickets.forEach(function (reservation) { items.append(createTicketListCard(reservation)); });
      groupCard.append(header, items);
      list.append(groupCard);
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

  function showMyTickets(options) {
    var page = window.location.pathname.split("/").pop();
    if (page !== "reservations.html" && !(options && options.history === false && page === "ticket.html")) { navigatePage("reservations.html"); return; }
    document.title = "예약 조회 | 렛츠런파크";
    document.querySelector(".reservation-steps").hidden = true;
    document.querySelectorAll("[data-booking-step]").forEach(function (section) { section.hidden = true; });
    byId("my-tickets-screen").hidden = false;
    byId("my-tickets-list-view").hidden = false;
    byId("ticket-detail-view").hidden = true;
    if (!currentMember) { byId("ticket-list").replaceChildren(); openLoginDialog("lookup"); return; }
    renderTicketList();
    if (window.DeveloperPolicy) window.DeveloperPolicy.refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showTicketDetail(reservationId) {
    var selectedReservation = ticketReservations.find(function (reservation) { return reservation.id === reservationId; });
    if (!selectedReservation && ticketReservation && ticketReservation.id === reservationId) selectedReservation = ticketReservation;
    if (!selectedReservation) { navigatePage("reservations.html", {}, true); return; }
    if (navigatePage("ticket.html", { ticket: reservationId })) return;
    document.title = "티켓 상세 | 렛츠런파크";
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
    if (!selectedSlot || selectedSlot.disabled || slotOperationException(selectedSlot) || slotRemainingCapacity(selectedSlot) < 1 || slotHasStarted(selectedSlot)) {
      state.time = "";
    }
    byId("booking-slots").innerHTML = program.slots.map(function (slot, index) {
      var remaining = slotRemainingCapacity(slot);
      var soldOut = remaining < 1;
      var operationClosed = !!slotOperationException(slot);
      var selected = slot.time === state.time;
      var className = "chip chip--slots" + (selected ? " is-selected" : "");
      var stockText = slotHasStarted(slot) ? "시작된 회차" : (index + 1) + "회차 · " + (operationClosed ? "휴장" : soldOut || slot.disabled ? "마감" : remaining + "자리");
      return '<button type="button" class="' + className + '" data-time="' + slot.time + '" aria-pressed="' + selected + '"' + (slot.disabled || operationClosed || soldOut || slotHasStarted(slot) ? ' disabled' : '') + '><strong>' + slot.time + '</strong><small>' + stockText + '</small></button>';
    }).join("");
    document.querySelectorAll("#booking-slots button:not([disabled])").forEach(function (button) {
      button.addEventListener("click", function () {
        state.time = button.getAttribute("data-time");
        syncQuantityWithDiscount();
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

  function slotRemainingCapacity(slot) {
    var capacity = Number.isInteger(slot.capacity) ? slot.capacity : 4;
    var store = readStore();
    if (!store) return 0;
    var paidSeats = BookingRules.ticketRecords(store.reservations).filter(function (item) {
      return BookingRules.isActive(item) && item.programKey === program.key && item.dateKey === state.dateKey && item.time === slot.time;
    }).reduce(function (sum, item) { return sum + (Number.isInteger(item.qty) ? item.qty : 0); }, 0);
    return Math.max(0, capacity - paidSeats);
  }

  function selectProgram(key, reset) {
    applyBookingWindowOverrides();
    var visibleKeys = Object.keys(programs).filter(function (programKey) { return programs[programKey].userBookable && programIsVisible(programs[programKey]); });
    state.programKey = visibleKeys.includes(key) ? key : visibleKeys[0] || "ride";
    program = programs[state.programKey];
    refreshBookingWindow(state.programKey);
    if (reset !== false) {
      state.date = ""; state.dateKey = ""; state.time = ""; state.qty = 1; state.discount = false; state.discountQty = 0; state.discountPolicyId = ""; state.guidanceConfirmed = false;
      calendarMonth = new Date(calendarFirstMonth);
    }
    if (typeof renderDiscountOptions === "function") renderDiscountOptions();
    byId("date-picker").open = false;
    byId("booking-program-tag").textContent = "렛츠런파크 체험";
    byId("booking-page-title").textContent = "체험 예약";
    byId("booking-page-description").textContent = "원하는 체험과 이용 일정을 선택해 예약해보세요.";
    byId("product-title").textContent = program.name;
    byId("product-subtitle").textContent = program.subtitle;
    byId("product-unit-price").textContent = money(program.price);
    byId("booking-review-image").src = program.image;
    byId("booking-review-image").alt = program.name + " 체험 현장";
    if (typeof renderProgramGuidance === "function") renderProgramGuidance();
    renderCalendar(); renderSlots(); update();
  }

  function prepareProgramGuidancePanel() {
    var picker = byId("program-picker");
    if (!picker || byId("program-guidance")) return;
    var panel = document.createElement("section");
    panel.id = "program-guidance";
    panel.className = "program-guidance";
    panel.hidden = true;
    panel.innerHTML = '<h3>이용 전 확인사항</h3><p id="program-guidance-text" class="program-guidance__text"></p><label id="program-guidance-check-wrap"><input id="program-guidance-check" type="checkbox"><span>확인하였습니다.</span></label>';
    picker.after(panel);
    byId("program-guidance-check").addEventListener("change", function (event) { state.guidanceConfirmed = event.target.checked; update(); });
  }

  function renderProgramGuidance() {
    var panel = byId("program-guidance");
    if (!panel) return;
    var text = String(program.guidanceText || "").trim();
    panel.hidden = !text;
    byId("program-guidance-text").textContent = text;
    var checkWrap = byId("program-guidance-check-wrap");
    checkWrap.hidden = !text;
    byId("program-guidance-check").checked = !!state.guidanceConfirmed;
  }

  function renderCalendar() {
    var grid = byId("calendar-grid");
    var windowNote = byId("booking-window-note");
    if (windowNote) windowNote.textContent = "오늘부터 " + (program.bookingWindow || 14) + "일 이내 운영일 예약 가능 · 휴장일 제외";
    if (calendarMonths.length && !calendarMonths.some(function (availableMonth) { return availableMonth.getTime() === calendarMonth.getTime(); })) calendarMonth = new Date(calendarFirstMonth);
    var monthIndex = calendarMonths.findIndex(function (availableMonth) { return availableMonth.getTime() === calendarMonth.getTime(); });
    var year = calendarMonth.getFullYear();
    var month = calendarMonth.getMonth();
    var firstWeekday = new Date(year, month, 1).getDay();
    var lastDate = new Date(year, month + 1, 0).getDate();
    var cells = [];
    var hasAvailableDate = false;

    byId("calendar-title").textContent = year + "년 " + (month + 1) + "월";
    byId("calendar-prev").disabled = monthIndex <= 0;
    byId("calendar-next").disabled = monthIndex < 0 || monthIndex === calendarMonths.length - 1;

    for (var empty = 0; empty < firstWeekday; empty += 1) {
      cells.push('<span class="calendar-empty" aria-hidden="true"></span>');
    }

    for (var day = 1; day <= lastDate; day += 1) {
      var date = new Date(year, month, day);
      var key = dateKey(date);
      var operationException = operationExceptionFor(key);
      var available = date >= bookingStart && date <= bookingEnd && programOperatesOn(program, key, date.getDay()) && !operationException;
      if (available) hasAvailableDate = true;
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

    grid.previousElementSibling.hidden = !hasAvailableDate;
    grid.innerHTML = hasAvailableDate ? cells.join("") : '<p class="calendar-no-dates" role="status">이용 가능한 날짜가 없습니다.</p>';
    grid.querySelectorAll("button:not([disabled])").forEach(function (button) {
      button.addEventListener("click", function () {
        var parts = button.getAttribute("data-date-key").split("-");
        var selectedDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        state.dateKey = button.getAttribute("data-date-key");
        state.date = formatBookingDate(selectedDate);
        state.time = "";
        if (!selectedDiscountPolicy()) { state.discount = false; state.discountPolicyId = ""; }
        byId("date-picker").open = false;
        byId("date-picker").querySelector("summary").focus();
        renderCalendar();
        renderSlots();
        renderDiscountOptions();
        update();
      });
    });
  }

  function changeCalendarMonth(direction) {
    var monthIndex = calendarMonths.findIndex(function (availableMonth) { return availableMonth.getTime() === calendarMonth.getTime(); });
    var nextMonth = calendarMonths[monthIndex + direction];
    if (!nextMonth) return;
    calendarMonth = new Date(nextMonth);
    renderCalendar();
  }

  function update() {
    var price = amount();
    var unitPrice = currentPrice();
    byId("booking-unit-price").textContent = "1인 " + money(unitPrice);
    byId("booking-qty").textContent = state.qty;
    byId("selected-date-label").textContent = state.date || "날짜를 선택해주세요";
    byId("selected-option-summary").textContent = state.dateKey && state.time ? state.date + " · " + state.time + " · " + state.qty + "명" : "날짜와 시간을 선택해주세요.";
    byId("summary-price").textContent = money(price);
    var selectedPolicy = selectedDiscountPolicy();
    byId("product-discount-note").hidden = !selectedPolicy;
    if (selectedPolicy) byId("product-discount-value").textContent = selectedPolicy.label.replace(/\s*할인$/, "") + " · " + selectedDiscountQty() + "매";
    var selectionError = bookingSelectionError();
    var actionError = selectionError || (!programIsVisible(program) ? "현재 예약할 수 없는 프로그램입니다." : "");
    setExplainedButtonState(byId("add-to-cart"), !!actionError, actionError);
    setExplainedButtonState(byId("book-now"), !!actionError, actionError);
    var limitText = quantityLimitText();
    setExplainedButtonState(byId("qty-minus"), !!selectionError || state.qty <= 1, selectionError || limitText);
    setExplainedButtonState(byId("qty-plus"), !!selectionError || state.qty >= selectedMaxQty(), selectionError || limitText);
    var purchaseLimit = program.purchasePolicy && Number(program.purchasePolicy.maxQty) > 0 ? Number(program.purchasePolicy.maxQty) : 4;
    byId("booking-quantity-limit").textContent = "이용일 기준 최대 " + purchaseLimit + "매 구매 가능합니다.";
  }

  function purchaseLimitUsage() {
    var purchasePolicy = program.purchasePolicy;
    if (!purchasePolicy || !purchasePolicy.maxQty || !currentMember || !state.dateKey) return null;
    var store = readStore();
    if (!store) return null;
    function matchingQty(items) {
      return BookingRules.ticketRecords(items).filter(function (item) {
        var itemProgram = item && programs[item.programKey];
        return item && item.memberId === currentMember.id && BookingRules.isActive(item) && item.dateKey === state.dateKey && itemProgram === program;
      }).reduce(function (sum, item) { return sum + (Number.isInteger(item.qty) ? item.qty : 0); }, 0);
    }
    var cartQty = matchingQty(ownCart(store));
    var reservationQty = matchingQty(store.reservations);
    return { limit: purchasePolicy.maxQty, cartQty: cartQty, reservationQty: reservationQty, total: cartQty + reservationQty };
  }

  function quantityLimitText() {
    var selectedPolicy = selectedDiscountPolicy();
    var usage = purchaseLimitUsage();
    if (usage && usage.total > 0) {
      var source = usage.cartQty && usage.reservationQty ? "장바구니와 기존 예약에" : usage.cartQty ? "장바구니에" : "기존 예약에";
      var remaining = Math.max(0, usage.limit - usage.total);
      return source.replace(/에$/, "") + " " + usage.total + "매 · 추가 가능 " + remaining + "매";
    }
    var slot = program.slots.find(function (entry) { return entry.time === state.time; });
    var remainingCapacity = slot ? slotRemainingCapacity(slot) : 4;
    if (remainingCapacity < (program.purchasePolicy ? program.purchasePolicy.maxQty : 4)) return "선택한 회차에는 " + remainingCapacity + "자리만 남아 최대 " + remainingCapacity + "매까지 담을 수 있어요.";
    if (selectedPolicy) return "할인은 최대 " + remainingDiscountQty(selectedPolicy) + "매 적용 가능합니다.";
    var purchaseLimit = program.purchasePolicy && Number(program.purchasePolicy.maxQty) > 0 ? Number(program.purchasePolicy.maxQty) : 4;
    return "이용일 기준 최대 " + purchaseLimit + "매 구매 가능합니다.";
  }

  function selectedMaxQty() {
    var slot = program.slots.find(function (entry) { return entry.time === state.time; });
    var remainingCapacity = slot ? slotRemainingCapacity(slot) : 4;
    var policy = selectedDiscountPolicy();
    var discountLimit = policy ? remainingDiscountQty(policy) : Infinity;
    var selectableMax = Math.min(program.purchasePolicy ? program.purchasePolicy.maxQty : 4, remainingCapacity, discountLimit);
    var purchasePolicy = program.purchasePolicy;
    if (!purchasePolicy || !purchasePolicy.maxQty || !currentMember || !state.dateKey) return Math.max(1, selectableMax);
    var store = readStore();
    if (!store) return 1;
    var used = BookingRules.ticketRecords(store.reservations).concat(ownCart(store)).filter(function (item) {
      var itemProgram = item && programs[item.programKey];
      return item && item.memberId === currentMember.id && BookingRules.isActive(item) && item.dateKey === state.dateKey && itemProgram === program;
    }).reduce(function (sum, item) { return sum + (Number.isInteger(item.qty) ? item.qty : 0); }, 0);
    // Keep one selectable so a full existing cart can still route the user to checkout;
    // addToCart performs the final validation and does not add a fifth ticket.
    var remainingPurchaseLimit = Math.max(1, purchasePolicy.maxQty - used);
    return Math.max(1, Math.min(selectableMax, remainingPurchaseLimit));
  }

  function renderDiscountOptions() {
    var wrap = byId("booking-discount-options");
    var policies = Array.isArray(program.discountPolicies) ? program.discountPolicies : program.discountPolicy ? [program.discountPolicy] : [];
    policies = policies.filter(function (policy) { return !state.dateKey || ((!policy.startDate || state.dateKey >= policy.startDate) && (!policy.endDate || state.dateKey <= policy.endDate)); });
    var selectedPolicy = policies.find(function (policy) { return policy.id === state.discountPolicyId; });
    if (selectedPolicy && remainingDiscountQty(selectedPolicy) < 1) {
      state.discountPolicyId = ""; state.discount = false; state.discountQty = 0; selectedPolicy = null;
    }
    syncQuantityWithDiscount();
    wrap.innerHTML = '<label class="discount-check"><input type="radio" name="booking-discount" value="" ' + (!state.discountPolicyId ? "checked" : "") + '> 할인 미적용</label>' + policies.map(function (policy) {
      var remaining = remainingDiscountQty(policy);
      var availabilityText = remaining < 1 ? " <span>· 한도 소진</span>" : "";
      var maximum = Number(policy.maxQty) > 0 ? Number(policy.maxQty) : remaining;
      var selectedLimit = remaining < 1 ? "" : '<span class="discount-limit-badge">최대 ' + maximum + '매 적용 가능</span>';
      var noticeText = policy.noticeText ? '<small class="discount-option-notice">' + escapeHtml(policy.noticeText) + '</small>' : "";
      return '<label class="discount-check"><input type="radio" name="booking-discount" value="' + escapeHtml(policy.id) + '" ' + (state.discountPolicyId === policy.id ? "checked" : "") + (remaining < 1 ? " disabled" : "") + '><span class="discount-option-copy"><strong>' + escapeHtml(policy.label) + '</strong>' + noticeText + '</span>' + selectedLimit + availabilityText + '</label>';
    }).join("");
    wrap.querySelectorAll('input[name="booking-discount"]').forEach(function (input) {
      input.addEventListener("change", function () {
        state.discountPolicyId = input.value;
        state.discount = !!input.value;
        syncQuantityWithDiscount();
        update();
      });
    });
  }

  function navigatePage(file, params, replace) {
    var url = new URL(file, window.location.href);
    Object.keys(params || {}).forEach(function (key) { if (params[key]) url.searchParams.set(key, params[key]); });
    if (url.href === window.location.href) return false;
    window.location[replace ? "replace" : "assign"](url.href);
    return true;
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
    document.title = (step === 1 ? "체험 예약" : step === 4 ? "장바구니" : step === 2 ? "예약 내용 확인" : "예약 완료") + " | 렛츠런파크";
    if (options.history !== false) {
      var file = step === 1 ? "booking.html" : step === 4 ? "cart.html" : step === 2 ? "checkout.html" : "complete.html";
      if (navigatePage(file, step === 1 ? { product: program.key } : step === 3 ? { order: completedOrder && completedOrder.reservationId } : {}, options.replace)) return;
    }
    if (window.DeveloperPolicy) window.DeveloperPolicy.refresh();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function restoreShopRoute() {
    var route = new URLSearchParams(window.location.search);
    var page = window.location.pathname.split("/").pop();
    applyBookingWindowOverrides();
    if (page === "reservations.html" || page === "ticket.html") {
      showMyTickets({ history: false });
      if (currentMember && page === "ticket.html") showTicketDetail(route.get("ticket"));
    } else if (page === "complete.html") {
      var store = readStore();
      var reservation = store && store.reservations.find(function (item) { return item.id === route.get("order") && currentMember && item.memberId === currentMember.id; });
      if (!reservation) { navigatePage("reservations.html", {}, true); return; }
      completedOrder = { reservationId: reservation.id, tickets: reservation.tickets, total: reservation.total };
      renderBookingItems(byId("complete-items"), completedOrder.tickets, false);
      byId("complete-order-id").textContent = completedOrder.reservationId;
      byId("complete-total").textContent = money(completedOrder.total);
      byId("complete-count").textContent = "예약 1건에 " + completedOrder.tickets.length + "개 티켓이 발급되었어요.";
      goToStep(3, { history: false });
    } else if (page === "checkout.html") {
      if (!currentMember) { navigatePage("cart.html", {}, true); return; }
      var checkoutStore = readStore();
      var cart = ownCart(checkoutStore);
      var error = checkoutStore && BookingRules.validationError(cart, checkoutStore.reservations, currentMember.id, programs, new Date());
      if (!checkoutStore || error) { navigatePage("cart.html", {}, true); return; }
      checkoutSnapshot = JSON.stringify(cart);
      byId("terms").checked = false;
      renderCart(); goToStep(2, { history: false });
    } else if (page === "cart.html") {
      renderCart(); goToStep(4, { history: false });
    } else if (route.get("view")) {
      navigatePage(["complete", "tickets"].includes(route.get("view")) ? "reservations.html" : "cart.html", {}, true);
    } else if (page !== "booking.html" && route.get("product")) {
      navigatePage("booking.html", { product: route.get("product") }, true);
    } else {
      var requestedProduct = route.get("product");
      selectProgram(requestedProduct && Object.prototype.hasOwnProperty.call(programs, requestedProduct) && programs[requestedProduct].userBookable ? requestedProduct : state.programKey, false);
      goToStep(1, { history: false });
    }
  }

  function syncProgramExtras() {
    var picker = byId("program-picker");
    if (picker) {
      var bookableKeys = Object.keys(programs).filter(function (key) { return programs[key].userBookable; });
      picker.querySelectorAll("[data-program-key]").forEach(function (button) {
        if (!bookableKeys.includes(button.getAttribute("data-program-key"))) button.remove();
      });
      bookableKeys.forEach(function (key) {
        if (picker.querySelector('[data-program-key="' + key + '"]')) return;
        var button = document.createElement("button");
        button.type = "button"; button.className = "chip"; button.setAttribute("data-program-key", key);
        button.innerHTML = "<strong></strong><small></small>"; picker.append(button);
      });
      picker.querySelectorAll("[data-program-key]").forEach(function (button) {
        var key = button.getAttribute("data-program-key");
        var selected = key === state.programKey;
        button.hidden = !programIsVisible(programs[key]);
        button.querySelector("strong").textContent = programs[key].name;
        button.querySelector("small").textContent = money(programs[key].price);
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
    }
    var notice = program.noticeText || "";
    var noticeEl = byId("product-notice");
    if (noticeEl) { noticeEl.textContent = notice; noticeEl.hidden = !notice || notice === program.subtitle; }
    document.querySelectorAll("#cart-program-links [data-program-key]").forEach(function (link) {
      var key = link.getAttribute("data-program-key");
      if (!programs[key] || !programs[key].userBookable) { link.remove(); return; }
      link.textContent = programs[key].name;
    });
    var cartLinks = byId("cart-program-links");
    Object.keys(programs).filter(function (key) { return programs[key].userBookable; }).forEach(function (key) {
      if (cartLinks.querySelector('[data-program-key="' + key + '"]')) return;
      var link = document.createElement("a"); link.href = "booking.html?product=" + encodeURIComponent(key);
      link.setAttribute("data-program-key", key); link.textContent = programs[key].name; cartLinks.append(link);
    });
  }

  document.querySelectorAll("[data-shop-home]").forEach(function (button) {
    button.addEventListener("click", function () { navigatePage("index.html"); });
  });
  function openDeveloperPolicy() {
    if (window.DeveloperPolicy) { window.DeveloperPolicy.toggle(); return; }
    var dialog = byId("developer-policy-dialog");
    if (dialog && !dialog.open) dialog.showModal();
  }
  var developerPolicyButton = byId("open-developer-policy");
  if (developerPolicyButton) developerPolicyButton.addEventListener("click", openDeveloperPolicy);
  document.addEventListener("keydown", function (event) {
    if (event.altKey && !event.metaKey && (event.code === "KeyP" || event.key.toLowerCase() === "p")) {
      event.preventDefault();
      openDeveloperPolicy();
    }
  });
  byId("program-picker").addEventListener("click", function (event) {
    var button = event.target.closest("[data-program-key]");
    if (!button) return;
    var key = button.getAttribute("data-program-key");
    if (key === state.programKey) return;
    selectProgram(key);
    goToStep(1);
    syncProgramExtras();
  });
  byId("calendar-prev").addEventListener("click", function () {
    changeCalendarMonth(-1);
  });
  byId("calendar-next").addEventListener("click", function () {
    changeCalendarMonth(1);
  });

  byId("booking-quantity-discount").addEventListener("click", function (event) {
    var error = bookingSelectionError();
    if (!error) return;
    event.preventDefault(); event.stopPropagation(); notify(error);
  }, true);
  byId("qty-minus").addEventListener("click", function () {
    var error = bookingSelectionError();
    if (error) { notify(error); return; }
    if (state.qty <= 1) { notify(quantityLimitText()); return; }
    state.qty = Math.max(1, state.qty - 1); update();
  });
  byId("qty-plus").addEventListener("click", function () {
    var error = bookingSelectionError();
    if (error) { notify(error); return; }
    if (state.qty >= selectedMaxQty()) { notify(quantityLimitText()); return; }
    state.qty = Math.min(selectedMaxQty(), state.qty + 1); update();
  });
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
  byId("new-booking").addEventListener("click", function () { selectProgram(program.key); goToStep(1); syncProgramExtras(); });
  byId("back-from-tickets").addEventListener("click", function () { goToStep(1); });
  byId("back-to-ticket-list").addEventListener("click", function () {
    navigatePage("reservations.html");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  byId("open-ticket-cancel").addEventListener("click", function () {
    if (!ticketReservation) return;
    var now = new Date();
    if (!ticketCanCancel(ticketReservation, ticketTiming(ticketReservation, now), now)) { updateTicketAccess(); return; }
    renderTicketCancelOptions(); byId("ticket-cancel-panel").hidden = false;
    byId("ticket-cancel-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  byId("close-ticket-cancel").addEventListener("click", function () { byId("ticket-cancel-panel").hidden = true; });
  byId("confirm-ticket-cancel").addEventListener("click", applyPartialTicketCancellation);
  byId("header-logout").addEventListener("click", function () {
    try { window.sessionStorage.removeItem("ponylandDemoMember"); } catch (error) { /* ignore */ }
    currentMember = null;
    checkoutSnapshot = ""; completedOrder = null; ticketReservation = null; ticketReservations = [];
    notify("로그아웃했습니다.");
    selectProgram(program.key); goToStep(1); syncProgramExtras(); renderCart();
  });
  byId("member-withdraw").addEventListener("click", function () {
    if (!currentMember || !window.confirm("회원탈퇴 시 로그인 연결과 장바구니가 삭제됩니다. 결제·예약 이력은 운영 기록으로 보관됩니다. 계속할까요?")) return;
    var memberId = currentMember.id;
    var store = readStore();
    if (store) { store.carts[memberId] = []; store.revision += 1; writeStore(store); }
    try { window.sessionStorage.removeItem("ponylandDemoMember"); } catch (error) { /* ignore */ }
    currentMember = null; checkoutSnapshot = ""; ticketReservation = null; ticketReservations = [];
    goToStep(1); renderCart(); notify("회원탈퇴가 완료되었습니다.");
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
    if (event.key === "letsrunPlayAdminDemoV4") { selectProgram(state.programKey, false); renderCart(); syncProgramExtras(); }
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
  document.querySelectorAll("dialog").forEach(function (dialog) {
    dialog.addEventListener("click", function (event) { if (event.target === dialog) dialog.close(); });
  });
  prepareProgramGuidancePanel();
  selectProgram(initialProgramKey);
  syncProgramExtras();
  renderCart();
  restoreShopRoute();
  syncProgramExtras();
  window.addEventListener("popstate", function () { restoreShopRoute(); syncProgramExtras(); });
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    currentMember = readMember(); checkoutSnapshot = ""; completedOrder = null; ticketReservation = null;
    selectProgram(state.programKey, false); renderCart(); restoreShopRoute(); syncProgramExtras();
  });
  setInterval(function () { updateTicketAccess(); updateTicketListStatuses(); }, 1000);
  setInterval(function () { renderSlots(); update(); renderCart(); }, 30000);
})();
