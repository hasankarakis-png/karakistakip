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
