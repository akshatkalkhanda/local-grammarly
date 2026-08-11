# Local Grammarly

> **Beta:** This is an early-stage project. Features, performance, and the interface are actively evolving.

Local Grammarly is a privacy-focused desktop writing assistant for macOS. Select and copy text in another app, then use the floating AI Editor widget to correct grammar, improve clarity, change tone, shorten text, or translate it. It uses [Ollama](https://ollama.com/) on your own computer, so selected text stays local.

## Features

- Floating writing assistant activated from copied text or `⌘⇧Space`
- Grammar correction, writing improvement, professional rewrites, and shortening
- Streaming suggestions, tone controls, and custom instructions
- German, Dutch, and English translation with an explicit target language
- Local-only Ollama configuration, history, and paste-back undo
- Menu-bar-first macOS experience with an accessibility-enabled `⌘C` helper

## Getting started

### Requirements

- macOS
- Node.js and npm
- [Ollama](https://ollama.com/) running locally

### Development

```bash
npm install
ollama pull qwen3:1.7b
npm run dev
```

Open **Settings** from the menu bar to select a locally installed Ollama model. `qwen3:1.7b` is a good lightweight starting point; choose a larger model if you prefer higher-quality suggestions.

For cross-application copy and paste support, grant **AI Editor** access in macOS **System Settings → Privacy & Security → Accessibility**.

### Production build

```bash
npm run build
```

The macOS DMG is created in `release/`.

## Privacy

The application accepts only local Ollama endpoints. Suggestions, settings, and history remain on your device unless you intentionally change the source code to use a remote provider.

## Beta notes

This is an initial beta release. Please expect occasional issues around macOS focus, clipboard handling, and individual local-model output quality. Feedback is welcome.

## Author and creator

Created by **Akshat Kalkhanda**.

Contact: [akshatkalkhanda@gmail.com](mailto:akshatkalkhanda@gmail.com)
