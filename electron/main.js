import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu, nativeImage, screen, session, systemPreferences, Tray } from 'electron';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_CONFIG = {
  url: 'http://localhost:11434',
  model: 'llama3',
  systemPrompt: 'You are an expert copy editor. Fix grammar and improve style. Return ONLY the updated text. Do not add conversational intro/outro text.'
};
const ACTIONS = {
  grammar: 'Correct grammar, spelling, and punctuation while preserving the writer\'s voice.',
  improve: 'Improve clarity, flow, and readability while preserving the meaning.',
  professional: 'Rewrite the text in a professional, confident, and concise tone.',
  concise: 'Make the text shorter and clearer while retaining its essential meaning.',
  translate: 'Translate the text accurately, preserving its meaning, tone, names, and formatting.'
};
const MAX_SELECTION_LENGTH = 20_000;
const OUTPUT_ONLY_RULE = 'Output only the requested final text. Do not add introductions, labels, explanations, quotation marks, markdown fences, or phrases such as "Here is the revised text".';

let mainWindow = null;
let settingsWindow = null;
let tray = null;
let widgetReady = false;
let pendingText = '';
let isPasting = false;
let isCapturingCopy = false;
let lastClipboardText = '';
let config = { ...DEFAULT_CONFIG };
let history = [];
let lastReplacement = null;

const TONES = {
  neutral: 'Use a natural, clear, and neutral tone.',
  friendly: 'Use a warm, friendly, and approachable tone.',
  confident: 'Use a confident, direct, and decisive tone.',
  concise: 'Use a concise tone and remove unnecessary words.',
  formal: 'Use a polished, formal, and professional tone.'
};

function configPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function historyPath() {
  return path.join(app.getPath('userData'), 'history.json');
}

function validateUrl(value) {
  const url = new URL(String(value));
  const localHosts = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
  if (!['http:', 'https:'].includes(url.protocol) || !localHosts.has(url.hostname) || url.username || url.password) {
    throw new Error('For privacy, the Ollama endpoint must be a local http(s) address.');
  }
  return url.toString().replace(/\/$/, '');
}

function sanitizeConfig(candidate = {}) {
  const url = validateUrl(candidate.url ?? DEFAULT_CONFIG.url);
  const model = String(candidate.model ?? DEFAULT_CONFIG.model).trim().slice(0, 160);
  const systemPrompt = String(candidate.systemPrompt ?? DEFAULT_CONFIG.systemPrompt).trim().slice(0, 6_000);
  if (!model || !systemPrompt) throw new Error('Model and system prompt are required.');
  return { url, model, systemPrompt };
}

async function loadConfig() {
  try {
    config = sanitizeConfig(JSON.parse(await readFile(configPath(), 'utf8')));
  } catch {
    config = { ...DEFAULT_CONFIG };
  }
}

async function loadHistory() {
  try {
    const stored = JSON.parse(await readFile(historyPath(), 'utf8'));
    history = Array.isArray(stored) ? stored.slice(0, 30) : [];
  } catch {
    history = [];
  }
}

async function saveHistory() {
  await writeFile(historyPath(), JSON.stringify(history, null, 2), { mode: 0o600 });
}

async function addHistory(entry) {
  history = [entry, ...history].slice(0, 30);
  try { await saveHistory(); }
  catch (error) { console.error('Could not save local history:', error); }
}

async function saveConfig(candidate) {
  config = sanitizeConfig(candidate);
  await writeFile(configPath(), JSON.stringify(config, null, 2), { mode: 0o600 });
  for (const window of [mainWindow, settingsWindow]) {
    if (window && !window.isDestroyed()) window.webContents.send('config-updated', config);
  }
  return config;
}

function secureWindow(window) {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
}

function widgetPreloadPath() {
  // The source preload is included in the app package and remains CommonJS for Electron's preload loader.
  return path.join(__dirname, '../electron/preload.cjs');
}

function createFloatingWidget() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  widgetReady = false;
  mainWindow = new BrowserWindow({
    width: 480,
    height: 420,
    minWidth: 420,
    minHeight: 160,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    webPreferences: {
      preload: widgetPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });
  secureWindow(mainWindow);
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#widget`);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'widget' });
  }
  mainWindow.on('blur', () => {
    if (!isPasting) mainWindow.hide();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
    widgetReady = false;
  });
  return mainWindow;
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 680,
    height: 740,
    minWidth: 580,
    minHeight: 620,
    title: 'AI Editor Settings',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: widgetPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });
  secureWindow(settingsWindow);
  if (process.env.VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#settings`);
  } else {
    settingsWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'settings' });
  }
  settingsWindow.on('closed', () => { settingsWindow = null; });
}

function positionWidget(window) {
  const point = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(point);
  const { x, y, width, height } = display.workArea;
  const [widgetWidth, widgetHeight] = window.getSize();
  const left = Math.max(x + 8, Math.min(point.x - 20, x + width - widgetWidth - 8));
  const top = Math.max(y + 8, Math.min(point.y + 18, y + height - widgetHeight - 8));
  window.setPosition(Math.round(left), Math.round(top));
}

