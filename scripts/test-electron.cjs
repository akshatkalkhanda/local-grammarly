const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-editor-native-smoke-'));
try {
  for (const phase of ['write', 'read']) {
    const result = spawnSync(require('electron'), [path.join(__dirname, 'smoke-writing-toolkit.cjs')], {
      stdio: 'inherit', timeout: 30_000,
      env: { ...process.env, AI_EDITOR_SMOKE_DIR: folder, AI_EDITOR_SMOKE_PHASE: phase }
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
