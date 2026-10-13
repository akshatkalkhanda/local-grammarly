# Replacement fix validation

Base: 36063bc6a82c893954248bfca8e3bb3cceee4373.

The source activation used `activateWithOptions(0)`. When AI Editor is active after panel interaction, that call does not request activation ignoring the other active app. The patch uses `NSApplicationActivateIgnoringOtherApps` (2), retaining the existing foreground-PID and fresh-copy selection checks. Copy/Paste/Undo now use physical macOS key codes with a five-second automation timeout, avoiding character shortcut ambiguity under non-Latin input sources. Permission denial still produces a visible message and manual clipboard fallback.

Harper has been removed. Automatic clipboard popups retain exclusions, pause controls, the four-word minimum and stale-source checks, and automatically request Ollama grammar suggestions when enabled. Clean text can now open the popup too: there is no offline error detector to gate it. No typing monitor or inline underlining has been implemented.

## Automated evidence

- `npm test`: 69 tests pass, including selection verification, focus loss, permission denial, automatic AI generation, stale stream cancellation and Replace IPC payloads.
- `npm run lint`: passes.
- `npm run build:app`: renderer and Electron main production bundles build.
- The two new macOS adapter regression checks fail against the base adapter and pass against the patch. These checks validate generated commands, not actual AppKit execution.

## Required packaged macOS check

This patch was prepared in Linux; native macOS execution and a DMG build were not available.

1. On the Mac, check out the PR branch. Run `npm ci`, then `npm run build`. Quit existing AI Editor instances and install/open the newly built app from Applications.
2. Enable Accessibility and Automation (System Events) for the installed AI Editor. Permission for Terminal or development Electron does not grant permission to the installed app. If permissions were granted to an older build, remove/re-add the installed app and fully restart it.
3. Start Ollama with the configured model. In TextEdit, type `I has a apple today.`, select it and press Command-C. Leave the selection intact. Confirm automatic generation and click Replace. Expect only the selected text to change.
4. Repeat in a browser textarea/contenteditable editor and after focusing the popup's custom instruction input. Confirm the source editor regains focus.
5. Repeat with a non-Latin input source enabled. Confirm Copy/Paste still work.
6. Change or clear the source selection before Replace. Expect refusal plus a clipboard fallback; unrelated text must not be overwritten. Deny Automation and repeat; expect a visible permission error.
7. Disable automatic suggestions: copying should show writing actions without starting a model request. Re-enable it: one AI request starts for a new eligible copy. Verify URLs, exclusions and paused operation remain quiet.

A successful keyboard event is not proof an arbitrary editor accepted the paste. Editors that clear selections on blur or do not support normal Copy/Paste may still require manual selection and paste. The app does not use Select All as a fallback.
