/* 行情抓取（正規化與寫入）：篩列、民國年、upsert、失敗保留與 prune。 */

const test = require("node:test");
const assert = require("node:assert/strict");
require("./client");

const repository = require("../lib/market/repository");
const fetchService = require("../lib/market/fetch");
const upstream = require("../lib/market/upstream");
const { addDays, todayIso } = require("../lib/market/dates");
const { raw, useRows, resetMarket, mapping } = require("./market-test-helpers");

test.beforeEach(resetMarket);

test("第一次抓取寫入行情與狀態", async function () {
  useRows([raw(), raw({ "市場名稱": "高雄", "平均價": 200, "交易量": 30 })]);
  const first = await fetchService.ensureLatest(mapping);
  assert.equal(first.status, "ok");
  assert.equal(first.rows.length, 2);

  const prices = repository.allPrices();
  assert.equal(prices.length, 2);
  assert.deepEqual(prices.map(function (row) { return row.trade_date; }), ["2026-10-22", "2026-10-22"]);
  assert.equal(prices[0].species_code, 2201);
  assert.equal(prices[0].species_id, "grouper");
  assert.equal(prices[0].is_aquaculture, false);
  assert.equal(prices[0].quality, "official");
  assert.ok(prices[0].source);

  const state = repository.getState(2201);
  assert.equal(state.last_status, "ok");
  assert.equal(state.last_trade_date, "2026-10-22");
  assert.equal(state.last_row_count, 2);
  assert.equal(state.last_error, null);
});

test("休市、代碼不符、價格或交易量為 0 的列不寫入；民國年轉西元", async function () {
  useRows([
    raw(),
    raw({ "魚貨名稱": "休市" }),
    raw({ "品種代碼": 2202 }),
    raw({ "平均價": 0 }),
    raw({ "交易量": 0 }),
    raw({ "交易日期": "115102" }),
    raw({ "市場名稱": "梓官", "平均價": 120 })
  ]);
  const result = await fetchService.ensureLatest(mapping);
  assert.equal(result.rows.length, 2);
  const prices = repository.allPrices();
  assert.equal(prices.length, 2);
  assert.equal(prices[0].trade_date, "2026-10-22");
  assert.deepEqual(prices.map(function (row) { return row.market_name; }).sort(), ["岡山", "梓官"]);
});

test("同一交易日重跑只更新既有列，不產生重複", async function () {
  useRows([raw({ "平均價": 100 })]);
  await fetchService.ensureLatest(mapping);

  repository.saveState(2201, "grouper", {
    last_checked_at: "2020-01-01T00:00:00.000Z",
    last_latest_at: "2020-01-01T00:00:00.000Z"
  });
  fetchService.resetCache();
  useRows([raw({ "平均價": 150 })]);
  await fetchService.ensureLatest(mapping);

  const prices = repository.allPrices();
  assert.equal(prices.length, 1);
  assert.equal(prices[0].price_per_kg_avg, 150);
});

test("上游失敗不清空既有行情，狀態記錄 error", async function () {
  useRows([raw()]);
  await fetchService.ensureLatest(mapping);
  repository.saveState(2201, "grouper", {
    last_checked_at: new Date(Date.now() - fetchService.TTL_MS - 1000).toISOString(),
    last_latest_at: new Date(Date.now() - fetchService.TTL_MS - 1000).toISOString()
  });
  fetchService.resetCache();
  upstream.setFetcher(async function () { throw new Error("boom"); });

  const result = await fetchService.ensureLatest(mapping);
  assert.equal(result.status, "error");
  assert.equal(repository.allPrices().length, 1);
  const state = repository.getState(2201);
  assert.equal(state.last_status, "error");
  assert.match(state.last_error, /boom/);
  assert.equal(state.last_trade_date, "2026-10-22");
});

test("成功抓取後刪除 90 天以前的行情與狀態", async function () {
  const oldDate = addDays(todayIso(), -120);
  repository.upsertPrices([{
    id: "mkt_old",
    species_code: 2201,
    species_id: "grouper",
    species_name: "石斑魚",
    market_name: "岡山",
    trade_date: oldDate,
    price_per_kg_avg: 1,
    volume_kg: 1,
    is_aquaculture: false,
    source: "x",
    source_url: "x",
    fetched_at: "2020-01-01T00:00:00.000Z",
    quality: "official"
  }]);
  repository.saveState(9999, "grouper", { last_checked_at: "2020-01-01T00:00:00.000Z" });

  useRows([raw()]);
  await fetchService.ensureLatest(mapping);

  assert.equal(repository.allPrices().some(function (row) { return row.id === "mkt_old"; }), false);
  assert.equal(repository.getState(9999), null);
});
