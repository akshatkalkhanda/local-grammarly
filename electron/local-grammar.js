import { LocalLinter } from 'harper.js';
import { binaryInlined } from 'harper.js/binaryInlined';

// The WASM binary is bundled locally; checking never downloads or sends text.
export function createLocalGrammarChecker() {
  const linter = new LocalLinter({ binary: binaryInlined });
  let dictionaryKey = '';
  return {
    async check(text, dictionary = []) {
      if (typeof text !== 'string' || !text.trim() || text.length > 20_000) {
        throw new Error('Select between 1 and 20,000 characters for an offline check.');
      }
      const key = JSON.stringify(dictionary);
      if (key !== dictionaryKey) {
        await linter.clearWords();
        await linter.importWords(dictionary);
        dictionaryKey = key;
      }
      if (!await linter.isLikelyEnglish(text)) return { suggestion: '', issueCount: 0, supported: false };
      const lints = await linter.lint(text, { language: 'markdown', dedup: true, isolateEnglish: true });
      const fixable = lints.filter(lint => lint.suggestion_count() > 0).sort((a, b) => b.span().start - a.span().start);
      let suggestion = text;
      let boundary = Infinity;
      let issueCount = 0;
      for (const lint of fixable) {
        const span = lint.span();
        if (span.end > boundary) continue;
        suggestion = await linter.applySuggestion(suggestion, lint, lint.suggestions()[0]);
        boundary = span.start;
        issueCount += 1;
      }
      return { suggestion: suggestion === text ? '' : suggestion, issueCount, supported: true };
    },
    dispose: () => linter.dispose()
  };
}
