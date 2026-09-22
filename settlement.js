(function (root) {
  'use strict';
  var PG_FEE_RATE = 0.02;
  // Demo normalized ledger. Production adapters must join verified provider records on the server.
  var payments = [
    ['001','2026-05-09 09:52:23','국민카드','카드',27000,'포니 타기'],
    ['002','2026-05-09 09:54:18','삼성카드','카드',9000,'포니랑 놀기'],
    ['003','2026-05-10 10:00:00','현대카드','카드',15000,'포니 타기'],
    ['004','2026-05-11 11:20:00','신한카드','카드',8000,'포니랑 놀기'],
    ['005','2026-05-31 16:00:00','국민카드','카드',10000,'포니 타기'],
    ['006','2026-04-30 13:00:00','삼성카드','카드',12000,'포니랑 놀기'],
    ['007','2026-05-15 14:00:00','국민카드','카드',4000,'포니랑 놀기']
  ].map(function (p) {
    var reservationId = 'LRP-' + p[1].slice(2,10).replace(/-/g,'') + '-' + String(p[0]).padStart(5,'0');
    return { id:'demo-pay-'+p[0], impUid:'imp_'+String(304455000247+Number(p[0])), orderId:'DEMO-ORDER-'+p[0], reservation:reservationId, paymentKey:'demo-toss-payment-'+p[0], pgTxId:'demo-toss-payment-'+p[0], paidAt:p[1], card:p[2], method:p[3], amount:p[4], program:p[5], feeAmount:Math.round(p[4]*PG_FEE_RATE), region:'서울', department:'공원화사업추진TF', currency:'KRW', approval:'00'+p[0], cardNumber:p[2]==='해당 없음'?'':'****-****-****-'+p[0]+'1', easyPay:'', serviceDate:'2026-06-06', completedAt:['001','002','003','007'].includes(p[0])?'2026-06-06T15:00:00+09:00':null, installment:0 };
  });
  function monthlyPayoutDate(serviceDate) {
    var parts=serviceDate.split('-'), year=Number(parts[0]), month=Number(parts[1])+1;
    if(month===13){year++;month=1;}
    return year+'-'+String(month).padStart(2,'0')+'-08';
  }
  var events = payments.map(function (p) {
    return { paymentId:p.id, key:'demo-tx-'+p.id+'-approve', at:p.paidAt, type:'승인', amount:p.amount, feeAmount:p.feeAmount, soldDate:p.paidAt.slice(0,10), paidOutDate:monthlyPayoutDate(p.serviceDate), reason:'', cancelId:'', status:'성공' };
  });
  [
    ['003','2026-05-12 10:00:00',5000,['LRP-260510-00003-T01']],
    ['003','2026-05-20 10:00:00',5000,['LRP-260510-00003-T02']],
    ['004','2026-05-12 11:00:00',8000,['LRP-260511-00004-T01','LRP-260511-00004-T02']],
    ['006','2026-05-02 14:00:00',12000,['LRP-260430-00006-T01','LRP-260430-00006-T02','LRP-260430-00006-T03']],
    ['005','2026-06-02 10:00:00',10000,['LRP-260531-00005-T01','LRP-260531-00005-T02']]
  ].forEach(function (c,i) {
    events.push({ paymentId:'demo-pay-'+c[0], key:'demo-tx-cancel-'+i, at:c[1], type:'취소', amount:-c[2], feeAmount:-Math.round(c[2]*PG_FEE_RATE), soldDate:c[1].slice(0,10), paidOutDate:'', reason:i===2?'운영 취소':'고객 요청', cancelId:'demo-cancel-'+i, ticketIds:c[3], status:'성공' });
  });
  // Independent products remain separate in the existing settlement grouping and export.
  // These fictional September records become eligible only after their simulated completion date.
  [{ name: '포니 타기', count: 25, refund: 25000, prefix: 'regular' },
   { name: '포니타기 추석 연휴', count: 10, refund: 10000, prefix: 'chuseok' }].forEach(function (sample) {
    for (var i = 0; i < sample.count; i++) {
      var id = 'holiday-example-' + sample.prefix + '-' + i;
      var day = 24 + (sample.prefix === 'chuseok' ? Math.floor(i / 4) : i % 3), date = '2026-09-' + day;
      var p = { id: id, reservation: 'LRP-260917-' + String((sample.prefix === 'regular' ? 80001 : 90001) + i),
        impUid: 'imp_demo_' + id, orderId: id, paymentKey: id, pgTxId: id,
        paidAt: '2026-09-17 09:' + String(i).padStart(2, '0') + ':00', card: '국민카드', method: '카드',
        amount: 20000, program: sample.name, feeAmount: 400, region: '서울', department: '공원화사업추진TF',
        currency: 'KRW', approval: 'DEMO', cardNumber: '****-****-****-0000', easyPay: '',
        serviceDate: date, completedAt: date + 'T16:00:00+09:00', installment: 0 };
      payments.push(p);
      events.push({ paymentId: id, key: id + '-approve', at: p.paidAt, type: '승인', amount: 20000, feeAmount: 400,
        soldDate: '2026-09-17', paidOutDate: monthlyPayoutDate(date), reason: '', cancelId: '', status: '성공' });
      var refund = sample.prefix === 'regular' ? (i < 5 ? 5000 : 0) : (i === 0 ? sample.refund : 0);
      if (refund) events.push({ paymentId: id, key: id + '-cancel', at: '2026-09-17 10:00:00', type: '취소',
        amount: -refund, feeAmount: -Math.round(refund * PG_FEE_RATE), soldDate: '2026-09-17', paidOutDate: '',
        reason: '고객 요청', cancelId: id + '-refund', ticketIds: Array.from({ length: refund / 5000 }, function (_, n) { return p.reservation + '-T' + String(n + 1).padStart(2, '0'); }), status: '성공' });
    }
  });
  events.forEach(function(e){ e.payOutAmount = e.amount-e.feeAmount; });
  function balance(e) { var p=payment(e); return p.amount+events.filter(function(c){return c.paymentId===p.id && c.type==='취소' && c.at<=e.at;}).reduce(function(n,c){return n+c.amount;},0); }
  function state(e) { return e.type==='승인'?'결제 완료':balance(e)===0?'전체 취소':'부분 취소'; }
  function payment(e) { return payments.find(function(p){return p.id===e.paymentId;}); }
  function fee(e) { return e.feeAmount; }
  function eventTime(e) { return Date.parse(e.at.replace(' ','T')+'+09:00'); }
  function balanceAt(p, cutoff) { return p.amount+events.filter(function(e){return e.paymentId===p.id&&e.type==='취소'&&eventTime(e)<=cutoff;}).reduce(function(n,e){return n+e.amount;},0); }
  function filter(f, allowed) {
    return events.filter(function(e){
      var p=payment(e), serviceBasis=f.basis==='service', cutoff=Date.parse(f.asOf || new Date().toISOString()), completedAt=p.completedAt?Date.parse(p.completedAt):NaN;
      var completed=Number.isFinite(completedAt)&&completedAt<=cutoff, fullyCancelled=eventTime(e)<=cutoff&&balanceAt(p,cutoff)===0;
      var date=serviceBasis ? (completed?p.completedAt.slice(0,10):p.serviceDate) : e.at.slice(0,10);
      if(serviceBasis && ((!completed&&!fullyCancelled) || (completed&&eventTime(e)>completedAt) || (!completed&&eventTime(e)>cutoff)))return false;
      return allowed(p.region,p.department) && (!f.region || p.region===f.region) && (!f.department || p.department===f.department) && (!f.scope || p.region+' · '+p.department===f.scope) && (!f.start || date>=f.start) && (!f.end || date<=f.end) && (!f.card || p.card===f.card) && (!f.search || [p.reservation,p.program,p.card,p.method,p.easyPay,p.serviceDate].concat(e.ticketIds || []).join(' ').toLowerCase().includes(f.search.toLowerCase()));
    }).sort(function(a,b){return b.at.localeCompare(a.at);});
  }
  function totals(rows) {
    return rows.reduce(function(t,e){t.count++; if(e.amount>=0){t.approved+=e.amount;t.approvals++;}else{t.cancelled-=e.amount;t.cancels++;}t.net+=e.amount;var f=fee(e);if(f===null)t.pending++;else{t.fee+=f;t.payout+=e.payOutAmount;}return t;},{count:0,approved:0,approvals:0,cancelled:0,cancels:0,net:0,fee:0,payout:0,pending:0});
  }
  function groups(rows) {
    var result=[];
    rows.forEach(function(e){
      var p=payment(e),group=result.find(function(item){return item.reservation===p.reservation;});
      if(!group){group={reservation:p.reservation,region:p.region,department:p.department,events:[],programs:[],serviceDates:[],payoutDates:[]};result.push(group);}
      group.events.push(e);
      if(!group.programs.includes(p.program))group.programs.push(p.program);
      if(!group.serviceDates.includes(p.serviceDate))group.serviceDates.push(p.serviceDate);
      if(e.type==='승인'&&e.paidOutDate&&!group.payoutDates.includes(e.paidOutDate))group.payoutDates.push(e.paidOutDate);
    });
    return result;
  }
  var ledgerHeaders=['서비스 이용일','예약번호','상품명','카드사','승인금액','취소 여부','취소금액','취소 제외 매출','수수료','입금예정액','입금예정일'];
  function reservationStatus(group){var t=totals(group.events);return t.cancelled===0?'미취소':t.net===0?'전체 취소':'부분 취소';}
  function ledgerDetail(group){var t=totals(group.events);return [group.serviceDates.join(' · '),group.reservation,group.programs.join(' · '),Array.from(new Set(group.events.map(function(e){return payment(e).card||'';}))).join(' · '),t.approved,reservationStatus(group),t.cancelled,t.net,t.fee,t.payout,t.net===0?'':group.payoutDates.join(' · ')];}
  var historyHeaders=['예약번호','포트원 거래번호','거래일시','지역','담당부서','상품명','서비스 이용일','결제수단','카드사','거래구분','거래금액','지급예정일','취소 티켓 번호','취소사유'];
  function historyDetail(e){var p=payment(e);return [p.reservation,p.impUid||'',e.at,p.region,p.department,p.program,p.serviceDate,p.easyPay||p.method,p.card==='해당 없음'?'':p.card,e.type==='취소'?state(e):'승인',e.amount,e.type==='취소'?'':e.paidOutDate,(e.ticketIds||[]).join(', '),e.reason||''];}
  function sheets(rows,f) {
    var t=totals(rows), reservationGroups=groups(rows);
    var legacyScope=(f.scope||'').split(' · '), selectedRegion=f.region||legacyScope[0]||'전체', selectedDepartment=f.department||legacyScope[1]||'전체';
    var detailRows=reservationGroups.map(ledgerDetail), detailStart=11, detailEnd=detailStart+detailRows.length, totalRow=detailEnd+1;
    var workbookRows=[[],['월 정산 내역'],['조회 기간',(f.start||'전체')+' ~ '+(f.end||'전체')],['지역 · 담당 부서',selectedRegion+' · '+selectedDepartment],['정산 기준',f.basis==='service'?'서비스 이용 완료일 기준. 전체취소 건은 예정 서비스 이용일 기준으로 포함합니다.':'거래일 기준'],['카드사',f.card||'전체 카드사'],['승인금액','취소금액','취소 제외 매출','수수료','입금예정액'],[t.approved,t.cancelled,t.net,t.fee,t.payout],[],[],ledgerHeaders].concat(detailRows);
    workbookRows.push(['합계','','','',t.approved,'',t.cancelled,t.net,t.fee,t.payout,'']);
    return [{name:'월 정산',rows:workbookRows,layout:{widths:[18,24,24,16,16,14,16,17,15,17,17],tableRanges:[{startRow:7,endRow:8,startCol:0,endCol:4},{startRow:detailStart,endRow:totalRow,startCol:0,endCol:10}],headerRows:[7,detailStart],totalRows:[totalRow],titleRow:2,noteRows:[9],freezeRows:detailStart,freezeCols:2,filter:true,filterRow:detailStart,filterEndRow:detailEnd,filterEndCol:10,statusCol:5,statusRange:{startRow:detailStart+1,endRow:detailEnd},merges:['A2:K2','B3:K3','B4:K4','B5:K5','B6:K6'],printHeader:detailStart}}];
  }
  root.SettlementLedger={payments:payments,events:events,payment:payment,fee:fee,state:state,balance:balance,balanceAt:balanceAt,filter:filter,totals:totals,groups:groups,ledgerDetail:ledgerDetail,ledgerHeaders:ledgerHeaders,reservationStatus:reservationStatus,historyDetail:historyDetail,historyHeaders:historyHeaders,sheets:sheets,monthlyPayoutDate:monthlyPayoutDate,pgFeeRate:PG_FEE_RATE};
})(typeof window==='undefined'?globalThis:window);
