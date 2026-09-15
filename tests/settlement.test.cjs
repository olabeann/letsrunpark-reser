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
 assert.equal(L.headers.length,14);
 assert.ok(L.payments.every(p=>/^LRP-\d{6}-\d{5}$/.test(p.reservation)));
 assert.equal(L.filter({...may,search:'LRP-260510-00003'},()=>true).length,3);
 assert.ok(!L.payments.some(p=>p.method==='계좌이체'));
 assert.ok(!L.headers.includes('예약번호'));
 assert.ok(!L.headers.includes('수수료 공급가액'));
 const rows=L.filter({...may,card:'국민카드',start:'2026-05-31'},()=>true);
 assert.equal(rows.length,1);assert.equal(L.totals(rows).net,10000);
 assert.equal(L.sheets(rows,may)[1].rows.length,2);
 assert.equal(L.filter({...may,type:'취소'},()=>true).length,4);
});
test('demo fees are populated and June cancellation does not rewrite May',()=>{
 const row=L.filter({...may,start:'2026-05-31'},()=>true)[0];
 assert.equal(L.pgFeeRate,0.02);
 assert.equal(L.fee(row),200);assert.equal(L.detail(row)[L.headers.indexOf('수수료')],200);
 assert.ok(L.events.every(e=>Math.abs(L.fee(e))===Math.round(Math.abs(e.amount)*0.02)));
 assert.ok(L.events.every(e=>Number.isFinite(L.fee(e))));
 assert.equal(L.totals(L.filter({start:'2026-06-01',end:'2026-06-30'},()=>true)).net,-10000);
});

test('completed services are scheduled for the eighth of the following month',()=>{
 assert.equal(L.monthlyPayoutDate('2026-06-06'),'2026-07-08');
 assert.equal(L.monthlyPayoutDate('2026-06-01'),'2026-07-08');
 assert.equal(L.monthlyPayoutDate('2026-06-30'),'2026-07-08');
 assert.equal(L.monthlyPayoutDate('2026-12-31'),'2027-01-08');
 assert.ok(L.events.filter(e=>e.type==='승인').every(e=>e.paidOutDate==='2026-07-08'));
 assert.ok(L.events.filter(e=>e.type==='취소').every(e=>e.paidOutDate===''));
 const cancelled=L.events.find(e=>e.type==='취소');
 assert.equal(L.detail(cancelled)[12],'');
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
 assert.deepEqual(partial.map(e=>e.ticketIds),[['LRP-260510-00003-T01'],['LRP-260510-00003-T02','LRP-260510-00003-T03']]);
 assert.ok(partial.every(e=>L.state(e)==='부분 취소'));
 const full=L.events.find(e=>e.paymentId==='demo-pay-004'&&e.type==='취소');
 assert.equal(L.state(full),'전체 취소');
 assert.deepEqual(full.ticketIds,['LRP-260511-00004-T01','LRP-260511-00004-T02']);
});

test('admin rendering and download use identical filtered ledger and reject reversed dates',async()=>{
 const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),source=fs.readFileSync(path.join(__dirname,'../admin.js'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../admin-reference.css'),'utf8');
 const elements={};
 for(const id of ['settlement-start-date','settlement-end-date','settlement-card-filter','settlement-scope-filter','settlement-type-filter','settlement-detail-search','download-settlement','settlement-date-error','settlement-metrics','settlement-card-count','settlement-summary-body','settlement-summary-foot','settlement-detail-body'])elements[id]={value:'',innerHTML:'',textContent:'',addEventListener(_,fn){this.click=fn;}};
 elements['settlement-start-date'].value='2026-06-01';elements['settlement-end-date'].value='2026-06-30';elements['settlement-detail-search'].value='포니 타기';
 let downloaded;
 const ctx={SettlementLedger:L,SettlementXlsx,byId:id=>elements[id],canManageDepartment:()=>true,money:n=>n+'원',escapeHtml:String,notify:()=>{},setTimeout:()=>{},URL:{createObjectURL:blob=>{downloaded=blob;return 'blob:test';}},document:{createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}}};
 vm.createContext(ctx);
 vm.runInContext(source.slice(source.indexOf('  function settlementFilters()'),source.indexOf('  function closeSettlementDrawer()')),ctx);
 vm.runInContext(source.slice(source.indexOf('  byId("download-settlement").addEventListener'),source.indexOf('  function openDeveloperPolicy()')),ctx);
 assert.equal(ctx.renderSettlementSummary(),true);
 assert.match(elements['settlement-card-count'].textContent,/4개 거래/);
 assert.ok(!elements['settlement-detail-body'].innerHTML.includes('확인 대기'));
 assert.match(elements['settlement-detail-body'].innerHTML, /<td>2026-06-06<\/td><td>카드<\/td><td>국민카드<\/td>/);
 assert.match(elements['settlement-detail-body'].innerHTML, /지급예정액<\/dt><dd>0원<\/dd>/);
 assert.match(elements['settlement-detail-body'].innerHTML, /지급예정일<\/dt><dd>—<\/dd>/);
 assert.match(elements['settlement-detail-body'].innerHTML, /예약번호<\/dt><dd>LRP-260510-00003<\/dd>/);
 assert.match(elements['settlement-detail-body'].innerHTML, /취소 티켓 번호<\/dt><dd>LRP-260510-00003-T01<\/dd>/);
 assert.match(elements['settlement-detail-body'].innerHTML, /<strong>LRP-260510-00003<\/strong><small>포니 타기<\/small>/);
 assert.match(css, /settlement-readable-table th:first-child[^}]*min-width:170px/);
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
 assert.equal(L.sheets(rows,f)[1].rows[0][3],'서비스 이용일');
 assert.equal(L.sheets(rows,f)[1].rows[1][3],'2026-06-06');
});

test('date basis changes both filtered records and Excel period description',()=>{
 const transaction={basis:'transaction',start:'2026-05-01',end:'2026-05-31'};
 const service={basis:'service',start:'2026-06-01',end:'2026-06-30',asOf:'2026-07-01T00:00:00+09:00'};
 assert.equal(L.filter(transaction,()=>true).length,10);
 assert.equal(L.filter(service,()=>true).length,6);
 assert.match(L.sheets(L.filter(transaction,()=>true),transaction)[0].rows[1][1],/거래일 기준/);
 assert.match(L.sheets(L.filter(service,()=>true),service)[0].rows[1][1],/서비스 완료일 기준/);
});
