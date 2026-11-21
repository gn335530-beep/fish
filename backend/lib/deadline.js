/* 請求期限：共用中止訊號與競速結果；計時器在成功、失敗與逾時路徑都會清理。 */

const NOOP = function () {};

function milliseconds(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/* 有限且小於或等於零代表期限已用盡；undefined 代表不設期限。 */
function expired(value) {
  const ms = milliseconds(value);
  return ms !== null && ms <= 0;
}

/* 建立中止訊號；期限已用盡時 signal 為 null，呼叫端不得再呼叫下游。 */
function abortSignal(value) {
  if (expired(value)) return { signal: null, clear: NOOP };
  const ms = milliseconds(value);
  if (ms === null) return { signal: undefined, clear: NOOP };
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, ms);
  return {
    signal: controller.signal,
    clear: function () { clearTimeout(timer); }
  };
}

/* 以剩餘毫秒和任務競速；時間已用盡時直接回逾時結果，不啟動任務。 */
async function race(task, timeoutMs, fallback) {
  if (expired(timeoutMs)) return fallback;
  const ms = milliseconds(timeoutMs);
  const promise = typeof task === "function" ? task() : task;
  if (ms === null) return promise;

  let timer;
  const timeout = new Promise(function (resolve) {
    timer = setTimeout(function () { resolve(fallback); }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/* 距絕對期限的剩餘毫秒，下限 1ms；呼叫端自行判斷期限是否已用盡。 */
function remainingMs(deadline) {
  return Math.max(1, deadline - Date.now());
}

module.exports = {
  abortSignal: abortSignal,
  race: race,
  remainingMs: remainingMs
};
