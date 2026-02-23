
// Web Worker for accurate background timing
// This runs in a separate thread and is less likely to be throttled by browsers

const INTERVAL = 15 * 60 * 1000; // 15 minutes

let timerId = null;

self.onmessage = (e) => {
  if (e.data === 'start') {
    if (timerId) clearInterval(timerId);
    console.log('[TimerWorker] Started');
    timerId = setInterval(() => {
      self.postMessage('tick');
    }, INTERVAL);
  } else if (e.data === 'stop') {
    if (timerId) clearInterval(timerId);
    timerId = null;
    console.log('[TimerWorker] Stopped');
  }
};
