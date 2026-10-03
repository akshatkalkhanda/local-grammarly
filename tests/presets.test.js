import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePresets } from '../electron/presets.js';
const preset = { id: 'work', name: 'Work', instruction: 'Keep it brief.' };
test('presets support older settings and survive JSON persistence', () => {
  assert.deepEqual(sanitizePresets(), []);
  const result = sanitizePresets([{ ...preset, name: ' Work ', instruction: ' Keep it brief. ' }]);
  assert.deepEqual(sanitizePresets(JSON.parse(JSON.stringify(result))), [preset]);
});
test('presets reject missing fields, duplicates and oversized lists or instructions', () => {
  for (const value of [null, {}, [{ ...preset, name: '' }], [{ ...preset, instruction: 'x'.repeat(501) }], [preset, { ...preset, id: 'other', name: 'WORK' }], [preset, { ...preset, name: 'Other' }], Array(21).fill(preset)]) {
    assert.throws(() => sanitizePresets(value));
  }
});
