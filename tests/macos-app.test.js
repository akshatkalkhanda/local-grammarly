import test from 'node:test';
import assert from 'node:assert/strict';
import { activateMacApp, isMacInputPermissionError, parseFrontmostApp, readFrontmostMacApp } from '../electron/macos-app.js';

test('frontmost app parsing keeps a target process and rejects our own or missing app', () => {
  assert.deepEqual(parseFrontmostApp('{"pid":123,"bundleId":"com.apple.TextEdit"}', 456), { pid: 123, bundleId: 'com.apple.TextEdit' });
  assert.equal(parseFrontmostApp('{"pid":456,"bundleId":"com.example.editor"}', 456), null);
  assert.equal(parseFrontmostApp('{"pid":null}', 456), null);
  assert.equal(parseFrontmostApp('', 456), null);
});

test('frontmost app lookup uses AppKit without asking System Events', async () => {
  const commands = [];
  const exec = async (command, args) => {
    commands.push({ command, args });
    return { stdout: '{"pid":123,"bundleId":"com.apple.TextEdit"}\n' };
  };
  assert.deepEqual(await readFrontmostMacApp(exec, 456), { pid: 123, bundleId: 'com.apple.TextEdit' });
  assert.equal(commands[0].command, 'osascript');
  assert.deepEqual(commands[0].args.slice(0, 3), ['-l', 'JavaScript', '-e']);
  assert.match(commands[0].args[3], /NSWorkspace\.sharedWorkspace\.frontmostApplication/);
  assert.doesNotMatch(commands[0].args[3], /System Events/);
});

test('activation requires a valid process and checks the system result', async () => {
  await assert.rejects(activateMacApp(async () => ({ stdout: 'false' }), 123), /could not be activated/);
  await assert.rejects(activateMacApp(async () => ({ stdout: 'true' }), 0), /Invalid source app/);
  await assert.doesNotReject(activateMacApp(async () => ({ stdout: 'true\n' }), 123));
});

test('macOS automation denial is distinguished from an ordinary paste failure', () => {
  assert.equal(isMacInputPermissionError({ stderr: 'System Events got an error: osascript is not allowed assistive access. (-25211)' }), true);
  assert.equal(isMacInputPermissionError({ message: 'Not authorized to send Apple events to System Events. (-1743)' }), true);
  assert.equal(isMacInputPermissionError({ message: 'The original selection changed.' }), false);
});
