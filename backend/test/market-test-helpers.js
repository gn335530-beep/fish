/* 行情測試共用：原始列、假的 upstream fetcher、清空行情集合。 */

const { call } = require("./client");
const upstream = require("../lib/market/upstream");
const mappings = require("../lib/market/mappings");
const fetchService = require("../lib/market/fetch");
const { setAll } = require("../lib/store");

function raw(overrides) {
  return Object.assign({
    "交易日期": "1151022",
    "品種代碼": 2201,
    "魚貨名稱": "石斑魚",
    "市場名稱": "岡山",
    "上價": 0,
    "中價": 0,
    "下價": 0,
    "交易量": 10,
    "平均價": 100
  }, overrides || {});
}

function useRows(rows) {
  const state = { calls: 0, urls: [] };
  upstream.setFetcher(async function (url) {
    state.calls += 1;
    state.urls.push(url);
    return { ok: true, json: async function () { return rows; } };
  });
  return state;
}

function resetMarket() {
  setAll("market_prices", []);
  setAll("market_fetch_state", []);
  fetchService.resetCache();
  upstream.setFetcher(null);
}

function getPrices(queryString) {
  return call("GET", "/api/market/prices?" + queryString);
}

function priceFields(data) {
  return [data.price_per_kg, data.price_per_taijin];
}

module.exports = {
  raw: raw,
  useRows: useRows,
  resetMarket: resetMarket,
  getPrices: getPrices,
  priceFields: priceFields,
  mapping: mappings.mappingBySpecies("grouper"),
  mappings: mappings,
  upstream: upstream,
  fetchService: fetchService
};
