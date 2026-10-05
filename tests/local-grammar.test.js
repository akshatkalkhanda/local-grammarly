import test from 'node:test';
import assert from 'node:assert/strict';
import { isAutomaticCheckCandidate } from '../electron/popup-policy.js';
import { createLocalGrammarService } from '../electron/local-grammar-service.js';

test('automatic checks skip short selections, links and non-word punctuation', () => {
  for (const text of ['', 'Hello', 'Please help', 'Please help me', 'They is here.', 'Please-help me', '123 456 !!! help', 'https://example.com', 'https://example.com\nhttps://example.org', 'x'.repeat(20_001)]) {
    assert.equal(isAutomaticCheckCandidate(text), false, text);
  }
  assert.equal(isAutomaticCheckCandidate('I has a apple today.'), true);
  assert.equal(isAutomaticCheckCandidate('Please review https://example.com today.'), true);
});

test('real Harper worker corrects locally, preserves Unicode and respects changing dictionaries', async t => {
  const checker = createLocalGrammarService();
  t.after(() => checker.dispose());
  const result = await checker.check('I has a apple today.');
  assert.equal(result.suggestion, 'I have an apple today.');
  assert.equal(result.issueCount, 2);
  assert.equal((await checker.check('😀 This is a example of incorrect grammar.')).suggestion, '😀 This is an example of incorrect grammar.');
  assert.equal((await checker.check('I would like some help.')).suggestion, '');
  assert.equal((await checker.check('Please help')).suggestion, '');
  assert.equal((await checker.check('Bitte helfen Sie mir heute.')).supported, false);
  const text = 'I work with Blorptastic every day.';
  assert.equal((await checker.check(text, ['Blorptastic'])).suggestion, '');
  assert.equal((await checker.check(text, [])).supported, false);
  await assert.rejects(checker.check('x'.repeat(20_001)), /20,000/);
  assert.equal((await checker.check('This is a example of incorrect grammar.')).suggestion, 'This is an example of incorrect grammar.');
});
