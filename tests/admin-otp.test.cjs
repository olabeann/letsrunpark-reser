const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../admin.js'), 'utf8');
function loginHarness(accounts = []) {
  const nodes = new Map(), storage = new Map([['letsrunParkDepartmentAccountsV3', JSON.stringify(accounts)]]);
  const context = { pendingOtpAccount: null, currentAccount: null, adminAccounts: [{ id: 'admin', password: '1234', scope: 'all' }],
    byId(id) { if (!nodes.has(id)) nodes.set(id, { value: '', hidden: false, dataset: {}, focus() {}, addEventListener(type, cb) { this[type] = cb; } }); return nodes.get(id); },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    saveAdminSession(id) { storage.set('session', id); }, setAdminLoginState() {}, renderAdminIdentity() {}, renderAdminNavigation() {}, lockAccountFilterSelects() {}, renderKioskProducts() {}, renderReservations() {}, refreshOperationScopeSelects() {}, refreshSettlementScopeFilter() {}, renderSettlementSummary() {}, restoreAdminRoute() {}, notify() {} };
  vm.createContext(context);
  const start = source.indexOf('  byId("admin-login-form").addEventListener("submit"');
  const end = source.indexOf('  document.querySelectorAll("[data-go-view]")', start);
  vm.runInContext(source.slice(start, end), context);
  return { context, storage, node: context.byId, submit(id) { context.byId(id).submit({ preventDefault() {} }); } };
}
test('password validation cannot create a session before OTP; invalid OTP remains blocked', () => {
  const h = loginHarness();
  h.node('admin-login-id').value = 'admin'; h.node('admin-login-password').value = '1234'; h.submit('admin-login-form');
  assert.equal(h.storage.has('session'), false);
  assert.equal(h.node('admin-otp-title').textContent, 'OTP 인증');
  assert.equal(h.node('admin-login-password').value, '');
  h.node('admin-otp-code').value = '000000'; h.submit('admin-otp-form');
  assert.equal(h.storage.has('session'), false);
  assert.equal(h.node('admin-otp-error').hidden, false);
  h.node('admin-otp-code').value = '123456'; h.submit('admin-otp-form');
  assert.equal(h.storage.get('session'), 'admin');
  assert.equal(h.context.pendingOtpAccount, null);
  assert.equal(h.node('admin-otp-code').value, '');
});
test('shared registration state takes precedence over legacy demo state', () => {
  const h = loginHarness([{ loginId: 'letsrun_admin', type: 'super', otpRegistered: true }]);
  assert.equal(h.context.readOtpRegistration('admin'), true);
  h.storage.set('letsrunParkOtpDemoV1', JSON.stringify({ admin: true }));
  h.storage.set('letsrunParkDepartmentAccountsV3', JSON.stringify([{ loginId: 'letsrun_admin', type: 'super', otpRegistered: false }]));
  assert.equal(h.context.readOtpRegistration('admin'), false);
  h.node('admin-login-id').value = 'admin'; h.node('admin-login-password').value = 'wrong'; h.submit('admin-login-form');
  assert.equal(h.context.pendingOtpAccount, null);
  assert.equal(h.storage.has('session'), false);
});

test('unregistered accounts cannot enroll during login',()=>{
 const h=loginHarness([{loginId:'letsrun_admin',type:'super',otpRegistered:false}]);h.node('admin-login-id').value='admin';h.node('admin-login-password').value='1234';h.submit('admin-login-form');
 assert.equal(h.context.pendingOtpAccount,null);assert.equal(h.storage.has('session'),false);assert.match(h.node('admin-login-error').textContent,/계정 발급 담당자/);
 assert.doesNotMatch(fs.readFileSync(require('node:path').join(__dirname,'../admin.html'),'utf8'),/admin-otp-setup|OTP 최초 등록/);
});

test('optional unregistered accounts skip enrollment after correct password only',()=>{
  const h=loginHarness([{loginId:'letsrun_admin',type:'super',otpRequired:false,otpRegistered:false}]);
  h.node('admin-login-id').value='admin';h.node('admin-login-password').value='bad';h.submit('admin-login-form');assert.equal(h.storage.has('session'),false);
  h.node('admin-login-password').value='1234';h.submit('admin-login-form');assert.equal(h.storage.get('session'),'admin');
});
test('optional policy preserves verification for an already registered OTP',()=>{
  const h=loginHarness([{loginId:'letsrun_admin',type:'super',otpRequired:false,otpRegistered:true}]);
  h.node('admin-login-id').value='admin';h.node('admin-login-password').value='1234';h.submit('admin-login-form');
  assert.equal(h.storage.has('session'),false);assert.equal(h.node('admin-otp-title').textContent,'OTP 인증');
});
