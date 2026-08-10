import React from 'react';

export default function Editor({ text, setText, onTextSelected }) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const characters = text.length;

  const handleSelect = (e) => {
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    if (start !== end) {
      onTextSelected(text.substring(start, end), start, end);
    } else {
      onTextSelected('', 0, 0);
    }
  };

  return (
    <div className="editor-container glass-panel">
      <textarea
        className="editor-textarea"
        placeholder="Start writing or paste your text here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onSelect={handleSelect}
      />
      <div className="editor-footer">
        <div>
          {words} words | {characters} characters
        </div>
        <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></span>
          Ready to type
        </div>
      </div>
    </div>
  );
}
