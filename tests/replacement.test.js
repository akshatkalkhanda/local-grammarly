import test from 'node:test';
import assert from 'node:assert/strict';
import { replaceSelection } from '../electron/replacement.js';

function disposableField({ text = 'They is here.', selected = 'They is here.', focused = 'assistant', permission = true } = {}) {
  const field = { text, selected, focused, clipboard: 'old clipboard', pasted: false, activated: false };
  const clipboard = {
    readText: () => field.clipboard,
    writeText: (value) => { field.clipboard = value; }
  };
  const options = {
    target: { pid: 10 }, original: 'They is here.', replacement: 'They are here.', clipboard,
    currentTarget: async () => field.focused === 'editor' ? { pid: 10 } : { pid: 20 },
    activate: async () => { field.activated = true; field.focused = 'editor'; },
    key: async (key) => {
      if (!permission) throw new Error('osascript is not allowed assistive access. (-25211)');
      if (key === 'c' && field.selected) field.clipboard = field.selected;
      if (key === 'v') { field.text = field.text.replace(field.selected, field.clipboard); field.pasted = true; }
    },
    pause: async () => {},
    sameTarget: (a, b) => a?.pid === b?.pid
  };
  return { field, options };
}

test('restores focus, verifies a disposable selection, then replaces it', async () => {
  const { field, options } = disposableField();
  await replaceSelection(options);
  assert.equal(field.activated, true);
  assert.equal(field.text, 'They are here.');
  assert.equal(field.pasted, true);
});

test('reactivates the source app even when its process already appears frontmost', async () => {
  const { field, options } = disposableField({ focused: 'editor' });
  await replaceSelection(options);
  assert.equal(field.activated, true);
  assert.equal(field.text, 'They are here.');
});

test('a changed selection never receives the suggestion', async () => {
  const { field, options } = disposableField({ text: 'They is here. Other text.', selected: 'Other text.' });
  await assert.rejects(replaceSelection(options), { reason: 'selection' });
  assert.equal(field.text, 'They is here. Other text.');
  assert.equal(field.pasted, false);
});

test('lost focus stops before copy or paste', async () => {
  const { field, options } = disposableField();
  options.activate = async () => {};
  await assert.rejects(replaceSelection(options), { reason: 'focus' });
  assert.equal(field.pasted, false);
});

test('focus lost while copying cannot reach paste', async () => {
  const { field, options } = disposableField();
  const copy = options.key;
  options.key = async (key) => {
    await copy(key);
    if (key === 'c') field.focused = 'other';
  };
  await assert.rejects(replaceSelection(options), { reason: 'focus' });
  assert.equal(field.pasted, false);
});

test('an empty selection leaves the sentinel and never pastes', async () => {
  const { field, options } = disposableField({ selected: '' });
  await assert.rejects(replaceSelection(options), { reason: 'selection' });
  assert.equal(field.pasted, false);
});

test('keyboard permission denial cannot paste', async () => {
  const { field, options } = disposableField({ permission: false });
  await assert.rejects(replaceSelection(options), /not allowed assistive access/);
  assert.equal(field.pasted, false);
});
