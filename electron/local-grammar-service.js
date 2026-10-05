import { Worker } from 'node:worker_threads';

export function createLocalGrammarService(workerPath = new URL('./local-grammar-worker.js', import.meta.url)) {
  let worker;
  let nextId = 0;
  const pending = new Map();
  const fail = (instance, error) => {
    if (worker !== instance) return;
    worker = undefined;
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pending.clear();
    void instance.terminate();
  };
  return {
    check(text, dictionary = []) {
      if (typeof text !== 'string' || !text.trim() || text.length > 20_000) {
        return Promise.reject(new Error('Select between 1 and 20,000 characters for an offline check.'));
      }
      if (!worker) {
        const instance = worker = new Worker(workerPath);
        instance.on('message', ({ id, result, error }) => {
          const request = pending.get(id);
          if (!request) return;
          clearTimeout(request.timer);
          pending.delete(id);
          if (error) request.reject(new Error(error));
          else request.resolve(result);
          if (!pending.size) instance.unref();
        });
        instance.on('error', error => fail(instance, error));
        instance.on('exit', () => fail(instance, new Error('Offline grammar checker stopped.')));
      }
      const instance = worker;
      instance.ref();
      return new Promise((resolve, reject) => {
        const id = ++nextId;
        const timer = setTimeout(() => fail(instance, new Error('Offline grammar check timed out.')), 10_000);
        pending.set(id, { resolve, reject, timer });
        try { instance.postMessage({ id, text, dictionary }); }
        catch (error) { fail(instance, error); }
      });
    },
    dispose() {
      if (worker) fail(worker, new Error('Offline grammar checker closed.'));
    }
  };
}
