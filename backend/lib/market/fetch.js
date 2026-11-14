/* 行情按需抓取：TTL 快取、negative cache、in-flight 去重與 90 天清理。 */

const upstream = require("./upstream");
const repository = require("./repository");
const cache = require("./fetch-cache");
const { normalizeRows } = require("./normalize");
const { addDays, maxDate, todayIso } = require("./dates");

const KEEP_DAYS = 90;
const LATEST_WINDOW_DAYS = 14;
const DATE_LOOKBACK_DAYS = 7;

const inFlight = new Map();

async function performFetch(mapping, from, to, options) {
  const key = cache.key(mapping.code, from, to);
  if (inFlight.has(key)) return inFlight.get(key);
  const isLatest = options && options.latest === true;
  const timeoutMs = options && options.timeoutMs;

  const task = (async function () {
    const fetchedAt = new Date().toISOString();
    try {
      const raw = await upstream.fetchRows({
        code: mapping.code, from: from, to: to, timeoutMs: timeoutMs
      });
      const rows = normalizeRows(raw, mapping, fetchedAt);
      repository.upsertPrices(rows);

      const previous = repository.getState(mapping.code);
      const latest = rows.reduce(function (value, row) { return maxDate(value, row.trade_date); }, null);
      const status = rows.length > 0 ? "ok" : "no_data";
      const changes = {
        last_checked_at: fetchedAt,
        last_trade_date: maxDate(previous && previous.last_trade_date, latest),
        last_row_count: rows.length,
        last_status: status,
        last_error: null,
        last_error_at: null,
        last_range_from: from,
        last_range_to: to
      };
      if (isLatest) changes.last_latest_at = fetchedAt;
      repository.saveState(mapping.code, changes);
      repository.pruneOlderThan(KEEP_DAYS);
      cache.remember(mapping.code, from, to, fetchedAt, status);
      return { status: status, rows: rows, cached: false };
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      const timedOut = Boolean(err && (err.timedOut === true ||
        err.name === "TimeoutError" || err.name === "AbortError"));
      const changes = {
        last_checked_at: fetchedAt,
        last_status: "error",
        last_error: message,
        last_error_at: fetchedAt
      };
      if (isLatest) changes.last_latest_at = fetchedAt;
      repository.saveState(mapping.code, changes);
      /* 逾時不進 negative cache：下一次查詢要能重新嘗試並回報 LLM_TIMEOUT。 */
      if (!timedOut) cache.remember(mapping.code, from, to, fetchedAt, "error");
      return { status: "error", error: message, timedOut: timedOut, rows: [], cached: false };
    }
  })();

  inFlight.set(key, task);
  try {
    return await task;
  } finally {
    inFlight.delete(key);
  }
}

async function ensureLatest(mapping, options) {
  const state = repository.getState(mapping.code);
  const to = todayIso();
  const from = addDays(to, -LATEST_WINDOW_DAYS);
  if (state && cache.isFresh(state.last_latest_at) &&
    cache.hasBackingData(state, mapping, from, to)) {
    return cache.result(state.last_status);
  }
  return performFetch(mapping, from, to, {
    latest: true, timeoutMs: options && options.timeoutMs
  });
}

/* 指定日若無資料（週末、休市），往回抓一週補上最近交易日；查詢仍只取 <= date。 */
async function ensureDate(mapping, date, options) {
  if (repository.hasPricesForCodeDate(mapping.code, date)) return cache.result("ok");
  const from = addDays(date, -DATE_LOOKBACK_DAYS);
  const state = repository.getState(mapping.code);
  if (cache.stateCovers(state, from, date) &&
    cache.hasBackingData(state, mapping, from, date)) {
    return cache.result(state.last_status);
  }
  const cachedEntry = cache.entry(mapping.code);
  if (cachedEntry && cache.covers(cachedEntry, from, date) &&
    cache.hasRangeData(cachedEntry, mapping, from, date)) {
    return cache.result(cachedEntry.status);
  }
  return performFetch(mapping, from, date, { timeoutMs: options && options.timeoutMs });
}

/* 行情卡歷史：從 endDate 往回抓足夠日曆日，確保涵蓋 N 個交易日。 */
async function ensureHistory(mapping, endDate, days, options) {
  const to = endDate || todayIso();
  const from = addDays(to, -(days * 2 + 7));
  const state = repository.getState(mapping.code);
  if (cache.stateCovers(state, from, to) && cache.hasBackingData(state, mapping, from, to)) {
    return cache.result(state.last_status);
  }
  const cachedEntry = cache.entry(mapping.code);
  if (cachedEntry && cache.covers(cachedEntry, from, to) &&
    cache.hasRangeData(cachedEntry, mapping, from, to)) {
    return cache.result(cachedEntry.status);
  }
  return performFetch(mapping, from, to, { timeoutMs: options && options.timeoutMs });
}

/* force 一律打上游，但仍共用 in-flight 去重，避免同時查詢重複下載。 */
function forceFetch(mapping, options) {
  if (options.days) {
    const to = options.date || todayIso();
    return performFetch(mapping, addDays(to, -(options.days * 2 + 7)), to, {
      timeoutMs: options.timeoutMs
    });
  }
  if (options.date) {
    return performFetch(mapping, addDays(options.date, -DATE_LOOKBACK_DAYS), options.date, {
      timeoutMs: options.timeoutMs
    });
  }
  const to = todayIso();
  return performFetch(mapping, addDays(to, -LATEST_WINDOW_DAYS), to, {
    latest: true, timeoutMs: options.timeoutMs
  });
}

/* CLI 與查詢服務共用同一套「最近／指定日期／歷史」選擇。 */
async function ensureFor(mapping, options) {
  const opts = options || {};
  if (opts.force) return forceFetch(mapping, opts);
  if (opts.days) return ensureHistory(mapping, opts.date || todayIso(), opts.days, opts);
  if (opts.date) return ensureDate(mapping, opts.date, opts);
  return ensureLatest(mapping, opts);
}

function resetCache() {
  cache.reset();
  inFlight.clear();
}

module.exports = {
  TTL_MS: cache.TTL_MS,
  ensureLatest: ensureLatest,
  ensureDate: ensureDate,
  ensureHistory: ensureHistory,
  ensureFor: ensureFor,
  resetCache: resetCache
};
