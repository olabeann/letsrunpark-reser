const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../settlement.js');
require('../xlsx-export.js');
const L=globalThis.SettlementLedger;
const may={start:'2026-05-01',end:'2026-05-31'};
test('May ledger counts approvals and each cancellation, including prior-month payment',()=>{
 const rows=L.filter(may,()=>true),t=L.totals(rows);
 assert.equal(rows.length,10);assert.equal(t.approved,73000);assert.equal(t.cancelled,30000);assert.equal(t.net,43000);assert.equal(t.pending,0);assert.equal(t.fee,860);assert.equal(t.payout,42140);
 assert.ok(rows.some(e=>e.paymentId==='demo-pay-006'&&e.type==='취소'));
 assert.equal(rows.filter(e=>e.paymentId==='demo-pay-003'&&e.type==='취소').length,2);
});
test('exact dates, cards, search and scope constrain screen/export source identically',()=>{
 assert.equal(L.filter({...may,start:'2026-05-03',end:'2026-05-08'},()=>true).length,0);
 assert.equal(L.filter(may,()=>false).length,0);
 assert.equal(L.filter({...may,scope:'제주 · 제주고객안전부'},()=>true).length,0);
 assert.equal(L.filter({...may,scope:'서울 · 공원화사업추진TF'},()=>true).length,10);
 assert.equal(L.filter({...may,region:'제주'},()=>true).length,0);
 assert.equal(L.filter({...may,region:'서울',department:'공원화사업추진TF'},()=>true).length,10);
 assert.equal(L.filter({...may,region:'서울',department:'서울고객안전부'},()=>true).length,0);
 assert.equal(L.ledgerHeaders.length,12);
 assert.equal(L.historyHeaders.length,14);
 assert.ok(L.payments.every(p=>/^LRP-\d{6}-\d{5}$/.test(p.reservation)));
 assert.equal(L.filter({...may,search:'LRP-260510-00003'},()=>true).length,3);
 assert.ok(!L.payments.some(p=>p.method==='계좌이체'));
 assert.ok(L.payments.every(p=>p.method==='카드'&&!p.easyPay));
 assert.equal(L.ledgerHeaders[0],'예약번호');
 assert.equal(L.historyHeaders[1],'포트원 거래번호');
 assert.ok(!L.ledgerHeaders.includes('수수료 공급가액'));
 const rows=L.filter({...may,card:'국민카드',start:'2026-05-31'},()=>true);
 assert.equal(rows.length,1);assert.equal(L.totals(rows).net,10000);
 const sheets=L.sheets(rows,may);
 assert.deepEqual(sheets.map(sheet=>sheet.name),['매출 요약','결제·정산 원장','거래 이력']);
 assert.equal(sheets[1].rows.length,2);
 assert.equal(sheets[2].rows.length,2);
 assert.equal(L.filter({...may,type:'취소'},()=>true).length,10,'summary filters must keep approvals and cancellations together');
});
test('demo fees are populated and June cancellation does not rewrite May',()=>{
 const row=L.filter({...may,start:'2026-05-31'},()=>true)[0];
 assert.equal(L.pgFeeRate,0.02);
 assert.equal(L.fee(row),200);
 assert.ok(L.events.every(e=>Math.abs(L.fee(e))===Math.round(Math.abs(e.amount)*0.02)));
 assert.ok(L.events.every(e=>Number.isFinite(L.fee(e))));
 assert.equal(L.totals(L.filter({start:'2026-06-01',end:'2026-06-30'},()=>true)).net,-10000);
});

test('Excel ledger groups each reservation and keeps source events in a separate history sheet',()=>{
 const rows=L.filter(may,()=>true),sheets=L.sheets(rows,may),ledger=sheets[1].rows,history=sheets[2].rows;
 assert.equal(ledger.length,L.groups(rows).length+1);
 assert.equal(history.length,rows.length+1);
 const grouped=ledger.find(row=>row[0]==='LRP-260510-00003');
 assert.deepEqual(grouped.slice(5),[15000,10000,5000,100,4900,'2026-07-08',3]);
 const cancelled=history.find(row=>row[0]==='LRP-260510-00003'&&row[9]==='부분 취소');
 assert.match(cancelled[1],/^imp_/);
 assert.equal(cancelled[10],-5000);
 assert.equal(cancelled[11],'');
 assert.match(cancelled[12],/^LRP-260510-00003-T0[12]$/);
});

