import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { transformWithOxc } from 'vite';

// Use the production components, transformed with the project's existing compiler.
const compiled = new Map();
async function componentModule(url) {
  if (compiled.has(url.href)) return compiled.get(url.href);
  let { code } = await transformWithOxc(await readFile(url, 'utf8'), url.pathname, { jsx: { runtime: 'classic' } });
  const imports = [...code.matchAll(/from\s+['"]([^'"]+)['"]/g)];
  for (const match of imports) {
    const specifier = match[1];
    let resolved;
    if (specifier.startsWith('.')) {
      let file = new URL(specifier, url);
      if (!/\.(jsx?|cjs)$/.test(specifier)) {
        file = new URL(`${specifier}.js`, url);
        try { await access(file); } catch { file = new URL(`${specifier}.jsx`, url); }
      }
      resolved = file.pathname.endsWith('.jsx') ? await componentModule(file) : file.href;
    } else resolved = import.meta.resolve(specifier);
    code = code.replace(match[0], `from ${JSON.stringify(resolved)}`);
  }
  const result = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  compiled.set(url.href, result);
  return result;
}
const { default: Widget } = await import(await componentModule(new URL('../src/components/FloatingWidget.jsx', import.meta.url)));
const { default: Settings } = await import(await componentModule(new URL('../src/components/MainConfigUI.jsx', import.meta.url)));
const config = { url: 'http://localhost:11434', model: 'missing-model', systemPrompt: 'Edit text.' };

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function mount(t, Component = Widget, props = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const requests = [];
  let selection;
  let cancels = 0;
  let hides = 0;
  const api = {
    ready() {},
    onTextSelected(callback) { selection = callback; return () => {}; },
    cancelGeneration() { cancels += 1; },
    hideWidget() { hides += 1; },
    generateStream(_action, _text, _tone, _instruction, _target, onChunk) {
      const request = { ...deferred(), onChunk };
      requests.push(request);
      return request.promise;
    },
    getModels: async () => ['installed-model'],
    getHistory: async () => [],
    ...props.api
  };
  window.electronAPI = api;
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(Component, { config, setConfig() {}, ...props })));
  t.after(async () => { await act(async () => root.unmount()); dom.window.close(); delete globalThis.window; delete globalThis.document; });
  const button = (label) => [...document.querySelectorAll('button')].find(element => element.textContent.includes(label));
  return {
    requests, button, get cancels() { return cancels; }, get hides() { return hides; },
    async select(text) { await act(async () => selection({ text, selectionId: requests.length + 1 })); },
    async expand() { await act(async () => document.querySelector('.widget-trigger').click()); },
    async click(label) { assert.ok(button(label), `Missing button: ${label}`); await act(async () => button(label).click()); }
  };
}

test('changing selection discards old chunks and final responses while a new request runs', async (t) => {
  const ui = await mount(t);
  await ui.select('First selection'); await ui.expand(); await ui.click('Correct');
  const old = ui.requests[0];
  await ui.select('Second selection'); await ui.expand(); await ui.click('Correct');
  const current = ui.requests[1];
  await act(async () => { old.onChunk('STALE'); old.resolve('STALE'); });
  assert.equal(document.body.textContent.includes('STALE'), false);
  assert.ok(ui.button('Cancel generation'));
  await act(async () => { current.onChunk('Current answer'); current.resolve('Current answer'); });
  assert.ok(document.querySelector('.diff-container').textContent.includes('Current')); 
  assert.equal(ui.button('Replace text').disabled, false);
});

test('automatic grammar checking starts on copy and still requires review before replacement', async (t) => {
  const ui = await mount(t, Widget, { config: { ...config, autoSuggestOnCopy: true } });
  await ui.select('They is here.');
  assert.equal(ui.requests.length, 1);
  assert.ok(document.body.textContent.includes('Checking grammar'));
  assert.ok(document.querySelector('[aria-label="Dismiss suggestion"]'));
  assert.ok(ui.button('Cancel generation'));
  await act(async () => ui.requests[0].resolve('They are here.'));
  assert.equal(ui.button('Replace text').disabled, false);
});

test('the suggestion panel can be dismissed without applying a change', async (t) => {
  const ui = await mount(t);
  await ui.select('They is here.'); await ui.expand(); await ui.click('Correct');
  await act(async () => ui.requests[0].resolve('They are here.'));
  await act(async () => document.querySelector('[aria-label="Dismiss suggestion"]').click());
  assert.equal(ui.hides, 1);
  assert.equal(document.querySelector('.widget-shell'), null);
});

test('automatic grammar checking can be disabled', async (t) => {
  const ui = await mount(t, Widget, { config: { ...config, autoSuggestOnCopy: false } });
  await ui.select('They is here.');
  assert.equal(ui.requests.length, 0);
  assert.ok(document.querySelector('.widget-trigger'));
});

