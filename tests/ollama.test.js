import test from 'node:test';
import assert from 'node:assert/strict';
import { readGenerationStream, validateCompletion, validateUrl } from '../electron/ollama.js';

async function* chunks(text, size = 3) {
  const bytes = new TextEncoder().encode(text);
  for (let offset = 0; offset < bytes.length; offset += size) yield bytes.slice(offset, offset + size);
}

const line = (data) => JSON.stringify(data) + '\n';

test('streams split JSON and UTF-8, including a final line without a newline', async () => {
  const received = [];
  const input = line({ response: 'Grüße 👋', done: false })
    + '\n' + JSON.stringify({ response: '!', done: true, done_reason: 'stop' });
  assert.equal(await readGenerationStream(chunks(input, 1), value => received.push(value)), 'Grüße 👋!');
  assert.deepEqual(received, ['Grüße 👋', '!']);
});

test('rejects premature EOF instead of accepting a partial suggestion', async () => {
  await assert.rejects(readGenerationStream(chunks(line({ response: 'Partial', done: false })), () => {}), /before completing/);
});

test('rejects a streamed Ollama error after partial output', async () => {
  await assert.rejects(readGenerationStream(chunks(line({ response: 'Partial' }) + line({ error: 'model unloaded' })), () => {}), /model unloaded/);
});

test('rejects token-limit completion instead of offering truncated text for replacement', async () => {
  await assert.rejects(readGenerationStream(chunks(line({ response: 'Partial', done: true, done_reason: 'length' })), () => {}), /output limit/);
});

test('rejects malformed JSON and empty streams', async () => {
  await assert.rejects(readGenerationStream(chunks('{bad json}\n'), () => {}), SyntaxError);
  await assert.rejects(readGenerationStream(chunks(''), () => {}), /before completing/);
});

test('rejects data after a terminal event', async () => {
  await assert.rejects(readGenerationStream(chunks(line({ done: true }) + line({ response: 'late' })), () => {}), /after Ollama completed/);
});

test('non-streamed responses must also complete successfully', () => {
  assert.doesNotThrow(() => validateCompletion({ done: true, done_reason: 'stop' }));
  assert.throws(() => validateCompletion({ error: 'not found' }), /not found/);
  assert.throws(() => validateCompletion({ done: false }), /before completing/);
});

test('accepts loopback HTTP and HTTPS endpoints', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    assert.equal(validateUrl(`http://${host}:11434/`), `http://${host}:11434`);
  }
  assert.equal(validateUrl('https://localhost:11434/'), 'https://localhost:11434');
});

test('rejects remote hosts, credentials, non-HTTP schemes, query strings and fragments', () => {
  for (const url of ['https://example.com', 'http://192.168.1.2:11434', 'http://localhost.evil.test', 'http://user:pass@localhost', 'file:///tmp/model', 'http://localhost?x=1', 'http://localhost#x']) {
    assert.throws(() => validateUrl(url), /local http/);
  }
});
