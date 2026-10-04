const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const packaged = process.argv.includes('--packaged');
const appRoot = packaged ? path.join(__dirname, '..', 'release', process.arch === 'arm64' ? 'mac-arm64' : 'mac', 'AI Editor.app', 'Contents', 'Resources', 'app.asar') : path.join(__dirname, '..');
if (packaged && !fs.existsSync(appRoot)) throw new Error('Build the packaged app first with npm run build or npm run build:dir.');
const devUrl = process.argv.find(value => value.startsWith('--dev-url='))?.slice('--dev-url='.length);
const captureDir = process.argv.includes('--screenshots') ? path.join(__dirname, '..', 'release', 'ui-checks') : '';
if (captureDir) fs.mkdirSync(captureDir, { recursive: true });
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-editor-native-smoke-'));
try {
  for (const phase of ['write', 'read']) {
    const result = spawnSync(require('electron'), [path.join(__dirname, 'smoke-writing-toolkit.cjs')], {
      stdio: 'inherit', timeout: 30_000,
      env: { ...process.env, AI_EDITOR_SMOKE_DIR: folder, AI_EDITOR_SMOKE_PHASE: phase, AI_EDITOR_SMOKE_APP_ROOT: appRoot, AI_EDITOR_SMOKE_CAPTURE_DIR: captureDir, VITE_DEV_SERVER_URL: devUrl || '' }
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Electron ${phase} smoke failed with ${result.status}`);
  }
  console.log('Native smoke suite passed. It used disposable settings, clipboard values, and mocked model responses.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  fs.rmSync(folder, { recursive: true, force: true });
}
