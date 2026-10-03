export class ReplacementError extends Error {
  constructor(reason, message) {
    super(message);
    this.name = 'ReplacementError';
    this.reason = reason;
  }
}

// Keyboard automation cannot inspect an arbitrary editor's caret. A fresh copy
// from the restored target is the last safety check before sending paste.
export async function replaceSelection({ target, original, replacement, clipboard, currentTarget, activate, key, pause, sameTarget }) {
  if (!target) throw new ReplacementError('focus', 'The source app could not be identified. Copy the text again.');
  if (!sameTarget(target, await currentTarget())) {
    try { await activate(target); }
    catch (error) {
      throw new ReplacementError('focus', `The source app could not be reactivated: ${error.message || 'unknown error'}`);
    }
  }

  let focused = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (sameTarget(target, await currentTarget())) { focused = true; break; }
    await pause(50);
  }
  if (!focused) throw new ReplacementError('focus', 'The source app did not regain focus. Select the text there and try again.');

  // A sentinel distinguishes a new copy from an unchanged clipboard. Some
  // editors leave the clipboard alone when no text is selected.
  const sentinel = `AI Editor copy check ${Date.now()} ${Math.random()}`;
  clipboard.writeText(sentinel);
  await key('c');
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await pause(50);
    if (!sameTarget(target, await currentTarget())) {
      throw new ReplacementError('focus', 'The source app lost focus during selection verification. Select the text and try again.');
    }
    const copied = clipboard.readText();
    if (copied === sentinel) continue;
    if (copied !== original) {
      throw new ReplacementError('selection', 'The selected text changed. Copy the current selection to get a new suggestion.');
    }
    if (!sameTarget(target, await currentTarget())) {
      throw new ReplacementError('focus', 'The source app lost focus before replacement.');
    }
    clipboard.writeText(replacement);
    await key('v');
    return;
  }
  throw new ReplacementError('selection', 'No selected text was copied from the source app. Select the original text and try again.');
}