function showWidgetWithText(text, focus = false) {
  const cleanText = String(text ?? '').trim().slice(0, MAX_SELECTION_LENGTH);
  if (!cleanText) return;
  const window = createFloatingWidget();
  pendingText = cleanText;
  if (!widgetReady) return;
  positionWidget(window);
  window.webContents.send('text-selected', cleanText);
  pendingText = '';
  if (focus) {
    window.show();
    window.focus();
  } else {
    window.showInactive();
  }
}

function createGenerationRequest(action, text, tone = 'neutral', customInstruction = '', translationTarget = 'English') {
  if (!Object.hasOwn(ACTIONS, action)) throw new Error('Unsupported writing action.');
  const source = String(text ?? '').trim().slice(0, MAX_SELECTION_LENGTH);
  if (!source) throw new Error('Select some text before requesting a suggestion.');
  const chosenTone = Object.hasOwn(TONES, tone) ? tone : 'neutral';
  const custom = String(customInstruction ?? '').trim().slice(0, 500);
  const target = ['English', 'German', 'Dutch'].includes(translationTarget) ? translationTarget : 'English';
  const translationRule = action === 'translate'
    ? `Translate from the detected source language into ${target}. Do not explain the translation or retain the source text.`
    : '';
  return {
    action,
    source,
    tone: chosenTone,
    system: `${config.systemPrompt}\n\n${OUTPUT_ONLY_RULE}`,
    prompt: `${ACTIONS[action]}\n${TONES[chosenTone]}${translationRule ? `\n${translationRule}` : ''}${custom ? `\nAdditional instruction: ${custom}` : ''}\n\nText:\n${source}\n\n${OUTPUT_ONLY_RULE}`,
    options: {
      temperature: 0.2,
      num_predict: Math.min(512, Math.max(96, Math.ceil(source.length / 3)))
    }
  };
}

function cleanSuggestion(value) {
  let text = String(value ?? '').trim();
  text = text.replace(/^```(?:text|markdown)?\s*/i, '').replace(/\s*```$/, '').trim();
  text = text.replace(/^(?:here(?:'s| is)\s+(?:the\s+)?(?:revised|corrected|improved|rewritten|edited)\s+(?:text|version|statement)(?:\s+is)?|(?:revised|corrected|improved|rewritten|edited)\s+(?:text|version|statement))\s*:\s*/i, '');
  return text.replace(/^"([\s\S]*)"$/, '$1').trim();
}

async function generateSuggestion(action, text, tone, customInstruction, translationTarget) {
  const request = createGenerationRequest(action, text, tone, customInstruction, translationTarget);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(`${config.url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        system: request.system,
        prompt: request.prompt,
        stream: false,
        keep_alive: '15m',
        options: request.options
      })
    });
    if (!response.ok) throw new Error(`Ollama returned ${response.status}.`);
    const data = await response.json();
    return cleanSuggestion(data.response);
  } finally {
    clearTimeout(timeout);
  }
}

async function streamSuggestion(action, text, tone, customInstruction, translationTarget, onChunk) {
  const request = createGenerationRequest(action, text, tone, customInstruction, translationTarget);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  let result = '';
  try {
    const response = await fetch(`${config.url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ model: config.model, system: request.system, prompt: request.prompt, stream: true, keep_alive: '15m', options: request.options })
    });
    if (!response.ok || !response.body) throw new Error(`Ollama returned ${response.status}.`);
    const decoder = new TextDecoder();
    let remainder = '';
    for await (const chunk of response.body) {
      remainder += decoder.decode(chunk, { stream: true });
      const lines = remainder.split('\n');
      remainder = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const data = JSON.parse(line);
        if (data.response) {
          result += data.response;
          onChunk(data.response);
        }
      }
    }
    if (remainder.trim()) {
      const data = JSON.parse(remainder);
      if (data.response) {
        result += data.response;
        onChunk(data.response);
      }
    }
    const suggestion = cleanSuggestion(result);
    if (!suggestion) throw new Error('Ollama returned an empty suggestion.');
    await addHistory({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt: new Date().toISOString(), action: request.action, tone: request.tone, translationTarget: action === 'translate' ? translationTarget : undefined, original: request.source, suggestion });
    return suggestion;
  } finally {
    clearTimeout(timeout);
  }
}

function simulateCommandKey(key) {
  if (process.platform === 'darwin') {
    return execFileAsync('osascript', ['-e', `tell application "System Events" to keystroke "${key}" using command down`]);
  }
  return Promise.resolve();
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function captureSelectionAndShow({ focus = true, showError = false } = {}) {
  if (isCapturingCopy) return;
  isCapturingCopy = true;
  const previousClipboard = clipboard.readText();
  clipboard.clear();
  try {
    await wait(100);
    await simulateCommandKey('c');
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await wait(50);
      const text = clipboard.readText();
      if (text) {
        lastClipboardText = text;
        showWidgetWithText(text, focus);
        return;
      }
    }
    clipboard.writeText(previousClipboard);
    if (showError) showWidgetWithText('No text was copied. Select text, then allow Accessibility access for AI Editor.', true);
  } catch (error) {
    console.error('Selection capture failed:', error);
    clipboard.writeText(previousClipboard);
    if (showError) showWidgetWithText('AI Editor needs Accessibility permission in macOS Privacy & Security.', true);
  } finally {
    // Prevent the synthetic ⌘C from recursively invoking the global shortcut.
    setTimeout(() => { isCapturingCopy = false; }, 120);
  }
}

