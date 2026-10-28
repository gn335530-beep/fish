/* 行情查詢 API（歷史與錯誤）：7／30 交易日序列、查無資料與參數契約。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call } = require("./client");
const { addDays } = require("../lib/market/dates");
const { raw, useRows, resetMarket, seedGrouperCatalog, getPrices, priceFields, upstream } = require("./market-test-helpers");

test.before(start);
test.after(stop);
test.beforeEach(function () {
  resetMarket();
  seedGrouperCatalog();
});

test("include=history 回最近 N 個有交易的日期，依日期升冪", async function () {
  const rows = [];
  for (let i = 39; i >= 0; i -= 1) {
    rows.push(raw({
      "交易日期": "115" + addDays("2026-10-22", -i).slice(5).replace("-", ""),
      "平均價": 100 + (39 - i),
      "交易量": 1
    }));
  }
  useRows(rows);

  const res = await getPrices("code=2201&region=高雄市&date=2026-10-22&include=history&days=30");
  const history = res.body.data.history;
  assert.equal(history.length, 30);
  assert.equal(history[0].trade_date, "2026-09-23");
  assert.equal(history[history.length - 1].trade_date, "2026-10-22");
  assert.ok(history[0].trade_date < history[1].trade_date);
  assert.equal(typeof history[0].price_per_kg, "number");
  assert.equal(typeof history[0].price_per_taijin, "number");

  const seven = await getPrices("code=2201&region=高雄市&date=2026-10-22&include=history&days=7");
  assert.equal(seven.body.data.history.length, 7);
});

test("查無交易資料回 NO_TRADE_DATA，且不得帶價格欄位", async function () {
  useRows([]);
  const res = await getPrices("code=2201&region=高雄市");
  assert.equal(res.status, 200);
  const data = res.body.data;
  assert.equal(data.found, false);
  assert.equal(data.reason, "NO_TRADE_DATA");
  assert.deepEqual(priceFields(data), [undefined, undefined]);
});

test("上游失敗且無快取回 UPSTREAM_UNAVAILABLE", async function () {
  upstream.setFetcher(async function () { throw new Error("down"); });
  const res = await getPrices("code=2201&region=高雄市");
  assert.equal(res.status, 200);
  assert.equal(res.body.data.found, false);
  assert.equal(res.body.data.reason, "UPSTREAM_UNAVAILABLE");
  assert.deepEqual(priceFields(res.body.data), [undefined, undefined]);
});

test("官方字典沒有的代碼回 SPECIES_NOT_FOUND", async function () {
  const res = await getPrices("code=9999");
  assert.equal(res.status, 404);
  assert.equal(res.body.code, "SPECIES_NOT_FOUND");
});

test("參數錯誤：缺少代碼、無效縣市、日期格式", async function () {
  const speciesError = await getPrices("region=高雄市");
  assert.equal(speciesError.status, 400);
  assert.equal(speciesError.body.code, "INVALID_SPECIES");

  const regionError = await getPrices("code=2201&region=火星市");
  assert.equal(regionError.status, 400);
  assert.equal(regionError.body.code, "INVALID_REGION");

  const dateError = await getPrices("code=2201&date=2026-13-01");
  assert.equal(dateError.status, 400);
  assert.equal(dateError.body.code, "INVALID_DATE");
});

test("沒有 summary 端點", async function () {
  const res = await call("GET", "/api/market/summary?code=2201");
  assert.equal(res.status, 404);
});
