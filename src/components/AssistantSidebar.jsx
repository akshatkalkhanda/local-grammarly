import React, { useState } from 'react';
import { Sparkles, Loader2, ArrowRight, Check, RotateCcw, Copy, ClipboardPaste } from 'lucide-react';
import DiffView from './DiffView';

export default function AssistantSidebar({ 
  selectedText, 
  onReplaceText, 
  onRequestSuggestion, 
  isGenerating,
  suggestion
}) {
  const [activeAction, setActiveAction] = useState(null);
  const [showCopied, setShowCopied] = useState(false);

  const handleAction = (promptType) => {
    setActiveAction(promptType);
    onRequestSuggestion(promptType);
  };

  const handleCopy = () => {
    if (suggestion) {
      navigator.clipboard.writeText(suggestion);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 1500);
    }
  };

  const getButtonClass = (type) => {
    return activeAction === type && isGenerating ? 'btn btn-primary' : 'btn btn-secondary';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', padding: '12px' }}>
      {/* Horizontal Action Toolbar */}
      {!suggestion && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button 
            className={getButtonClass('grammar')} 
            onClick={() => handleAction('grammar')}
            disabled={isGenerating}
            style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            {isGenerating && activeAction === 'grammar' ? <Loader2 size={14} className="loader" /> : <Check size={14} />}
            Fix Grammar
          </button>
          <button 
            className={getButtonClass('improve')} 
            onClick={() => handleAction('improve')}
            disabled={isGenerating}
            style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            {isGenerating && activeAction === 'improve' ? <Loader2 size={14} className="loader" /> : <Sparkles size={14} />}
            Improve
          </button>
          <button 
            className={getButtonClass('professional')} 
            onClick={() => handleAction('professional')}
            disabled={isGenerating}
            style={{ padding: '6px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            {isGenerating && activeAction === 'professional' ? <Loader2 size={14} className="loader" /> : <ArrowRight size={14} />}
            Professional
          </button>
        </div>
      )}

      {/* Suggestion Card */}
      {suggestion && (
        <div className="suggestion-card" style={{ background: 'transparent' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
            Suggestion
          </div>
          
          <DiffView originalText={selectedText} correctedText={suggestion} />

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button 
              className="btn btn-primary" 
              style={{ flex: 1, padding: '6px' }}
              onClick={() => onReplaceText(suggestion)}
            >
              <ClipboardPaste size={14} />
              Accept
            </button>
            <div className="copy-tooltip" style={{ position: 'relative' }}>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px 10px' }}
                onClick={handleCopy}
              >
                <Copy size={14} />
              </button>
              {showCopied && <span className="copy-tooltip-text">Copied!</span>}
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px' }}
              onClick={() => onReplaceText(null)}
              title="Cancel"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
