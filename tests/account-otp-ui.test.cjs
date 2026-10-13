const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../account-admin.js'), 'utf8');
function harness() {
  const nodes = new Map();
  const ctx = {accounts: [], activeAccountKey: null, pendingOtpRegistered: false, verifiedOtpLoginId: '', canManageCommercePermission: () => true, hasCommercePermission: () => false,
    byId(id) {if (!nodes.has(id)) nodes.set(id, {value:'',checked:false,focus(){},close(){ctx.closed=true;}});return nodes.get(id);},
    notify(message){ctx.message=message;},save(){ctx.persisted=true;},render(){}};
  vm.createContext(ctx);
  vm.runInContext(source.slice(source.indexOf('  function saveAccount()'), source.indexOf('  function renderOtpCard(')),ctx);
  ctx.byId('account-location').value='서울';ctx.byId('account-department').value='홍보부';
  ctx.byId('account-login-id').value='otp_review';ctx.byId('account-password').value='preview-only';
  return ctx;
}
test('new accounts are issued pending OTP without issuer enrollment',()=>{
  const c=harness();c.saveAccount();assert.equal(c.persisted,true);assert.equal(c.accounts[0].otpRegistered,false);assert.equal(c.closed,true);
});
test('existing account can retain unregistered state for next-login enrollment',()=>{
  const c=harness();c.activeAccountKey='existing';c.accounts=[{key:'existing',loginId:'otp_review',type:'department',lastLogin:'미접속'}];
  c.byId('account-password').value='';c.saveAccount();assert.equal(c.persisted,true);assert.equal(c.accounts[0].otpRegistered,false);
});
test('OTP invalid code cannot activate or deactivate an account',()=>{
  const c=harness();c.byId('account-otp-code').setAttribute=()=>{};c.byId('account-otp-code').removeAttribute=()=>{};c.byId('account-otp-feedback').classList={remove(){}};
  vm.runInContext(source.slice(source.indexOf('  function checkOtpCode('),source.indexOf('  function bindOtpInput(')),c);
  for(const value of ['', '12345', '000000']) {c.byId('account-otp-code').value=value;assert.equal(c.checkOtpCode('account-otp'),false);}
  c.byId('account-otp-code').value='123456';assert.equal(c.checkOtpCode('account-otp'),true);
});
