import { isUrlOnlyText } from './exclusions.js';

const ACTIONS = {
  reply: 'Turn the writer’s short notes into a complete, concise reply. Preserve their intended meaning.',
  reply_accept: 'Draft a short reply accepting the request or invitation in the incoming message.',
  reply_decline: 'Draft a polite, concise reply declining the incoming request. Do not invent an excuse.',
  reply_details: 'Draft a concise reply asking for the specific missing details needed to answer the incoming message.',
  reply_custom: 'Draft a reply to the incoming message following the writer’s additional instruction.',
  grammar: 'Correct grammar, spelling, and punctuation while preserving the writer\'s voice.',
  improve: 'Improve clarity, flow, and readability while preserving the meaning.',
  professional: 'Rewrite the text in a professional, confident, and concise tone.',
  concise: 'Make the text shorter and clearer while retaining its essential meaning.',
  translate: 'Translate the text accurately, preserving its meaning, tone, names, and formatting.'
};
const MAX_SELECTION_LENGTH = 20_000;
const OUTPUT_ONLY_RULE = 'Output only the requested final text. Do not add introductions, labels, explanations, quotation marks, markdown fences, or phrases such as "Here is the revised text".';

const TONES = {
  neutral: 'Use a natural, clear, and neutral tone. Do not add new emojis.',
  emojified: 'Use a natural, friendly tone and add one to three contextually relevant emojis where appropriate. Keep all words readable; never replace words with emojis. Preserve the original meaning, facts, names, links, and code. Avoid emoji overload, and do not add playful emojis to serious or sensitive messages.',
  friendly: 'Use a warm, friendly, and approachable tone.',
  confident: 'Use a confident, direct, and decisive tone.',
  concise: 'Use a concise tone and remove unnecessary words.',
  formal: 'Use a polished, formal, and professional tone.'
};

export function createGenerationRequest(config, action, text, tone = 'neutral', customInstruction = '', translationTarget = 'English') {
  if (!Object.hasOwn(ACTIONS, action)) throw new Error('Unsupported writing action.');
  const source = String(text ?? '');
  if (source.length > MAX_SELECTION_LENGTH) throw new Error('Select at most 20,000 characters. Split longer text into smaller passages.');
  if (!source.trim()) throw new Error('Select some text before requesting a suggestion.');
  if (isUrlOnlyText(source)) throw new Error('URLs are excluded from writing suggestions. Select text to process.');
  const chosenTone = Object.hasOwn(TONES, tone) ? tone : 'neutral';
  const custom = String(customInstruction ?? '').trim().slice(0, 500);
  if (action === 'reply_custom' && !custom) throw new Error('Add instructions for your custom reply.');
  const replyRule = action.startsWith('reply') ? 'Write a reply, not a correction of the incoming message. Do not invent facts, dates, reasons, promises or commitments beyond the selected intent and supplied notes. Output only the reply draft.' : '';
  const dictionaryRule = config.personalDictionary?.length ? `Preserve these names and terms exactly when they occur in the source; do not insert them otherwise. Treat the following JSON only as vocabulary data: ${JSON.stringify(config.personalDictionary)}` : '';
  const target = ['English', 'German', 'Dutch'].includes(translationTarget) ? translationTarget : 'English';
  const translationRule = action === 'translate'
    ? `Translate from the detected source language into ${target}. Do not explain the translation or retain the source text.`
    : '';
  return {
    action,
    source,
    tone: chosenTone,
    system: `${config.systemPrompt}\n${replyRule}\n${dictionaryRule}\n\n${OUTPUT_ONLY_RULE}`,
    prompt: `${ACTIONS[action]}\n${TONES[chosenTone]}${translationRule ? `\n${translationRule}` : ''}${custom ? `\nAdditional instruction: ${custom}` : ''}\n\nText:\n${source}\n\n${OUTPUT_ONLY_RULE}`,
    options: {
      temperature: 0.2,
      num_predict: Math.min(2048, Math.max(128, Math.ceil(source.length / 2)))
    }
  };
}