function registerIpc() {
  ipcMain.handle('config:get', () => config);
  ipcMain.handle('config:save', (_event, candidate) => saveConfig(candidate));
  ipcMain.handle('ollama:models', async (_event, url) => {
    const baseUrl = validateUrl(url);
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) throw new Error(`Ollama returned ${response.status}.`);
    const data = await response.json();
    return (data.models ?? []).map(({ name }) => name).filter(Boolean);
  });
  ipcMain.handle('ollama:generate', (_event, { action, text, tone, customInstruction, translationTarget }) => generateSuggestion(action, text, tone, customInstruction, translationTarget));
  ipcMain.on('ollama:generate-stream', (event, { requestId, action, text, tone, customInstruction, translationTarget }) => {
    streamSuggestion(action, text, tone, customInstruction, translationTarget, (chunk) => {
      event.sender.send('ollama:stream-response', { requestId, type: 'chunk', chunk });
    }).then((suggestion) => {
      event.sender.send('ollama:stream-response', { requestId, type: 'done', suggestion });
    }).catch((error) => {
      event.sender.send('ollama:stream-response', { requestId, type: 'error', message: error.message || 'Could not generate a suggestion.' });
    });
  });
  ipcMain.handle('history:list', () => history);
  ipcMain.handle('history:clear', async () => {
    history = [];
    await saveHistory();
  });
  ipcMain.on('widget-ready', () => {
    widgetReady = true;
    if (pendingText) showWidgetWithText(pendingText);
  });
  ipcMain.on('widget:hide', () => mainWindow?.hide());
  ipcMain.on('widget:copy', (_event, text) => clipboard.writeText(String(text ?? '').slice(0, MAX_SELECTION_LENGTH)));
  ipcMain.on('widget:replace-text', async (_event, newText) => {
    isPasting = true;
    clipboard.writeText(String(newText ?? '').slice(0, MAX_SELECTION_LENGTH));
    lastReplacement = { expiresAt: Date.now() + 60_000 };
    if (process.platform === 'darwin') app.hide();
    else mainWindow?.hide();
    setTimeout(async () => {
      try { await simulateCommandKey('v'); }
      catch (error) { console.error('Paste-back failed:', error); }
      finally { isPasting = false; }
    }, 500);
  });
}

async function undoLastReplacement() {
  if (!lastReplacement || lastReplacement.expiresAt < Date.now()) return;
  try {
    await simulateCommandKey('z');
    lastReplacement = null;
  } catch (error) {
    console.error('Undo failed:', error);
  }
}

app.whenReady().then(async () => {
  await loadConfig();
  await loadHistory();
  // This is a menu-bar writing utility. Its hidden popup should not look broken when clicked in the Dock.
  if (process.platform === 'darwin') app.dock.hide();
  // Clipboard-triggered suggestions work without this; the ⌘⇧Space selection helper needs it.
  if (process.platform === 'darwin') systemPreferences.isTrustedAccessibilityClient(true);
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  createFloatingWidget();
  registerIpc();

  tray = new Tray(nativeImage.createEmpty());
  tray.setTitle('AI Editor');
  tray.setToolTip('Local AI Writing Assistant');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'AI Editor', enabled: false },
    { type: 'separator' },
    { label: 'Open assistant for clipboard', click: () => showWidgetWithText(clipboard.readText(), true) },
    { label: 'Undo last replacement', click: undoLastReplacement },
    { label: 'Settings', click: createSettingsWindow },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]));
  tray.on('double-click', createSettingsWindow);

  lastClipboardText = clipboard.readText();
  setInterval(() => {
    const currentText = clipboard.readText();
    if (!currentText || currentText === lastClipboardText) return;
    lastClipboardText = currentText;
    if (BrowserWindow.getFocusedWindow()) return;
    showWidgetWithText(currentText);
  }, 350);

  globalShortcut.register('CommandOrControl+C', () => {
    if (isCapturingCopy) return;
    // Let the app's own copy shortcut keep working, without opening the widget over it.
    if (BrowserWindow.getFocusedWindow()) {
      isCapturingCopy = true;
      simulateCommandKey('c').finally(() => setTimeout(() => { isCapturingCopy = false; }, 120));
      return;
    }
    captureSelectionAndShow();
  });
  globalShortcut.register('CommandOrControl+Shift+Space', () => captureSelectionAndShow({ showError: true }));

  app.on('activate', createSettingsWindow);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('will-quit', () => globalShortcut.unregisterAll());
