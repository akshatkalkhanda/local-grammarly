export const toneLabels = { neutral: 'Normal', emojified: 'Emojified ✨', friendly: 'Friendly', confident: 'Confident', concise: 'Concise', formal: 'Formal' };
export const replyLabels = { reply: 'Polish my notes', reply_accept: 'Accept', reply_decline: 'Decline politely', reply_details: 'Ask for details', reply_custom: 'Custom reply' };
export const defaultPreferences = { tone: 'neutral', translationTarget: 'English', presetId: '' };
export function sanitizePreferences(value = {}) {
  return {
    tone: Object.hasOwn(toneLabels, value?.tone) ? value.tone : 'neutral',
    translationTarget: ['English', 'German', 'Dutch'].includes(value?.translationTarget) ? value.translationTarget : 'English',
    presetId: typeof value?.presetId === 'string' ? value.presetId.slice(0, 100) : ''
  };
}
export function pauseDeadline(duration, now = Date.now()) {
  if (duration === 'resume') return 0;
  if (duration === '15m') return now + 15 * 60_000;
  if (duration === '1h') return now + 60 * 60_000;
  if (duration === 'tomorrow') {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next.getTime();
  }
  throw new Error('Choose a valid pause duration.');
}
export const isPaused = (config, now = Date.now()) => Number(config.pausedUntil) > now;
export function normalizeDictionary(value = []) {
  const entries = Array.isArray(value) ? value : String(value).split(/\r?\n/);
  const words = [...new Set(entries.map(word => String(word).trim()).filter(Boolean))];
  if (words.length > 200 || words.some(word => word.length > 80 || /[\r\n]/.test(word))) throw new Error('Use up to 200 dictionary entries, each at most 80 characters.');
  return words;
}
