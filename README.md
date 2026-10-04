# Local Grammarly · AI Editor

A macOS menu-bar writing assistant powered by Ollama. Copy selected text to get an automatic grammar suggestion, review the changes, then copy or replace the selection in your app.

**Status: beta.** This is a standalone desktop assistant. With automatic suggestions enabled, checking starts when you copy selected text; it does not underline mistakes as you type in every app. AI output and cross-app paste-back need your review.

## What you can do

| Action | Purpose |
| --- | --- |
| Correct | Fix grammar, spelling, and punctuation |
| Improve | Improve clarity and flow |
| Professional | Rewrite for a professional tone |
| Shorten | Make a passage more concise |
| Translate | Translate into English, German, or Dutch |

Grammar checking starts automatically on new copied text by default. You can turn it off in Settings, choose another action, set a tone, add a custom instruction, watch streamed output, cancel a request, compare word-level changes, and revisit recent suggestions. Copy and Replace stay disabled until generation finishes successfully.

## Requirements

- **macOS** for the full experience. Copy/paste automation uses AppleScript; Windows and Linux are not currently supported desktop targets.
- **Node.js 24 LTS, version 24.15 or later in the 24.x line**, and npm to develop/build. Node 22.22.2+ in the 22.x line is also accepted by the dependencies. Validation for this change used Node 24.19.0.
- [Git](https://git-scm.com/) to clone the repository.
- [Ollama](https://ollama.com/download/mac) installed and running, with a downloaded text-generation model.
- Enough RAM and storage for your chosen model. No GPU performance or latency guarantee is made.

Node.js is needed to build from source; a packaged app still needs Ollama and a model, but not a separate Node.js installation. Check `node --version` before `npm ci`; unsupported Node releases may appear to work but are not tested targets.

## Quick start from source

### 1. Prepare Ollama

Install and open Ollama, then run:

```bash
ollama pull qwen3:1.7b
ollama list
curl --max-time 5 http://localhost:11434/api/tags
```

The curl command should return JSON containing your installed model. If you use the Ollama CLI without its desktop app, run `ollama serve` in a separate terminal. Do not start a second server when one is already listening on port 11434.

### 2. Download and start AI Editor

```bash
git clone https://github.com/akshatkalkhanda/local-grammarly.git
cd local-grammarly
npm ci
npm run dev
```

Keep the terminal running. Look for **AI Editor** in the macOS menu bar: the main window starts hidden, and the Dock icon is intentionally hidden.

### 3. Configure the model

1. Open **AI Editor → Settings** from the menu bar.
2. Keep the API URL as `http://localhost:11434` unless your local server uses a different port.
3. Select an installed model and click **Save settings**.
4. If a saved model is missing, install it or choose an available model; use the refresh button to reload the list.

`qwen3:1.7b` is the default. Existing installations keep their saved choice. Changing the repository's default does not replace your saved settings. **Restore defaults** changes the form; click **Save settings** to persist it.

### 4. Grant macOS permissions

Open **System Settings → Privacy & Security → Device Control and Data Access** (called **Accessibility** on older macOS versions) and allow the running app. A source/development run may appear as **Electron**; a packaged build appears as **AI Editor**. Fully quit and restart the app after changing this setting; Electron's trust check can retain the earlier status until restart. If macOS separately requests Automation permission for System Events, allow it for the app you are running.

Normal copy detection works without Accessibility permission. The selection shortcut, Replace, and tray Undo need keyboard automation permission. If macOS blocks a simulated keystroke, the app reports that specifically. A failed keyboard-control check can also mean that no selection was copied, so verify the selected text before changing permissions.

## Daily use

1. Select a short passage in TextEdit, Mail, a browser text field, or another app.
2. Press **⌘C**. When **Suggest grammar fixes after copying text** is enabled in Settings, the assistant appears near the pointer and starts a grammar suggestion without another click. If the setting is off, click the sparkle and choose **Correct**. The setting is on by default for new installations; an existing saved setting takes precedence.
3. Review the result. Red strikethrough shows removals; green highlights show additions. Longer texts fall back to a plain result to keep the UI responsive.
4. Choose another writing action or tone if needed.
5. Choose **Copy** for manual pasting, or **Replace text** to attempt paste-back into the source app.

Example custom instructions: “Keep product names unchanged”, “Use British English”, or “Keep it under 80 words”. They guide the model; they are not guaranteed constraints.

**Keep the original selection intact until replacing.** The app binds each suggestion to the copied text and selection ID. Replace restores the source app, copies its current selection using a fresh clipboard marker, and compares it with that original text before sending ⌘V. A stale suggestion, changed or missing selection, lost focus, or blocked keyboard command stops replacement and shows a specific message. On a failed attempt, the suggestion remains on the clipboard for deliberate manual pasting. The check cannot distinguish two windows in the same app with identical selected text, and a successful ⌘V command does not prove that an editor accepted the edit. Use Copy and paste manually when the destination is uncertain.

On macOS, a popup opened by copying stays nonfocusable so clicking its writing actions or Replace does not take keyboard focus from the source editor. Clicking the custom-instruction field explicitly focuses AI Editor so you can type; some source apps may then clear their selection. If Replace reports a missing selection after editing instructions, use Copy and paste the suggestion yourself.

| Control | Behavior |
| --- | --- |
| ⌘⇧Space | Attempts to copy the current selection, open the assistant, and start grammar checking when automatic suggestions are enabled |
| Menu → Open assistant for clipboard | Opens current clipboard text; useful if copying the same text does not trigger a popup |
| Cancel generation | Stops the desktop request and discards partial output |
| Try again | Regenerates using the current action and controls |
| Header back arrow | Returns from the result to writing actions |
| Header down arrow | Collapses the panel to the sparkle button |
| Menu → Settings | Configures Ollama and shows the five newest history entries |
| Menu → Quit | Exits the menu-bar app |

Copying new text invalidates an older request. An old response cannot become a replacement for the new selection. Selections over 20,000 JavaScript string characters are rejected explicitly instead of being silently shortened. This is an input ceiling, not a guarantee that your model can handle that much text.

### Undo and history

The menu's **Undo last replacement** sends ⌘Z to the currently focused app within one minute of a replacement attempt. It does not store a reversible document edit or verify the target. Prefer your source app's normal Undo immediately after a replacement; do not use the tray action after switching apps or making unrelated edits.

The last 30 completed suggestions are saved locally, including original text. Settings displays the newest five; reopen Settings to refresh this view. **Clear history** clears the saved list. History is plaintext, not encrypted, and there is currently no “disable history” option.

## Privacy and network behavior

- The desktop app accepts only loopback Ollama URLs (`localhost`, `127.0.0.1`, or `[::1]`) using HTTP/HTTPS. Credentials, query strings, fragments, and HTTP redirects are rejected.
- It monitors changes to plain-text clipboard content while running. With automatic suggestions enabled, new copied text is sent to your configured Ollama endpoint immediately. Turn the option off in Settings if you want generation only after choosing an action.
- The UI uses system fonts and does not fetch Google Fonts.
- A loopback address alone **does not prove local inference**: a local Ollama server can use cloud models or a local proxy can forward requests. Use a downloaded local model and disable Ollama Cloud if you require local-only processing.
- Installing dependencies and downloading models requires network access. Your operating system or clipboard manager may also sync copied text independently of this app.

To disable cloud features for an Ollama macOS app launch:

```bash
launchctl setenv OLLAMA_NO_CLOUD 1
```

Quit and reopen Ollama afterward. For a CLI-managed server, use `OLLAMA_NO_CLOUD=1 ollama serve`. See [Ollama's local-only configuration](https://docs.ollama.com/faq#how-do-i-disable-ollama-cloud-features) for the persistent `server.json` setting and verification. The editor itself does not enforce that server setting.

`settings.json` and `history.json` live under Electron's `userData` directory, normally within `~/Library/Application Support/`. Development and packaged names can differ (`grammerly-clone` and `AI Editor`); check the matching folder. The project does not encrypt these files.

## Speed and quality

Start with the default small model and a paragraph of text. Larger models may produce better rewrites but use more memory and take longer. Existing installations should explicitly check the selected model in Settings.

The app requests non-thinking output (`think: false`), streams generated text, preloads the selected model at startup, and requests a 30-minute keep-alive. Model support and available memory affect this behavior. Switching models may still incur a cold load.

For diagnosis:

```bash
ollama ps
```

This shows loaded models and CPU/GPU placement. Check macOS Activity Monitor for memory pressure. Generation times out after 60 seconds; model-list checks time out after five seconds. Requests have an output token limit, so long passages may require smaller selections even below the 20,000-character ceiling. Incomplete streams and output-limit stops are rejected instead of offered for replacement.

There are no measured latency benchmarks yet. Streaming improves perceived responsiveness; it does not make the model itself generate faster.

## Build and checks

```bash
npm ci
npm test
npm run lint
npm run build:app
npm run build
```

| Command | Result |
| --- | --- |
| `npm run dev` | Vite development server and Electron app |
| `npm test` | Stream/protocol, preload IPC, and React UI regression tests; no model download required |
| `npm run lint` | JavaScript/React lint checks |
| `npm run build:app` | Compiles renderer and Electron main process into `dist/` and `dist-electron/` |
| `npm run build` | Compiles and runs electron-builder; on macOS produces the configured DMG in `release/` |
| `npm run preview` | Previews the web renderer only; not a full desktop app |

Build the DMG on a Mac. Open it and move **AI Editor.app** to Applications. The repository does not configure distribution signing/notarization credentials; a local build may be unsigned. It also has no automatic update mechanism.

The browser preview is for UI development. It does not provide the desktop clipboard, history, local-URL enforcement, or full action/translation behavior. Use Electron for normal operation.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Nothing opens after launch | Look in the menu bar; the widget stays hidden until text is copied |
| Ollama offline / connection refused | Open Ollama and run the curl check above; verify the configured loopback port |
| Port 11434 already in use | A server is probably already running; check it before launching another |
| Model missing / HTTP 404 | Run `ollama list`, pull the exact model tag if necessary, refresh Settings, and save an installed model |
| First response is slow | Model loading can be slow; try a short paragraph and check `ollama ps`/memory pressure |
| Generation times out | Use a shorter passage or smaller model; Cancel lets you retry without waiting |
| Suggestion reaches output limit | Select a shorter passage; the app will not let you apply the incomplete result |
| ⌘⇧Space or Replace does nothing | Check Accessibility/Automation permission for the actual running Electron/AI Editor app. Keep the original text selected until you click Replace. On failure, paste manually from the clipboard. |
| “The selected text changed” | The current selection differs from the text used for this suggestion. Copy the intended text again to generate a new suggestion. |
| “No selected text was copied” | Reselect the original passage in its app. Some editors clear selection when the assistant takes focus; use Copy for manual pasting in those apps. |
| “The source app did not regain focus” | Bring the original app forward, reselect and copy the text, then retry. Avoid switching documents while reviewing. |
| “The source app could not be identified” | Copy again while the source app is active. The assistant refuses to paste without a source-app identity. |
| “macOS blocked keyboard control” | Allow the running Electron/AI Editor app in Accessibility or Device Control and Data Access, allow System Events Automation if prompted, and fully restart the app. |
| Permission switch is on but Replace still says access denied | Fully quit and relaunch the development Electron app or packaged AI Editor. Newer versions attempt the copy/paste operation and report an actual macOS automation denial instead of stopping at a preflight trust check. If it still fails, remove and add the exact running app again in Device Control and Data Access. |
| “The original app could not be identified” | Install a build containing the macOS frontmost-app fix. Quit and reopen AI Editor, copy text again from the source app, then retry. An existing suggestion captured by an older build cannot regain its missing source-app identity. |
| Popup does not reappear for identical text | Use the menu's clipboard action; automatic detection compares text values |
| Paste goes to the wrong place | Use manual Copy/paste; preserve the original selection and avoid switching documents. The safeguard compares app identity and selected text, not document identity. |
| npm reports an unsupported Node version | Check `node --version`; use the supported versions listed above, then rerun `npm ci` |
| Browser preview cannot reach Ollama | Use the Electron app; its main process handles requests without browser CORS limitations |

The selection helper temporarily clears the clipboard and only restores plain text if copying fails. Rich clipboard content may be lost. Use normal ⌘C when preserving image/rich-text clipboard data matters.

## Known limitations and inline checking

The practical cross-app automatic flow is **copy → suggestion appears → you review → optional Replace**. It works with apps that expose selected text through normal Copy. Clipboard monitoring cannot see text as you type, and it cannot tell whether a copied passage came from a password field or a document. Disable automatic suggestions in Settings when copying sensitive material; the app still detects copies but waits for you to request generation.

Grammarly-style underlines while typing require app-specific integration. A browser extension can inspect supported web edit fields, while native editors need Accessibility support or their own plugin APIs. Rich editors, secure fields, terminals, remote desktops, and apps that clear selection on focus change may not support automatic paste-back. This project has no browser extension or system-wide typing monitor. Replacement is intentionally never automatic.

## Code map and contributing

- `electron/main.js`: windows, settings/history persistence, clipboard polling, shortcuts, IPC, generation lifecycle.
- `electron/ollama.js`: loopback URL validation and streamed-response completion checks.
- `electron/preload.cjs`: narrow bridge between the renderer and Electron main process.
- `src/components/FloatingWidget.jsx`: writing actions, cancellation, result review.
- `src/components/MainConfigUI.jsx`: connection/model settings and recent history.
- `src/components/DiffView.jsx`: word-level diff with a bounded-work fallback.
- `tests/`: automated regression coverage using Node's test runner and jsdom.

Before contributing, run the checks above and test the macOS clipboard flow with disposable text. Include OS, Node, Ollama version, model tag, action, approximate selection length, and reproducible steps in bug reports. Avoid posting private clipboard contents or history files.

See [REVIEW.md](REVIEW.md) for review findings, remaining limitations, suggested features, and the macOS smoke-test checklist.

## Author and license

Created by **Akshat Kalkhanda** — [akshatkalkhanda@gmail.com](mailto:akshatkalkhanda@gmail.com).

There is currently no LICENSE file in the repository. The owner should choose a license before presenting this as an open-source distribution with reuse permissions.

### Exclude apps and websites from popups

Open the menu bar icon → **Settings → Popup exclusions**. Enter one exact app name or bundle ID per line (for example `Terminal`, `iTerm2`, or `com.apple.Terminal`). Enter website domains such as `example.com` or `mail.google.com` in the website list, then click **Save settings**. Remove a line and save to enable that source again. Exclusions persist across restarts. Restore defaults clears both lists.

Domains include their subdomains. Pasting a full URL excludes its entire domain, not just that page. Exclusions suppress automatic clipboard popups before generation; the tray's **Open assistant for clipboard** and the selection shortcut remain available on demand.

App identification and website filtering are macOS features. Safari and supported Chromium browsers (Chrome, Edge, Brave, Vivaldi, Opera and Arc) expose their active tab through Apple Events. macOS may ask you to allow AI Editor/Electron to control the browser; allow this under **Privacy & Security → Automation** for website filtering. With a nonempty website list, automatic popups are suppressed in these browsers if the URL is unavailable or permission is denied, and in Firefox, which does not expose its tab this way. Other browsers and embedded web views cannot reliably be filtered by domain: exclude their whole app instead. URLs are used locally for matching and are not stored or sent to Ollama.

The clipboard does not identify its source: the app samples the foreground app when it notices a clipboard change. Switching tabs/apps immediately after copying can make attribution unreliable. This feature controls popup convenience; it is not a security boundary for clipboard contents.

### Writing tones

In the assistant's action panel, choose **Normal** for natural writing without added emojis, or **Emojified ✨** for a friendly version with a few relevant emojis. Then choose a writing action such as **Improve**. Emojified asks the model to preserve meaning and words, avoid emoji overload, and keep serious messages appropriate. Friendly, Confident, Concise and Formal remain available. Always review the result before choosing **Replace text**; actual emoji choices depend on your Ollama model.

### Custom writing presets

Open **Settings → Custom writing presets → Add preset**, enter a name and instructions, then **Save settings**. For example, name a preset “Friendly work message” and use “Make this warm, clear and professional. Keep it brief and preserve all facts.” You can edit or remove presets in Settings; changes take effect when saved. Up to 20 presets are stored locally, with 60 characters per name and 500 per instruction. Restore defaults clears presets too.

In the assistant's writing actions, choose **Writing preset**, review or adjust the filled-in custom instruction, select your tone, and click **Improve** or another action. If an automatic suggestion is already displayed, use **Back to writing actions** first. Choosing a preset does not generate or replace text by itself. Choose **No preset / custom** to clear the instruction. The filled-in instruction stays in the widget for subsequent requests during that app session; changing a saved preset does not overwrite an instruction already filled in. Results depend on the local model; review before replacing.

### Moving the popup and keeping settings

Drag the **AI Editor header** to move the popup; Back, Minimize and Close remain clickable. New selections still position the popup near the pointer. The popup uses a light CSS shadow with the macOS window shadow disabled to avoid the extra outline beneath it.

Click **Save settings** after changing preferences and wait for the saved message. On macOS, development and packaged builds now share `~/Library/Application Support/AI Editor/settings.json`. Existing settings from the old application folder are imported when the new file is absent. Saves replace the file atomically and keep a `.bak` recovery copy. Startup recovers valid fields independently, so an invalid preset or model preference does not erase your exclusions. Settings controls wait until saved preferences finish loading. The browser preview also reloads its saved local settings.

Already-reset exclusions cannot be reconstructed from an empty settings file: enter them once and save with this version, then fully quit and reopen to confirm they persist.

### Quick reply

In writing actions, choose a **Quick reply** intent and click **Draft reply**:

- **Polish my notes:** select your own short notes, such as “yes, tomorrow works”.
- **Accept**, **Decline politely**, **Ask for details:** select the incoming message you want to answer.
- **Custom reply:** select the incoming message and put your directions in the custom instruction field.

Reply drafts offer **Copy** so you can paste into the actual reply field. They never send a message or replace the incoming message. Your tone and selected preset also apply. Review facts and commitments before sending; model output can still be wrong.

### Pause automatic popups

Use **Pause assistant** in the menu bar, the popup footer, or Settings. Choose **15 minutes**, **1 hour**, or **Until tomorrow (midnight)** in your local timezone. **Resume now** ends the pause early. Pausing closes the current popup and cancels its generation. The deadline is saved across restarts; automatic popups resume after it expires. Text copied while paused is not replayed on resume. Manual opening through the tray or selection shortcut still works.

### Dictionary, preview and favorites

- **Personal dictionary:** Settings → Personal dictionary. Enter one name, technical term, or phrase per line and save. Up to 200 entries of 80 characters each are included in model instructions. This guides preservation; it does not guarantee exact model output.
- **Before / After:** use **Changes**, **Before**, or **After** above the suggestion to see highlighted edits, the original, or a clean result. Copy and Replace always use the generated suggestion, even while viewing Before.
- **Favorite presets:** check **Show as a favorite button** on a preset and save Settings. Its star button in the popup runs **Improve** with that preset in one click, then waits for review.
- **Remembered preferences:** changing tone, translation language, or selected preset automatically saves that choice. The next app session restores it. These choices also apply to automatic grammar suggestions. Custom instructions typed by hand last only for the current session; choosing No preset clears the remembered preset. Settings saves do not undo a running pause or newer writing preferences.

### Native smoke test

Run `npm run test:electron` on macOS to build and exercise the actual Electron main process, preload bridge and renderer twice in succession. It uses temporary settings, a mocked clipboard, disabled shortcut registration/permission prompts, and mocked model responses. It verifies pause/resume, settings writes, stale Settings saves, favorites, reply review, and restoring preferences after a fresh process launch. It does not test real Ollama quality, real macOS permissions, or copying/pasting into other applications. Run `npm test`, `npm run lint`, and `npm run build` for the full regular checks and packaging.
