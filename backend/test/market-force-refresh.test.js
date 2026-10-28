/* 行情強制重抓：每次 API 查詢都打上游、state 失效重抓與失敗回舊資料。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop } = require("./client");
const { setAll } = require("../lib/store");
const upstream = require("../lib/market/upstream");
const repository = require("../lib/market/repository");
const fetchService = require("../lib/market/fetch");
const { raw, useRows, resetMarket, getPrices, mapping } = require("./market-test-helpers");

test.before(start);
test.after(stop);
test.beforeEach(resetMarket);

test("行情 API 每次查詢都重新抓上游", async function () {
  const fetcher = useRows([raw()]);
  const query = "species_id=grouper&region=高雄市";

  await getPrices(query);
  await getPrices(query);

  assert.equal(fetcher.calls, 2);
});

test("state 說成功但行情已被刪除時會重新抓取", async function () {
  const fetcher = useRows([raw()]);
  const first = await fetchService.ensureDate(mapping, "2026-10-22");
  assert.equal(first.status, "ok");
  assert.equal(fetcher.calls, 1);

  setAll("market_prices", []);
  fetchService.resetCache();

  const second = await fetchService.ensureDate(mapping, "2026-10-22");
  assert.equal(second.status, "ok");
  assert.equal(fetcher.calls, 2);
});

test("上游失敗但本機有舊資料時回舊行情", async function () {
  useRows([raw({ "平均價": 111, "交易量": 1 })]);
  const first = await getPrices("species_id=grouper&region=高雄市");
  assert.equal(first.body.data.found, true);
  assert.equal(first.body.data.price_per_kg, 111);

  upstream.setFetcher(async function () { throw new Error("down"); });
  fetchService.resetCache();

  const second = await getPrices("species_id=grouper&region=高雄市");
  assert.equal(second.status, 200);
  assert.equal(second.body.data.found, true);
  assert.equal(second.body.data.price_per_kg, 111);
  assert.equal(second.body.data.trade_date, "2026-10-22");
});

test("上游失敗且完全沒有資料時回 UPSTREAM_UNAVAILABLE", async function () {
  upstream.setFetcher(async function () { throw new Error("down"); });
  fetchService.resetCache();

  const res = await getPrices("species_id=grouper&region=高雄市");
  assert.equal(res.status, 200);
  assert.equal(res.body.data.found, false);
  assert.equal(res.body.data.reason, "UPSTREAM_UNAVAILABLE");
  assert.equal(res.body.data.price_per_kg, undefined);
});

test("強制重抓時 state 會記錄最新的抓取結果", async function () {
  const fetcher = useRows([raw({ "交易日期": "1151027" })]);
  await getPrices("species_id=grouper&region=高雄市");

  const state = repository.getState(mapping.code);
  assert.equal(fetcher.calls, 1);
  assert.equal(state.last_status, "ok");
  assert.equal(state.last_trade_date, "2026-10-27");
  assert.ok(state.last_checked_at);
});
