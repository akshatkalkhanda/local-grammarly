import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ClipboardPaste, Copy, Languages, Loader2, Minimize2, RefreshCw, Sparkles, WandSparkles, X } from 'lucide-react';
import DiffView from './DiffView';
import BrandMark from './BrandMark';
import { OllamaService } from '../OllamaService';

const actions = [
  { id: 'grammar', label: 'Correct', icon: Check, description: 'Grammar and spelling' },
  { id: 'improve', label: 'Improve', icon: Sparkles, description: 'Clarity and flow' },
  { id: 'professional', label: 'Professional', icon: WandSparkles, description: 'Formal tone' },
  { id: 'concise', label: 'Shorten', icon: Minimize2, description: 'More concise' },
  { id: 'translate', label: 'Translate', icon: Languages, description: 'English, German or Dutch' }
];

const toneLabels = { neutral: 'Normal', emojified: 'Emojified ✨', friendly: 'Friendly', confident: 'Confident', concise: 'Concise', formal: 'Formal' };

function getDesktopApi() {
  return window.electronAPI ?? null;
}

export default function FloatingWidget({ config }) {
  const [selectedText, setSelectedText] = useState('');
  const [selectionId, setSelectionId] = useState(null);
  const [suggestion, setSuggestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAction, setActiveAction] = useState('grammar');
  const [isExpanded, setIsExpanded] = useState(false);
  const [notice, setNotice] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);
  const [tone, setTone] = useState('neutral');
  const [customInstruction, setCustomInstruction] = useState('');
  const [translationTarget, setTranslationTarget] = useState('English');
  const requestVersion = useRef(0);
  const generationActive = useRef(false);
  const [automaticRequest, setAutomaticRequest] = useState(null);
  const handledAutomaticRequest = useRef(0);
  const selectionTooLong = selectedText.length > 20_000;
  const wordCount = useMemo(() => selectedText ? selectedText.trim().split(/\s+/).length : 0, [selectedText]);

  useEffect(() => {
    const desktop = getDesktopApi();
    if (!desktop) {
      setSelectedText('Select text in any app, copy it, then choose a writing action.');
      return undefined;
    }
    const removeListener = desktop.onTextSelected((selection) => {
      const text = typeof selection === 'string' ? selection : selection.text;
      requestVersion.current += 1;
      generationActive.current = false;
      desktop.cancelGeneration();
      setIsGenerating(false);
      setSelectedText(text);
      setSelectionId(typeof selection === 'string' ? null : selection.selectionId);
      setSuggestion('');
      setNotice('');
      setIsExpanded(config.autoSuggestOnCopy === true);
      if (config.autoSuggestOnCopy === true) setAutomaticRequest({ text, id: Date.now() + Math.random() });
    });
    desktop.ready();
    return () => {
      requestVersion.current += 1;
      generationActive.current = false;
      desktop.cancelGeneration();
      removeListener();
    };
  }, [config.autoSuggestOnCopy]);

  const requestSuggestion = useCallback(async (action = activeAction, text = selectedText) => {
    if (!text.trim() || generationActive.current || text.length > 20_000) return;
    generationActive.current = true;
    const version = ++requestVersion.current;
    setIsGenerating(true);
    setSuggestion('');
    setNotice('');
    setActiveAction(action);
    try {
      const desktop = getDesktopApi();
      const response = desktop
        ? await desktop.generateStream(action, text, tone, customInstruction, translationTarget, (chunk) => {
          if (version === requestVersion.current) setSuggestion((current) => current + chunk);
        })
        : await new OllamaService(config.url).generateSuggestion(config.model, `${action}. Tone: ${toneLabels[tone]}. ${tone === 'emojified' ? 'Add a few relevant emojis without replacing words or changing meaning.' : tone === 'neutral' ? 'Do not add new emojis.' : ''}${customInstruction ? `\nAdditional instruction: ${customInstruction}` : ''}\n${text}`, config.systemPrompt);
      if (version !== requestVersion.current) return;
      if (!response) throw new Error('Ollama returned an empty suggestion.');
      setSuggestion(response);
    } catch (error) {
      if (version !== requestVersion.current) return;
      setSuggestion('');
      setNotice(error.message || 'Could not reach Ollama. Check its local service in Settings.');
    } finally {
      if (version === requestVersion.current) {
        generationActive.current = false;
        setIsGenerating(false);
      }
    }
  }, [activeAction, selectedText, tone, customInstruction, translationTarget, config.url, config.model, config.systemPrompt]);

  useEffect(() => {
    if (!automaticRequest || handledAutomaticRequest.current === automaticRequest.id) return;
    handledAutomaticRequest.current = automaticRequest.id;
    requestSuggestion('grammar', automaticRequest.text);
  }, [automaticRequest, requestSuggestion]);

  const cancelGeneration = () => {
    requestVersion.current += 1;
    generationActive.current = false;
    getDesktopApi()?.cancelGeneration();
    setIsGenerating(false);
    setSuggestion('');
    setNotice('Generation cancelled.');
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
    if (!suggestion || isGenerating) return;
    const desktop = getDesktopApi();
    if (desktop) desktop.copyText(suggestion);
    else await navigator.clipboard.writeText(suggestion);
    setNotice('Copied to clipboard');
  };

  // Only dismiss once the main process confirms the paste, otherwise a failed
  // replace closes the widget and looks like a silent success.
  const replaceText = async () => {
    if (!suggestion || isGenerating || isReplacing) return;
    const desktop = getDesktopApi();
    if (!desktop) {
      await copySuggestion();
      return;
    }
    setIsReplacing(true);
    setNotice('');
    try {
      const result = await desktop.replaceText({ suggestion, original: selectedText, selectionId });
      if (result?.ok) dismiss();
      else setNotice(result?.message ?? 'Could not paste automatically. The suggestion is on your clipboard.');
    } catch (error) {
      setNotice(error.message || 'Could not paste automatically. The suggestion is on your clipboard.');
    } finally {
      setIsReplacing(false);
    }
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
      <header className="widget-header" title="Drag to move the assistant">
        <div className="widget-brand"><BrandMark className="brand-mark" />AI Editor</div>
        <div className="widget-header-actions">
          {suggestion && !isGenerating
            ? <button className="icon-button" onClick={returnToActions} title="Back to writing actions" aria-label="Back to writing actions"><ChevronLeft size={17} /></button>
            : <button className="icon-button" onClick={minimizeToPill} title="Minimize assistant" aria-label="Minimize assistant"><ChevronDown size={17} /></button>}
          <button className="icon-button dismiss-button" onClick={dismiss} title="Dismiss suggestion" aria-label="Dismiss suggestion"><X size={16} /></button>
        </div>
      </header>

      {!suggestion && !isGenerating ? (
        <section className="action-panel">
          <p className="selection-summary"><strong>{wordCount} words selected</strong><span>{selectedText.slice(0, 92)}{selectedText.length > 92 ? '…' : ''}</span></p>
          <div className="writing-controls">
            <label>Tone<select value={tone} onChange={(event) => setTone(event.target.value)} disabled={isGenerating}>{Object.entries(toneLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Translate to<select value={translationTarget} onChange={(event) => setTranslationTarget(event.target.value)} disabled={isGenerating}><option value="English">English</option><option value="German">German</option><option value="Dutch">Dutch</option></select></label>
            {(config.presets ?? []).length > 0 && <label className="preset-picker">Writing preset<select aria-label="Writing preset" value={(config.presets ?? []).find(preset => preset.instruction === customInstruction)?.id ?? ''} onChange={event => setCustomInstruction((config.presets ?? []).find(preset => preset.id === event.target.value)?.instruction ?? '')} disabled={isGenerating}><option value="">No preset / custom</option>{config.presets.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label>}
            <input className="custom-instruction" value={customInstruction} onChange={(event) => setCustomInstruction(event.target.value)} onClick={async (event) => {
              const input = event.currentTarget;
              await getDesktopApi()?.focusWidget?.();
              input.focus();
            }} disabled={isGenerating} maxLength={500} placeholder="Custom instruction (optional)" aria-label="Custom writing instruction" />
          </div>
          <div className="action-grid">
            {actions.map(({ id, label, icon: Icon, description }) => (
              <button key={id} className={`action-button ${activeAction === id ? 'is-active' : ''}`} onClick={() => requestSuggestion(id)} disabled={isGenerating || selectionTooLong}>
                {isGenerating && activeAction === id ? <Loader2 size={16} className="loader" /> : <Icon size={16} />}
                <span>{label}<small>{description}</small></span>
              </button>
            ))}
          </div>
          <p className="widget-hint">Copy selected text to check grammar automatically. Review the result before replacing text.</p>
        </section>
      ) : (
        <section className="suggestion-panel">
          <div className="suggestion-heading"><div><span>{isGenerating ? 'Checking copied text' : 'Ready for review'}</span><strong>{actions.find(({ id }) => id === activeAction)?.label}{activeAction === 'translate' ? ` → ${translationTarget}` : ` · ${toneLabels[tone] ?? tone}`}</strong></div>{!isGenerating && <button className="text-button" onClick={() => requestSuggestion()} disabled={isReplacing}><RefreshCw size={14} />Try again</button>}</div>
          {suggestion
            ? <>
              <DiffView originalText={selectedText} correctedText={suggestion} />
              <div className="suggestion-actions">
                <button className="secondary-button" onClick={copySuggestion} disabled={isGenerating || isReplacing}><Copy size={15} />Copy</button>
                <button className="primary-button" onClick={replaceText} disabled={isGenerating || isReplacing}><ClipboardPaste size={15} />{isReplacing ? 'Replacing…' : 'Replace text'}</button>
              </div>
            </>
            : <div className="generation-status" role="status"><Loader2 size={17} className="loader" /><span>Checking grammar… Your text stays unchanged until you choose an action.</span></div>}
        </section>
      )}
      {isGenerating && <button className="text-button" onClick={cancelGeneration}>Cancel generation</button>}
      {selectionTooLong && <div className="widget-notice">Select at most 20,000 characters. Split longer text into smaller passages.</div>}
      {notice && <div className="widget-notice">{notice}</div>}
    </main>
  );
}
