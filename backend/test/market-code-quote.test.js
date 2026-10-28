/* 代碼查價與名稱整合查詢：代碼、官方名稱、多候選、無交易與上游失敗。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call } = require("./client");
const { raw, useRows, resetMarket, getPrices, priceFields } = require("./market-test-helpers");
const { seedCatalog, resetCatalog } = require("./market-catalog-helpers");
const upstream = require("../lib/market/upstream");

test.before(start);
test.after(stop);
test.beforeEach(function () {
  resetMarket();
  resetCatalog();
});

function getQuote(query) {
  return call("GET", "/api/market/quote?" + query);
}

function seedTuotuo() {
  seedCatalog([raw({ "品種代碼": 2141, "魚貨名稱": "土魠" })]);
}

const TUOTUO_PRICE = raw({
  "品種代碼": 2141,
  "魚貨名稱": "土魠",
  "市場名稱": "高雄",
  "平均價": 100,
  "交易量": 10
});

test("用代碼 2141 查價可取得行情、官方名稱與來源", async function () {
  seedTuotuo();
  useRows([TUOTUO_PRICE]);
  const res = await getPrices("code=2141&region=高雄市");
  assert.equal(res.status, 200);
  const data = res.body.data;
  assert.equal(data.found, true);
  assert.equal(data.species_code, 2141);
  assert.equal(data.official_name, "土魠");
  assert.equal(data.price_per_kg, 100);
  assert.equal(data.price_per_taijin, 60);
  assert.equal(data.trade_date, "2026-10-22");
  assert.ok(data.source);
  assert.equal(data.is_aquaculture, false);
});

test("用土魠魚加縣市查整合行情，直接取得同一筆結果", async function () {
  seedTuotuo();
  useRows([TUOTUO_PRICE]);
  const res = await getQuote("q=" + encodeURIComponent("土魠魚") + "&region=高雄市");
  assert.equal(res.status, 200);
  const data = res.body.data;
  assert.equal(data.species_code, 2141);
  assert.equal(data.official_name, "土魠");
  assert.equal(data.price_per_taijin, 60);
  assert.equal(data.scope, "city");
  assert.equal(data.region, "高雄市");
});

test("整合查詢遇到多候選時回 AMBIGUOUS_SPECIES 與候選清單", async function () {
  seedCatalog([
    raw({ "品種代碼": 2201, "魚貨名稱": "石斑魚" }),
    raw({ "品種代碼": 2202, "魚貨名稱": "龍膽石斑" })
  ]);
  const res = await getQuote("q=" + encodeURIComponent("石斑"));
  assert.equal(res.status, 409);
  assert.equal(res.body.code, "AMBIGUOUS_SPECIES");
  assert.deepEqual(res.body.candidates.map(function (row) {
    return row.species_code;
  }), [2201, 2202]);
});

test("有代碼但當日無交易時回 NO_TRADE_DATA 且不帶價格", async function () {
  seedTuotuo();
  useRows([]);
  const res = await getPrices("code=2141&region=高雄市");
  assert.equal(res.status, 200);
  const data = res.body.data;
  assert.equal(data.found, false);
  assert.equal(data.reason, "NO_TRADE_DATA");
  assert.equal(data.species_code, 2141);
  assert.equal(data.official_name, "土魠");
  assert.equal(data.is_aquaculture, false);
  assert.deepEqual(priceFields(data), [undefined, undefined]);
});

test("字典不可用且沒有舊對照時，代碼查價回 CATALOG_UNAVAILABLE", async function () {
  upstream.setFetcher(async function () { throw new Error("down"); });
  const res = await getPrices("code=2141");
  assert.equal(res.status, 503);
  assert.equal(res.body.code, "CATALOG_UNAVAILABLE");
});

test("上游失敗但本機有舊行情時回舊資料與實際交易日期", async function () {
  seedTuotuo();
  useRows([TUOTUO_PRICE]);
  const first = await getQuote("q=" + encodeURIComponent("土魠") + "&region=高雄市");
  assert.equal(first.body.data.found, true);

  upstream.setFetcher(async function () { throw new Error("down"); });
  const res = await getQuote("q=" + encodeURIComponent("土魠") + "&region=高雄市");
  assert.equal(res.status, 200);
  assert.equal(res.body.data.found, true);
  assert.equal(res.body.data.price_per_kg, 100);
  assert.equal(res.body.data.trade_date, "2026-10-22");
});

test("上游失敗且完全沒有行情時回 UPSTREAM_UNAVAILABLE", async function () {
  seedTuotuo();
  upstream.setFetcher(async function () { throw new Error("down"); });
  const res = await getPrices("code=2141");
  assert.equal(res.status, 200);
  assert.equal(res.body.data.found, false);
  assert.equal(res.body.data.reason, "UPSTREAM_UNAVAILABLE");
  assert.deepEqual(priceFields(res.body.data), [undefined, undefined]);
});

test("名稱查無代碼與代碼格式錯誤有明確錯誤碼", async function () {
  seedTuotuo();
  const missing = await getQuote("q=" + encodeURIComponent("不存在的魚"));
  assert.equal(missing.status, 404);
  assert.equal(missing.body.code, "SPECIES_NOT_FOUND");

  const badCode = await getPrices("code=abc");
  assert.equal(badCode.status, 400);
  assert.equal(badCode.body.code, "INVALID_SPECIES");
});