test('completed services are scheduled for the eighth of the following month',()=>{
 assert.equal(L.monthlyPayoutDate('2026-06-06'),'2026-07-08');
 assert.equal(L.monthlyPayoutDate('2026-06-01'),'2026-07-08');
 assert.equal(L.monthlyPayoutDate('2026-06-30'),'2026-07-08');
 assert.equal(L.monthlyPayoutDate('2026-12-31'),'2027-01-08');
 assert.ok(L.events.filter(e=>e.type==='승인').every(e=>e.paidOutDate==='2026-07-08'));
 assert.ok(L.events.filter(e=>e.type==='취소').every(e=>e.paidOutDate===''));
 const cancelled=L.events.find(e=>e.type==='취소');
 assert.equal(L.historyDetail(cancelled)[11],'');
});
test('xlsx is a ZIP workbook with numeric amounts and literal formula-like strings',async()=>{
 const blob=SettlementXlsx.workbook([{name:'안전',rows:[['ID','금액'],['=1+1',27000],['00123',null]]}]);
 const bytes=Buffer.from(await blob.arrayBuffer());
 assert.equal(bytes.readUInt32LE(0),0x04034b50);
 assert.ok(bytes.includes(Buffer.from('t="inlineStr"><is><t xml:space="preserve">=1+1')));
 assert.ok(bytes.includes(Buffer.from('<v>27000</v>')));
 assert.ok(!bytes.includes(Buffer.from('<f>')));
 assert.ok(bytes.includes(Buffer.from('state="frozen"')));
});

test('cancellation rows distinguish partial from full and preserve event-time balance',()=>{
 const partial=L.events.filter(e=>e.paymentId==='demo-pay-003'&&e.type==='취소');
 assert.deepEqual(partial.map(L.balance),[10000,5000]);
 assert.deepEqual(partial.map(e=>e.ticketIds),[['LRP-260510-00003-T01'],['LRP-260510-00003-T02']]);
 assert.ok(partial.every(e=>L.state(e)==='부분 취소'));
 const full=L.events.find(e=>e.paymentId==='demo-pay-004'&&e.type==='취소');
 assert.equal(L.state(full),'전체 취소');
 assert.deepEqual(full.ticketIds,['LRP-260511-00004-T01','LRP-260511-00004-T02']);
});

test('admin rendering and download use identical filtered ledger and reject reversed dates',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),source=fs.readFileSync(path.join(__dirname,'../admin.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../admin-reference.css'),'utf8'),html=fs.readFileSync(path.join(__dirname,'../admin.html'),'utf8');
  const elements={};
 for(const id of ['settlement-start-date','settlement-end-date','settlement-card-filter','settlement-region-filter','settlement-department-filter','settlement-detail-search','download-settlement','settlement-date-error','settlement-metrics','settlement-card-count','settlement-summary-body','settlement-summary-foot','settlement-detail-body'])elements[id]={value:'',innerHTML:'',textContent:'',addEventListener(_,fn){this.click=fn;}};
 assert.ok(!html.includes('id="settlement-type-filter"'));
 assert.ok(!source.includes('byId("settlement-type-filter")'));
 elements['settlement-start-date'].value='2026-06-01';elements['settlement-end-date'].value='2026-06-30';elements['settlement-detail-search'].value='포니 타기';
 let downloaded;
 const ctx={SettlementLedger:L,SettlementXlsx,byId:id=>elements[id],canManageDepartment:()=>true,money:n=>n+'원',escapeHtml:String,notify:()=>{},setTimeout:()=>{},URL:{createObjectURL:blob=>{downloaded=blob;return 'blob:test';}},document:{createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}}};
 vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('  function settlementFilters()'),source.indexOf('  function closeSettlementDrawer()')),ctx);
 vm.runInContext(source.slice(source.indexOf('  byId("download-settlement").addEventListener'),source.indexOf('  function openDeveloperPolicy()')),ctx);
 assert.equal(ctx.renderSettlementSummary(),true);
 assert.match(elements['settlement-card-count'].textContent,/2건 결제 · 4개 거래/);
 assert.ok(!elements['settlement-detail-body'].innerHTML.includes('확인 대기'));
 assert.match(elements['settlement-detail-body'].innerHTML, /LRP-260510-00003[\s\S]*15000원[\s\S]*−10000원[\s\S]*5000원[\s\S]*100원[\s\S]*4900원/);
 assert.match(elements['settlement-detail-body'].innerHTML, /aria-label="거래 3건 펼치기"/);
 assert.match(elements['settlement-detail-body'].innerHTML, /승인 · 취소 거래 이력/);
 assert.match(elements['settlement-detail-body'].innerHTML, /결제수단<\/dt><dd>카드<\/dd>[\s\S]*카드사<\/dt><dd>국민카드<\/dd>/);
 assert.match(elements['settlement-detail-body'].innerHTML, /취소 티켓 번호<\/dt><dd>LRP-260510-00003-T01<\/dd>/);
 assert.match(elements['settlement-detail-body'].innerHTML, /<strong>LRP-260510-00003<\/strong><small>포니 타기<\/small>/);
 assert.equal((elements['settlement-detail-body'].innerHTML.match(/<strong>LRP-260510-00003<\/strong>/g)||[]).length,1);
 assert.match(css, /settlement-readable-table \{[^}]*table-layout:fixed/);
 assert.match(css, /settlement-readable-table th \{[^}]*text-align:center[^}]*vertical-align:middle/);
 assert.match(css, /settlement-readable-table td \{[^}]*text-align:center[^}]*vertical-align:middle/);
 assert.match(css, /money-cell \{ text-align:center/);
 assert.match(css, /settlement-readable-table th:first-child[^}]*text-align:left/);
 assert.match(css, /settlement-readable-table th:first-child[^}]*padding-left:32px/);
 assert.match(css, /settlement-readable-table th:last-child[^}]*padding-right:32px[^}]*text-align:right/);
 assert.match(css, /settlement-timeline-item:not\(:last-child\):after/);
 assert.ok(!elements['settlement-detail-body'].innerHTML.includes('<small>수수료'));
 assert.match(elements['settlement-metrics'].innerHTML,/<small>승인금액<\/small><strong>42000원<\/strong>/);
 assert.match(elements['settlement-metrics'].innerHTML,/취소 수수료 조정 반영 완료/);
 assert.match(elements['settlement-metrics'].innerHTML,/순매출 - 수수료/);
 assert.ok(!elements['settlement-detail-body'].innerHTML.includes('포니랑 놀기'));
 elements['download-settlement'].click();assert.ok(downloaded instanceof Blob);
 elements['settlement-start-date'].value='2026-07-01';
 assert.equal(ctx.renderSettlementSummary(),false);assert.equal(elements['download-settlement'].disabled,true);
 downloaded=null;elements['download-settlement'].click();assert.equal(downloaded,null);
});

