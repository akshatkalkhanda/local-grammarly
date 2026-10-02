export function validateUrl(value) {
  const url = new URL(String(value));
  if (!['http:', 'https:'].includes(url.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || url.username || url.password || url.search || url.hash) {
    throw new Error('The Ollama endpoint must be a local http(s) address without credentials, query parameters, or fragments.');
  }
  return url.toString().replace(/\/$/, '');
}

export function validateCompletion(data) {
  if (data.error) throw new Error(String(data.error));
  if (data.done !== true) throw new Error('Ollama stopped before completing the suggestion. Please try again.');
  if (data.done_reason === 'length') {
    throw new Error('The suggestion reached its output limit. Select a shorter passage and try again.');
  }
}

// Network chunks need not align with JSON lines or UTF-8 character boundaries.
export async function readGenerationStream(body, onChunk) {
  const decoder = new TextDecoder();
  let pending = '';
  let result = '';
  let completed = false;
  const consume = (line) => {
    if (!line.trim()) return;
    if (completed) throw new Error('Unexpected data after Ollama completed the suggestion.');
    const data = JSON.parse(line);
    if (data.error) throw new Error(String(data.error));
    if (data.done === true) {
      validateCompletion(data);
      completed = true;
    }
    if (typeof data.response === 'string' && data.response) {
      result += data.response;
      onChunk(data.response);
    }
  };
  for await (const chunk of body) {
    pending += decoder.decode(chunk, { stream: true });
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';
    for (const line of lines) consume(line);
  }
  pending += decoder.decode();
  consume(pending);
  if (!completed) validateCompletion({ done: false });
  return result;
}
