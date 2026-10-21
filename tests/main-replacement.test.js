import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { replaceSelection, ReplacementError } from '../electron/replacement.js';

// Run the production main-process handlers with disposable Electron/OS adapters.
// This exercises event ordering; it does not emulate AppKit or macOS permissions.
async function harness() {
  const app = new EventEmitter();
  let startup;
  app.getPath = () => '/tmp/disposable-ai-editor';
  app.whenReady = () => ({ then: callback => { startup = callback; } });
  app.dock = { hide() {} };
  const windows = [];
  let settingsActivationPending = false;
  class Window extends EventEmitter {
    constructor(options) {
      super(); this.options = options; this.visible = false;
      this.webContents = { id: windows.length + 1, setWindowOpenHandler() {}, on() {}, send() {} };
      windows.push(this);
      if (options.title) settingsActivationPending = true;
    }
    loadFile() {} isDestroyed() { return false; } isVisible() { return this.visible; }
    hide() { this.visible = false; app.emit('activate'); }
    show() { this.visible = true; } showInactive() { this.visible = true; }
    focus() {} setFocusable() {} setPosition() {} getSize() { return [480, 560]; }
    static getFocusedWindow() { return null; }
  }
  const handlers = new Map();
  const intervals = [];
  const timers = [];
  const shortcuts = new Map();
  let text = '';
  let field = 'I has a apple today.';
  let focused = true;
  let pastes = 0;
  const clipboard = { readText: () => text, writeText: value => { text = value; }, clear: () => { text = ''; } };
  const sandbox = {
    console, process: { platform: 'darwin', pid: 99, env: {} }, path, fileURLToPath,
    app, BrowserWindow: Window, clipboard, systemPreferences: { isTrustedAccessibilityClient: () => true },
    session: { defaultSession: { setPermissionRequestHandler() {}, setPermissionCheckHandler() {} } },
    ipcMain: { handle: (name, callback) => handlers.set(name, callback), on: (name, callback) => handlers.set(name, callback) },
    globalShortcut: { register: (name, callback) => shortcuts.set(name, callback) },
    nativeImage: { createFromPath: () => ({ setTemplateImage() {} }) },
    Tray: class { setContextMenu() {} setToolTip() {} on() {} }, Menu: { buildFromTemplate: value => value },
    DEFAULT_CONFIG: {}, sanitizeConfig: value => value, readSettings: async () => ({ config: {} }),
    readFile: async () => '[]', promisify: () => async () => ({}), execFile() {},
    setInterval: callback => { intervals.push(callback); },
    setTimeout: (callback, delay) => { if (delay === 0) timers.push(callback); else callback(); },
    readFrontmostMacApp: async () => focused ? { pid: 10 } : null,
    activateMacApp: async () => { focused = true; },
    sendMacCommandKey: async (_exec, key) => {
      // Opening Settings while the source is being restored steals focus.
      if (settingsActivationPending) { focused = false; settingsActivationPending = false; }
      if (focused && key === 'c') text = field;
      if (focused && key === 'v') { field = text; pastes += 1; }
    },
    screen: { getCursorScreenPoint: () => ({ x: 100, y: 100 }), getDisplayNearestPoint: () => ({ workArea: { x: 0, y: 0, width: 1200, height: 900 } }) },
    isUrlOnlyText: () => false, isAutomaticCheckCandidate: () => true, isPaused: () => false,
    shouldSuppressPopup: async () => false, readBrowserUrl() {},
    ReplacementError, replaceSelection,
    parseFrontmostPid: () => null,
    isMacInputPermissionError: () => false
  };
  let code = await readFile(new URL('../electron/main.js', import.meta.url), 'utf8');
  code = code.replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', JSON.stringify(new URL('../electron/main.js', import.meta.url).href));
  vm.runInNewContext(code, sandbox);
  await startup();
  await handlers.get('widget-ready')();
  return {
    windows, shortcuts, timers,
    async copy(value = field) { text = value; await intervals[1](); },
    replace: () => handlers.get('widget:replace-text')({}, { selectionId: 1, original: 'I has a apple today.', suggestion: 'I have an apple today.' }),
    activate: () => app.emit('activate'),
    get field() { return field; }, get pastes() { return pastes; }
  };
}

test('macOS activation during hidden-panel replacement cannot open Settings or steal paste focus', async () => {
  const app = await harness();
  await app.copy();
  assert.equal(app.windows[0].isVisible(), true);
  const result = await app.replace();
  assert.equal(result.ok, true, result.message);
  assert.equal(app.windows.length, 1, 'activation during Replace opened Settings');
  assert.equal(app.field, 'I have an apple today.');
  assert.equal(app.pastes, 1);
});

test('ordinary activation with no visible popup still opens Settings', async () => {
  const app = await harness();
  app.activate();
  assert.equal(app.windows.length, 2);
  assert.equal(app.windows[1].options.title, 'AI Editor Settings');
});
