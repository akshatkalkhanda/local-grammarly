import { parentPort } from 'node:worker_threads';
import { createLocalGrammarChecker } from './local-grammar.js';

const checker = createLocalGrammarChecker();
let queue = Promise.resolve();
parentPort.on('message', ({ id, text, dictionary }) => {
  queue = queue.then(async () => {
    try { parentPort.postMessage({ id, result: await checker.check(text, dictionary) }); }
    catch (error) { parentPort.postMessage({ id, error: error.message }); }
  });
});
