const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'serialMutationQueue.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleForTest = { exports: {} };
vm.runInNewContext(compiled, { module: moduleForTest, exports: moduleForTest.exports });
const { createSerialMutationQueue } = moduleForTest.exports;

test('rapid display choices are persisted and shown in press order', async () => {
  const run = createSerialMutationQueue();
  const events = [];
  let releaseFirst;
  const first = run(async () => {
    events.push('write dark');
    await new Promise((resolve) => { releaseFirst = resolve; });
    events.push('show dark');
  });
  const second = run(async () => {
    events.push('write light');
    events.push('show light');
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(events.join(','), 'write dark');
  releaseFirst();
  await Promise.all([first, second]);
  assert.equal(events.join(','), 'write dark,show dark,write light,show light');
});

test('a failed first preference does not block the next choice', async () => {
  const run = createSerialMutationQueue();
  const first = run(async () => { throw new Error('offline'); });
  const second = run(async () => 'light');
  await assert.rejects(first, /offline/);
  assert.equal(await second, 'light');
});
