(function (root) {
  'use strict';
  var key = 'ride-chuseok-2026';
  var program = {
    key: key, programKey: key, programName: '포니타기 추석 연휴', price: 5000,
    image: 'assets/pony/cover.jpg', location: '서울', department: '공원화사업추진TF', programType: '승마체험',
    settlementTag: 'SEOUL-PARK-TF', purchaseGroup: 'SEOUL-PONY', conflictGroup: 'SEOUL-PONY',
    bookingWindow: 14, arrivalLeadMinutes: 20, cancelMinutes: 10, cancelOffsetValue: 10, cancelOffsetUnit: 'minutes',
    saleStartDate: '2026-09-24', saleEndDate: '2026-09-26', saleDays: [4, 5, 6],
    visibleStartAt: '2026-09-01T00:00', visibleEndAt: '2026-09-26T23:59',
    noticeText: '추석 연휴 한정 운영 · 9월 24일~26일 · 1인 5,000원',
    guidanceText: '[운영 일정] 추석 연휴 9월 24일~26일에만 운영합니다.\n[이용 대상] 키 100cm 이상, 초등학생 이하 어린이만 이용할 수 있습니다.\n[체험 방법] 포니체험라운지에서 안전장구를 착용한 후 진행요원의 안내에 따라 체험장으로 이동해주세요.\n[방문 안내] 체험 시작 20분 전까지 방문해주세요.',
    requiresGuidanceConfirmation: true, discountIds: [], active: true
  };
  var times = [['10:00', '10:20'], ['11:00', '11:20'], ['14:00', '14:20'], ['15:00', '15:20']];
  var sessions = times.map(function (time, i) { return { key: key + '-session-' + i, programKey: key, start: time[0], end: time[1], capacity: 8, active: true }; });
  var reservations = Array.from({ length: 10 }, function (_, i) {
    var day = 24 + Math.floor(i / 4), date = '2026-09-' + day;
    var id = 'LRP-260917-' + String(90001 + i);
    return { id: id + '-G01', reservationId: id, orderId: 'DEMO-CHUSEOK-' + i, memberId: 'demo:chuseok:' + i,
      programKey: key, program: program.programName, location: program.location, department: program.department,
      dateKey: date, date: '2026.09.' + day + ' (' + ['목', '금', '토'][day - 24] + ')',
      time: times[i % 4].join('~'), qty: 4, price: 20000, discount: false,
      status: i === 0 ? '부분 취소' : '예약 확정', createdAt: '2026-09-17 09:' + String(i).padStart(2, '0'), method: '신용카드',
      tickets: i === 0 ? ['cancelled', 'cancelled', 'confirmed', 'confirmed'] : ['confirmed', 'confirmed', 'confirmed', 'confirmed'],
      cancellationEvents: i === 0 ? [{ source: 'customer', qty: 2, amount: 10000, reason: '고객 직접 취소', createdAt: '2026-09-17 10:00' }] : [] };
  });
  var calendarKey = 'calendar-empty-2026';
  var calendarProgram = {
    key: calendarKey, programKey: calendarKey, programName: '달력 빈 상태 확인', price: 5000,
    image: 'assets/pony/cover.jpg', location: '서울', department: '공원화사업추진TF', programType: '승마체험',
    settlementTag: 'SEOUL-PARK-TF', purchaseGroup: 'SEOUL-PONY', conflictGroup: 'SEOUL-PONY',
    bookingWindow: 14, arrivalLeadMinutes: 20, cancelMinutes: 10, cancelOffsetValue: 10, cancelOffsetUnit: 'minutes',
    saleStartDate: '2026-09-26', saleEndDate: '2026-10-04', saleDays: [6, 0],
    visibleStartAt: '2026-09-21T00:00', visibleEndAt: '2026-10-04T23:59',
    noticeText: '달력 안내 문구 검증용 · 9월은 휴장, 10월 3~4일 운영',
    guidanceText: '', requiresGuidanceConfirmation: false, discountIds: [], active: true
  };
  var calendarSessions = [{ key: calendarKey + '-session-0', programKey: calendarKey, start: '10:00', end: '10:20', capacity: 8, active: true }];
  var calendarClosure = { id: 'calendar-empty-2026-september-closure', region: '서울', programKey: calendarKey,
    startDate: '2026-09-26', endDate: '2026-09-27', status: 'closed', reason: '달력 빈 상태 검증용 휴장' };
  root.HolidayDemo = { program: program, sessions: sessions, reservations: reservations };
  // Seed once per browser without replacing the operator's existing configuration.
  try {
    var seedHoliday = !localStorage.getItem('ponyChuseokSampleV1');
    var seedCalendar = !localStorage.getItem('ponyEmptyCalendarSampleV1');
    if (!seedHoliday && !seedCalendar) return;
    var state = JSON.parse(localStorage.getItem('letsrunPlayAdminDemoV4') || '{}');
    var catalog = state.catalog || (state.catalog = {});
    catalog.programOverrides = catalog.programOverrides || {};
    catalog.sessionOverrides = catalog.sessionOverrides || {};
    catalog.addedPrograms = catalog.addedPrograms || [];
    catalog.addedSessions = catalog.addedSessions || [];
    if (seedHoliday && !catalog.addedPrograms.some(function (p) { return p.key === key; })) {
      catalog.addedPrograms.push(program);
      sessions.forEach(function (s) { catalog.addedSessions.push(s); });
    }
    if (seedCalendar && !catalog.addedPrograms.some(function (p) { return p.key === calendarKey; })) {
      catalog.addedPrograms.push(calendarProgram);
      calendarSessions.forEach(function (s) { catalog.addedSessions.push(s); });
      state.operationExceptions = Array.isArray(state.operationExceptions) ? state.operationExceptions : [];
      state.operationExceptions.push(calendarClosure);
    }
    localStorage.setItem('letsrunPlayAdminDemoV4', JSON.stringify(state));
    if (seedHoliday) localStorage.setItem('ponyChuseokSampleV1', '1');
    if (seedCalendar) localStorage.setItem('ponyEmptyCalendarSampleV1', '1');
  } catch (error) { /* Storage availability follows the prototype's existing behavior. */ }
})(typeof window !== 'undefined' ? window : globalThis);
