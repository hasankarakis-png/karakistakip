const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function profileContext() {
  const ctx = vm.createContext({
    ROLE: 'coach', ME: 'coach-id', NAME: 'Koç', DRAFTS: [], esc: String,
    document: { addEventListener() {}, documentElement: {getAttribute: () => 'light'} },
    studentView: () => '', render() {}, ui() {}, confirm: () => true,
    sb: { auth: { getSession: async () => ({data:{session:null}}) } },
    resetCard: () => 'student-reset'
  });
  for (const file of ['profile-photo', 'account']) {
    vm.runInContext(fs.readFileSync('js/' + file + '.js', 'utf8'), ctx);
  }
  return ctx;
}

test('coach has own photo and password controls, student retains day reset', () => {
  const ctx = profileContext();
  assert.match(ctx.profileCard(), /Koç hesabı/);
  assert.match(ctx.accountCard(), /id="pwopen"/);
  assert.doesNotMatch(ctx.accountCard(), /student-reset/);
  ctx.ROLE = 'student';
  assert.match(ctx.profileCard(), /Öğrenci hesabı/);
  assert.match(ctx.accountCard(), /student-reset/);
});

test('photo removal targets the signed-in coach and retains the photo on failure', async () => {
  const ctx = profileContext();
  vm.runInContext('PH[ME]="before"', ctx);
  let fail = true;
  ctx.sb.from = () => ({delete: () => ({eq: async (key, id) => {
    assert.equal(key, 'student_id');
    assert.equal(id, ctx.ME);
    if (fail) throw Error('offline');
    return {error:null};
  }})});
  await ctx.phDel();
  assert.equal(vm.runInContext('PH[ME]', ctx), 'before');
  fail = false;
  await ctx.phDel();
  assert.equal(vm.runInContext('PH[ME]', ctx), undefined);
});

test('coach details preserve failed edits and save only professional metadata', async () => {
  const ctx = profileContext();
  ctx.initCoachDetails({user_metadata:{coach_title:'Danışman'}});
  vm.runInContext('coachDraft.specialty=" YKS "', ctx);
  ctx.sb.auth.updateUser = async () => ({error:'offline'});
  await ctx.saveCoachDetails();
  assert.match(ctx.coachDetailsCard(), /Kaydedilemedi/);
  assert.match(ctx.coachDetailsCard(), / YKS /);
  let payload;
  ctx.sb.auth.updateUser = async value => {payload=value; return {error:null};};
  await ctx.saveCoachDetails();
  assert.deepEqual(JSON.parse(JSON.stringify(payload)), {data:{coach_title:'Danışman', coach_specialty:'YKS'}});
  ctx.initCoachDetails({user_metadata:payload.data});
  assert.match(ctx.coachDetailsCard(), /value="YKS"/);
});

test('coach intro/contact card saves only its own metadata and rejects a bad phone', async () => {
  const ctx = profileContext();
  ctx.initCoachDetails({user_metadata:{coach_bio:'Merhaba', coach_phone:'0532 000 00 00'}, email:'hasan@takip.karakis.app'});
  assert.match(ctx.coachInfoCard(), /Merhaba/);
  assert.match(ctx.coachSecurityCard(), /hasan/);
  vm.runInContext('coachInfoDraft.phone="abc"', ctx);
  let called = false;
  ctx.sb.auth.updateUser = async () => {called = true; return {error:null};};
  await ctx.saveCoachInfo();
  assert.equal(called, false);
  assert.match(ctx.coachInfoCard(), /geçersiz/);
  vm.runInContext('coachInfoDraft={bio:" Kısa tanıtım ",phone:"+90 532 111 22 33",hours:" 17:00-22:00 "}', ctx);
  let payload;
  ctx.sb.auth.updateUser = async value => {payload = value; return {error:null};};
  await ctx.saveCoachInfo();
  assert.deepEqual(JSON.parse(JSON.stringify(payload)), {data:{coach_bio:'Kısa tanıtım', coach_phone:'+90 532 111 22 33', coach_hours:'17:00-22:00'}});
  assert.match(ctx.coachInfoCard(), /kaydedildi/);
});

test('coach intro save keeps the draft when the server fails', async () => {
  const ctx = profileContext();
  ctx.initCoachDetails({user_metadata:{}});
  vm.runInContext('coachInfoDraft.bio="Yazdığım metin"', ctx);
  ctx.sb.auth.updateUser = async () => ({error:'offline'});
  await ctx.saveCoachInfo();
  assert.match(ctx.coachInfoCard(), /Kaydedilemedi/);
  assert.match(ctx.coachInfoCard(), /Yazdığım metin/);
});

test('profile completeness counts photo, title, specialty, bio, phone and hours', () => {
  const ctx = profileContext();
  ctx.initCoachDetails({user_metadata:{}});
  assert.equal(ctx.coachCompleteness().pct, 0);
  ctx.initCoachDetails({user_metadata:{coach_title:'A', coach_specialty:'B', coach_bio:'C', coach_phone:'05320000000', coach_hours:'D'}});
  vm.runInContext('PH[ME]="x"', ctx);
  assert.equal(ctx.coachCompleteness().pct, 100);
  assert.match(ctx.coachCompleteCard(), /Profilin tamam/);
});

test('sign out of all devices asks first and uses the global scope', async () => {
  const ctx = profileContext();
  const calls = [];
  ctx.sb.auth.signOut = async o => {calls.push(JSON.stringify(o)); return {error:null};};
  ctx.logout = () => calls.push('logout');
  ctx.confirm = () => false;
  await ctx.coachSignOutAll();
  assert.deepEqual(calls, []);
  ctx.confirm = () => true;
  await ctx.coachSignOutAll();
  assert.deepEqual(calls, ['{"scope":"global"}', 'logout']);
  ctx.sb.auth.signOut = async () => ({error:'offline'});
  await ctx.coachSignOutAll();
  assert.match(ctx.coachSecurityCard(), /yapılamadı/);
});
