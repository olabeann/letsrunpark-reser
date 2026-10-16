const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../app.js'), 'utf8');
const admin = fs.readFileSync(require.resolve('../admin.js'), 'utf8');
function functions(text, names) {
  return names.map(name => { const start = text.indexOf('  function ' + name + '('); assert.ok(start >= 0); return text.slice(start, text.indexOf('\n  }', start) + 4); }).join('\n');
}
function nodes() { const map = new Map(); return id => { if (!map.has(id)) map.set(id, {value:'', checked:false, hidden:false, setAttribute(){}}); return map.get(id); }; }
test('visibility preferences save independently, reopen, and reset for legacy programs', () => {
  const byId = nodes();
  const program = {key:'ride', programName:'체험', image:'cover.jpg', location:'서울', department:'공원', saleStartDate:'2026-01-01', saleEndDate:'2026-12-31', visibleStartAt:'2026-01-01T00:00', visibleEndAt:'2026-12-31T23:59', price:5000, arrivalLeadMinutes:5, cancelMinutes:60};
  const c = vm.createContext({byId, currentAccount:null, organization:{서울:['공원']}, defaultBookingWindow:14, defaultArrivalLeadMinutes:20, defaultCancelMinutes:10,
    canManageDepartment:()=>true, refreshProgramInputs(){}, refreshDepartmentSelect(id,region,value){byId(id).value=value;}, renderProgramGuidanceEditor(){}, renderProductDiscountOptions(){}, showView(){}, notify(){}, commitDiscountDraft(){}, programCatalog:()=>[program], persistProgram(p){c.saved=p;},
    document:{querySelectorAll:()=>[{value:'6'}], querySelector:()=>({querySelectorAll:()=>[]})}
  });
  vm.runInContext(functions(admin,['openProductDialog','saveProductDetail']),c);
  for (const [arrival,cancel] of [[true,false],[false,true],[true,true],[false,false]]) {
    c.openProductDialog(program);
    byId('detail-hide-arrival-guidance').checked=arrival;
    byId('detail-hide-cancel-guidance').checked=cancel;
    const notice = arrival ? '당일 구매 후 취소 불가합니다.\n1번 발권으로 다회 이용 가능합니다.' : '';
    byId('detail-ticket-notice').value=notice;
    c.saveProductDetail({preventDefault(){assert.fail('unexpected validation error');}});
    assert.equal(c.saved.ticketNoticeText,notice);
    assert.equal(c.saved.hideArrivalGuidance,arrival); assert.equal(c.saved.hideCancelGuidance,cancel);
    assert.equal(c.saved.arrivalLeadMinutes,5); assert.equal(c.saved.cancelMinutes,60);
    c.openProductDialog(c.saved);
    assert.equal(byId('detail-ticket-notice').value,notice);
    assert.equal(byId('detail-hide-arrival-guidance').checked,arrival); assert.equal(byId('detail-hide-cancel-guidance').checked,cancel);
  }
  c.openProductDialog(program);
  assert.equal(byId('detail-ticket-notice').value,'');
  assert.equal(byId('detail-hide-arrival-guidance').checked,false); assert.equal(byId('detail-hide-cancel-guidance').checked,false);
});
test('hidden guidance preserves admission and cancellation rules and can be shown again', () => {
  const byId=nodes();
  const reservation={programKey:'ride', dateKey:'2026-10-17', time:'10:00~10:20', qty:1, arrivalLeadMinutes:5, cancelMinutes:60};
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [2026,9,17,8])); } }
  const c=vm.createContext({byId, Date:ClockDate, programs:{ride:{}}, ticketReservation:reservation, BookingRules:require('../booking-rules.js'), formatTime:()=>'', renderTicketRefundHistory(){}, formatPaymentDate:()=>'', paymentMethodLabel:()=>'', ticketPaymentStatus:()=>'', money:()=>''});
  vm.runInContext(functions(source,['ticketGuidanceHidden','ticketSessionStart','ticketSessionEnd','ticketTiming','ticketCancellationDeadline','ticketCanCancel','formatCancellationDeadline','renderTicketCancellation','ticketReservationNumber','ticketDiscountQty','updateTicketAccess']),c);
  const before=new Date(2026,9,17,8), after=new Date(2026,9,17,9,30);
  const original=c.ticketTiming(reservation,before);
  for(const hidden of [true,false]) {
    c.programs.ride.hideArrivalGuidance=hidden;c.programs.ride.hideCancelGuidance=hidden;
    const timing=c.ticketTiming(reservation,before);
    assert.equal(timing.entryOpen.getTime(),original.entryOpen.getTime());
    c.renderTicketCancellation(timing,before);
    assert.equal(byId('ticket-cancel-deadline').hidden,hidden);assert.equal(byId('open-ticket-cancel').disabled,false);
    c.renderTicketCancellation(c.ticketTiming(reservation,after),after);
    assert.equal(byId('open-ticket-cancel').disabled,true);
    c.updateTicketAccess();
    assert.equal(byId('ticket-window-note').hidden,hidden);
    assert.equal(byId('ticket-time-window').hidden,hidden);
    assert.equal(byId('ticket-access-detail').hidden,hidden);
  }
  for (const notice of ['당일 구매 후 취소 불가합니다.\n1번 발권으로 다회 이용 가능합니다.', '<img src=x onerror=alert(1)>', '', '   ']) {
    c.programs.ride.hideArrivalGuidance=true;
    c.programs.ride.ticketNoticeText=notice;
    c.updateTicketAccess();
    assert.equal(byId('ticket-free-notice').textContent,notice);
    assert.equal(byId('ticket-free-notice').hidden,!notice.trim());
  }
  assert.equal(c.ticketGuidanceHidden({programKey:'deleted',hideArrivalGuidance:true},'hideArrivalGuidance'),true);
  assert.equal(c.ticketGuidanceHidden({programKey:'legacy'},'hideArrivalGuidance'),false);
});
