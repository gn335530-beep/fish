/* 官方代碼字典測試共用：原始列、分頁假上游、清空字典與查代碼。 */

const { call } = require("./client");
const upstream = require("../lib/market/upstream");
const sync = require("../lib/market/catalog-sync");
const store = require("../lib/market/catalog-store");
const { buildEntries } = require("../lib/market/catalog-normalize");

function raw(overrides) {
  return Object.assign({
    "交易日期": "1151022",
    "品種代碼": 2141,
    "魚貨名稱": "土魠",
    "市場名稱": "高雄",
    "交易量": 10,
    "平均價": 100
  }, overrides || {});
}

function usePages(pages) {
  const state = { calls: 0, urls: [] };
  upstream.setFetcher(async function (url) {
    state.calls += 1;
    state.urls.push(url);
    const parsed = new URL(url, "http://test");
    const skip = Number(parsed.searchParams.get("$skip")) || 0;
    const page = typeof pages === "function"
      ? pages(skip)
      : (pages[Math.floor(skip / 10000)] || []);
    return { ok: true, json: async function () { return page; } };
  });
  return state;
}

function useFailure() {
  const state = { calls: 0 };
  upstream.setFetcher(async function () {
    state.calls += 1;
    throw new Error("upstream down");
  });
  return state;
}

function seedCatalog(rows) {
  store.replace(buildEntries(rows));
  store.saveState({
    last_status: "ok",
    last_synced_at: new Date().toISOString(),
    last_attempt_at: new Date().toISOString(),
    last_row_count: rows.length,
    last_error: null,
    last_error_at: null
  });
}

function resetCatalog() {
  store.reset();
  sync.reset();
  upstream.setFetcher(null);
}

function getCodes(query) {
  const suffix = query === undefined ? "" : "?q=" + encodeURIComponent(query);
  return call("GET", "/api/market/codes" + suffix);
}

module.exports = {
  raw: raw,
  usePages: usePages,
  useFailure: useFailure,
  seedCatalog: seedCatalog,
  resetCatalog: resetCatalog,
  getCodes: getCodes,
  store: store,
  sync: sync
};
