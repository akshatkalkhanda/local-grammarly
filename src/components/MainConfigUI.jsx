import React, { useEffect, useRef, useState } from 'react';
import { Activity, Clipboard, Clock3, Database, LockKeyhole, RefreshCw, Save, Server, Trash2 } from 'lucide-react';
import { DEFAULT_OLLAMA_URL, DEFAULT_MODEL } from '../OllamaService';
import BrandMark from './BrandMark';
import PauseControl from './PauseControl';

const defaultPrompt = 'You are an expert copy editor. Fix grammar and improve style. Return ONLY the updated text. Do not add conversational intro/outro text.';

export default function MainConfigUI({ config, setConfig }) {
  const [availableModels, setAvailableModels] = useState([]);
  const [status, setStatus] = useState({ kind: 'checking', text: 'Checking local Ollama…' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [history, setHistory] = useState([]);
  const modelRequest = useRef(0);
  const modelMissing = status.kind === 'online' && !availableModels.includes(config.model);

  const fetchModels = async (url = config.url) => {
    const requestId = ++modelRequest.current;
    setStatus({ kind: 'checking', text: 'Checking local Ollama…' });
    try {
      const desktop = window.electronAPI;
      const models = desktop
        ? await desktop.getModels(url)
        : (await fetch(`${url.replace(/\/$/, '')}/api/tags`, { signal: AbortSignal.timeout(5_000), redirect: 'error' }).then((response) => {
          if (!response.ok) throw new Error(`Ollama returned ${response.status}.`);
          return response.json();
        })).models?.map(({ name }) => name) ?? [];
      if (requestId !== modelRequest.current) return;
      setAvailableModels(models);
      setStatus({ kind: 'online', text: models.length ? `${models.length} model${models.length === 1 ? '' : 's'} available` : 'Connected — no models installed' });
    } catch (error) {
      if (requestId !== modelRequest.current) return;
      setAvailableModels([]);
      setStatus({ kind: 'offline', text: error.message || 'Ollama is not reachable' });
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => fetchModels(), 350);
    return () => { clearTimeout(timeout); modelRequest.current += 1; };
  }, [config.url]);

  useEffect(() => {
    const desktop = window.electronAPI;
    if (!desktop) return;
    desktop.getHistory().then(setHistory).catch(() => {});
  }, []);

  const update = (event) => setConfig({ ...config, [event.target.name]: event.target.value });
  const reset = () => setConfig({ url: DEFAULT_OLLAMA_URL, model: DEFAULT_MODEL, systemPrompt: defaultPrompt, autoSuggestOnCopy: true, personalDictionary: [], presets: [], excludedApps: [], excludedWebsites: [] });

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
        <BrandMark className="settings-brand-mark" />
        <div><p className="eyebrow">LOCAL WRITING ASSISTANT</p><h1>AI Editor settings</h1><p>Choose the local Ollama model that powers your suggestions.</p></div>
      </header>

      <section className="settings-card">
        <div className="settings-card-heading"><div><h2>Connection</h2><p>Your selected text is sent only to the local Ollama endpoint below.</p></div><div className={`connection-status ${status.kind}`}><Activity size={15} />{status.text}</div></div>
        <label className="settings-field"><span><Server size={15} />Ollama API URL</span><input name="url" value={config.url} onChange={update} placeholder="http://localhost:11434" autoComplete="off" /></label>
        <p className="field-help"><LockKeyhole size={14} />For privacy, the desktop app accepts localhost endpoints only.</p>
        <div className="model-row"><label className="settings-field"><span><Database size={15} />Model</span>{availableModels.length ? <select name="model" value={config.model} onChange={update}>{!availableModels.includes(config.model) && <option value={config.model}>{config.model} (not installed)</option>}{availableModels.map((model) => <option key={model} value={model}>{model}</option>)}</select> : <input name="model" value={config.model} onChange={update} placeholder="llama3" />}</label><button className="refresh-button" onClick={() => fetchModels()} title="Refresh models"><RefreshCw size={17} /></button></div>
        {modelMissing && <p className="field-help" role="status">The selected model is not installed. Choose an available model or install it with Ollama, then refresh.</p>}
      </section>

      <section className="settings-card"><div className="settings-card-heading"><div><h2>Writing instructions</h2><p>These rules are included with every local request.</p></div></div><label className="settings-field"><span>System prompt</span><textarea name="systemPrompt" value={config.systemPrompt} onChange={update} rows={6} /></label></section>

      <section className="settings-card"><PauseControl config={config} onChange={pausedUntil => setConfig({ ...config, pausedUntil })} /><div className="settings-card-heading"><div><h2>Automatic suggestions</h2><p>Run grammar correction when new copied text opens the assistant. You still review and choose whether to replace it.</p></div></div><label className="settings-field auto-suggest-toggle"><span><input type="checkbox" name="autoSuggestOnCopy" checked={config.autoSuggestOnCopy !== false} onChange={(event) => setConfig({ ...config, autoSuggestOnCopy: event.target.checked })} /> Suggest grammar fixes after copying text</span></label></section>

      <section className="settings-card">
        <div className="settings-card-heading"><div><h2>Popup exclusions</h2><p>Skip automatic popups in these apps and websites. The keyboard shortcut and tray menu still open the assistant manually.</p></div></div>
        <label className="settings-field"><span>Excluded apps</span><textarea name="excludedApps" rows={4} value={Array.isArray(config.excludedApps) ? config.excludedApps.join('\n') : config.excludedApps ?? ''} onChange={update} placeholder={'Terminal\niTerm2\ncom.apple.Terminal'} /></label>
        <p className="field-help">One exact app name or bundle ID per line. Use Terminal or iTerm2 to silence your terminal.</p>
        <label className="settings-field"><span>Excluded websites</span><textarea name="excludedWebsites" rows={4} value={Array.isArray(config.excludedWebsites) ? config.excludedWebsites.join('\n') : config.excludedWebsites ?? ''} onChange={update} placeholder={'example.com\nmail.google.com'} /></label>
        <p className="field-help">One domain per line; subdomains are included. URLs are saved as domains, covering the entire site.</p>
        <p className="field-help">Website filtering supports Safari and Chromium browsers on macOS and may request Automation permission. With website exclusions saved, unreadable tabs and Firefox suppress automatic popups. Other browsers and embedded web views may require excluding the whole app.</p>
      </section>

      <section className="settings-card">
        <div className="settings-card-heading"><div><h2>Custom writing presets</h2><p>Save reusable instructions, then choose a preset in the assistant before running a writing action.</p></div></div>
        {(config.presets ?? []).map((preset, index) => <div className="preset-editor" key={preset.id}>
          <label className="settings-field"><span>Preset {index + 1} name</span><input aria-label={`Preset ${index + 1} name`} value={preset.name} maxLength={60} placeholder="Friendly work message" onChange={event => setConfig({ ...config, presets: config.presets.map(item => item.id === preset.id ? { ...item, name: event.target.value } : item) })} /></label>
          <label className="settings-field"><span>Instructions</span><textarea aria-label={`Preset ${index + 1} instructions`} rows={3} value={preset.instruction} maxLength={500} placeholder="Make this warm, clear and professional. Keep it brief and preserve all facts." onChange={event => setConfig({ ...config, presets: config.presets.map(item => item.id === preset.id ? { ...item, instruction: event.target.value } : item) })} /></label>
          <label className="favorite-toggle"><input type="checkbox" aria-label={`Favorite preset ${index + 1}`} checked={preset.favorite === true} onChange={event => setConfig({ ...config, presets: config.presets.map(item => item.id === preset.id ? { ...item, favorite: event.target.checked } : item) })} />Show as a favorite button</label>
          <button className="text-button danger" aria-label={`Remove preset ${index + 1}`} onClick={() => setConfig({ ...config, presets: config.presets.filter(item => item.id !== preset.id) })}><Trash2 size={14} />Remove preset</button>
        </div>)}
        <button className="secondary-button" disabled={(config.presets ?? []).length >= 20} onClick={() => setConfig({ ...config, presets: [...(config.presets ?? []), { id: crypto.randomUUID(), name: '', instruction: '' }] })}>Add preset</button>
        <p className="field-help">Up to 20 presets, with 500 characters per instruction. Click Save settings to keep changes. Presets work alongside your chosen tone.</p>
      </section>

      <section className="settings-card"><div className="settings-card-heading"><div><h2>Personal dictionary</h2><p>Names, company vocabulary and technical terms the model should preserve. One word or phrase per line.</p></div></div><label className="settings-field"><span>Preserved terms</span><textarea name="personalDictionary" rows={5} value={Array.isArray(config.personalDictionary) ? config.personalDictionary.join('\n') : config.personalDictionary ?? ''} onChange={update} placeholder={'censhare\nKubernetes\nAkshat'} /></label><p className="field-help">Up to 200 entries, 80 characters each. This guides the model; always review its output. Save settings to apply.</p></section>

      <section className="settings-card history-card"><div className="settings-card-heading"><div><h2><Clock3 size={15} />Local history</h2><p>Your last 30 completed suggestions are stored only on this device.</p></div>{history.length > 0 && <button className="text-button danger" onClick={clearHistory}><Trash2 size={14} />Clear history</button>}</div>{history.length ? <div className="history-list">{history.slice(0, 5).map((item) => <article className="history-item" key={item.id}><div><strong>{item.action} · {item.tone}</strong><span>{item.suggestion}</span></div><button className="icon-button" onClick={() => copyHistoryItem(item.suggestion)} title="Copy suggestion"><Clipboard size={15} /></button></article>)}</div> : <p className="history-empty">Completed suggestions will appear here. After replacing text, use the tray menu’s “Undo last replacement” within one minute.</p>}</section>

      <footer className="settings-footer"><span className={saveMessage.startsWith('Saved') ? 'saved-message success' : 'saved-message'}>{saveMessage}</span><button className="secondary-button" onClick={reset}>Restore defaults</button><button className="primary-button" onClick={save} disabled={isSaving || modelMissing}><Save size={16} />{isSaving ? 'Saving…' : 'Save settings'}</button></footer>
    </main>
  );
}
