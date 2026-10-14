const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'admin-security.js'),'utf8');
function harness(type='department',session='dept') {
 const nodes=new Map(), accountMenu={hidden:false}, profile={};
 const saved=[{key:'dept',loginId:'dept',type,location:'서울',department:'홍보부',otpRegistered:true},{key:'other',loginId:'other',type:'department',otpRegistered:true}];
 const storage=new Map([['letsrunParkDepartmentAccountsV3',JSON.stringify(saved)]]);
 function node(id){if(!nodes.has(id))nodes.set(id,{value:'',hidden:false,textContent:'',classList:{toggle(){},add(){},remove(){}},focus(){},setAttribute(){},removeAttribute(){},addEventListener(event,handler){this[event]=handler;}});return nodes.get(id);}
 vm.runInNewContext(source,{document:{getElementById:node,querySelectorAll:q=>q==='[data-integrated-admin-only]'?[accountMenu]:[],querySelector:q=>q==='.admin-user'?{querySelector:key=>profile[key]||(profile[key]={})}:null},
 sessionStorage:{getItem:()=>session,setItem(){}},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},navigator:{},window:{location:{}}});
 return {node,accountMenu,storage,profile};
}
test('personal security is a standalone peer menu with no account-management markup or script',()=>{
 const html=fs.readFileSync(path.join(root,'admin-security.html'),'utf8');
 assert.match(html,/data-admin-href="admin-security.html" class="is-active" aria-current="page"/);
 assert.match(html,/src="admin-security.js/);assert.doesNotMatch(html,/src="account-admin.js|id="account-dialog"|id="account-admin-main"/);
 const accountHtml=fs.readFileSync(path.join(root,'account-admin.html'),'utf8');
 assert.match(accountHtml,/<button type="button" data-admin-href="admin-security.html"><i/);
});
test('department users see their own security settings and cannot see the accounts menu',()=>{
 const h=harness();assert.equal(h.accountMenu.hidden,true);assert.equal(h.node('security-login-id').textContent,'dept');assert.equal(h.profile.strong.textContent,'홍보부');
 assert.equal(h.node('security-otp-change').hidden,false);assert.equal(h.node('security-otp-flow').hidden,true);
});
test('integrated users can access both independent menus',()=>{assert.equal(harness('super').accountMenu.hidden,false);});
test('personal device change checks existing code and preserves OTP until new code verification',()=>{
 const h=harness();h.node('security-otp-change').click();h.node('security-otp-code').value='000000';h.node('security-otp-reset').click();assert.equal(h.node('security-otp-enroll').hidden,true);
 h.node('security-otp-code').value='123456';h.node('security-otp-reset').click();assert.equal(h.node('security-otp-enroll').hidden,false);
 assert.equal(JSON.parse(h.storage.get('letsrunParkDepartmentAccountsV3'))[0].otpRegistered,true);
 h.node('security-otp-cancel').click();assert.equal(h.node('security-otp-enroll').hidden,true);
 h.node('security-otp-change').click();h.node('security-otp-code').value='123456';h.node('security-otp-reset').click();h.node('security-otp-code').value='123456';h.node('security-otp-verify').click();
 assert.equal(h.node('security-otp-enroll').hidden,true);assert.equal(JSON.parse(h.storage.get('letsrunParkDepartmentAccountsV3'))[1].otpRegistered,true);
});
test('signed-out users receive login guidance without exposing security controls',()=>{
 const h=harness('department','signed-out');assert.equal(h.accountMenu.hidden,true);assert.match(h.node('account-security-main').innerHTML,/로그인 후/);
});

test('device-change fields only appear after starting and finish returns to status view',()=>{
 const h=harness();assert.equal(h.node('security-otp-flow').hidden,true);h.node('security-otp-change').click();assert.equal(h.node('security-otp-flow').hidden,false);assert.equal(h.node('security-otp-enroll').hidden,true);
 h.node('security-otp-code').value='123456';h.node('security-otp-reset').click();assert.equal(h.node('security-otp-enroll').hidden,false);h.node('security-otp-code').value='123456';h.node('security-otp-verify').click();assert.equal(h.node('security-otp-flow').hidden,true);assert.equal(h.node('security-otp-change').hidden,false);
});