test('default Excel cells have no borders; only declared table ranges have borders', async()=>{
 const sourceSheets=L.sheets(L.filter(may,()=>true),may);
 const bytes=Buffer.from(await SettlementXlsx.workbook(sourceSheets).arrayBuffer());
 const entries={};let offset=0;
 while(bytes.readUInt32LE(offset)===0x04034b50){
  const size=bytes.readUInt32LE(offset+18),nameLength=bytes.readUInt16LE(offset+26),extraLength=bytes.readUInt16LE(offset+28);
  const name=bytes.toString('utf8',offset+30,offset+30+nameLength),start=offset+30+nameLength+extraLength;
  entries[name]=bytes.toString('utf8',start,start+size);offset=start+size;
 }
 const styles=entries['xl/styles.xml'].match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)[1];
 const borders=[...styles.matchAll(/<xf\b[^>]*borderId="(\d+)"/g)].map(m=>Number(m[1]));
 assert.equal(borders[0],0,'unspecified cells must inherit a borderless style');
 sourceSheets.forEach((sheet,index)=>{
  const xml=entries['xl/worksheets/sheet'+(index+1)+'.xml'];
  for(const match of xml.matchAll(/<c r="([A-Z]+)(\d+)" s="(\d+)"/g)){
   const column=[...match[1]].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1,row=Number(match[2]);
   const inTable=sheet.layout.tableRanges.some(r=>row>=r.startRow&&row<=r.endRow&&column>=r.startCol&&column<=r.endCol);
   assert.equal(borders[Number(match[3])],inTable?1:0,`sheet ${index+1} ${match[1]}${row}`);
  }
  assert.ok(!/<col\b[^>]*\bstyle=/.test(xml),'column styles must not extend borders to empty rows');
 });
});

test('service month includes earlier payments and partial refunds but excludes undelivered cancellations',()=>{
 const f={basis:'service',start:'2026-06-01',end:'2026-06-30',asOf:'2026-07-01T00:00:00+09:00'};
 const rows=L.filter(f,()=>true),t=L.totals(rows);
 assert.equal(rows.length,6);assert.equal(t.approved,55000);assert.equal(t.cancelled,10000);assert.equal(t.net,45000);assert.equal(t.fee,900);assert.equal(t.payout,44100);assert.equal(t.net-t.fee,t.payout);
 assert.ok(rows.every(e=>L.payment(e).completedAt));
 assert.ok(!rows.some(e=>['demo-pay-004','demo-pay-005','demo-pay-006'].includes(e.paymentId)));
 assert.equal(L.filter({...f,start:'2026-05-01',end:'2026-05-31'},()=>true).length,0);
 assert.equal(L.filter({...f,asOf:'2026-06-06T14:59:59+09:00'},()=>true).length,0);
 assert.equal(L.sheets(rows,f)[1].rows[0][4],'서비스 이용일');
 assert.equal(L.sheets(rows,f)[1].rows[1][4],'2026-06-06');
});

test('date basis changes both filtered records and Excel period description',()=>{
 const transaction={basis:'transaction',start:'2026-05-01',end:'2026-05-31'};
 const service={basis:'service',start:'2026-06-01',end:'2026-06-30',asOf:'2026-07-01T00:00:00+09:00'};
 assert.equal(L.filter(transaction,()=>true).length,10);
 assert.equal(L.filter(service,()=>true).length,6);
 assert.match(L.sheets(L.filter(transaction,()=>true),transaction)[0].rows[1][1],/거래일 기준/);
 assert.match(L.sheets(L.filter(service,()=>true),service)[0].rows[1][1],/서비스 완료일 기준/);
});
