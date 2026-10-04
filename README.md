# Local Grammarly · AI Editor

A Mac writing assistant powered by Ollama. Select text, copy it, review a grammar suggestion, then choose **Copy** or **Replace text**.

**Beta:** suggestions appear after copying text. The app does not underline mistakes while you type. Always review the result before applying it.

## Start here

**First-time user? Follow sections 1–6 in order.** You only need Terminal for downloading the model; you do not need to know how to code.

1. [Check what you need](#1-check-what-you-need)
2. [Install Ollama](#2-install-ollama)
3. [Download a writing model](#3-download-a-writing-model)
4. [Install AI Editor](#4-install-ai-editor)
5. [Connect AI Editor to Ollama](#5-connect-ai-editor-to-ollama)
6. [Allow replacement and try your first correction](#6-allow-replacement-and-try-your-first-correction)
7. [Use the app day to day](#7-use-the-app-day-to-day)
8. [Customize the assistant](#8-customize-the-assistant)
9. [Update the app](#9-update-the-app)
10. [Fix common problems](#10-fix-common-problems)

For technical information, see [Privacy and limitations](#privacy-and-limitations) and [Build from source developer-guide](#build-from-source-developer-guide).

## 1. Check what you need

AI Editor uses two separate applications:

| Application | What it does |
| --- | --- |
| **Ollama** | Runs the AI model that reads and rewrites your text |
| **AI Editor** | Shows suggestions and lets you copy or replace text |

You need:

- A Mac. Ollama currently requires **macOS 14 Sonoma or newer**; see its [Mac installation guide](https://docs.ollama.com/macos).
- Internet access to download the apps and model. A downloaded local model can then run without an internet connection.
- Space for the apps and model, plus enough memory to run the model. The default [qwen3:1.7b model](https://ollama.com/library/qwen3:1.7b) download is approximately **1.4 GB**; running it also uses RAM.
- An **AI Editor DMG installer**, or the ability to build one using the developer guide below.

**Check your Mac type:** click the Apple menu ** → About This Mac**. If it says **Chip: Apple M1, M2, M3…**, you have an Apple Silicon Mac. If it says **Intel**, you have an Intel Mac.

The installer named `AI Editor-0.0.0-arm64.dmg` is for **Apple Silicon**. It is not an Intel installer. An Intel Mac needs a build made for its architecture; this guide's packaged installation steps assume the Apple Silicon installer.

**You do not need Node.js, npm or Git to install a DMG.** Those tools are only needed to build from source.

## 2. Install Ollama

1. Visit [Ollama's Mac download page](https://ollama.com/download/mac).
2. Choose the **manual download** for macOS.
3. Open the downloaded `ollama.dmg` file from Finder → **Downloads**.
4. Drag **Ollama** into **Applications**.
5. Open Finder → **Applications**, then double-click **Ollama**.
6. Complete its first-time setup. If asked to install the `ollama` command-line tool, allow that installation so the next step works.

The official [Ollama Mac guide](https://docs.ollama.com/macos) describes this installation and command-line setup.

**Leave Ollama running.** AI Editor needs it to generate suggestions. You do not need to start a separate `ollama serve` command when the Ollama app is already running.

## 3. Download a writing model

A model is the downloaded AI that performs the writing correction. Install the app's default model first.

1. Press **Command + Space** to open Spotlight.
2. Type **Terminal**, then press **Return**.
3. Copy the following line, paste it into Terminal and press **Return**:

   ```bash
   ollama pull qwen3:1.7b
   ```

4. Wait for the download to finish and the terminal prompt to return. The first download may take several minutes.
5. Paste this second command and press **Return**:

   ```bash
   ollama list
   ```

**Success check:** the list should include `qwen3:1.7b` under `NAME`.

If Terminal says **command not found: ollama**, open Ollama and complete its command-line setup, then close and reopen Terminal. See [troubleshooting](#10-fix-common-problems) if it still fails.

You can close Terminal after the download. Keep the **Ollama app** running.

## 4. Install AI Editor

### If you have the DMG installer

1. Find `AI Editor-0.0.0-arm64.dmg`, usually in **Downloads**. If you built it yourself, it is in the project's **release** folder.
2. Double-click the DMG to open it.
3. Drag **AI Editor.app** into **Applications**. If the DMG window does not show an Applications shortcut, open a second Finder window at Applications and drag the app there.
4. Open Finder → **Applications** and double-click **AI Editor**.
5. Once installed, eject the mounted installer using Finder's eject button. Launch the app from **Applications**, rather than from inside the DMG.

**Success check:** look for the AI Editor icon in the **menu bar at the top of your screen**, near the clock. Click it and choose **Settings**.

It is normal for no large window or Dock icon to appear when the app starts. AI Editor runs in the menu bar; the suggestion popup appears when you copy text.

Local builds may be unsigned or unnotarized. If macOS blocks opening one, confirm that you obtained it from a trusted source and follow Apple's [instructions for opening an app safely](https://support.apple.com/en-us/102445). Do not disable Gatekeeper or run blanket quarantine-removal commands.

### If you do not have a DMG installer

Cloning or downloading the repository gives you source code, not an installed Mac app. Follow [Build from source](#build-from-source-developer-guide) to create a DMG, then return to the steps above. This README does not assume that a packaged installer has been published on GitHub Releases.

## 5. Connect AI Editor to Ollama

1. Make sure **Ollama is open**.
2. Click the **AI Editor menu-bar icon → Settings**.
3. Find **Connection**. Keep **Ollama API URL** set to:

   ```text
   http://localhost:11434
   ```

   `localhost` means your own Mac. You do not need an API key.

4. Click the refresh button beside **Model** if the list has not loaded.
5. Select **qwen3:1.7b**, or another model you already downloaded.
6. Keep **Suggest grammar fixes after copying text** enabled if you want automatic checking.
7. Click **Save settings** at the bottom of the window.
8. Wait for **“Saved securely on this device.”** before closing Settings.

**Success check:** Connection shows available models, your chosen model is not marked “not installed”, and the saved message appears.

An existing installation keeps its saved model and preferences. **Restore defaults** changes the settings form; click **Save settings** to keep those changes. It also clears your exclusions, presets and personal dictionary, so use it deliberately.

## 6. Allow replacement and try your first correction

### A. Enable keyboard-control permission

Normal copying can show suggestions without this permission. **Replace text**, the selection shortcut and the menu's Undo action need permission to control the keyboard.

1. Open the Apple menu ** → System Settings → Privacy & Security**.
2. Find **Accessibility**. On macOS versions that use the name **Device Control and Data Access**, open that section instead.
3. Enable **AI Editor**. If it is not listed, use the **+** button and select `/Applications/AI Editor.app`.
4. If you are running from source, enable the actual running **Electron** app instead.
5. If macOS requests **Automation** access to **System Events**, allow it for the running app. Existing Automation permissions can be reviewed under Privacy & Security → Automation.
6. Fully quit AI Editor using **menu-bar icon → Quit**, then reopen it from Applications.

Do not simply close the settings window: **Quit** stops the app and lets it pick up the permission change on the next launch.

### B. Test with disposable text

1. Open **TextEdit** and create a new document.
2. Type this sample sentence:

   ```text
   She go to office every day and write email to her team.
   ```

3. Press **Command + A** to select the sentence.
4. Press **Command + C** to copy it.
5. Keep that sentence selected and wait for the AI Editor popup.
6. With automatic suggestions enabled, grammar checking starts immediately. If you see only a sparkle button, click it and choose **Correct**.
7. Review the suggestion. The exact wording depends on the model.
8. Click **Replace text** and check the TextEdit document. If replacement fails, click **Copy**, return to TextEdit, select the original sentence and press **Command + V** to paste manually.

**Success check:** TextEdit contains the suggestion you reviewed. Use **Command + Z** in TextEdit to undo the test if you want.

Setup is complete. For normal use, open Ollama and AI Editor, select a passage and press **Command + C**.

## 7. Use the app day to day

1. **Select** the text you want to improve.
2. **Copy** it with **Command + C**.
3. **Review** the completed suggestion. Red strikethrough marks removed words; green highlights mark additions.
4. Use **Changes**, **Before** or **After** to compare the edit with your original text. Copy and Replace always use the generated result, even while you are looking at Before.
5. Choose **Copy** to paste manually, or **Replace text** to apply the suggestion to the original selection.

**Keep the original text selected until you click Replace.** Avoid switching documents while reviewing. If the selection changes, copy the intended text again to start a fresh suggestion.

### Choose a different writing action

If a suggestion is already displayed, use **Back to writing actions** first. Adjust the tone or instruction, then choose an action:

| Action | Use it for |
| --- | --- |
| Correct | Grammar, spelling and punctuation |
| Improve | Clarity and flow |
| Professional | A more professional tone |
| Shorten | A more concise passage |
| Translate | English, German or Dutch; choose **Translate to** before running it |

### Other popup controls

| Control | What it does |
| --- | --- |
| Try again | Generates another result using the current action and controls |
| Cancel generation | Stops the request and discards partial output |
| Back arrow | Returns to writing actions |
| Down arrow | Collapses the popup to the sparkle button |
| X | Dismisses the popup |
| AI Editor header | Drag it to move the popup |

Copy and Replace become available after generation finishes successfully. New copied text cancels the older request. Copying exactly the same text again may not reopen the popup: use **menu-bar icon → Open assistant for clipboard** instead.

**Command + Shift + Space** can copy the current selection and open the assistant without a separate Command + C. It requires keyboard-control permission. Normal Command + C is the simplest starting point.

## 8. Customize the assistant

Open **menu-bar icon → Settings** to change saved settings. Look for the section headings below; their position can vary between app builds.

### Tone and custom instructions

In the popup's writing actions, choose **Normal**, **Emojified ✨**, **Friendly**, **Confident**, **Concise** or **Formal**, then run an action. In builds with a **Customize your writing** control, expand it to reveal these options.

Use the custom instruction field for directions such as “Use British English”, “Keep product names unchanged” or “Keep it under 80 words”. These guide the model; always check the result.

Tone, translation language and selected preset are remembered automatically. Manually typed custom instructions last for the current session. Typing in that field can give the popup focus and cause some editors to lose their selection; use manual Copy/paste if necessary.

### Saved writing presets and favorites

1. In Settings, find **Custom writing presets** and click **Add preset**.
2. Enter a name, for example **Friendly work message**.
3. Enter instructions, for example **Make this warm, clear and professional. Keep it brief and preserve all facts.**
4. Optionally enable **Show as a favorite button**.
5. Click **Save settings**.
6. In the popup's writing actions, choose the **Writing preset**, check the filled-in instruction and run an action.

Choosing a preset alone does not generate text. A favorite's star button runs **Improve** immediately with that preset, then waits for your review. Choose **No preset / custom** to clear the preset instruction. Up to 20 presets are supported, with 60 characters per name and 500 per instruction.

### Quick replies

In the popup's writing actions, choose a **Quick reply** intent and click **Draft reply**:

| Intent | Text to select before copying |
| --- | --- |
| Polish my notes | Your own notes, such as “yes, tomorrow works” |
| Accept | The incoming invitation or request |
| Decline politely | The incoming invitation or request |
| Ask for details | The incoming message you want clarified |
| Custom reply | The incoming message; add your directions in the custom instruction field |

Reply drafts offer **Copy**. Paste into the actual reply field, review the facts and send it yourself. The app never sends replies or replaces the incoming message with the draft.

### Pause automatic popups

Use **Pause assistant** in the menu, popup footer or Settings. Choose **15 minutes**, **1 hour**, or **Until tomorrow (midnight)**. **Resume now** ends the pause early.

Pausing closes the current popup and cancels generation. The deadline survives restarts. Copies made while paused are not replayed afterward. Manual opening through the menu or shortcut remains available.

### Exclude apps and websites

1. Find **Popup exclusions** in Settings.
2. Under **Excluded apps**, enter one exact app name or bundle ID per line:

   ```text
   Terminal
   iTerm2
   com.apple.Terminal
   ```

3. Under **Excluded websites**, enter one domain per line:

   ```text
   example.com
   mail.google.com
   ```

4. Click **Save settings**. Remove a line and save to enable popups there again.

Domain exclusions include subdomains. A full URL is saved as a domain, so it excludes the whole site rather than one page. Manual opening through the menu or shortcut still works.

Website filtering supports Safari and Chromium browsers such as Chrome, Edge and Brave on macOS. It may request Automation permission for the browser. When website exclusions are saved, unreadable tabs and Firefox suppress automatic popups. Other browsers may need an app exclusion instead.

### Personal dictionary

Find **Personal dictionary**, enter one name or technical term per line and save. For example:

```text
Akshat
censhare
Kubernetes
```

Up to 200 entries of 80 characters each are supported. They guide the model to preserve your terms but do not guarantee exact output.

### History and Undo

**Local history** shows the five newest completed suggestions; reopen Settings to refresh it. The app stores the last 30, including original text. **Clear history** clears that saved list.

For Undo, use **Command + Z in the original app immediately after replacement**. The menu's **Undo last replacement** is available within one minute of a replacement attempt, but sends Command + Z to the currently focused app. Avoid using it after switching apps or making unrelated edits.

## 9. Update the app

AI Editor currently has **no automatic updater**. Changing source code or running a build does not update the copy in Applications.

1. Obtain the new DMG from the project maintainer, or build it from source.
2. Quit the running app using **menu-bar icon → Quit**. Stop a development run with **Control + C** in its terminal too, if one is running.
3. Open the new DMG and drag **AI Editor.app** into **Applications**.
4. Choose **Replace** when Finder asks about the existing app.
5. Launch **Applications → AI Editor**.
6. Open Settings and confirm your saved model and preferences.
7. If Replace text no longer works, check permissions for this installed copy, quit it and reopen it.

Avoid running an old app from the DMG, a development Electron instance and the installed app at the same time. Multiple copies can make it unclear which version you are seeing.

## 10. Fix common problems

Start with these checks: **Ollama running → model downloaded → AI Editor running → settings saved**.

| Problem | What to do |
| --- | --- |
| No window after launching AI Editor | Look for its icon in the top menu bar. The main popup is hidden until text is copied. |
| `command not found: ollama` | Open Ollama, complete its command-line installation and reopen Terminal. See the official [Mac setup guide](https://docs.ollama.com/macos). |
| Ollama offline or connection refused | Open Ollama. Keep the URL at `http://localhost:11434` unless you deliberately changed its port. |
| Model says “not installed”, or generation returns 404 | Run `ollama list`. Download the exact tag with `ollama pull qwen3:1.7b`, refresh the model list, select it and save. |
| Save settings is disabled | The selected model may not be installed. Refresh and choose an available model. |
| No automatic suggestion | Check the automatic-suggestion option, pause status and exclusions. Copy different text, or use **Open assistant for clipboard**. |
| Still seeing the old UI | Quit all old copies, install the new app in Applications, then launch that copy. A build alone does not replace the installed app. |
| First response is slow | The model may be loading. Start with one sentence; try a smaller model if longer requests remain slow. |
| Generation times out or hits its output limit | Use a shorter passage. Cancel lets you stop and retry. Incomplete output cannot be applied. |
| Replace or the shortcut does not work | Check keyboard-control and System Events permissions for the actual AI Editor/Electron app, then quit and reopen it. Use Copy and manual paste meanwhile. |
| “The selected text changed” / “No selected text was copied” | Return to the original app, reselect the intended passage and copy it again. Avoid switching documents. |
| The source app cannot be identified or regain focus | Bring the original app forward and copy again. An older suggestion cannot regain a missing source identity. |
| Permission is on but keyboard control is still blocked | Quit and reopen the exact app you enabled. If necessary, remove and re-add that copy in the macOS permission list. |
| Port 11434 is already in use | Ollama may already be running. Do not start a second server; check the existing one below. |
| Text is pasted in an unexpected place | Undo in that app immediately. Use manual Copy/paste and confirm the destination before retrying. |

### Optional diagnostic commands

Open Terminal and run each command separately:

```bash
ollama list
```

Shows downloaded models.

```bash
curl --max-time 5 http://localhost:11434/api/tags
```

Checks whether the local Ollama server responds. Success looks like JSON containing a `models` list. A connection error means the server is unavailable at that address.

```bash
ollama ps
```

Shows loaded models and CPU/GPU usage. macOS Activity Monitor can also show memory pressure.

If you use Ollama only through its CLI, `ollama serve` starts the server. Leave that terminal running. Skip this when the Ollama desktop app is already serving requests.

## Privacy and limitations

- **Clipboard monitoring:** while running, the app detects changes to copied plain text. Automatic suggestions send that text to your configured Ollama endpoint. Disable automatic suggestions when you want generation only after choosing an action; clipboard detection still runs.
- **Local endpoints:** the desktop app accepts only loopback HTTP/HTTPS URLs (`localhost`, `127.0.0.1`, `[::1]`). It rejects credentials, query strings, fragments and redirects. It does not fetch remote fonts.
- **Local models:** a localhost endpoint can still use an Ollama cloud model or a forwarding proxy. For local processing, select a downloaded local model. See [Ollama's local-only configuration](https://docs.ollama.com/faq#how-do-i-disable-ollama-cloud-features) if you also want to disable its cloud features.
- **Saved text:** history contains original text and suggestions in plaintext, without encryption. There is no disable-history option. Settings are stored at `~/Library/Application Support/AI Editor/settings.json`; legacy settings migrate when that file is absent. History uses Electron's original user-data folder, typically `AI Editor` for packaged builds or `grammerly-clone` for development builds.
- **Exclusions:** the app samples the foreground app after noticing a copy. Rapidly switching apps or tabs can affect attribution. Exclusions are a popup-control feature, not a security boundary.
- **Replacement:** the app checks source-app identity and selected text before attempting paste. It cannot distinguish identical selections in different documents of the same app, or prove that an editor accepted the paste. Some rich editors, remote desktops and apps that clear selections may require manual pasting.
- **Clipboard helper:** the selection shortcut temporarily clears the clipboard. If copying fails, it restores only plain text; rich clipboard contents may be lost. Use normal Command + C when that matters.
- **Length and quality:** selections over 20,000 JavaScript string characters are rejected. Smaller selections can still exceed a model's capacity or output limit. Generation times out after 60 seconds; model-list checks after five seconds. AI can change meaning or invent details.
- **Platform:** macOS is the supported desktop target. There is no browser extension, system-wide typing monitor or automatic replacement.

## Build from source (developer guide)

Use this section only if you want to develop the app or do not have a DMG installer.

### A. Install development tools

1. Install **Node.js 24 LTS, version 24.15 or later in the 24.x line**, from [nodejs.org](https://nodejs.org/en/download). npm comes with Node.js. The project's engine range also accepts Node 22.22.2+ in the 22.x line and Node 26+.
2. Install [Git](https://git-scm.com/downloads/mac) if it is not already available.
3. Open Terminal and check:

   ```bash
   node --version
   npm --version
   git --version
   ```

### B. Download the project

Run these commands one line at a time:

```bash
git clone https://github.com/akshatkalkhanda/local-grammarly.git
cd local-grammarly
npm ci
```

If you already have the project, open Terminal in that folder instead of cloning it again. Run the following npm commands from the folder containing `package.json`.

### C. Choose how to run it

**To create an installer:**

```bash
npm run build
```

Wait for the command to finish successfully. On an Apple Silicon Mac, look in `release/` for `AI Editor-0.0.0-arm64.dmg`. Install it using [section 4](#4-install-ai-editor). Builds currently have no configured distribution signing or notarization.

**To run while developing:**

```bash
npm run dev
```

Keep this terminal running. The app starts in the menu bar. Use Settings to select your downloaded Ollama model. Development permission prompts may identify the app as **Electron**. Press **Control + C** in Terminal to stop the development run.

### D. Checks and command reference

| Command | Purpose |
| --- | --- |
| `npm test` | Automated protocol, persistence, IPC and React UI regression tests |
| `npm run lint` | JavaScript/React lint checks |
| `npm run build:app` | Compiles into `dist/` and `dist-electron/`; does not install the app |
| `npm run build` | Compiles and packages the macOS DMG in `release/` |
| `npm run test:electron` | Builds and runs the isolated native Electron smoke suite |
| `npm run dev` | Starts Vite and Electron for development |
| `npm run preview` | Browser-only UI preview; not the desktop app |

The Electron smoke suite uses temporary settings, a mocked clipboard and model responses, and disabled shortcut registration/permission prompts. It checks IPC, persistence across launches, pause/resume, favorites and reply review. It does not verify real Ollama output or macOS cross-app copying/pasting. Test those with disposable text separately.

The browser preview lacks the desktop clipboard, native history and desktop URL validation. Use Electron for normal operation.

### Code map and reporting bugs

| File | Responsibility |
| --- | --- |
| `electron/main.js` | Windows, clipboard detection, settings/history, shortcuts and generation lifecycle |
| `electron/ollama.js` | Loopback URL validation and streamed-response checks |
| `electron/preload.cjs` | Bridge between the UI and Electron |
| `src/components/FloatingWidget.jsx` | Writing actions and suggestion review |
| `src/components/MainConfigUI.jsx` | Settings and history |
| `src/components/DiffView.jsx` | Highlighted text changes |
| `tests/` | Automated regression coverage |

Before contributing, run tests, lint and a build. Include your macOS, Node and Ollama versions, model tag, action and reproduction steps in bug reports. Use sample text rather than private clipboard contents or history files. See [REVIEW.md](REVIEW.md) for the detailed review and smoke-test checklist.

## Author and license

Created by **Akshat Kalkhanda** — [akshatkalkhanda@gmail.com](mailto:akshatkalkhanda@gmail.com).

There is currently no LICENSE file in the repository.
