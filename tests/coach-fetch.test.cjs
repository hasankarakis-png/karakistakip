const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('js/boot.js', 'utf8');
const start = source.indexOf('async function pullCoach(){');
const end = source.indexOf('\nlet rt;', start);
assert.ok(start >= 0 && end > start, 'pullCoach() should be present');
const functionBody = source.slice(start, end);

function mockQuery(error = null) {
  const result = { data: null, error };
  const q = {
    select: () => q, eq: () => q, gte: () => q,
    lte: () => q, order: () => q,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject)
  };
  return q;
}

test('failed coach query preserves previous student and chart data', async () => {
  const priorStudents = [{ id: 'student-1', name: 'Example' }];
  const priorRows = [{ student_id: 'student-1' }];
  const ctx = {
    sb: { from: () => mockQuery({ message: 'network unavailable' }) },
    STU: priorStudents, ROWS: priorRows,
    C: { goals: { old: 1 }, notes: { old: 1 }, den: { old: 1 } },
    EXALL: [{ old: true }], TKALL: [{ old: true }],
    day: () => '2026-11-01', dayN: () => '2026-10-26',
    profPullCoach: async () => {}, plusPullCoach: async () => {}
  };
  vm.createContext(ctx);
  vm.runInContext(functionBody + '\nthis.pullCoachTest = pullCoach;', ctx);
  await assert.rejects(() => ctx.pullCoachTest(), /Koç verileri güncellenemedi/);
  assert.equal(ctx.STU, priorStudents);
  assert.equal(ctx.ROWS, priorRows);
  assert.equal(ctx.C.goals.old, 1);
  assert.equal(ctx.EXALL.length, 1);
  assert.equal(ctx.TKALL.length, 1);
});
