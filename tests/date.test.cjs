const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../lib/date.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const date = {};
new Function('exports', compiled)(date);

const inTimezone = (timezone, verify) => {
  const previous = process.env.TZ;
  process.env.TZ = timezone;
  try {
    verify();
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
};

test('Daily et tâches changent ensemble à minuit', () => {
  for (const timezone of ['Europe/Paris', 'America/New_York']) {
    inTimezone(timezone, () => {
      const before = new Date(2026, 8, 25, 23, 59);
      const after = new Date(2026, 8, 26, 0, 1);
      assert.equal(date.toDailyDateKey(before), '2026-09-25');
      assert.equal(date.toDailyDateKey(after), '2026-09-26');
      assert.equal(date.toDailyDateKey(after), date.toAppDateKey(after));
    });
  }
});

test('la date de fin de Repos est incluse, puis expire le lendemain', () => {
  assert.equal(date.getRestEndStatus('2026-09-28', '2026-09-27'), 'active');
  assert.equal(date.getRestEndStatus('2026-09-28', '2026-09-28'), 'active');
  assert.equal(date.getRestEndStatus('2026-09-28', '2026-09-29'), 'expired');
  assert.equal(date.getRestEndStatus(null, '2026-09-28'), 'none');
  assert.throws(() => date.getRestEndStatus('2026-02-30', '2026-02-28'));
});

test('une clé de date civile ne change pas de jour après un voyage', () => {
  const savedKey = '2026-09-28';
  for (const timezone of ['Europe/Paris', 'America/Los_Angeles']) {
    inTimezone(timezone, () => {
      assert.equal(date.toAppDateKey(date.fromAppDateKey(savedKey)), savedKey);
      assert.equal(date.toDailyDateKey(savedKey), savedKey);
    });
  }
});

test('les nouvelles clés suivent le fuseau courant dans les deux sens', () => {
  const instant = new Date('2026-09-25T22:30:00.000Z');
  inTimezone('Europe/Paris', () => assert.equal(date.toAppDateKey(instant), '2026-09-26'));
  inTimezone('America/New_York', () => assert.equal(date.toAppDateKey(instant), '2026-09-25'));
  inTimezone('Europe/Paris', () => assert.equal(date.toAppDateKey(instant), '2026-09-26'));
});

test('le passage heure été/hiver ne change pas la clôture à minuit', () => {
  inTimezone('Europe/Paris', () => {
    for (const [previous, next] of [[28, 29], [24, 25]]) {
      const month = previous === 28 ? 2 : 9;
      const before = new Date(2026, month, previous, 23, 59);
      const after = new Date(2026, month, next, 0, 1);
      assert.notEqual(date.toDailyDateKey(before), date.toDailyDateKey(after));
    }
  });
});
