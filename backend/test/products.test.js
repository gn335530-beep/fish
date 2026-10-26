/* 商品建立：行情快照、自由文字處理方式與移除示意行情。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call } = require("./client");
const { raw, useRows, resetMarket } = require("./market-test-helpers");
const { patch } = require("../lib/store");
const upstream = require("../lib/market/upstream");
const { create } = require("./product-helpers");

test.before(start);
test.after(stop);
test.beforeEach(function () {
  resetMarket();
  useRows([]);
});

test("上架時依魚種與縣市寫入行情快照", async function () {
  useRows([raw({ "平均價": 1237, "交易量": 1 })]);
  const res = await create();
  assert.equal(res.status, 201);
  const snapshot = res.body.data.market_snapshot;
  assert.ok(snapshot);
  assert.equal(snapshot.scope, "city");
  assert.equal(snapshot.region, "高雄市");
  assert.equal(snapshot.trade_date, "2026-10-22");
  assert.equal(snapshot.price_per_kg, 1237);
  assert.equal(snapshot.price_per_taijin, 742.2);
  assert.equal(snapshot.is_aquaculture, false);
  assert.equal(snapshot.source, "農業部漁產品交易行情");
  assert.ok(snapshot.source_url);
  assert.ok(snapshot.fetched_at);
  assert.equal(snapshot.quality, "official");
  assert.equal(res.body.data.market_reference_price, undefined);
});

test("商品改價不影響已寫入的行情快照", async function () {
  useRows([raw({ "平均價": 1237, "交易量": 1 })]);
  const created = await create();
  const id = created.body.data.id;
  patch("products", id, { price: 2000 });

  const detail = await call("GET", "/api/products/" + id);
  assert.equal(detail.body.data.price, 2000);
  assert.equal(detail.body.data.market_snapshot.price_per_kg, 1237);
  assert.equal(detail.body.data.market_snapshot.price_per_taijin, 742.2);
});

test("查無行情或上游失敗仍可上架，快照為 null", async function () {
  useRows([]);
  const empty = await create();
  assert.equal(empty.status, 201);
  assert.equal(empty.body.data.market_snapshot, null);

  upstream.setFetcher(async function () { throw new Error("down"); });
  const failed = await create({ fish_species: "花枝", species_id: "cuttlefish" });
  assert.equal(failed.status, 201);
  assert.equal(failed.body.data.market_snapshot, null);
});

test("未知魚種不呼叫行情 API，快照為 null", async function () {
  let calls = 0;
  upstream.setFetcher(async function () {
    calls += 1;
    return { ok: true, json: async function () { return []; } };
  });
  const res = await create({ fish_species: "鮭魚", species_id: null, condition: "冷凍" });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.market_snapshot, null);
  assert.equal(calls, 0);
});

test("處理方式接受任何非空、20 字以內的自由文字", async function () {
  const cold = await create({ condition: "冷凍" });
  assert.equal(cold.status, 201);
  assert.equal(cold.body.data.condition, "冷凍");
  assert.match(cold.body.data.title, /冷凍/);

  const rawText = await create({ condition: "活魚" });
  assert.equal(rawText.status, 201);
  assert.equal(rawText.body.data.condition, "活魚");

  const custom = await create({ condition: "自行處理" });
  assert.equal(custom.status, 201);
  assert.equal(custom.body.data.condition, "自行處理");
});

test("處理方式空白或超過 20 字會回對應錯誤碼", async function () {
  const empty = await create({ condition: "  " });
  assert.equal(empty.status, 400);
  assert.equal(empty.body.code, "MISSING_CONDITION");

  const tooLong = await create({ condition: "處".repeat(21) });
  assert.equal(tooLong.status, 400);
  assert.equal(tooLong.body.code, "FIELD_TOO_LONG");
});

test("魚種 API 與商品不再帶示意行情", async function () {
  const species = await call("GET", "/api/species");
  assert.equal(species.status, 200);
  assert.ok(species.body.data.length > 0);
  assert.equal(species.body.data.some(function (row) { return "market" in row; }), false);

  useRows([raw()]);
  const product = await create();
  assert.equal(product.body.data.market_reference_price, undefined);
});
