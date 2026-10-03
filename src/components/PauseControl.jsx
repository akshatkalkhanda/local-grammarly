import React, { useEffect, useState } from 'react';
import { isPaused, pauseDeadline } from '../writing';

export default function PauseControl({ config, onChange }) {
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [until, setUntil] = useState(config.pausedUntil ?? 0);
  useEffect(() => { setUntil(config.pausedUntil ?? 0); }, [config.pausedUntil]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const paused = isPaused({ pausedUntil: until }, now);
  const change = async event => {
    const duration = event.target.value;
    if (!duration) return;
    setBusy(true); setError('');
    try {
      const desktop = window.electronAPI;
      let saved;
      if (desktop) saved = await desktop.setPause(duration);
      else {
        const stored = JSON.parse(localStorage.getItem('ai-editor-config') ?? '{}');
        saved = { ...stored, pausedUntil: pauseDeadline(duration) };
        localStorage.setItem('ai-editor-config', JSON.stringify(saved));
      }
      setUntil(saved.pausedUntil); setNow(Date.now()); onChange?.(saved.pausedUntil);
    } catch (failure) { setError(failure.message || 'Could not change pause.'); }
    finally { setBusy(false); }
  };
  return <div className="pause-control">
    <label>{paused ? `Paused until ${new Date(until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Automatic popups active'}
      <select aria-label="Pause assistant" value="" onChange={change} disabled={busy}>
        <option value="">Pause / resume…</option><option value="15m">15 minutes</option><option value="1h">1 hour</option><option value="tomorrow">Until tomorrow (midnight)</option><option value="resume">Resume now</option>
      </select>
    </label>
    {error && <span role="alert">{error}</span>}
  </div>;
}
