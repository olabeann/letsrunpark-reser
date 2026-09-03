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

  function findConflict(candidate, items, memberId) {
    if (!memberId) return null;
    return items.find(function (item) {
      return item && item.memberId === memberId && isActive(item) && overlaps(candidate, item);
    }) || null;
  }

  function quoteItem(item, programs) {
    if (!item || typeof item !== "object") throw new Error("예약 정보를 다시 확인해주세요.");
    var program = programs[item.programKey];
    if (!program) throw new Error("프로그램을 다시 선택해주세요.");
    var experience = program.experiences ? program.experiences[item.experience] : null;
    if (program.experiences && !experience) throw new Error("체험을 다시 선택해주세요.");
    var product = experience || program;
    var discountPolicy = product.discountPolicy || program.discountPolicy;
    var slot = program.slots.find(function (candidate) { return candidate.time === item.time; });
    if (!slot || slot.disabled || !interval(item)) throw new Error("예약 가능한 날짜와 회차를 다시 선택해주세요.");
    if (typeof item.discount !== "boolean" || (item.discount && !discountPolicy)) throw new Error("할인 정보를 다시 확인해주세요.");
    var maxQty = Math.min(item.discount ? discountPolicy.maxQty : 4, slot.capacity || 4);
    var discountRate = item.discount ? discountPolicy.rate : 0;
    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > maxQty) throw new Error("회차별 인원과 할인 적용 수량을 확인해주세요.");
    return Object.assign({}, item, {
      name: product.name,
      price: Math.round(product.price * item.qty * (1 - discountRate))
    });
  }

  function programFor(item, programs) {
    return item && programs ? programs[item.programKey] : null;
  }

  function purchaseLimitError(items, programs) {
    var totals = {};
    for (var i = 0; i < items.length; i += 1) {
      var program = programFor(items[i], programs), policy = program && program.purchasePolicy;
      if (!policy || !policy.group || !policy.maxQty) continue;
      totals[policy.group] = (totals[policy.group] || 0) + (Number.isInteger(items[i].qty) ? items[i].qty : 0);
      if (totals[policy.group] > policy.maxQty) return "같은 구매 한도 그룹은 장바구니에 최대 " + policy.maxQty + "매까지 담을 수 있습니다.";
    }
    return "";
  }

  function discountLimitError(items, reservations, memberId, programs) {
    var totals = {};
    reservations.concat(items).forEach(function (item) {
      if (!item || item.memberId !== memberId || !item.discount || !isActive(item)) return;
      var program = programFor(item, programs), policy = program && program.discountPolicy;
      if (!policy || !policy.id || !policy.lifetimeMaxQty) return;
      totals[policy.id] = (totals[policy.id] || 0) + (Number.isInteger(item.qty) ? item.qty : 0);
    });
    var exceeded = Object.keys(totals).find(function (id) {
      var item = items.find(function (candidate) { var program = programFor(candidate, programs); return program && program.discountPolicy && program.discountPolicy.id === id; });
      var policy = item && programFor(item, programs).discountPolicy;
      return policy && totals[id] > policy.lifetimeMaxQty;
    });
    if (!exceeded) return "";
    var target = items.find(function (item) { var program = programFor(item, programs); return program && program.discountPolicy && program.discountPolicy.id === exceeded; });
    var discount = programFor(target, programs).discountPolicy;
    return discount.label + "은(는) 계정당 최대 " + discount.lifetimeMaxQty + "매까지 적용됩니다.";
  }

  function validationError(items, reservations, memberId, programs, now) {
    if (!memberId) return "로그인 후 진행해주세요.";
    if (!items.length) return "장바구니에 프로그램을 담아주세요.";
    var purchaseError = purchaseLimitError(items, programs);
    if (purchaseError) return purchaseError;
    var discountError = discountLimitError(items, reservations, memberId, programs);
    if (discountError) return discountError;
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var lastDay = new Date(today); lastDay.setDate(lastDay.getDate() + 14);
    var checked = [];
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      if (!item || item.memberId !== memberId) return "현재 로그인한 계정의 장바구니만 결제할 수 있습니다.";
      try { quoteItem(item, programs); } catch (error) { return error.message; }
      var range = interval(item), date = new Date(range.start);
      var midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      if (range.start <= now.getTime() || midnight < today || midnight > lastDay || (date.getDay() !== 0 && date.getDay() !== 6)) {
        return "예약 기간이 지났거나 운영하지 않는 회차가 있습니다. 일정을 다시 선택해주세요.";
      }
      var conflict = findConflict(item, reservations.concat(checked), memberId);
      if (conflict) return item.name + " " + item.time + "은(는) " + conflict.name + " " + conflict.time + "과 이용 시간이 겹칩니다.";
      checked.push(item);
    }
    return "";
  }

  function buildOrder(store, memberId, programs, now, orderId) {
    var cart = store.carts[memberId] || [];
    var error = validationError(cart, store.reservations, memberId, programs, now);
    if (error) throw new Error(error);
    if (store.reservations.some(function (item) { return item.orderId === orderId; })) throw new Error("이미 처리된 결제입니다.");
    var tickets = cart.map(function (item, index) {
      return Object.assign(quoteItem(item, programs), {
        id: orderId + "-" + (index + 1), orderId: orderId,
        status: "confirmed", createdAt: now.toISOString(), paymentMethod: "demo-card"
      });
    });
    var carts = Object.assign({}, store.carts); carts[memberId] = [];
    return {
      store: { revision: store.revision + 1, reservations: tickets.concat(store.reservations), carts: carts },
      tickets: tickets, orderId: orderId,
      total: tickets.reduce(function (sum, item) { return sum + item.price; }, 0)
    };
  }

  return { interval: interval, overlaps: overlaps, isActive: isActive, findConflict: findConflict, quoteItem: quoteItem, validationError: validationError, buildOrder: buildOrder };
});
