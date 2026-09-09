const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../admin.js'), 'utf8');
function runtime(reservations = [], allowed = true) {
  const ctx = { programCatalog: () => [{key:'ride',location:'서울',programName:'포니 타기'}], canManageRegion: () => allowed, localStorage: {getItem: () => JSON.stringify({reservations})}, reservationStoreKey:'store', demoReservations:[], sessionData:{ride:[['1회차','10:00','10:20',0,8,'판매중']]}, catalogState:{sessionOverrides:{},addedSessions:[]}, confirm:()=>true, notify:()=>{}, activeSessionKey:null, persistSession:(s)=>{ctx.saved=s;} };
  vm.createContext(ctx);
  for (const name of ['sessionDeletionReason','deleteSession','sessionsForProgram']) {
    const start = source.indexOf('  function '+name+'(');
    vm.runInContext(source.slice(start, source.indexOf('\n  }',start)+4),ctx);
  }
  return ctx;
}
const session = {key:'ride-session-0',programKey:'ride',start:'10:00',end:'10:20'};
test('deletes only a session without history and removes it from counts',()=>{
 const ctx=runtime(); ctx.deleteSession(session); assert.equal(ctx.saved.deleted,true); assert.equal(ctx.saved.active,false);
 ctx.catalogState.sessionOverrides[session.key]=ctx.saved; assert.equal(ctx.sessionsForProgram('ride').length,0);
});
test('cancelled and list-hidden reservation history still blocks deletion',()=>{
 const ctx=runtime([{id:'old',programKey:'ride',time:'10:00 ~ 10:20',status:'cancelled'}]); ctx.deletedReservationIds=['old']; ctx.deleteSession(session); assert.equal(ctx.saved,undefined); assert.match(ctx.sessionDeletionReason(session),/예약 이력/);
});
test('original time and stable session keys protect edited sessions',()=>{
 const ctx=runtime([{programKey:'ride',time:'10:00~10:20'}]); assert.ok(ctx.sessionDeletionReason({...session,start:'11:00',end:'11:20'}));
 const keyed=runtime([{sessionKey:session.key,time:'09:00~09:20'}]); assert.ok(keyed.sessionDeletionReason(session));
});
test('foreign region and unreadable history block deletion',()=>{
 const denied=runtime([],false); denied.deleteSession(session); assert.equal(denied.saved,undefined);
 const invalid=runtime(); invalid.localStorage.getItem=()=>'{'; invalid.deleteSession(session); assert.equal(invalid.saved,undefined);
});
test('cancel confirmation and newly created history prevent deletion',()=>{
 const cancelled=runtime(); cancelled.confirm=()=>false; cancelled.deleteSession(session); assert.equal(cancelled.saved,undefined);
 const changed=runtime(); changed.confirm=()=>{changed.demoReservations.push({programKey:'ride',time:'10:00~10:20'});return true;}; changed.deleteSession(session); assert.equal(changed.saved,undefined);
});
