import test from 'node:test';
import assert from 'node:assert/strict';
import { pauseDeadline, isPaused, normalizeDictionary, sanitizePreferences } from '../src/writing.js';
import { DEFAULT_CONFIG, sanitizeConfig } from '../electron/config.js';
import { createGenerationRequest } from '../electron/generation.js';

test('pause expiry, resume and local midnight have exact boundaries', () => {
  const now = new Date(2026, 9, 3, 22, 30).getTime();
  assert.equal(pauseDeadline('15m', now), now + 900_000);
  assert.equal(pauseDeadline('1h', now), now + 3_600_000);
  assert.equal(pauseDeadline('tomorrow', now), new Date(2026, 9, 4, 0, 0).getTime());
  assert.equal(isPaused({ pausedUntil: now + 1 }, now), true);
  assert.equal(isPaused({ pausedUntil: now }, now), false);
  assert.equal(isPaused({ pausedUntil: pauseDeadline('resume', now) }, now), false);
  assert.throws(() => pauseDeadline('bad'));
});
test('dictionary normalizes entries and enforces limits without losing case', () => {
  assert.deepEqual(normalizeDictionary(' Akshat\nKubernetes\nAkshat\n'), ['Akshat', 'Kubernetes']);
  assert.throws(() => normalizeDictionary(['x'.repeat(81)]));
  assert.throws(() => normalizeDictionary(Array.from({ length: 201 }, (_, i) => String(i))));
});
test('saved preferences validate values and older settings acquire defaults', () => {
  assert.deepEqual(sanitizePreferences({ tone: 'bad', translationTarget: 'bad', presetId: null }), { tone: 'neutral', translationTarget: 'English', presetId: '' });
  const result = sanitizeConfig({ ...DEFAULT_CONFIG, preferences: { tone: 'friendly', translationTarget: 'German', presetId: 'work' }, pausedUntil: 123456, personalDictionary: 'censhare', presets: [{ id: 'work', name: 'Work', instruction: 'Be brief.', favorite: true }] });
  assert.equal(result.preferences.presetId, 'work');
  assert.equal(result.preferences.tone, 'friendly');
  assert.equal(result.presets[0].favorite, true);
  assert.deepEqual(result.personalDictionary, ['censhare']);
  assert.equal(result.pausedUntil, 123456);
});
test('all reply intents create draft requests; custom replies require instructions', () => {
  for (const action of ['reply', 'reply_accept', 'reply_decline', 'reply_details', 'reply_custom']) {
    const request = createGenerationRequest(DEFAULT_CONFIG, action, 'Can we meet tomorrow?', 'friendly', 'Ask about the time.');
    assert.equal(request.action, action);
    assert.match(request.system, /Output only the reply draft/);
    assert.match(request.system, /Do not invent/);
    assert.match(request.prompt, /Ask about the time/);
  }
  assert.throws(() => createGenerationRequest(DEFAULT_CONFIG, 'reply_custom', 'Text'), /Add instructions/);
  assert.throws(() => createGenerationRequest(DEFAULT_CONFIG, 'send', 'Text'), /Unsupported/);
});
test('dictionary data and output-only constraints reach grammar and translation prompts', () => {
  for (const action of ['grammar', 'translate']) {
    const request = createGenerationRequest({ ...DEFAULT_CONFIG, personalDictionary: ['Akshat', 'censhare'] }, action, 'Akshat use censhare.', 'neutral', '', 'German');
    assert.match(request.system, /\["Akshat","censhare"\]/);
    assert.match(request.system, /do not insert them otherwise/);
    assert.match(request.system, /Output only/);
    if (action === 'translate') assert.match(request.prompt, /into German/);
  }
});
