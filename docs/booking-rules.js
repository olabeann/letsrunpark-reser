(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BookingRules = factory();
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";

  function interval(item) {
    if (!item || typeof item.dateKey !== "string" || typeof item.time !== "string") return null;
    var date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(item.dateKey);
    var time = /^(\d{2}):(\d{2})(?:~(\d{2}):(\d{2}))?$/.exec(item.time);
    if (!date || !time) return null;
    var year = Number(date[1]), month = Number(date[2]) - 1, day = Number(date[3]);
    var hour = Number(time[1]), minute = Number(time[2]);
    if (hour > 23 || minute > 59 || (time[3] && (Number(time[3]) > 23 || Number(time[4]) > 59))) return null;
    var start = new Date(year, month, day, hour, minute);
    if (start.getFullYear() !== year || start.getMonth() !== month || start.getDate() !== day) return null;
    // Legacy tour records stored only a start time; the existing tour page specifies 80 minutes.
    var duration = item.durationMinutes || (item.programKey === "tour" ? 80 : 20);
    var end = time[3] ? new Date(year, month, day, Number(time[3]), Number(time[4])) : new Date(start.getTime() + duration * 60000);
    if (time[3] && end <= start) end.setDate(end.getDate() + 1);
    return { start: start.getTime(), end: end.getTime() };
  }

  function overlaps(left, right) {
    var a = interval(left), b = interval(right);
    // Adjacent sessions are allowed; the entry window is not the reserved session interval.
    return !!(a && b && a.start < b.end && b.start < a.end);
  }

  function isActive(item) {
    return item && !item.isExample && item.status !== "cancelled" && item.status !== "canceled" && item.qty !== 0;
  }

  // New records are stored as one reservation with many product/session tickets.
  // Legacy prototypes stored those tickets directly in `reservations`, so flatten both
  // shapes at the policy boundary until existing browser data has naturally migrated.
  function ticketRecords(reservations) {
    return (reservations || []).reduce(function (records, reservation) {
      if (!reservation) return records;
      if (Array.isArray(reservation.tickets) && reservation.tickets.some(function (ticket) { return ticket && typeof ticket === "object"; })) {
        reservation.tickets.forEach(function (ticket) {
          if (!ticket || typeof ticket !== "object") return;
          records.push(Object.assign({
            memberId: reservation.memberId,
            reservationId: reservation.id,
            paymentId: reservation.paymentId,
            createdAt: reservation.createdAt,
            paymentMethod: reservation.paymentMethod
          }, ticket));
        });
      } else records.push(reservation);
      return records;
    }, []);
  }

  function quoteItem(item, programs) {
    if (!item || typeof item !== "object") throw new Error("예약 정보를 다시 확인해주세요.");
    var program = programs[item.programKey];
    if (!program) throw new Error("프로그램을 다시 선택해주세요.");
    var experience = program.experiences ? program.experiences[item.experience] : null;
    if (program.experiences && !experience) throw new Error("체험을 다시 선택해주세요.");
    var product = experience || program;
    var discountPolicy = discountPolicyFor(item, product.discountPolicy ? product : program);
    var slot = program.slots.find(function (candidate) { return candidate.time === item.time; });
    var itemRange = interval(item);
    var itemDate = itemRange ? new Date(itemRange.start) : null;
    var saleDays = Array.isArray(program.saleDays) ? program.saleDays.map(Number) : [6, 0];
    var closed = (program.operationExceptions || []).some(function (exception) {
      return exception.status !== "open" && exception.region === (item.region || program.region || program.location) && (!exception.department || exception.department === (item.department || program.department)) && (!exception.programKey || exception.programKey === "all" || exception.programKey === item.programKey) && (!exception.sessionKey || (slot && exception.sessionKey === slot.key)) && exception.startDate <= item.dateKey && exception.endDate >= item.dateKey;
    });
    if (!slot || slot.disabled || program.active === false || !itemDate || !saleDays.includes(itemDate.getDay()) || (program.saleStartDate && item.dateKey < program.saleStartDate) || (program.saleEndDate && item.dateKey > program.saleEndDate) || closed) throw new Error("예약 가능한 날짜와 회차를 다시 선택해주세요.");
    if (typeof item.discount !== "boolean" || (item.discount && !discountPolicy)) throw new Error("할인 정보를 다시 확인해주세요.");
    var maxQty = Math.min(program.purchasePolicy ? program.purchasePolicy.maxQty : 4, Number.isInteger(slot.capacity) ? slot.capacity : 4);
    var discountQty = item.discount ? (Number.isInteger(item.discountQty) ? item.discountQty : item.qty) : 0;
    var discountRate = item.discount && discountPolicy.type !== "fixed" ? Number(discountPolicy.rate || 0) : 0;
    var discountPerUnit = item.discount ? (discountPolicy.type === "fixed" ? Number(discountPolicy.value || 0) : Math.round(product.price * discountRate)) : 0;
    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > maxQty) throw new Error("회차별 인원과 할인 적용 수량을 확인해주세요.");
    if (!Number.isInteger(discountQty) || discountQty < 0 || discountQty > item.qty || (item.discount && discountQty !== item.qty) || (!item.discount && discountQty !== 0) || (discountPolicy && discountQty > discountPolicy.maxQty)) throw new Error("할인 카드와 할인 미적용 카드의 인원을 나누어 담아주세요.");
    return Object.assign({}, item, {
      name: product.name,
      price: Math.max(0, product.price * item.qty - discountPerUnit * discountQty),
      discountQty: discountQty,
      discountLabel: discountPolicy ? discountPolicy.label || discountPolicy.name || "할인 적용" : "",
      discountType: discountPolicy ? discountPolicy.type || "percent" : "",
      discountValue: discountPolicy ? Number(discountPolicy.value || discountRate * 100) : 0
    });
  }

  function programFor(item, programs) {
    return item && programs ? programs[item.programKey] : null;
  }

  function discountPolicyFor(item, program) {
    if (!item || !program || !item.discount) return null;
    var policies = Array.isArray(program.discountPolicies) ? program.discountPolicies : program.discountPolicy ? [program.discountPolicy] : [];
    return policies.find(function (policy) { return !item.discountPolicyId || policy.id === item.discountPolicyId; }) || null;
  }

  // Purchase and discount caps reset per usage date (not payment date), so today's cart is
  // tallied together with the account's other active reservations for that same dateKey only.
  function cartDateError(items) {
    var dateKeys = {};
    items.forEach(function (item) { if (item && item.dateKey) dateKeys[item.dateKey] = true; });
    if (Object.keys(dateKeys).length > 1) return "장바구니에는 하나의 이용일만 담을 수 있습니다. 다른 날짜를 예약하려면 먼저 결제하거나 장바구니를 비워주세요.";
    return "";
  }

  function cartScopeError(items, programs) {
    if (items.length < 2) return "";
    var firstProgram = programFor(items[0], programs) || {};
    var firstRegion = items[0].region || firstProgram.region || firstProgram.location;
    var firstDepartment = items[0].department || firstProgram.department;
    var mixed = items.some(function (item) {
      var program = programFor(item, programs) || {};
      return (item.region || program.region || program.location) !== firstRegion ||
        (item.department || program.department) !== firstDepartment;
    });
    return mixed ? "장바구니에는 같은 지역과 담당부서의 체험만 담을 수 있습니다. 다른 지역 또는 부서는 먼저 결제하거나 장바구니를 비워주세요." : "";
  }

  function purchaseLimitError(items, reservations, memberId, programs) {
    var totals = {};
    function tally(list) {
      list.forEach(function (entry) {
        if (!entry || entry.memberId !== memberId || !isActive(entry)) return;
        var program = programFor(entry, programs), policy = program && program.purchasePolicy;
        if (!policy || !policy.maxQty) return;
        var key = entry.programKey + "|" + entry.dateKey;
        totals[key] = (totals[key] || 0) + (Number.isInteger(entry.qty) ? entry.qty : 0);
      });
    }
    tally(ticketRecords(reservations));
    tally(items);
    for (var i = 0; i < items.length; i += 1) {
      var program = programFor(items[i], programs), policy = program && program.purchasePolicy;
      if (!policy || !policy.maxQty) continue;
      if (totals[items[i].programKey + "|" + items[i].dateKey] > policy.maxQty) {
        return "같은 프로그램은 이용일 기준 계정당 최대 " + policy.maxQty + "매까지 예약할 수 있습니다.";
      }
    }
    return "";
  }

  function discountLimitError(items, reservations, memberId, programs) {
    var totals = {};
    var policyIdsByDate = {};
    function tally(list) {
      list.forEach(function (item) {
        if (!item || item.memberId !== memberId || !item.discount || !isActive(item)) return;
        var program = programFor(item, programs), policy = discountPolicyFor(item, program);
        if (!policy || !policy.id || !policy.maxQtyPerDate) return;
        var key = policy.id + "|" + item.dateKey;
        policyIdsByDate[item.dateKey] = policyIdsByDate[item.dateKey] || {};
        policyIdsByDate[item.dateKey][policy.id] = true;
        var discountedQty = Number.isInteger(item.discountQty) ? item.discountQty : item.qty;
        totals[key] = (totals[key] || 0) + (Number.isInteger(discountedQty) ? discountedQty : 0);
      });
    }
    tally(ticketRecords(reservations));
    tally(items);
    if (Object.keys(policyIdsByDate).some(function (dateKey) { return Object.keys(policyIdsByDate[dateKey]).length > 1; })) {
      return "같은 이용일에는 하나의 할인 정책만 선택할 수 있습니다.";
    }
    var exceededItem = items.find(function (item) {
      var program = programFor(item, programs), policy = discountPolicyFor(item, program);
      return policy && policy.id && policy.maxQtyPerDate && totals[policy.id + "|" + item.dateKey] > policy.maxQtyPerDate;
    });
    if (!exceededItem) return "";
    var discount = discountPolicyFor(exceededItem, programFor(exceededItem, programs));
    return discount.label + "은(는) 이용일 기준 계정당 최대 " + discount.maxQtyPerDate + "매까지 적용됩니다.";
  }

  function validationError(items, reservations, memberId, programs, now) {
    if (!memberId) return "로그인 후 진행해주세요.";
    if (!items.length) return "장바구니에 프로그램을 담아주세요.";
    var dateError = cartDateError(items);
    if (dateError) return dateError;
    var scopeError = cartScopeError(items, programs);
    if (scopeError) return scopeError;
    var purchaseError = purchaseLimitError(items, reservations, memberId, programs);
    if (purchaseError) return purchaseError;
    var existing = ticketRecords(reservations).filter(function (entry) { return entry.memberId === memberId && isActive(entry); });
    for (var n = 0; n < items.length; n += 1) {
      var candidate = items[n];
      if (!candidate || candidate.memberId !== memberId || !isActive(candidate)) continue;
      var conflicts = existing.concat(items.slice(0, n)).some(function (entry) {
        return entry && entry.memberId === memberId && isActive(entry) && entry.programKey !== candidate.programKey && overlaps(entry, candidate);
      });
      if (conflicts) return "다른 프로그램의 이용 시간이 겹칩니다. 기존 예약과 장바구니의 회차 시간을 확인해주세요.";
    }
    var discountError = discountLimitError(items, reservations, memberId, programs);
    if (discountError) return discountError;
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      if (!item || item.memberId !== memberId) return "현재 로그인한 계정의 장바구니만 결제할 수 있습니다.";
      try { quoteItem(item, programs); } catch (error) { return error.message; }
      var itemProgram = programFor(item, programs);
      var bookingWindowDays = itemProgram && Number.isFinite(itemProgram.bookingWindow) && itemProgram.bookingWindow > 0 ? itemProgram.bookingWindow : 14;
      var lastDay = new Date(today); lastDay.setDate(lastDay.getDate() + bookingWindowDays);
      var range = interval(item), date = new Date(range.start);
      var midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      var saleDays = itemProgram && Array.isArray(itemProgram.saleDays) ? itemProgram.saleDays.map(Number) : [6, 0];
      if (range.start <= now.getTime() || midnight < today || midnight > lastDay || !saleDays.includes(date.getDay()) || (itemProgram.saleStartDate && item.dateKey < itemProgram.saleStartDate) || (itemProgram.saleEndDate && item.dateKey > itemProgram.saleEndDate)) {
        return "예약 기간이 지났거나 운영하지 않는 회차가 있습니다. 일정을 다시 선택해주세요.";
      }
    }
    return "";
  }

  // Seats are never reserved ahead of payment; availability is only settled at the
  // payment instant by comparing the requested seats against seats already paid for.
  function slotCapacity(slot) {
    if (Number.isFinite(slot.capacity)) return slot.capacity;
    var match = /([0-9]+)\s*자리/.exec(slot.stock || "");
    return match ? Number(match[1]) : Infinity;
  }

  function capacityConflict(items, reservations, programs) {
    var paidTickets = ticketRecords(reservations);
    return items.find(function (item) {
      var program = programFor(item, programs);
      var slot = program && program.slots && program.slots.find(function (candidate) { return candidate.time === item.time; });
      if (!slot) return false;
      var capacity = slotCapacity(slot);
      var paidSeats = paidTickets.filter(function (entry) {
        return isActive(entry) && entry.programKey === item.programKey && entry.dateKey === item.dateKey && entry.time === item.time;
      }).reduce(function (sum, entry) { return sum + (Number.isInteger(entry.qty) ? entry.qty : 0); }, 0);
      return paidSeats + item.qty > capacity;
    }) || null;
  }

  function buildOrder(store, memberId, programs, now, reservationId) {
    var cart = store.carts[memberId] || [];
    var error = validationError(cart, store.reservations, memberId, programs, now);
    if (error) throw new Error(error);
    var conflict = capacityConflict(cart, store.reservations, programs);
    if (conflict) {
      var conflictError = new Error(conflict.name + " " + conflict.time + " 회차는 다른 결제로 이미 마감되었습니다.");
      conflictError.code = "SESSION_TAKEN";
      throw conflictError;
    }
    if (store.reservations.some(function (item) { return item.id === reservationId || item.reservationId === reservationId || item.orderId === reservationId; })) throw new Error("이미 처리된 결제입니다.");
    var personSequence = 0;
    var tickets = cart.map(function (item, index) {
      var quoted = quoteItem(item, programs);
      var discountedQty = quoted.discountQty;
      var unitAmount = Math.floor(quoted.price / quoted.qty);
      var unitAmounts = Array.from({ length: quoted.qty }, function (_, unitIndex) {
        return unitAmount + (unitIndex < quoted.price % quoted.qty ? 1 : 0);
      });
      var ticketIds = Array.from({ length: quoted.qty }, function () {
        personSequence += 1;
        return reservationId + "-T" + String(personSequence).padStart(2, "0");
      });
      var discountFlags = Array.from({ length: quoted.qty }, function (_, unitIndex) { return unitIndex < discountedQty; });
      var ticketStatuses = Array.from({ length: quoted.qty }, function () { return "confirmed"; });
      return Object.assign(quoted, {
        id: reservationId + "-G" + String(index + 1).padStart(2, "0"), reservationId: reservationId,
        ticketIds: ticketIds,
        discountQty: discountedQty, unitAmounts: unitAmounts,
        originalPrice: quoted.price,
        originalTicketIds: ticketIds.slice(),
        originalUnitAmounts: unitAmounts.slice(),
        originalDiscountFlags: discountFlags,
        adminTicketStatuses: ticketStatuses,
        arrivalLeadMinutes: Number.isInteger(programs[item.programKey].arrivalLeadMinutes) && programs[item.programKey].arrivalLeadMinutes >= 0 && programs[item.programKey].arrivalLeadMinutes <= 100 ? programs[item.programKey].arrivalLeadMinutes : 20,
        cancelMinutes: Number.isFinite(programs[item.programKey].cancelMinutes) ? programs[item.programKey].cancelMinutes : 10,
        status: "confirmed", createdAt: now.toISOString(), paymentMethod: "demo-card"
      });
    });
    var total = tickets.reduce(function (sum, item) { return sum + item.price; }, 0);
    var reservation = {
      id: reservationId,
      memberId: memberId,
      paymentId: "DEMO-PAY-" + reservationId,
      paymentMethod: "demo-card",
      createdAt: now.toISOString(),
      status: "confirmed",
      total: total,
      tickets: tickets
    };
    var carts = Object.assign({}, store.carts); carts[memberId] = [];
    return {
      store: { revision: store.revision + 1, reservations: [reservation].concat(store.reservations), carts: carts },
      reservation: reservation, tickets: tickets, reservationId: reservationId,
      total: total
    };
  }

  return { interval: interval, overlaps: overlaps, isActive: isActive, ticketRecords: ticketRecords, quoteItem: quoteItem, validationError: validationError, buildOrder: buildOrder };
});
