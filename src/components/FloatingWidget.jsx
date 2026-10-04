import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ClipboardPaste, Copy, Languages, Loader2, Minimize2, RefreshCw, Sparkles, WandSparkles, X } from 'lucide-react';
import DiffView from './DiffView';
import BrandMark from './BrandMark';
import { OllamaService } from '../OllamaService';
import { toneLabels, replyLabels } from '../writing';
import { createGenerationRequest } from '../../electron/generation';
import PauseControl from './PauseControl';

const actions = [
  { id: 'grammar', label: 'Correct', icon: Check, description: 'Grammar and spelling' },
  { id: 'improve', label: 'Improve', icon: Sparkles, description: 'Clarity and flow' },
  { id: 'professional', label: 'Professional', icon: WandSparkles, description: 'Formal tone' },
  { id: 'concise', label: 'Shorten', icon: Minimize2, description: 'More concise' },
  { id: 'translate', label: 'Translate', icon: Languages, description: 'English, German or Dutch' }
];


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
  const [tone, setTone] = useState(config.preferences?.tone ?? 'neutral');
  const [presetId, setPresetId] = useState(config.preferences?.presetId ?? '');
  const [replyAction, setReplyAction] = useState('reply');
  const [preview, setPreview] = useState('changes');
  const [customInstruction, setCustomInstruction] = useState(() => config.presets?.find(preset => preset.id === config.preferences?.presetId)?.instruction ?? '');
  const [translationTarget, setTranslationTarget] = useState(config.preferences?.translationTarget ?? 'English');
  const requestVersion = useRef(0);
  const generationActive = useRef(false);
  const [automaticRequest, setAutomaticRequest] = useState(null);
  const handledAutomaticRequest = useRef(0);
  const selectionTooLong = selectedText.length > 20_000;
  const wordCount = useMemo(() => selectedText ? selectedText.trim().split(/\s+/).length : 0, [selectedText]);

  const remember = (patch) => {
    const desktop = getDesktopApi();
    if (desktop) {
      desktop.savePreferences?.(patch).catch(error => setNotice(`Could not remember preference: ${error.message}`));
    } else {
      try {
        const stored = JSON.parse(localStorage.getItem('ai-editor-config') ?? '{}');
        localStorage.setItem('ai-editor-config', JSON.stringify({ ...stored, preferences: { ...stored.preferences, ...patch } }));
      } catch { setNotice('Could not save writing preferences.'); }
    }
  };
  const choosePreset = (id) => {
    const preset = config.presets?.find(item => item.id === id);
    setPresetId(preset?.id ?? '');
    setCustomInstruction(preset?.instruction ?? '');
    remember({ presetId: preset?.id ?? '' });
  };

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

  const requestSuggestion = useCallback(async (action = activeAction, text = selectedText, instruction = customInstruction) => {
    if (!text.trim() || generationActive.current || text.length > 20_000) return;
    generationActive.current = true;
    const version = ++requestVersion.current;
    setIsGenerating(true);
    setSuggestion('');
    setNotice('');
    setActiveAction(action);
    setPreview(action.startsWith('reply') ? 'after' : 'changes');
    try {
      const desktop = getDesktopApi();
      const response = desktop
        ? await desktop.generateStream(action, text, tone, instruction, translationTarget, (chunk) => {
          if (version === requestVersion.current) setSuggestion((current) => current + chunk);
        })
        : await (() => {
          const request = createGenerationRequest(config, action, text, tone, instruction, translationTarget);
          return new OllamaService(config.url).generateSuggestion(config.model, request.prompt, request.system);
        })();
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
  }, [activeAction, selectedText, tone, customInstruction, translationTarget, config]);

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
            <label>Tone<select value={tone} onChange={(event) => { setTone(event.target.value); remember({ tone: event.target.value }); }} disabled={isGenerating}>{Object.entries(toneLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Translate to<select value={translationTarget} onChange={(event) => { setTranslationTarget(event.target.value); remember({ translationTarget: event.target.value }); }} disabled={isGenerating}><option value="English">English</option><option value="German">German</option><option value="Dutch">Dutch</option></select></label>
            {(config.presets ?? []).length > 0 && <label className="preset-picker">Writing preset<select aria-label="Writing preset" value={config.presets?.some(preset => preset.id === presetId) ? presetId : ''} onChange={event => choosePreset(event.target.value)} disabled={isGenerating}><option value="">No preset / custom</option>{config.presets.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</select></label>}
            <input className="custom-instruction" value={customInstruction} onChange={(event) => { setCustomInstruction(event.target.value); if (presetId) { setPresetId(''); remember({ presetId: '' }); } }} onClick={async (event) => {
              const input = event.currentTarget;
              await getDesktopApi()?.focusWidget?.();
              input.focus();
            }} disabled={isGenerating} maxLength={500} placeholder="Custom instruction (optional)" aria-label="Custom writing instruction" />
          </div>
          {config.presets?.some(preset => preset.favorite) && <div className="favorite-presets" aria-label="Favorite presets">{config.presets.filter(preset => preset.favorite).map(preset => <button className="secondary-button" key={preset.id} disabled={selectionTooLong} onClick={() => { choosePreset(preset.id); requestSuggestion('improve', selectedText, preset.instruction); }}>★ {preset.name}</button>)}</div>}
          <div className="action-grid">
            {actions.map(({ id, label, icon: Icon, description }) => (
              <button key={id} className={`action-button ${activeAction === id ? 'is-active' : ''}`} onClick={() => requestSuggestion(id)} disabled={isGenerating || selectionTooLong}>
                {isGenerating && activeAction === id ? <Loader2 size={16} className="loader" /> : <Icon size={16} />}
                <span>{label}<small>{description}</small></span>
              </button>
            ))}
          </div>
          <div className="quick-reply">
            <label>Quick reply<select aria-label="Reply intent" value={replyAction} onChange={event => setReplyAction(event.target.value)}>{Object.entries(replyLabels).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label>
            <button className="secondary-button" disabled={selectionTooLong || (replyAction === 'reply_custom' && !customInstruction.trim())} onClick={() => requestSuggestion(replyAction)}>Draft reply</button>
          </div>
          <p className="widget-hint">Use your selected notes for “Polish my notes”, or select the incoming message for other reply options. Custom reply uses the instruction above.</p>
          <p className="widget-hint">Copy selected text to check grammar automatically. Review the result before replacing text.</p>
        </section>
      ) : (
        <section className="suggestion-panel">
          <div className="suggestion-heading"><div><span>{isGenerating ? 'Checking copied text' : 'Ready for review'}</span><strong>{replyLabels[activeAction] ?? actions.find(({ id }) => id === activeAction)?.label}{activeAction === 'translate' ? ` → ${translationTarget}` : ` · ${toneLabels[tone] ?? tone}`}</strong></div>{!isGenerating && <button className="text-button" onClick={() => requestSuggestion()} disabled={isReplacing}><RefreshCw size={14} />Try again</button>}</div>
          {suggestion
            ? <>
              <div className="preview-tabs" aria-label="Preview mode">{[['changes', 'Changes'], ['before', 'Before'], ['after', 'After']].map(([id, label]) => <button key={id} aria-pressed={preview === id} onClick={() => setPreview(id)}>{label}</button>)}</div>
              {preview === 'changes' ? <DiffView originalText={selectedText} correctedText={suggestion} /> : <div className="diff-container clean-preview">{preview === 'before' ? selectedText : suggestion}</div>}
              {activeAction.startsWith('reply') && <p className="widget-hint">Reply draft: copy it into your reply field, review, then send yourself.</p>}
              <div className="suggestion-actions">
                <button className="secondary-button" onClick={copySuggestion} disabled={isGenerating || isReplacing}><Copy size={15} />Copy</button>
                {!activeAction.startsWith('reply') && <button className="primary-button" onClick={replaceText} disabled={isGenerating || isReplacing}><ClipboardPaste size={15} />{isReplacing ? 'Replacing…' : 'Replace text'}</button>}
              </div>
            </>
            : <div className="generation-status" role="status"><Loader2 size={17} className="loader" /><span>{activeAction === 'grammar' ? 'Checking grammar…' : activeAction.startsWith('reply') ? 'Drafting your reply…' : 'Preparing your suggestion…'} Your text stays unchanged until you choose an action.</span></div>}
        </section>
      )}
      <PauseControl config={config} />
      {isGenerating && <button className="text-button" onClick={cancelGeneration}>Cancel generation</button>}
      {selectionTooLong && <div className="widget-notice">Select at most 20,000 characters. Split longer text into smaller passages.</div>}
      {notice && <div className="widget-notice">{notice}</div>}
    </main>
  );
}
