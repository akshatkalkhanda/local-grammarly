const { app, BrowserWindow, clipboard, globalShortcut, systemPreferences } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const folder = process.env.AI_EDITOR_SMOKE_DIR;
  assert.ok(folder && path.basename(folder).startsWith('ai-editor-native-smoke-'), 'Run via npm run test:electron');
  app.setPath('appData', folder);
  app.setPath('userData', folder);
  // Isolate the smoke app from the user's clipboard, permissions and shortcuts.
  let clipboardText = 'Disposable smoke text';
  clipboard.readText = () => clipboardText;
  globalShortcut.register = () => true;
  systemPreferences.isTrustedAccessibilityClient = () => true;
  global.fetch = async () => new Response(JSON.stringify({ response: 'Thanks for the invitation, but I cannot make it.', done: true }) + '\n', { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } });
  await import(require('node:url').pathToFileURL(path.join(__dirname, '../dist-electron/main.js')).href);
  let window;
  for (let i = 0; i < 100; i++) {
    window = BrowserWindow.getAllWindows()[0];
    if (window && !window.webContents.isLoading()) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(window);
  const run = source => window.webContents.executeJavaScript(source);
  for (let i = 0; i < 100; i++) {
    if (await run('Boolean(window.electronAPI)')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const config = await run('window.electronAPI.getConfig()');
  if (process.env.AI_EDITOR_SMOKE_PHASE === 'read') {
    assert.ok(config.pausedUntil > Date.now());
    assert.equal(config.preferences.tone, 'friendly');
    assert.equal(config.preferences.translationTarget, 'German');
    assert.equal(config.preferences.presetId, 'work');
    assert.equal(config.presets[0].favorite, true);
    assert.deepEqual(config.personalDictionary, ['censhare', 'Akshat']);
    assert.deepEqual(config.excludedApps, ['terminal']);
    window.webContents.send('text-selected', { text: 'Disposable manual selection', selectionId: 102 });
    await new Promise(resolve => setTimeout(resolve, 250));
    await run("document.querySelector('.widget-trigger').click()");
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.equal(await run("document.querySelector('option[value=\"friendly\"]').parentElement.value"), 'friendly');
    assert.equal(await run("document.querySelector('[aria-label=\"Writing preset\"]').value"), 'work');
    console.log('PASS: a fresh Electron process restored pause, exclusions, dictionary, favorite and writing preferences.');
    app.exit(0);
    return;
  }
  config.autoSuggestOnCopy = false;
  config.personalDictionary = ['censhare', 'Akshat'];
  config.excludedApps = ['terminal'];
  config.presets = [{ id: 'work', name: 'Work', instruction: 'Be brief.', favorite: true }];
  await run(`window.electronAPI.saveConfig(${JSON.stringify(config)})`);
  await run("window.electronAPI.setPause('15m')");
  clipboardText = 'New disposable copy while paused';
  await new Promise(resolve => setTimeout(resolve, 500));
  assert.equal(window.isVisible(), false);
  await run("window.electronAPI.savePreferences({ tone: 'friendly', translationTarget: 'German', presetId: 'work' })");
  // Save the earlier stale Settings snapshot. Runtime controls must survive.
  await run(`window.electronAPI.saveConfig(${JSON.stringify(config)})`);
  const current = await run('window.electronAPI.getConfig()');
  assert.ok(current.pausedUntil > Date.now());
  assert.equal(current.preferences.tone, 'friendly');
  assert.equal(current.preferences.presetId, 'work');
  assert.deepEqual(current.personalDictionary, ['censhare', 'Akshat']);
  const saved = JSON.parse(await fs.readFile(path.join(folder, 'AI Editor/settings.json'), 'utf8'));
  assert.deepEqual(saved, current);
  await run("window.electronAPI.setPause('resume')");
  window.webContents.send('text-selected', { text: 'Can you join tomorrow?', selectionId: 101 });
  await new Promise(resolve => setTimeout(resolve, 250));
  await run("document.querySelector('.widget-trigger').click()");
  await new Promise(resolve => setTimeout(resolve, 250));
  assert.equal(await run("Boolean(document.querySelector('[aria-label=\"Reply intent\"]'))"), true);
  assert.equal(await run("getComputedStyle(document.querySelector('.widget-header')).getPropertyValue('-webkit-app-region')"), 'drag');
  assert.equal(await run("Boolean([...document.querySelectorAll('button')].find(b => b.textContent.includes('★ Work')))"), true);
  await run("[...document.querySelectorAll('button')].find(b => b.textContent === 'Draft reply').click()");
  await new Promise(resolve => setTimeout(resolve, 750));
  assert.equal(await run("document.querySelector('.clean-preview')?.textContent"), 'Thanks for the invitation, but I cannot make it.');
  assert.equal(await run("[...document.querySelectorAll('button')].some(b => b.textContent.includes('Replace text'))"), false);
  window.showInactive();
  await new Promise(resolve => setTimeout(resolve, 200));
  await fs.writeFile(path.join(folder, 'preview.png'), (await window.webContents.capturePage()).toPNG());
  console.log('PASS: real Electron IPC, stale-settings preservation, pause/resume, preferences, disk save, favorite UI, drag-region CSS, streamed reply and copy-only review.');
  await run("window.electronAPI.setPause('15m')");
  app.exit(0);
})().catch(error => { console.error(error); app.exit(1); });
