import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function harness() {
  let api;
  const ipc = new EventEmitter();
  const sent = [];
  ipc.send = (channel, payload) => sent.push({ channel, payload });
  runInNewContext(readFileSync(new URL('../electron/preload.cjs', import.meta.url), 'utf8'), {
    require: () => ({ ipcRenderer: ipc, contextBridge: { exposeInMainWorld: (_name, value) => { api = value; } } })
  });
  return { api, ipc, sent };
}

test('stream replies are correlated by request ID and listeners are cleaned up', async () => {
  const { api, ipc, sent } = harness();
  const received = [];
  const result = api.generateStream('grammar', 'text', 'neutral', '', 'English', value => received.push(value));
  const { requestId } = sent[0].payload;
  ipc.emit('ollama:stream-response', {}, { requestId: 'unrelated', type: 'chunk', chunk: 'wrong' });
  ipc.emit('ollama:stream-response', {}, { requestId, type: 'chunk', chunk: 'right' });
  ipc.emit('ollama:stream-response', {}, { requestId, type: 'done', suggestion: 'right' });
  assert.equal(await result, 'right');
  assert.deepEqual(received, ['right']);
  assert.equal(ipc.listenerCount('ollama:stream-response'), 0);
});

test('stream errors reject and release listeners', async () => {
  const { api, ipc, sent } = harness();
  const result = api.generateStream('grammar', 'text', 'neutral', '', 'English', () => {});
  const rejected = assert.rejects(result, /cancelled/);
  ipc.emit('ollama:stream-response', {}, { requestId: sent[0].payload.requestId, type: 'error', message: 'cancelled' });
  await rejected;
  assert.equal(ipc.listenerCount('ollama:stream-response'), 0);
});

test('Cancel reaches the main process', () => {
  const { api, sent } = harness();
  api.cancelGeneration();
  assert.equal(sent[0].channel, 'ollama:cancel');
});
