/* 官方新鮮代碼字典同步：30 天、分頁、24 小時快取、單一同步與失敗沿用舊字典。 */

const upstream = require("./upstream");
const catalogStore = require("./catalog-store");
const { buildEntries } = require("./catalog-normalize");
const { addDays, todayIso } = require("./dates");

const TTL_MS = 24 * 3600 * 1000;
const FAILURE_BACKOFF_MS = 60 * 1000;
const PAGE_SIZE = 10000;
const MAX_SKIP = 200000;
const SYNC_DAYS = 30;

let inFlight = null;

/* 快取看的是「上次成功同步」，最近一次失敗不影響 24 小時內沿用舊字典。 */
function isFresh(state) {
  if (!state || !state.last_synced_at) return false;
  const at = Date.parse(state.last_synced_at);
  return Number.isFinite(at) && Date.now() - at < TTL_MS;
}

function inFailureBackoff(state) {
  if (!state || state.last_status !== "error" || !state.last_attempt_at) return false;
  const at = Date.parse(state.last_attempt_at);
  return Number.isFinite(at) && Date.now() - at < FAILURE_BACKOFF_MS;
}

/* 以上游實際回傳筆數推進 $skip，直到空頁或整頁都重複；避免忽略 $skip 的上游無窮迴圈。 */
async function fetchAllRows(from, to) {
  const rows = [];
  const seen = new Set();
  let skip = 0;
  while (true) {
    const page = await upstream.fetchRows({ from: from, to: to, skip: skip, top: PAGE_SIZE });
    if (!Array.isArray(page) || page.length === 0) break;
    let added = 0;
    for (const raw of page) {
      const key = [raw["交易日期"], raw["品種代碼"], raw["魚貨名稱"], raw["市場名稱"]].join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(raw);
      added += 1;
    }
    if (added === 0) break;
    skip += page.length;
    if (skip > MAX_SKIP) break;
  }
  return rows;
}

async function runSync() {
  const attemptedAt = new Date().toISOString();
  const to = todayIso();
  const from = addDays(to, -SYNC_DAYS);
  try {
    const rawRows = await fetchAllRows(from, to);
    const entries = buildEntries(rawRows);
    if (entries.length === 0) {
      throw new Error("官方回傳沒有新鮮代碼");
    }
    catalogStore.replace(entries);
    catalogStore.saveState({
      last_status: "ok",
      last_synced_at: attemptedAt,
      last_attempt_at: attemptedAt,
      last_row_count: entries.length,
      last_error: null,
      last_error_at: null
    });
    return { available: true, status: "ok", cached: false, rows: entries.length };
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    catalogStore.saveState({
      last_status: "error",
      last_attempt_at: attemptedAt,
      last_error: message,
      last_error_at: attemptedAt
    });
    return { available: catalogStore.count() > 0, status: "error", cached: false, error: message };
  }
}

/* 有 24 小時內的字典就不再抓；最近失敗後短時間內也不再重試。 */
async function ensureCatalog() {
  const state = catalogStore.getState();
  if (isFresh(state)) {
    return { available: catalogStore.count() > 0, status: state.last_status, cached: true };
  }
  if (inFailureBackoff(state)) {
    return { available: catalogStore.count() > 0, status: "error", cached: true, error: state.last_error };
  }
  if (inFlight) return inFlight;

  inFlight = runSync();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

function reset() {
  inFlight = null;
}

module.exports = {
  TTL_MS: TTL_MS,
  PAGE_SIZE: PAGE_SIZE,
  ensureCatalog: ensureCatalog,
  reset: reset
};
