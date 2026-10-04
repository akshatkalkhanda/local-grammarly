import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DEFAULT_CONFIG, sanitizeConfig } from '../electron/config.js';
import { readSettings, writeSettings } from '../electron/settings-store.js';

async function fixture(t) {
  const folder = await mkdtemp(path.join(tmpdir(), 'ai-editor-settings-'));
  t.after(() => rm(folder, { recursive: true, force: true }));
  return path.join(folder, 'app', 'settings.json');
}
const settings = sanitizeConfig({ ...DEFAULT_CONFIG, excludedApps: ['Terminal', 'iTerm2'], excludedWebsites: ['example.com'], presets: [{ id: 'work', name: 'Work', instruction: 'Be brief.' }], autoSuggestOnCopy: false });
const load = (file, legacy) => readSettings(file, DEFAULT_CONFIG, sanitizeConfig, legacy);

test('saved exclusions, presets and toggles survive a fresh disk load', async t => {
  const file = await fixture(t);
  await writeSettings(file, settings);
  assert.deepEqual((await load(file)).config, settings);
  assert.deepEqual(JSON.parse(await readFile(`${file}.bak`, 'utf8')), settings);
});
test('a corrupt primary settings file recovers the saved backup', async t => {
  const file = await fixture(t);
  await writeSettings(file, settings);
  await writeFile(file, '{truncated');
  const loaded = await load(file);
  assert.equal(loaded.migrated, true);
  assert.deepEqual(loaded.config, settings);
});
test('an invalid model or preset does not reset valid exclusions', async t => {
  const file = await fixture(t);
  await writeSettings(file, { ...settings, model: '', presets: [{ id: 'broken' }] });
  const loaded = await load(file);
  assert.deepEqual(loaded.config.excludedApps, settings.excludedApps);
  assert.deepEqual(loaded.config.excludedWebsites, settings.excludedWebsites);
  assert.equal(loaded.config.autoSuggestOnCopy, false);
  assert.equal(loaded.config.model, DEFAULT_CONFIG.model);
  assert.deepEqual(loaded.config.presets, []);
});
test('legacy settings migrate only when the stable settings file is absent', async t => {
  const file = await fixture(t);
  const legacy = path.join(path.dirname(path.dirname(file)), 'legacy.json');
  await writeFile(legacy, JSON.stringify(settings));
  assert.equal((await load(file, [legacy])).migrated, true);
  assert.deepEqual((await load(file, [legacy])).config, settings);
  await writeSettings(file, DEFAULT_CONFIG);
  assert.deepEqual((await load(file, [legacy])).config, DEFAULT_CONFIG);
});
