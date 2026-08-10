import React, { useEffect, useState } from 'react';
import { Activity, Clipboard, Clock3, Database, LockKeyhole, RefreshCw, Save, Server, Sparkles, Trash2 } from 'lucide-react';
import { DEFAULT_OLLAMA_URL, DEFAULT_MODEL } from '../OllamaService';

const defaultPrompt = 'You are an expert copy editor. Fix grammar and improve style. Return ONLY the updated text. Do not add conversational intro/outro text.';

export default function MainConfigUI({ config, setConfig }) {
  const [availableModels, setAvailableModels] = useState([]);
  const [status, setStatus] = useState({ kind: 'checking', text: 'Checking local Ollama…' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [history, setHistory] = useState([]);

  const fetchModels = async (url = config.url) => {
    setStatus({ kind: 'checking', text: 'Checking local Ollama…' });
    try {
      const desktop = window.electronAPI;
      const models = desktop
        ? await desktop.getModels(url)
        : (await fetch(`${url.replace(/\/$/, '')}/api/tags`).then((response) => response.json())).models?.map(({ name }) => name) ?? [];
      setAvailableModels(models);
      setStatus({ kind: 'online', text: models.length ? `${models.length} model${models.length === 1 ? '' : 's'} available` : 'Connected — no models installed' });
    } catch (error) {
      setAvailableModels([]);
      setStatus({ kind: 'offline', text: error.message || 'Ollama is not reachable' });
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => fetchModels(), 350);
    return () => clearTimeout(timeout);
  }, [config.url]);

  useEffect(() => {
    const desktop = window.electronAPI;
    if (!desktop) return;
    desktop.getHistory().then(setHistory).catch(() => {});
  }, []);

  const update = (event) => setConfig({ ...config, [event.target.name]: event.target.value });
  const reset = () => setConfig({ url: DEFAULT_OLLAMA_URL, model: DEFAULT_MODEL, systemPrompt: defaultPrompt });

  const save = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const desktop = window.electronAPI;
      if (desktop) setConfig(await desktop.saveConfig(config));
      else localStorage.setItem('ai-editor-config', JSON.stringify(config));
      setSaveMessage('Saved securely on this device.');
    } catch (error) {
      setSaveMessage(error.message || 'Could not save these settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const copyHistoryItem = async (text) => {
    const desktop = window.electronAPI;
    if (desktop) desktop.copyText(text);
    else await navigator.clipboard.writeText(text);
    setSaveMessage('Suggestion copied to clipboard.');
  };

  const clearHistory = async () => {
    try {
      await window.electronAPI?.clearHistory();
      setHistory([]);
      setSaveMessage('Local history cleared.');
    } catch (error) {
      setSaveMessage(error.message || 'Could not clear local history.');
    }
  };

  return (
    <main className="settings-page">
      <header className="settings-hero">
        <div className="settings-icon"><Sparkles size={23} /></div>
        <div><p className="eyebrow">LOCAL WRITING ASSISTANT</p><h1>AI Editor settings</h1><p>Choose the local Ollama model that powers your suggestions.</p></div>
      </header>

      <section className="settings-card">
        <div className="settings-card-heading"><div><h2>Connection</h2><p>Your selected text is sent only to the local Ollama endpoint below.</p></div><div className={`connection-status ${status.kind}`}><Activity size={15} />{status.text}</div></div>
        <label className="settings-field"><span><Server size={15} />Ollama API URL</span><input name="url" value={config.url} onChange={update} placeholder="http://localhost:11434" autoComplete="off" /></label>
        <p className="field-help"><LockKeyhole size={14} />For privacy, the desktop app accepts localhost endpoints only.</p>
        <div className="model-row"><label className="settings-field"><span><Database size={15} />Model</span>{availableModels.length ? <select name="model" value={config.model} onChange={update}>{availableModels.map((model) => <option key={model} value={model}>{model}</option>)}</select> : <input name="model" value={config.model} onChange={update} placeholder="llama3" />}</label><button className="refresh-button" onClick={() => fetchModels()} title="Refresh models"><RefreshCw size={17} /></button></div>
      </section>

      <section className="settings-card"><div className="settings-card-heading"><div><h2>Writing instructions</h2><p>These rules are included with every local request.</p></div></div><label className="settings-field"><span>System prompt</span><textarea name="systemPrompt" value={config.systemPrompt} onChange={update} rows={6} /></label></section>

      <section className="settings-card history-card"><div className="settings-card-heading"><div><h2><Clock3 size={15} />Local history</h2><p>Your last 30 completed suggestions are stored only on this device.</p></div>{history.length > 0 && <button className="text-button danger" onClick={clearHistory}><Trash2 size={14} />Clear history</button>}</div>{history.length ? <div className="history-list">{history.slice(0, 5).map((item) => <article className="history-item" key={item.id}><div><strong>{item.action} · {item.tone}</strong><span>{item.suggestion}</span></div><button className="icon-button" onClick={() => copyHistoryItem(item.suggestion)} title="Copy suggestion"><Clipboard size={15} /></button></article>)}</div> : <p className="history-empty">Completed suggestions will appear here. After replacing text, use the tray menu’s “Undo last replacement” within one minute.</p>}</section>

      <footer className="settings-footer"><span className={saveMessage.startsWith('Saved') ? 'saved-message success' : 'saved-message'}>{saveMessage}</span><button className="secondary-button" onClick={reset}>Restore defaults</button><button className="primary-button" onClick={save} disabled={isSaving}><Save size={16} />{isSaving ? 'Saving…' : 'Save settings'}</button></footer>
    </main>
  );
}
