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
  const api = {
    ready() {},
    onTextSelected(callback) { selection = callback; return () => {}; },
    cancelGeneration() { cancels += 1; },
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
    requests, button, get cancels() { return cancels; },
    async select(text) { await act(async () => selection(text)); },
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
