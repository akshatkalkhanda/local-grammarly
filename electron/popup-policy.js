import { isUrlOnlyText } from './exclusions.js';

const words = new Intl.Segmenter('en', { granularity: 'word' });

export function isAutomaticCheckCandidate(text) {
  if (!text || text.length > 20_000 || isUrlOnlyText(text)) return false;
  let count = 0;
  for (const part of words.segment(text)) {
    if (part.isWordLike && /\p{L}/u.test(part.segment) && ++count > 3) return true;
  }
  return false;
}
