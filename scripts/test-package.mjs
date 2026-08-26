import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'geo-intersection-util-'));

function run(command, args, cwd = root) {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
}

try {
  const packOutput = run('npm', [
    'pack',
    '--ignore-scripts',
    '--json',
    '--pack-destination',
    temporaryDirectory,
  ]);
  const packResult = JSON.parse(packOutput)[0];
  const actualFiles = packResult.files.map(({ path }) => path).sort();
  const expectedFiles = [
    'CHANGELOG.md',
    'LICENSE',
    'README.md',
    'dist/index.cjs',
    'dist/index.cjs.map',
    'dist/index.d.cts',
    'dist/index.d.ts',
    'dist/index.js',
    'dist/index.js.map',
    'package.json',
  ].sort();
  assert.deepEqual(actualFiles, expectedFiles, 'npm tarball contains unexpected files');

  const tarball = join(temporaryDirectory, packResult.filename);
  run('npx', ['--no-install', 'attw', '--pack', tarball]);

  const consumer = join(temporaryDirectory, 'consumer');
  await writeFile(
    join(temporaryDirectory, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  await import('node:fs/promises').then(({ mkdir }) => mkdir(consumer));
  await writeFile(
    join(consumer, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  );
  run('npm', ['install', '--ignore-scripts', '--no-package-lock', tarball], consumer);

  const esmOutput = run(
    process.execPath,
    ['--input-type=module', '--eval', "import { Intersection } from 'geo-intersection-util'; console.log(typeof Intersection)"],
    consumer,
  );
  assert.equal(esmOutput, 'function');

  const commonJsOutput = run(
    process.execPath,
    ['--input-type=commonjs', '--eval', "const { Intersection } = require('geo-intersection-util'); console.log(typeof Intersection)"],
    consumer,
  );
  assert.equal(commonJsOutput, 'function');

  await writeFile(
    join(consumer, 'index.ts'),
    [
      "import { Intersection, type IntersectionResult } from 'geo-intersection-util';",
      "const result: IntersectionResult = new Intersection().getIntersection('0 0, 1 0', '0.5 1', '1 0');",
      'console.log(result.side);',
    ].join('\n'),
  );
  await writeFile(
    join(consumer, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
      },
      include: ['index.ts'],
    }),
  );
  run(join(root, 'node_modules', '.bin', 'tsc'), ['-p', 'tsconfig.json'], consumer);

  const manifest = JSON.parse(await readFile(join(consumer, 'node_modules/geo-intersection-util/package.json'), 'utf8'));
  assert.equal(manifest.version, packResult.version);
  console.log(`Package verified: ${packResult.filename} (${packResult.size} bytes)`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
