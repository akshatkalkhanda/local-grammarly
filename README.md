# Local Grammarly · AI Editor

A macOS menu-bar writing assistant powered by Ollama. Copy a passage, choose a writing action, review the changes, and copy or paste the result back into your app.

**Status: beta.** This is a standalone desktop assistant, not a browser extension or an inline grammar checker. It does not underline mistakes as you type. AI output and cross-app paste-back need your review.

## What you can do

| Action | Purpose |
| --- | --- |
| Correct | Fix grammar, spelling, and punctuation |
| Improve | Improve clarity and flow |
| Professional | Rewrite for a professional tone |
| Shorten | Make a passage more concise |
| Translate | Translate into English, German, or Dutch |

You can also choose a tone, add a custom instruction, watch streamed output, cancel a request, compare word-level changes, and revisit recent suggestions. Copy and Replace stay disabled until generation finishes successfully.

## Requirements

- **macOS** for the full experience. Copy/paste automation uses AppleScript; Windows and Linux are not currently supported desktop targets.
- **Node.js 24 LTS, version 24.15 or later in the 24.x line**, and npm to develop/build. Node 22.22.2+ in the 22.x line is also accepted by the dependencies. Validation for this change used Node 24.19.0.
- [Git](https://git-scm.com/) to clone the repository.
- [Ollama](https://ollama.com/download/mac) installed and running, with a downloaded text-generation model.
- Enough RAM and storage for your chosen model. No GPU performance or latency guarantee is made.

Node.js is needed to build from source; a packaged app still needs Ollama and a model, but not a separate Node.js installation.

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

Open **System Settings → Privacy & Security → Accessibility** and allow the running app. A source/development run may appear as **Electron**; a packaged build appears as **AI Editor**. Restart the app if the permission does not take effect. If macOS separately requests Automation permission for System Events, allow it for the app you are running.

Normal copy detection works without Accessibility permission. The selection shortcut, Replace, and tray Undo need keyboard automation permission.

## Daily use

1. Select a short passage in TextEdit, Mail, a browser text field, or another app.
2. Press **⌘C**. A small sparkle button appears near the pointer when clipboard text changes.
3. Click the sparkle, choose an optional tone/custom instruction, then a writing action.
4. Review the result. Red strikethrough shows removals; green highlights show additions. Longer texts fall back to a plain result to keep the UI responsive.
5. Choose **Copy** for manual pasting, or **Replace text** to attempt paste-back into the previously active app.

Example custom instructions: “Keep product names unchanged”, “Use British English”, or “Keep it under 80 words”. They guide the model; they are not guaranteed constraints.

**Keep the original selection intact until replacing.** The current paste-back implementation does not verify the original document or selection. If you switched apps or moved the cursor, use Copy and paste manually into the intended selection.

| Control | Behavior |
| --- | --- |
| ⌘⇧Space | Attempts to copy the current selection and open the assistant |
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
- It monitors changes to plain-text clipboard content while running. Copy detection displays text locally; generation starts when you choose an action.
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
| ⌘⇧Space or Replace does nothing | Check Accessibility/Automation permission for the actual running Electron/AI Editor app |
| Popup does not reappear for identical text | Use the menu's clipboard action; automatic detection compares text values |
| Paste goes to the wrong place | Use manual Copy/paste; preserve the original selection and avoid switching apps |
| npm reports an unsupported Node version | Check `node --version`; use the supported versions listed above, then rerun `npm ci` |
| Browser preview cannot reach Ollama | Use the Electron app; its main process handles requests without browser CORS limitations |

The selection helper temporarily clears the clipboard and only restores plain text if copying fails. Rich clipboard content may be lost. Use normal ⌘C when preserving image/rich-text clipboard data matters.

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
