const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const pkg = require('../package.json');
const expectedNode = fs.readFileSync(path.join(__dirname, '..', '.nvmrc'), 'utf8').trim();
const npmVersion = process.env.npm_config_user_agent?.match(/^npm\/([^ ]+)/)?.[1];
const denoVersion = execFileSync('deno', ['--version'], { encoding: 'utf8' }).split('\n')[0];
if (process.versions.node !== expectedNode || pkg.engines.node !== expectedNode || npmVersion !== pkg.engines.npm || denoVersion.split(' ')[1] !== pkg.devDependencies.deno) {
  throw new Error(`Expected Node ${expectedNode}, npm ${pkg.engines.npm}, Deno ${pkg.devDependencies.deno}; got ${process.versions.node}, ${npmVersion}, ${denoVersion}`);
}
console.log(`Toolchain OK: Node ${expectedNode}, npm ${npmVersion}, Deno ${pkg.devDependencies.deno}`);
