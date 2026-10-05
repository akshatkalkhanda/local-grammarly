import test from 'node:test';
import assert from 'node:assert/strict';
import { isUrlOnlyText, normalizeExclusions, shouldSuppressPopup, readBrowserUrl } from '../electron/exclusions.js';
import { createGenerationRequest } from '../electron/generation.js';
const chrome = { pid: 123, bundleId: 'com.google.Chrome', name: 'Google Chrome' };

test('URL-only selections are excluded while prose containing links remains eligible', () => {
  for (const text of [' https://example.com/path?q=hello#section\n', 'HTTP://localhost:3000', 'http://127.0.0.1:8080', 'https://[::1]:3000', 'www.example.com', 'example.com/path', 'file:///tmp/document.txt', 'https://example.com\nhttps://example.org']) {
    assert.equal(isUrlOnlyText(text), true, text);
    assert.throws(() => createGenerationRequest({}, 'grammar', text), /URLs are excluded/, text);
  }
  for (const text of ['', '   ', 'Hello world.', 'Please review https://example.com', 'name@example.com', 'https://', 'example', 'This is a sentence.\nhttps://example.com']) {
    assert.equal(isUrlOnlyText(text), false, text);
  }
  assert.equal(createGenerationRequest({}, 'grammar', 'Please review https://example.com').source, 'Please review https://example.com');
});

test('normalizes persisted lists and validates domains', () => {
  assert.deepEqual(normalizeExclusions(' Terminal\niTerm2\nterminal\n'), ['terminal', 'iterm2']);
  assert.deepEqual(normalizeExclusions('https://Example.com/path\nexample.com\nmail.example.org', true), ['example.com', 'mail.example.org']);
  assert.throws(() => normalizeExclusions('*.example.com', true), /valid website/);
  assert.throws(() => normalizeExclusions('bad domain', true), /valid website/);
});

test('app exclusions match names and bundle IDs before querying a browser', async () => {
  const read = () => { throw new Error('must not query'); };
  assert.equal(await shouldSuppressPopup({ excludedApps: ['iterm2'] }, { name: 'iTerm2' }, read), true);
  assert.equal(await shouldSuppressPopup({ excludedApps: ['com.google.chrome'] }, chrome, read), true);
  assert.equal(await shouldSuppressPopup({ excludedApps: ['terminal'] }, { name: 'Terminal Plus' }, read), false);
});

test('domain rules cover subdomains with correct boundaries', async () => {
  const config = { excludedWebsites: ['example.com'] };
  for (const host of ['example.com', 'mail.example.com', 'EXAMPLE.COM.']) {
    assert.equal(await shouldSuppressPopup(config, chrome, async () => `https://${host}/path`), true);
  }
  for (const host of ['notexample.com', 'example.com.evil.org']) {
    assert.equal(await shouldSuppressPopup(config, chrome, async () => `https://${host}`), false);
  }
});

test('unknown sources, unsupported browsers and permission failures fail closed when filtered', async () => {
  const config = { excludedWebsites: ['example.com'] };
  assert.equal(await shouldSuppressPopup(config, null), true);
  assert.equal(await shouldSuppressPopup(config, { bundleId: 'org.mozilla.firefox' }), true);
  assert.equal(await shouldSuppressPopup(config, chrome, async () => { throw new Error('permission denied'); }), true);
  assert.equal(await shouldSuppressPopup(config, chrome, async () => ''), true);
  assert.equal(await shouldSuppressPopup({}, chrome, () => { throw new Error(); }), false);
  assert.equal(await shouldSuppressPopup(config, { bundleId: 'com.apple.TextEdit' }), false);
});

test('browser lookup uses bounded scripts without changing focus or clipboard', async () => {
  for (const kind of ['safari', 'chromium']) {
    const url = await readBrowserUrl(async (command, args, options) => {
      assert.equal(command, 'osascript');
      assert.equal(options.timeout, 2500);
      assert.match(args[3], kind === 'safari' ? /currentTab/ : /activeTab/);
      assert.doesNotMatch(args[3], /activate|clipboard|keystroke/);
      return { stdout: 'https://example.com\n' };
    }, chrome, kind);
    assert.equal(url, 'https://example.com');
  }
});
