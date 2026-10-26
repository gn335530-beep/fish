/* 行情查詢 API（基本）：縣市／全國加權、台斤換算、日期語意與公開存取。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop } = require("./client");
const repository = require("../lib/market/repository");
const fetchService = require("../lib/market/fetch");
const upstream = require("../lib/market/upstream");
const { raw, useRows, resetMarket, getPrices } = require("./market-test-helpers");

test.before(start);
test.after(stop);
test.beforeEach(resetMarket);

test("縣市有資料時以交易量加權，回 city 與正確台斤價", async function () {
  useRows([
    raw({ "市場名稱": "岡山", "平均價": 1000, "交易量": 10 }),
    raw({ "市場名稱": "高雄", "平均價": 2000, "交易量": 30 }),
    raw({ "市場名稱": "台北", "平均價": 500, "交易量": 100 })
  ]);
  const res = await getPrices("species_id=grouper&region=高雄市");
  assert.equal(res.status, 200);
  const data = res.body.data;
  assert.equal(data.found, true);
  assert.equal(data.scope, "city");
  assert.equal(data.region, "高雄市");
  assert.equal(data.trade_date, "2026-10-22");
  assert.equal(data.price_per_kg, 1750);
  assert.equal(data.price_per_taijin, 1050);
  assert.equal(data.is_aquaculture, false);
  assert.equal(data.source, "農業部漁產品交易行情");
  assert.equal(data.quality, "official");
  assert.ok(data.source_url);
  assert.ok(data.fetched_at);
  assert.equal(data.history, undefined);
});

test("1237 元／公斤換算為 742.2 元／台斤", async function () {
  useRows([raw({ "平均價": 1237, "交易量": 1 })]);
  const res = await getPrices("species_id=grouper&region=高雄市");
  assert.equal(res.body.data.price_per_kg, 1237);
  assert.equal(res.body.data.price_per_taijin, 742.2);
});

test("縣市無資料退回全國平均，仍保留請求縣市", async function () {
  useRows([
    raw({ "市場名稱": "岡山", "平均價": 1000, "交易量": 10 }),
    raw({ "市場名稱": "高雄", "平均價": 2000, "交易量": 30 }),
    raw({ "市場名稱": "台北", "平均價": 500, "交易量": 100 })
  ]);
  const res = await getPrices("species_id=grouper&region=澎湖縣");
  const data = res.body.data;
  assert.equal(data.scope, "national");
  assert.equal(data.region, "澎湖縣");
  assert.equal(data.price_per_kg, 857.1);
  assert.equal(data.price_per_taijin, 514.3);
});

test("省略縣市回全國平均，region 為 null", async function () {
  useRows([raw({ "平均價": 300, "交易量": 5 })]);
  const res = await getPrices("species_id=grouper");
  const data = res.body.data;
  assert.equal(data.scope, "national");
  assert.equal(data.region, null);
  assert.equal(data.price_per_kg, 300);
});

test("縣市加權只納入 verified 市場，全國平均納入未確認市場", async function () {
  useRows([
    raw({ "市場名稱": "新港", "平均價": 9999, "交易量": 1 }),
    raw({ "市場名稱": "台北", "平均價": 100, "交易量": 10 })
  ]);
  const res = await getPrices("species_id=grouper&region=台東縣");
  const data = res.body.data;
  assert.equal(data.scope, "national");
  assert.equal(data.region, "台東縣");
  assert.equal(data.price_per_kg, 999.9);
});

test("臺正規化為台，縣市比對不受異體字影響", async function () {
  useRows([raw({ "市場名稱": "台北", "平均價": 200, "交易量": 1 })]);
  const res = await getPrices("species_id=grouper&region=臺北市");
  assert.equal(res.body.data.scope, "city");
  assert.equal(res.body.data.region, "台北市");
});

test("指定日期取該日或之前最近交易日，回實際 trade_date", async function () {
  useRows([
    raw({ "交易日期": "1151020", "平均價": 100 }),
    raw({ "交易日期": "1151022", "平均價": 200 })
  ]);
  const res = await getPrices("species_id=grouper&region=高雄市&date=2026-10-21");
  assert.equal(res.status, 200);
  assert.equal(res.body.data.trade_date, "2026-10-20");
  assert.equal(res.body.data.price_per_kg, 100);
});

test("養殖魚種回 is_aquaculture true", async function () {
  useRows([raw({ "品種代碼": 1073, "魚貨名稱": "七星鱸", "平均價": 200 })]);
  const res = await getPrices("species_id=seabass&region=高雄市");
  assert.equal(res.body.data.is_aquaculture, true);
  assert.equal(res.body.data.price_per_kg, 200);
});

test("行情 API 公開，不需要 Token", async function () {
  useRows([raw()]);
  const res = await getPrices("species_id=grouper");
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test("上游失敗但有快取時回快取", async function () {
  useRows([raw({ "平均價": 456 })]);
  const first = await getPrices("species_id=grouper&region=高雄市");
  assert.equal(first.body.data.found, true);

  repository.saveState(2201, "grouper", {
    last_checked_at: new Date(Date.now() - fetchService.TTL_MS - 1000).toISOString(),
    last_latest_at: new Date(Date.now() - fetchService.TTL_MS - 1000).toISOString()
  });
  fetchService.resetCache();
  upstream.setFetcher(async function () { throw new Error("down"); });

  const res = await getPrices("species_id=grouper&region=高雄市");
  assert.equal(res.body.data.found, true);
  assert.equal(res.body.data.price_per_kg, 456);
  assert.equal(repository.allPrices().length, 1);
});
