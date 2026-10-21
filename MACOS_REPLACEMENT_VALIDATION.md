# Replacement fix validation

Current patch base: 16d63574d0cbd09b8c80d4127d8e3bc560546b95 (main after PR #23).

## Remaining activation race

The earlier activation and Harper-removal changes below are already on main. A second focus path remained: Replace hides the panel before restoring the source, while the macOS `activate` handler opened Settings whenever that panel was hidden. An activation event during replacement could therefore create or focus Settings and interrupt Copy/Paste verification.

The handler now ignores activation while replacement, paste suppression, or popup opening is in progress. Ordinary activation with no popup still opens Settings. Existing fresh-selection verification and permission error handling remain intact.

`tests/main-replacement.test.js` runs the production main-process handlers with disposable Electron/OS adapters. Injecting activation when Replace hides the panel and delaying Settings focus until Copy reproduces a focus failure against the base; the patch passes and changes only the selected disposable text. This isolates a possible event-order failure, not a confirmed reproduction on the user's Mac.

The Electron smoke script no longer calls the removed Harper API. It now checks that the API is absent and exercises automatic Ollama generation through the renderer/preload/main path with a mocked model response.

Current validation: 71 tests pass; lint and production renderer/main builds pass. The full Electron smoke run was attempted but this Linux host cannot create a GTK display connection, so that suite is not reported as passed. No native macOS app or DMG execution was available.

On macOS, additionally verify that clicking Replace never opens Settings, including after interacting with the popup, and that ordinary app activation still opens Settings once the popup is closed. Run `npm run test:electron` before the manual cross-app checks below.

## Earlier fix retained from PR #23

The source activation used `activateWithOptions(0)`. When AI Editor is active after panel interaction, that call does not request activation ignoring the other active app. The patch uses `NSApplicationActivateIgnoringOtherApps` (2), retaining the existing foreground-PID and fresh-copy selection checks. Copy/Paste/Undo now use physical macOS key codes with a five-second automation timeout, avoiding character shortcut ambiguity under non-Latin input sources. Permission denial still produces a visible message and manual clipboard fallback.

Harper has been removed. Automatic clipboard popups retain exclusions, pause controls, the four-word minimum and stale-source checks, and automatically request Ollama grammar suggestions when enabled. Clean text can now open the popup too: there is no offline error detector to gate it. No typing monitor or inline underlining has been implemented.

## Earlier automated evidence (PR #23)

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
