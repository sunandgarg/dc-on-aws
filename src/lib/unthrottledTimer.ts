/**
 * Web-Worker-backed timer that is NOT throttled when the tab is hidden.
 *
 * Browsers throttle `setTimeout` / `setInterval` on the main thread to roughly
 * 1 call per minute when a tab is in the background. Timers inside a Worker
 * are not subject to that throttling, so we run the schedule there and
 * resolve a main-thread Promise via postMessage.
 *
 * Use this anywhere you have a long-running loop (e.g. lead-push processing)
 * that must keep ticking while the user switches tabs.
 */

let worker: Worker | null = null;
let counter = 0;
const pendingTimeouts = new Map<number, () => void>();
const activeIntervals = new Map<number, (n: number) => void>();

function ensureWorker(): Worker {
  if (worker) return worker;

  const src = `
    const intervals = new Map();
    self.onmessage = (e) => {
      const { kind, id, ms } = e.data || {};
      if (kind === 'timeout') {
        setTimeout(() => self.postMessage({ kind: 'timeout', id }), ms);
      } else if (kind === 'interval-start') {
        let n = 0;
        const handle = setInterval(() => {
          n += 1;
          self.postMessage({ kind: 'interval', id, n });
        }, ms);
        intervals.set(id, handle);
      } else if (kind === 'interval-stop') {
        const h = intervals.get(id);
        if (h !== undefined) { clearInterval(h); intervals.delete(id); }
      }
    };
  `;
  const blob = new Blob([src], { type: "application/javascript" });
  worker = new Worker(URL.createObjectURL(blob));
  worker.onmessage = (e: MessageEvent) => {
    const { kind, id, n } = e.data || {};
    if (kind === "timeout") {
      const cb = pendingTimeouts.get(id);
      if (cb) { pendingTimeouts.delete(id); cb(); }
    } else if (kind === "interval") {
      const cb = activeIntervals.get(id);
      if (cb) cb(n);
    }
  };
  return worker;
}

/** Promise that resolves after `ms` ms even when the tab is hidden. */
export function unthrottledWait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const id = ++counter;
    pendingTimeouts.set(id, resolve);
    ensureWorker().postMessage({ kind: "timeout", id, ms });
  });
}

/** Start an interval that keeps firing while the tab is hidden. Returns a stop handle. */
export function unthrottledInterval(ms: number, cb: (n: number) => void): () => void {
  const id = ++counter;
  activeIntervals.set(id, cb);
  ensureWorker().postMessage({ kind: "interval-start", id, ms });
  return () => {
    activeIntervals.delete(id);
    if (worker) worker.postMessage({ kind: "interval-stop", id });
  };
}
