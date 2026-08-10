import React, { useEffect, useState } from 'react';
import FloatingWidget from './components/FloatingWidget';
import MainConfigUI from './components/MainConfigUI';
import { DEFAULT_OLLAMA_URL, DEFAULT_MODEL } from './OllamaService';

const defaultConfig = {
  url: DEFAULT_OLLAMA_URL,
  model: DEFAULT_MODEL,
  systemPrompt: 'You are an expert copy editor. Fix grammar and improve style. Return ONLY the updated text. Do not add conversational intro/outro text.'
};

export default function App() {
  const [route, setRoute] = useState(window.location.hash);
  const [config, setConfig] = useState(defaultConfig);

  useEffect(() => {
    const desktop = window.electronAPI;
    if (!desktop) return undefined;
    desktop.getConfig().then(setConfig).catch(() => {});
    return desktop.onConfigUpdated(setConfig);
  }, []);

  useEffect(() => {
    const updateRoute = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  return route === '#settings'
    ? <MainConfigUI config={config} setConfig={setConfig} />
    : <FloatingWidget config={config} />;
}
