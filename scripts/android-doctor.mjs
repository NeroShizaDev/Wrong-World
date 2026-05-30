import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checks = [];

function run(command, args) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
}

function add(name, ok, detail) {
  checks.push({ name, ok, detail });
}

const registry = run('npm', ['config', 'get', 'registry']);
add('npm registry', registry.status === 0 && registry.stdout.trim() === 'https://registry.npmjs.org/', registry.stdout.trim() || registry.stderr.trim());

add('package-lock.json', existsSync(join(root, 'package-lock.json')), 'npm lockfile is required for this repo');
add('capacitor.config.ts', existsSync(join(root, 'capacitor.config.ts')), 'Capacitor config should exist at repo root');
add('dist web build', existsSync(join(root, 'dist', 'index.html')), 'Run npm run build before syncing Android');

let packageJson;
try {
  packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
} catch (error) {
  packageJson = null;
  add('package.json parse', false, error.message);
}

if (packageJson) {
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  add('@capacitor/core dependency', Boolean(allDeps['@capacitor/core']), 'Install with npm install @capacitor/core @capacitor/cli @capacitor/android --save');
  add('@capacitor/cli dependency', Boolean(allDeps['@capacitor/cli']), 'Install with npm install @capacitor/core @capacitor/cli @capacitor/android --save');
  add('@capacitor/android dependency', Boolean(allDeps['@capacitor/android']), 'Install with npm install @capacitor/core @capacitor/cli @capacitor/android --save');
}

add('android directory', existsSync(join(root, 'android')), 'Create with npx cap add android');

const java = run('java', ['-version']);
add('Java available', java.status === 0, (java.stderr || java.stdout).split('\n')[0] || 'java not found');

const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
add('Android SDK env', Boolean(sdkRoot), sdkRoot || 'Set ANDROID_HOME or ANDROID_SDK_ROOT before Gradle build');

const gradlew = join(root, 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
add('Gradle wrapper', existsSync(gradlew), 'Expected after npx cap add android');

let failed = 0;
for (const check of checks) {
  const marker = check.ok ? '✅' : '❌';
  if (!check.ok) failed += 1;
  console.log(`${marker} ${check.name}: ${check.detail}`);
}

if (failed > 0) {
  console.log(`\nAndroid doctor found ${failed} issue(s). Fix them before expecting an APK.`);
  process.exitCode = 1;
} else {
  console.log('\nAndroid doctor passed. You can run npm run android:sync and npm run android:build.');
}
