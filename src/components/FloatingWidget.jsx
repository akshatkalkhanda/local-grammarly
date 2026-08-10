import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ClipboardPaste, Copy, Languages, Loader2, Minimize2, RefreshCw, Sparkles, WandSparkles } from 'lucide-react';
import DiffView from './DiffView';
import { OllamaService } from '../OllamaService';

const actions = [
  { id: 'grammar', label: 'Correct', icon: Check, description: 'Grammar and spelling' },
  { id: 'improve', label: 'Improve', icon: Sparkles, description: 'Clarity and flow' },
  { id: 'professional', label: 'Professional', icon: WandSparkles, description: 'Formal tone' },
  { id: 'concise', label: 'Shorten', icon: Minimize2, description: 'More concise' },
  { id: 'translate', label: 'Translate', icon: Languages, description: 'English or Spanish' }
];

function getDesktopApi() {
  return window.electronAPI ?? null;
}

export default function FloatingWidget({ config }) {
  const [selectedText, setSelectedText] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAction, setActiveAction] = useState('grammar');
  const [isExpanded, setIsExpanded] = useState(false);
  const [notice, setNotice] = useState('');
  const [tone, setTone] = useState('neutral');
  const [customInstruction, setCustomInstruction] = useState('');
  const [translationTarget, setTranslationTarget] = useState('English');
  const wordCount = useMemo(() => selectedText ? selectedText.trim().split(/\s+/).length : 0, [selectedText]);

  useEffect(() => {
    const desktop = getDesktopApi();
    if (!desktop) {
      setSelectedText('Select text in any app, copy it, then choose a writing action.');
      return undefined;
    }
    const removeListener = desktop.onTextSelected((text) => {
      setSelectedText(text);
      setSuggestion('');
      setNotice('');
      setIsExpanded(false);
    });
    desktop.ready();
    return removeListener;
  }, []);

  const requestSuggestion = async (action = activeAction) => {
    if (!selectedText || isGenerating) return;
    setIsGenerating(true);
    setSuggestion('');
    setNotice('');
    setActiveAction(action);
    try {
      const desktop = getDesktopApi();
      const response = desktop
        ? await desktop.generateStream(action, selectedText, tone, customInstruction, translationTarget, (chunk) => {
          setSuggestion((current) => current + chunk);
        })
        : await new OllamaService(config.url).generateSuggestion(config.model, `${action}:\n${selectedText}`, config.systemPrompt);
      if (!response) throw new Error('Ollama returned an empty suggestion.');
      setSuggestion(response);
    } catch (error) {
      setNotice(error.message || 'Could not reach Ollama. Check its local service in Settings.');
    } finally {
      setIsGenerating(false);
    }
  };

  const minimizeToPill = () => {
    setIsExpanded(false);
  };

  const dismiss = () => {
    setSuggestion('');
    setSelectedText('');
    setIsExpanded(false);
    getDesktopApi()?.hideWidget();
  };

  const returnToActions = () => {
    setSuggestion('');
    setNotice('');
  };

  const copySuggestion = async () => {
    if (!suggestion) return;
    const desktop = getDesktopApi();
    if (desktop) desktop.copyText(suggestion);
    else await navigator.clipboard.writeText(suggestion);
    setNotice('Copied to clipboard');
  };

  const replaceText = () => {
    if (!suggestion) return;
    const desktop = getDesktopApi();
    if (desktop) desktop.replaceText(suggestion);
    else copySuggestion();
    dismiss();
  };

  if (!selectedText) return null;

  if (!isExpanded) {
    return (
      <button className="widget-trigger" onClick={() => setIsExpanded(true)} title="Open AI writing actions" aria-label="Open AI writing actions">
        <Sparkles size={17} />
      </button>
    );
  }

  return (
    <main className="widget-shell" aria-live="polite">
      <header className="widget-header">
        <div className="widget-brand"><span className="brand-mark"><Sparkles size={14} /></span>AI Editor</div>
        <button className="icon-button" onClick={suggestion ? returnToActions : minimizeToPill} disabled={isGenerating} title={suggestion ? 'Back to writing actions' : 'Minimize to button'}>{suggestion ? <ChevronLeft size={17} /> : <ChevronDown size={17} />}</button>
      </header>

      {!suggestion ? (
        <section className="action-panel">
          <p className="selection-summary"><strong>{wordCount} words selected</strong><span>{selectedText.slice(0, 92)}{selectedText.length > 92 ? '…' : ''}</span></p>
          <div className="writing-controls">
            <label>Tone<select value={tone} onChange={(event) => setTone(event.target.value)} disabled={isGenerating}><option value="neutral">Natural</option><option value="friendly">Friendly</option><option value="confident">Confident</option><option value="concise">Concise</option><option value="formal">Formal</option></select></label>
            <label>Translate to<select value={translationTarget} onChange={(event) => setTranslationTarget(event.target.value)} disabled={isGenerating}><option value="English">English</option><option value="German">German</option><option value="Dutch">Dutch</option></select></label>
            <input className="custom-instruction" value={customInstruction} onChange={(event) => setCustomInstruction(event.target.value)} disabled={isGenerating} maxLength={500} placeholder="Custom instruction (optional)" aria-label="Custom writing instruction" />
          </div>
          <div className="action-grid">
            {actions.map(({ id, label, icon: Icon, description }) => (
              <button key={id} className={`action-button ${activeAction === id ? 'is-active' : ''}`} onClick={() => requestSuggestion(id)} disabled={isGenerating}>
                {isGenerating && activeAction === id ? <Loader2 size={16} className="loader" /> : <Icon size={16} />}
                <span>{label}<small>{description}</small></span>
              </button>
            ))}
          </div>
          <p className="widget-hint">Tip: copy selected text to open this automatically. Suggestions are streamed as they generate.</p>
        </section>
      ) : (
        <section className="suggestion-panel">
          <div className="suggestion-heading"><div><span>{isGenerating ? 'Writing now' : 'AI suggestion'}</span><strong>{actions.find(({ id }) => id === activeAction)?.label}{activeAction === 'translate' ? ` → ${translationTarget}` : ` · ${tone}`}</strong></div><button className="text-button" onClick={() => requestSuggestion()} disabled={isGenerating}><RefreshCw size={14} />Try again</button></div>
          <DiffView originalText={selectedText} correctedText={suggestion} />
          <div className="suggestion-actions">
            <button className="secondary-button" onClick={copySuggestion}><Copy size={15} />Copy</button>
            <button className="primary-button" onClick={replaceText}><ClipboardPaste size={15} />Replace text</button>
          </div>
        </section>
      )}
      {notice && <div className="widget-notice">{notice}</div>}
    </main>
  );
}
