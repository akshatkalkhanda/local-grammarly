import React from 'react';

/**
 * Simple word-level diff view.
 * Compares originalText and correctedText word-by-word using a longest common subsequence (LCS) approach.
 * Removed words are shown in red with strikethrough, added words in green with highlight.
 */
function computeWordDiff(original, corrected) {
  const oldWords = original.split(/(\s+)/);
  const newWords = corrected.split(/(\s+)/);

  // LCS is quadratic. Long selections should remain responsive rather than allocate a huge table.
  if (oldWords.length * newWords.length > 160000) return null;

  // Build LCS table
  const m = oldWords.length;
  const n = newWords.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff tokens
  const result = [];
  let i = m, j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      result.unshift({ type: 'same', text: oldWords[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', text: newWords[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'removed', text: oldWords[i - 1] });
      i--;
    }
  }

  return result;
}

export default function DiffView({ originalText, correctedText }) {
  if (!originalText || !correctedText) return null;

  const diff = computeWordDiff(originalText, correctedText);

  if (!diff) {
    return <div className="diff-container"><p className="diff-plain">{correctedText}</p></div>;
  }

  return (
    <div className="diff-container">
      {diff.map((token, idx) => {
        if (token.type === 'removed') {
          return <span key={idx} className="diff-removed">{token.text}</span>;
        }
        if (token.type === 'added') {
          return <span key={idx} className="diff-added">{token.text}</span>;
        }
        return <span key={idx}>{token.text}</span>;
      })}
    </div>
  );
}
