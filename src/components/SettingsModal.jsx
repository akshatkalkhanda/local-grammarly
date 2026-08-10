import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { OllamaService } from '../OllamaService';

export default function SettingsModal({ isOpen, onClose, config, onSave }) {
  const [url, setUrl] = useState(config.url);
  const [model, setModel] = useState(config.model);
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt);
  
  const [status, setStatus] = useState('checking'); // checking, ok, error
  const [availableModels, setAvailableModels] = useState([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnectionAndFetchModels = useCallback(async (testUrl) => {
    setIsChecking(true);
    setStatus('checking');
    const service = new OllamaService(testUrl);
    
    const isConnected = await service.checkConnection();
    if (isConnected) {
      setStatus('ok');
      const models = await service.getModels();
      setAvailableModels(models);
      
      // Auto-select if current model not in list but list isn't empty
      if (models.length > 0 && !models.find(m => m.name === model)) {
        setModel(models[0].name);
      }
    } else {
      setStatus('error');
      setAvailableModels([]);
    }
    setIsChecking(false);
  }, [model]);

  useEffect(() => {
    if (isOpen) checkConnectionAndFetchModels(url);
  }, [isOpen, url, checkConnectionAndFetchModels]);

  const handleSave = () => {
    onSave({ url, model, systemPrompt });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle} className="glass-panel">
        <div style={headerStyle}>
          <h2>Settings</h2>
          <button onClick={onClose} style={closeButtonStyle}>
            <X size={20} />
          </button>
        </div>
        
        <div style={contentStyle}>
          <div className="input-group">
            <label className="input-label">Ollama API URL</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                className="input-field" 
                style={{ flex: 1 }}
                value={url} 
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:11434"
              />
              <button 
                className="btn btn-secondary" 
                onClick={() => checkConnectionAndFetchModels(url)}
                disabled={isChecking}
              >
                <RefreshCw size={16} className={isChecking ? "loader" : ""} />
              </button>
            </div>
            
            {status === 'ok' && (
              <span style={{ color: 'var(--success)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={12} /> Connection successful
              </span>
            )}
            {status === 'error' && (
              <span style={{ color: 'var(--error)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <XCircle size={12} /> Cannot connect to Ollama. Is it running?
              </span>
            )}
          </div>

          <div className="input-group">
            <label className="input-label">Model</label>
            <select 
              className="input-field" 
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={availableModels.length === 0}
            >
              {availableModels.length === 0 && <option value={model}>{model} (Not verified)</option>}
              {availableModels.map(m => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">System Prompt</label>
            <textarea 
              className="input-field" 
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>
        </div>

        <div style={footerStyle}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000,
  backdropFilter: 'blur(4px)'
};

const modalStyle = {
  width: '100%', maxWidth: '480px',
  display: 'flex', flexDirection: 'column',
  backgroundColor: 'var(--bg-main)'
};

const headerStyle = {
  padding: '20px 24px',
  borderBottom: '1px solid var(--border-color)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
};

const closeButtonStyle = {
  background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer'
};

const contentStyle = {
  padding: '24px',
  display: 'flex', flexDirection: 'column', gap: '12px'
};

const footerStyle = {
  padding: '16px 24px',
  borderTop: '1px solid var(--border-color)',
  display: 'flex', justifyContent: 'flex-end', gap: '12px'
};