test('failed replacement keeps the suggestion available and explains manual paste', async (t) => {
  const ui = await mount(t, Widget, { api: { replaceText: async () => ({ ok: false, message: 'Selection changed. Paste manually.' }) } });
  await ui.select('They is here.'); await ui.expand(); await ui.click('Correct');
  await act(async () => ui.requests[0].resolve('They are here.'));
  await ui.click('Replace text');
  assert.ok(document.body.textContent.includes('Selection changed. Paste manually.'));
  assert.ok(ui.button('Replace text'));
});

test('Replace sends the text and selection ID used for the suggestion', async (t) => {
  let request;
  const ui = await mount(t, Widget, { api: { replaceText: async (value) => { request = value; return { ok: true }; } } });
  await ui.select('They is here.'); await ui.expand(); await ui.click('Correct');
  await act(async () => ui.requests[0].resolve('They are here.'));
  await ui.click('Replace text');
  assert.deepEqual(request, { suggestion: 'They are here.', original: 'They is here.', selectionId: 1 });
});

test('Cancel clears partial output and permits another request immediately', async (t) => {
  const ui = await mount(t);
  await ui.select('Please edit'); await ui.expand(); await ui.click('Correct');
  const request = ui.requests[0];
  await act(async () => request.onChunk('Partial'));
  assert.equal(ui.button('Replace text').disabled, true);
  await ui.click('Cancel generation');
  assert.ok(ui.cancels >= 2);
  assert.equal(document.body.textContent.includes('Partial'), false);
  await ui.click('Improve');
  await act(async () => request.reject(new Error('old request cancelled')));
  assert.ok(ui.button('Cancel generation'));
  assert.equal(document.body.textContent.includes('old request cancelled'), false);
  await act(async () => ui.requests[1].resolve('New answer'));
});

test('a stream error removes partial text instead of allowing replacement', async (t) => {
  const ui = await mount(t);
  await ui.select('Please edit'); await ui.expand(); await ui.click('Correct');
  await act(async () => { ui.requests[0].onChunk('Partial'); });
  await act(async () => { ui.requests[0].reject(new Error('output limit')); });
  assert.equal(document.body.textContent.includes('Partial'), false);
  assert.equal(ui.button('Replace text'), undefined);
  assert.ok(document.body.textContent.includes('output limit'));
});

test('overlong selections are explicitly blocked instead of silently truncated', async (t) => {
  const ui = await mount(t);
  await ui.select('a'.repeat(20_001)); await ui.expand();
  assert.equal(ui.button('Correct').disabled, true);
  assert.ok(document.body.textContent.includes('20,000'));
  assert.equal(ui.requests.length, 0);
});

test('Settings shows a missing saved model and blocks saving the misleading selection', async (t) => {
  const ui = await mount(t, Settings);
  await act(async () => document.querySelector('[title="Refresh models"]').click());
  const select = document.querySelector('select[name="model"]');
  assert.equal(select.value, 'missing-model');
  assert.match(select.selectedOptions[0].textContent, /not installed/);
  assert.equal(ui.button('Save settings').disabled, true);
});

test('a late model lookup does not overwrite a newer result', async (t) => {
  const lookups = [];
  await mount(t, Settings, { api: { getModels() { const request = deferred(); lookups.push(request); return request.promise; } } });
  const refresh = async () => act(async () => document.querySelector('[title="Refresh models"]').click());
  await refresh(); await refresh();
  await act(async () => lookups[1].resolve(['new-model']));
  await act(async () => lookups[0].resolve(['stale-model']));
  assert.ok(document.querySelector('option[value="new-model"]'));
  assert.equal(document.querySelector('option[value="stale-model"]'), null);
});

test('Settings displays and saves app and website exclusions', async (t) => {
  let saved;
  const settings = { ...config, excludedApps: ['terminal', 'iterm2'], excludedWebsites: ['example.com'] };
  const ui = await mount(t, Settings, {
    config: settings,
    api: { saveConfig: async (value) => { saved = value; return value; } }
  });
  assert.equal(document.querySelector('[name="excludedApps"]').value, 'terminal\niterm2');
  assert.equal(document.querySelector('[name="excludedWebsites"]').value, 'example.com');
  await ui.click('Save settings');
  assert.deepEqual(saved.excludedApps, ['terminal', 'iterm2']);
  assert.deepEqual(saved.excludedWebsites, ['example.com']);
  assert.match(document.body.textContent, /Saved securely/);
});

test('Restore defaults clears both exclusion lists', async (t) => {
  let reset;
  const ui = await mount(t, Settings, { setConfig: value => { reset = value; } });
  await ui.click('Restore defaults');
  assert.deepEqual(reset.excludedApps, []);
  assert.deepEqual(reset.excludedWebsites, []);
});
