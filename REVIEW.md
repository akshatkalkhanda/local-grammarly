# Repository review — 3 October 2026

## Follow-up: safer Replace and automatic suggestion flow

This branch starts from `48d93d7` on the latest fetched `main` at the time of the change.

- Replace now carries the copied text and selection ID with the suggestion. The main process rejects a result tied to an older selection before touching the clipboard or sending a paste.
- The paste-back check restores the source app, waits for its focus, writes a unique clipboard marker, sends Copy, then requires an exact match with the original text before Paste. A changed or empty selection and lost focus have separate messages. macOS keyboard-control denials are reported separately.
- The widget now remembers whether a pending selection should open with focus while its renderer is loading. Automatic grammar generation still starts on new copied text when the saved setting is enabled; this is the practical cross-app trigger, not live typing integration.
- Focused tests exercise replacement against a disposable in-memory text field for success, changed selection, empty selection, lost focus, and permission denial. They do not simulate a native editor's Accessibility behavior.

Native smoke testing on this Mac showed a popup and generated suggestions from disposable TextEdit text. Replace refused to paste when the source-app identity was unavailable; the TextEdit selection remained intact. The session did **not** verify a successful native replacement or the distinct native error paths for changed selection, lost focus, and denied permission. Repeat those checks on the target Mac before merging. The app intentionally refuses to guess a paste destination when source capture fails.

The existing saved setting on the test machine had automatic suggestions disabled, so the live popup required a click to generate. Automated UI tests cover the enabled path. The README explains the setting and copy-triggered behavior.

Reviewed `main` at `99e212b` and updated the paste-back flow, automatic suggestions, tests, and usage guide. This is still a beta desktop assistant, not a system-wide inline Grammarly replacement.

## Changes in this update

- The System Events fallback now returns the frontmost process's Unix ID and compares it with this app's PID. The previous fallback called nonexistent Electron `app.getBundleId()`, producing repeated console errors when it ran. Target comparison now also recognizes Windows handles and Linux window IDs.
- After a report showing the macOS permission switch enabled while Electron still returned `ACCESSIBILITY_DENIED`, Replace no longer blocks solely on `isTrustedAccessibilityClient(false)`. It attempts the keyboard operation, verifies the original selection before paste, and classifies actual macOS automation-denial errors. The README now names the macOS 27 settings pane and the restart requirement.
- After a real macOS error report, source-app identification now uses AppKit's `NSWorkspace.frontmostApplication` through JXA and keeps the process ID. System Events remains a fallback. The selection shortcut preserves its initial source-app capture instead of overwriting it with a later lookup.
- Wait for source-app capture before showing the widget. Previously that asynchronous capture could finish after the widget took focus and leave an old target in memory.
- Before paste-back, reactivate the source app, confirm that it regained focus, and copy the current selection to compare it with the submitted text. If verification fails, keep the suggestion on the clipboard and show the widget with an error.
- Set the one-minute Undo entry only after the paste command is sent.
- Start grammar checking automatically when copied text opens the widget, with a Settings toggle to disable it. Replacement still requires a click.
- Add UI tests for automatic checking and update the README with the current behavior and its limits.

## Bugs fixed in this change

