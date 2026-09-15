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
  events.forEach(function(e){ e.payOutAmount = e.amount-e.feeAmount; });
  function balance(e) { var p=payment(e); return p.amount+events.filter(function(c){return c.paymentId===p.id && c.type==='취소' && c.at<=e.at;}).reduce(function(n,c){return n+c.amount;},0); }
  function state(e) { return e.type==='승인'?'결제 완료':balance(e)===0?'전체 취소':'부분 취소'; }
  function payment(e) { return payments.find(function(p){return p.id===e.paymentId;}); }
  function fee(e) { return e.feeAmount; }
  function filter(f, allowed) {
    return events.filter(function(e){
      var p=payment(e), serviceBasis=f.basis==='service';
      var date=serviceBasis ? (p.completedAt || '').slice(0,10) : e.at.slice(0,10);
      if(serviceBasis && (!p.completedAt || Date.parse(p.completedAt)>Date.parse(f.asOf || new Date().toISOString()) || Date.parse(e.at.replace(' ','T')+'+09:00')>Date.parse(p.completedAt)))return false;
      return allowed(p.region,p.department) && (!f.region || p.region===f.region) && (!f.department || p.department===f.department) && (!f.scope || p.region+' · '+p.department===f.scope) && (!f.start || date>=f.start) && (!f.end || date<=f.end) && (!f.card || p.card===f.card) && (!f.search || [p.reservation,p.program,p.card,p.method,p.easyPay,p.serviceDate].concat(e.ticketIds || []).join(' ').toLowerCase().includes(f.search.toLowerCase()));
    }).sort(function(a,b){return b.at.localeCompare(a.at);});
  }
  function totals(rows) {
    return rows.reduce(function(t,e){t.count++; if(e.amount>=0){t.approved+=e.amount;t.approvals++;}else{t.cancelled-=e.amount;t.cancels++;}t.net+=e.amount;var f=fee(e);if(f===null)t.pending++;else{t.fee+=f;t.payout+=e.payOutAmount;}return t;},{count:0,approved:0,approvals:0,cancelled:0,cancels:0,net:0,fee:0,payout:0,pending:0});
  }
  var headers=['지역','담당부서','상품명','서비스 이용일','결제수단','카드사','거래구분','승인금액','취소금액','수수료','거래일시','지급예정액','지급예정일','취소사유'];
  function detail(e){var p=payment(e);return [p.region,p.department,p.program,p.serviceDate,p.easyPay || p.method,p.card,e.type==='취소'?state(e):'승인',Math.max(0,e.amount),Math.max(0,-e.amount),fee(e),e.at,e.payOutAmount,e.type==='취소'?'':e.paidOutDate,e.reason];}
  function sheets(rows,f) {
    var t=totals(rows), groups=Array.from(new Set(rows.map(function(e){var p=payment(e);return p.region+' · '+p.department+' · '+p.program;})));
    var legacyScope=(f.scope||'').split(' · '), selectedRegion=f.region||legacyScope[0]||'전체', selectedDepartment=f.department||legacyScope[1]||'전체';
    var summary=[[],['조회 기간',(f.start||'전체')+' ~ '+(f.end||'전체')+(f.basis==='service'?' · 서비스 완료일 기준':' · 거래일 기준')],['지역',selectedRegion],['담당 부서',selectedDepartment],['조회 조건','카드사: '+(f.card||'전체')+' / 검색어: '+(f.search||'없음')],['생성시각',new Date().toLocaleString('ko-KR',{timeZone:'Asia/Seoul',hour12:false})+' (한국시간)'],[],['승인금액','취소금액','순매출','수수료','지급예정액'],[t.approved,t.cancelled,t.net,t.fee,t.payout],[],['지역·부서·상품','승인건수','승인금액','취소건수','취소금액','순매출','수수료','지급예정액']];
    groups.forEach(function(group){var s=totals(rows.filter(function(e){var p=payment(e);return p.region+' · '+p.department+' · '+p.program===group;}));summary.push([group,s.approvals,s.approved,s.cancels,s.cancelled,s.net,s.fee,s.payout]);});
    var totalRow = summary.length + 1;
    summary.push(['합계',t.approvals,t.approved,t.cancels,t.cancelled,t.net,t.fee,t.payout]);
    summary.push([],['집계 기준',f.basis==='service'?'기간 내 서비스 완료 건의 결제액에서 완료 전 부분취소액을 차감합니다. 미이용·전액취소 건은 제외합니다.':'기간 내 승인금액에서 취소금액을 차감합니다.'],['수수료·지급예정액','PG 수수료는 거래금액의 2%입니다. 지급예정액은 순매출에서 수수료를 차감한 금액이며, 취소 수수료 조정은 음수입니다.']);
    return [
      {name:'매출 요약',rows:summary,layout:{widths:[39,15,16,15,20,17,17,20],tableRanges:[{startRow:8,endRow:9,startCol:0,endCol:4},{startRow:11,endRow:totalRow,startCol:0,endCol:7}],headerRows:[8,11],totalRows:[totalRow],accentHeaderRows:[8],totalAccentCol:5,freezeRows:11,merges:['B2:H2','B3:H3','B4:H4','B5:H5','B6:H6','B'+(totalRow+2)+':H'+(totalRow+2),'B'+(totalRow+3)+':H'+(totalRow+3)],noteRows:[totalRow+2,totalRow+3],printHeader:11}},
      {name:'개별 거래내역',rows:[headers].concat(rows.map(detail)),layout:{widths:[12,26,20,15,16,16,15,17,17,17,23,19,17,28],tableRanges:[{startRow:1,endRow:rows.length+1,startCol:0,endCol:13}],headerRows:[1],freezeRows:1,freezeCols:1,filter:true,amountCols:[7,8],statusCol:6,printHeader:1}}
    ];
  }
  root.SettlementLedger={payments:payments,events:events,payment:payment,fee:fee,state:state,balance:balance,filter:filter,totals:totals,detail:detail,headers:headers,sheets:sheets,monthlyPayoutDate:monthlyPayoutDate,pgFeeRate:PG_FEE_RATE};
})(typeof window==='undefined'?globalThis:window);
