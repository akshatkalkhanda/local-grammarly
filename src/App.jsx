import React, { useEffect, useState } from 'react';
import FloatingWidget from './components/FloatingWidget';
import MainConfigUI from './components/MainConfigUI';
import { DEFAULT_OLLAMA_URL, DEFAULT_MODEL } from './OllamaService';

const defaultConfig = {
  url: DEFAULT_OLLAMA_URL,
  model: DEFAULT_MODEL,
  autoSuggestOnCopy: true,
  excludedApps: [],
  excludedWebsites: [],
  presets: [],
  systemPrompt: 'You are an expert copy editor. Fix grammar and improve style. Return ONLY the updated text. Do not add conversational intro/outro text.'
};

export default function App() {
  const [route, setRoute] = useState(window.location.hash);
  const [config, setConfig] = useState(defaultConfig);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const desktop = window.electronAPI;
    let active = true;
    if (!desktop) {
      try {
        const stored = JSON.parse(localStorage.getItem('ai-editor-config') ?? '{}');
        setConfig({ ...defaultConfig, ...stored });
      } catch { setLoadError('Saved settings could not be read. Restart the app and try again.'); }
      setLoaded(true);
      return undefined;
    }
    desktop.getConfig().then(value => {
      if (active) { setConfig(value); setLoaded(true); }
    }).catch(() => {
      if (active) setLoadError('Could not load saved settings. Restart the app and try again.');
    });
    const unsubscribe = desktop.onConfigUpdated(setConfig);
    return () => { active = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    const updateRoute = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  if (loadError) return <main className="settings-page" role="alert">{loadError}</main>;
  if (!loaded) return <main className="settings-page" role="status">Loading saved settings…</main>;

  return route === '#settings'
    ? <MainConfigUI config={config} setConfig={setConfig} />
    : <FloatingWidget config={config} />;
}