| Priority | Finding in the reviewed code | Change |
| --- | --- | --- |
| High | Copying new text while a request was running changed `selectedText`, but old stream callbacks still updated the suggestion. The old answer could be offered for the new selection. | Cancel on a new selection; gate chunks, final output, errors, and cleanup by request version. Main process aborts a sender's superseded request. |
| High | The stream reader treated EOF as success, ignored Ollama error events, and ignored output-limit termination. Partial text could be saved and offered for replacement. | Require the terminal `done` event, reject error and length-limit events, and clear partial UI output on failure. |
| High | Selections were silently shortened to 20,000 characters; replacement could overwrite the complete original selection with an answer based on only its prefix. | Preserve the selection and explicitly block overlong inputs in both the UI and generation request validation. |
| Medium | Clipboard polling ran during synthetic copy/paste, and app-authored clipboard text was not consistently marked as already seen. | Suppress polling during these operations and synchronize clipboard tracking on app-authored writes. |
| Medium | Settings could visually show the first installed model while retaining a different missing model as the saved value. | Display the missing value explicitly, explain the mismatch, and block saving it when the connected server confirms it is absent. |
| Medium | Concurrent model-list requests could complete out of order; a hung `/api/tags` request had no timeout. | Ignore stale lookup results and apply a five-second desktop request timeout. |
| Medium | Google Fonts caused an external UI request despite the local-first positioning. Local endpoint validation also allowed HTTP redirects. | Use system fonts; reject redirects and ambiguous URL query/fragment settings. Clarify the distinction between local endpoints and local inference. |
| Medium | Six high-severity dependency-tree audit findings were present. | Apply compatible lockfile updates; final npm audit reported zero known findings on the review date. This is not proof that all runtime vulnerabilities are absent. |

The new **Cancel generation** control aborts the desktop request, clears partial output, and permits a new request. Renderer destruction also aborts an active streamed request. Regression tests cover protocol errors, request isolation, cancellation UX, input-length handling, and model-selection races.

## Remaining issues and risks

These are not claimed as fixed. Findings below are from code inspection unless otherwise stated.

| Priority | Location / evidence | Impact and next step |
| --- | --- | --- |
| High | `electron/main.js`: paste-back checks the app identity and selected text, while tray Undo sends ⌘Z to the focused app. | Two windows in the same app with identical selected text cannot be distinguished; paste command delivery does not prove the edit was accepted. Undo still has no target verification. Use manual Copy/paste and native Undo when the destination is uncertain. Native macOS reproduction is still needed. |
| Medium | `electron/main.js`: `captureSelectionAndShow` snapshots only `clipboard.readText()` before `clipboard.clear()`. | A failed capture loses existing image/HTML/RTF clipboard formats. Preserve all supported formats or change capture to avoid clearing the clipboard; test on macOS with images, styled text, and file copies. |
| Medium | `electron/main.js`: fixed 480×420 transparent widget; React collapse changes only visible content. | A tiny visible sparkle may leave a larger transparent window area intercepting mouse input. Confirm on macOS, then resize the native window when collapsing/expanding. |
| Medium | `electron/main.js`: `createGenerationRequest` has an output cap but no explicit context-window budget. | Large selections can exceed the model's context budget. Output-limit detection prevents one kind of truncation, but model-side input truncation is still possible. Prefer sentence/paragraph chunks and reserve context for both prompt and output. |
| Medium | `electron/main.js`: history persists originals and suggestions to JSON; no opt-out. | Sensitive text remains after use. Add a history-disable option and retention controls; consider storage protection appropriate to the deployment. |
| Medium | `electron/main.js`: `saveConfig` updates in-memory config before the file write; history writes are not serialized/atomic. | Failed settings writes can leave the running state different from disk; overlapping history updates can race. Persist an atomic temporary-file rename before publishing settings and serialize history writes. |
| Low | `src/OllamaService.js` and browser fallback in `FloatingWidget.jsx` | Browser fallback lacks desktop feature parity, such as translation-target prompting, cancellation, and URL enforcement. Keep it clearly documented as a development preview or consolidate generation logic. |
| Low | `SettingsModal.jsx`, `AssistantSidebar.jsx`, `Editor.jsx`, `App.css`, template assets | Legacy UI remains outside the active App route. Remove it after confirming no intended alternate entrypoint; this will simplify maintenance. |
| Release blocker for broad distribution | No LICENSE file or configured signing/notarization/release pipeline | Choose a license, validate the macOS package, configure signing, and establish release checks before distributing broadly. |

Local model quality is another limit: a terminal success event does not prove the rewrite preserved meaning. Proper nouns, technical commands, identifiers, negation, and tone all need user review. The app should not advertise guaranteed correctness.

