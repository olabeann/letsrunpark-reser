const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../account-admin.js'), 'utf8');
function harness() {
  const nodes = new Map();
  const ctx = {storeKey: "letsrunParkDepartmentAccountsV3", accounts: [], activeAccountKey: null, pendingOtpRegistered: false, verifiedOtpLoginId: '', pendingOtpResetKey: null, canManageCommercePermission: () => true, hasCommercePermission: () => false,
    byId(id) {if (!nodes.has(id)) nodes.set(id, {value:'',checked:false,classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},focus(){},showModal(){this.open=true;},close(){this.open=false;ctx.closed=true;}});return nodes.get(id);},
    notify(message){ctx.message=message;},save(){ctx.persisted=true;},render(){}};
  ctx.sessionStorage = {getItem: () => 'admin'};
  ctx.localStorage = {setItem(key,value) {if(ctx.storageFails) throw Error('storage blocked');ctx.persisted=true;ctx.stored=JSON.parse(value);}};
  vm.createContext(ctx);
  vm.runInContext(source.slice(source.indexOf('  function saveAccount()'), source.indexOf('  function renderOtpSettings(')),ctx);
  vm.runInContext(source.slice(source.indexOf('  function renderOtpSettings()'),source.indexOf('  function bindOtpInput(')),ctx);
  ctx.byId('account-location').value='서울';ctx.byId('account-department').value='홍보부';
  ctx.byId('account-otp-required').checked=true;ctx.byId('account-login-id').value='otp_review';ctx.byId('account-password').value='preview-only';
  return ctx;
}
test('new account cannot be issued before OTP verification or with invalid code',()=>{
  const c=harness();c.saveAccount();assert.equal(c.accounts.length,0);assert.equal(c.persisted,undefined);
  for(const value of ['', '12345', '000000']) {
    c.byId('account-otp-code').value=value;c.verifyIssuerOtp();c.saveAccount();assert.equal(c.accounts.length,0);
  }
});
test('issuer verification is staged until save and stored for login verification',()=>{
  const c=harness();c.byId('account-otp-code').value='123456';c.verifyIssuerOtp();
  assert.equal(c.persisted,undefined);assert.equal(c.accounts.length,0);
  c.saveAccount();assert.equal(c.persisted,true);assert.equal(c.accounts[0].otpRegistered,true);assert.equal(c.closed,true);
});
test('verification for another login ID cannot issue a new account',()=>{
  const c=harness();c.byId('account-otp-code').value='123456';c.verifyIssuerOtp();
  c.byId('account-login-id').value='different_id';c.saveAccount();assert.equal(c.accounts.length,0);
});
test('department session cannot verify or save an account',()=>{
  const c=harness();c.canManageCommercePermission=()=>false;c.byId('account-otp-code').value='123456';
  c.verifyIssuerOtp();c.saveAccount();assert.equal(c.pendingOtpRegistered,false);assert.equal(c.accounts.length,0);
});
test('existing accounts preserve OTP state and cannot enroll from account management',()=>{
  for (const registered of [false,true]) {
    const c=harness();c.activeAccountKey='existing';c.accounts=[{key:'existing',loginId:'otp_review',type:'department',otpRegistered:registered,lastLogin:'미접속'}];
    c.byId('account-password').value='';c.saveAccount();assert.equal(c.accounts[0].otpRegistered,registered);
    if(!registered) {c.byId('account-otp-code').value='123456';c.verifyIssuerOtp();c.saveAccount();assert.equal(c.accounts[0].otpRegistered,false);}
  }
});
test('both account dialogs expose enrollment and remove the old issuer prohibition',()=>{
  for(const name of ['account-admin.html']) {
    const html=fs.readFileSync(path.join(__dirname,'..',name),'utf8');
    assert.match(html,/id="account-otp-code"/);assert.match(html,/id="account-otp-verify"/);
    assert.doesNotMatch(html,/발급 담당자는 OTP를 대신 등록하지 않습니다/);
  }
});




test('existing accounts show status only and issuance is the only administrator enrollment path',()=>{
 const c=harness();c.activeAccountKey='existing';c.renderOtpSettings();assert.equal(c.byId('account-otp-registration').hidden,true);
 c.byId('account-otp-code').value='123456';c.verifyIssuerOtp();assert.equal(c.pendingOtpRegistered,false);
 const html=fs.readFileSync(path.join(__dirname,'../account-admin.html'),'utf8');assert.doesNotMatch(html,/account-otp-reset|OTP 초기화/);
});
test('storage failure cannot issue an account after OTP verification',()=>{
 const c=harness();c.byId('account-otp-code').value='123456';c.verifyIssuerOtp();c.storageFails=true;c.saveAccount();assert.equal(c.accounts.length,0);assert.equal(c.closed,undefined);
});

test('issuer can persist optional enrollment without registering OTP',()=>{
  const c=harness();c.byId('account-otp-required').checked=false;c.saveAccount();
  assert.equal(c.accounts[0].otpRequired,false);assert.equal(c.accounts[0].otpRegistered,false);
});
