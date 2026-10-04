import { defaultPreferences, sanitizePreferences, normalizeDictionary } from '../src/writing.js';
import { validateUrl } from './ollama.js';
import { sanitizePresets } from './presets.js';
import { normalizeExclusions } from './exclusions.js';

export const DEFAULT_CONFIG = {
  url: 'http://localhost:11434',
  model: 'qwen3:1.7b',
  autoSuggestOnCopy: true,
  presets: [],
  personalDictionary: [],
  preferences: { ...defaultPreferences },
  pausedUntil: 0,
  excludedApps: [],
  excludedWebsites: [],
  systemPrompt: 'You are an expert copy editor. Fix grammar and improve style. Return ONLY the updated text. Do not add conversational intro/outro text.'
};

export function sanitizeConfig(candidate = {}) {
  const url = validateUrl(candidate.url ?? DEFAULT_CONFIG.url);
  const model = String(candidate.model ?? DEFAULT_CONFIG.model).trim().slice(0, 160);
  const systemPrompt = String(candidate.systemPrompt ?? DEFAULT_CONFIG.systemPrompt).trim().slice(0, 6_000);
  if (!model || !systemPrompt) throw new Error('Model and system prompt are required.');
  return { url, model, systemPrompt, personalDictionary: normalizeDictionary(candidate.personalDictionary), preferences: sanitizePreferences(candidate.preferences), pausedUntil: Number.isSafeInteger(candidate.pausedUntil) && candidate.pausedUntil > 0 ? candidate.pausedUntil : 0, presets: sanitizePresets(candidate.presets), excludedApps: normalizeExclusions(candidate.excludedApps), excludedWebsites: normalizeExclusions(candidate.excludedWebsites, true), autoSuggestOnCopy: candidate.autoSuggestOnCopy !== false };
}

