/* 行情按需抓取：TTL 快取、negative cache、in-flight 去重與 90 天清理。 */

const upstream = require("./upstream");
const repository = require("./repository");
const { normalizeRows } = require("./normalize");
const { addDays, maxDate, todayIso } = require("./dates");

const TTL_MS = 30 * 60 * 1000;
const KEEP_DAYS = 90;
const LATEST_WINDOW_DAYS = 14;
const DATE_LOOKBACK_DAYS = 7;

const rangeCache = new Map();
const inFlight = new Map();

function isFresh(isoText) {
  const time = Date.parse(isoText || "");
  return Number.isFinite(time) && Date.now() - time < TTL_MS;
}

function cacheKey(code, from, to) {
  return code + "|" + (from || "") + "|" + (to || "");
}

function cacheCovers(entry, from, to) {
  if (!entry || !isFresh(entry.at)) return false;
  return entry.from <= from && entry.to >= to;
}

function cachedResult(status) {
  return { status: status || "ok", rows: [], cached: true };
}

/* 過去日期一旦抓過就不應再改；含今天的範圍仍受 30 分鐘 TTL 限制。 */
function stateCovers(state, from, to) {
  if (!state || state.last_status === "error") return false;
  if (!state.last_range_from || !state.last_range_to) return false;
  if (state.last_range_from > from || state.last_range_to < to) return false;
  return to < todayIso() || isFresh(state.last_checked_at);
}

function remember(code, from, to, at, status) {
  rangeCache.set(code, { from: from, to: to, at: at, status: status });
}

async function performFetch(mapping, from, to, options) {
  const key = cacheKey(mapping.code, from, to);
  if (inFlight.has(key)) return inFlight.get(key);
  const isLatest = options && options.latest === true;

  const task = (async function () {
    const fetchedAt = new Date().toISOString();
    try {
      const raw = await upstream.fetchRows({ code: mapping.code, from: from, to: to });
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
      repository.saveState(mapping.code, mapping.species_id, changes);
      repository.pruneOlderThan(KEEP_DAYS);
      remember(mapping.code, from, to, fetchedAt, status);
      return { status: status, rows: rows, cached: false };
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      const changes = {
        last_checked_at: fetchedAt,
        last_status: "error",
        last_error: message,
        last_error_at: fetchedAt
      };
      if (isLatest) changes.last_latest_at = fetchedAt;
      repository.saveState(mapping.code, mapping.species_id, changes);
      remember(mapping.code, from, to, fetchedAt, "error");
      return { status: "error", error: message, rows: [], cached: false };
    }
  })();

  inFlight.set(key, task);
  try {
    return await task;
  } finally {
    inFlight.delete(key);
  }
}

async function ensureLatest(mapping) {
  const state = repository.getState(mapping.code);
  if (state && isFresh(state.last_latest_at)) return cachedResult(state.last_status);
  const to = todayIso();
  return performFetch(mapping, addDays(to, -LATEST_WINDOW_DAYS), to, { latest: true });
}

/* 指定日若無資料（週末、休市），往回抓一週補上最近交易日；查詢仍只取 <= date。 */
async function ensureDate(mapping, date) {
  if (repository.hasPricesForDate(mapping.species_id, date)) return cachedResult("ok");
  const from = addDays(date, -DATE_LOOKBACK_DAYS);
  const state = repository.getState(mapping.code);
  if (stateCovers(state, from, date)) return cachedResult(state.last_status);
  const entry = rangeCache.get(mapping.code);
  if (entry && cacheCovers(entry, from, date)) return cachedResult(entry.status);
  return performFetch(mapping, from, date);
}

/* 行情卡歷史：從 endDate 往回抓足夠日曆日，確保涵蓋 N 個交易日。 */
async function ensureHistory(mapping, endDate, days) {
  const to = endDate || todayIso();
  const from = addDays(to, -(days * 2 + 7));
  const state = repository.getState(mapping.code);
  if (stateCovers(state, from, to)) return cachedResult(state.last_status);
  const entry = rangeCache.get(mapping.code);
  if (cacheCovers(entry, from, to)) return cachedResult(entry.status);
  return performFetch(mapping, from, to);
}

/* CLI 與查詢服務共用同一套「最近／指定日期／歷史」選擇。 */
async function ensureFor(mapping, options) {
  if (options.days) return ensureHistory(mapping, options.date || todayIso(), options.days);
  if (options.date) return ensureDate(mapping, options.date);
  return ensureLatest(mapping);
}

function resetCache() {
  rangeCache.clear();
  inFlight.clear();
}

module.exports = {
  TTL_MS: TTL_MS,
  ensureLatest: ensureLatest,
  ensureDate: ensureDate,
  ensureHistory: ensureHistory,
  ensureFor: ensureFor,
  resetCache: resetCache
};