## Suggested feature order

1. **Document-aware replacement and undo.** Capture the source window and document, confirm the actual edit, and provide a scoped Undo path where supported. The current app/selection check is a first safeguard.
2. **Privacy controls.** Add “Pause clipboard detection”, a shortcut-only mode, an app exclusion list, and a history-off switch.
3. **Useful performance feedback.** Show model name, elapsed time, first-token time, and generation rate. Use Ollama's reported timing fields; benchmark representative passages before promising speed improvements.
4. **Writing preferences.** Personal dictionary and protected technical terms (for example censhare, Keycloak, HAProxy), British/American English, and reusable presets for emails, Jira tickets, and incident updates.
5. **Paragraph-aware processing.** Estimate context usage, split long selections at natural boundaries, preserve formatting, and let users review each segment.
6. **Release and onboarding.** First-run Ollama checks, clear model installation instructions, keyboard shortcut customization, login launch, signed builds, CI, and screenshots of the real macOS app.
7. **Inline checking later.** A browser extension or editor integration is needed for Grammarly-style underlines and automatic checks while typing. A universal desktop key listener alone cannot reliably read and replace text across every app.

For faster suggestions, first measure latency on the user's actual Mac with the existing small model. Cancelling stale work avoids wasted inference; streaming alone does not increase token generation speed.

## Validation performed

- Dependency installation completed with the lockfile.
- 26 regression cases passed: five macOS app and input checks, nine stream/URL checks, three preload IPC checks, and nine React UI checks in jsdom.
- `npm run lint` passed.
- `npm run build:app` compiled the renderer and Electron main process.
- Electron Builder packaged `release/mac-arm64/AI Editor.app` after correcting the icon file. DMG creation then failed because this execution environment's `hdiutil` returned `Device not configured`; the DMG is not a validated deliverable from this run.
- `npm audit` reports eight high-severity findings in the electron-builder development dependency chain through `http-cache-semantics`. `npm audit fix` does not resolve them within the current dependency range. Recheck upstream builder releases before distribution.
- `git diff --check` passed.

The UI tests use a mocked desktop bridge and transformed production React components. They do not exercise macOS APIs or a real model. The test runner may summarize the three test files; running each test file directly with Node prints its individual cases.

Not verified here: a completed macOS DMG, code signing/notarization, Accessibility/Automation prompts, native focus/paste/undo behavior, visual macOS inspection, or real Ollama latency/quality benchmarks. Automated checks ran on macOS with supported Node 24.19.0.

## Mac smoke test before merging/releasing

Use disposable text in TextEdit and a browser form, with Ollama running.

- Start with `npm ci` and `npm run dev`; confirm the menu-bar entry and settings.
- Choose an installed model, save, quit, and reopen to verify persistence.
- Copy a sentence, open the sparkle, and try each action, tone, and translation target.
- During a slow generation, copy different text, start another request, and verify the old answer never appears for the new text.
- Cancel before and after the first streamed output; immediately start a new action.
- Stop Ollama during generation; ensure partial output cannot be copied/replaced and a retry works after restart.
- Copy more than 20,000 characters and verify the explicit length warning.
- Confirm Copy and Replace do not create a new popup from the assistant's own clipboard write.
- Test Accessibility denied and allowed; preserve the source selection for paste-back, and use manual Copy if focus is uncertain.
- Test multiple displays, scaled displays, collapsed-widget click-through, repeated identical copies, and rich clipboard content.
- Clear history, restart, and verify the list remains empty.
- Run `npm run build` on the target Mac and repeat the essential flow in the packaged application.

## References

- [Ollama generate API](https://docs.ollama.com/api/generate): streaming completion and timing fields.
- [Ollama FAQ](https://docs.ollama.com/faq): local-only configuration, model memory residency, and GPU diagnostics.
- [Electron clipboard API](https://www.electronjs.org/docs/latest/api/clipboard): text and other clipboard formats.
