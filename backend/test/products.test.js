/* 商品建立：不寫行情快照、自由文字處理方式與移除示意行情。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call } = require("./client");
const { raw, useRows, resetMarket } = require("./market-test-helpers");
const { create } = require("./product-helpers");

test.before(start);
test.after(stop);
test.beforeEach(resetMarket);

test("上架商品不寫入行情快照，也不呼叫行情上游", async function () {
  const fetcher = useRows([raw({ "平均價": 1237, "交易量": 1 })]);
  const res = await create();

  assert.equal(res.status, 201);
  assert.equal("market_snapshot" in res.body.data, false);
  assert.equal(fetcher.calls, 0);
});

test("商品可帶官方 species_code，列表與詳情都回傳", async function () {
  const res = await create({ fish_species: "土魠", species_code: 2141 });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.species_code, 2141);
  assert.equal(res.body.data.species_id, "grouper");
  assert.ok(res.body.data.species_latin);

  const list = await call("GET", "/api/products");
  assert.equal(list.body.data.find(function (row) { return row.id === res.body.data.id; }).species_code, 2141);
  const detail = await call("GET", "/api/products/" + res.body.data.id);
  assert.equal(detail.body.data.species_code, 2141);
});

test("沒有 species_code 或代碼不合法時仍可建立，代碼為空", async function () {
  const missing = await create({ species_code: undefined });
  assert.equal(missing.status, 201);
  assert.equal(missing.body.data.species_code, null);

  const invalid = await create({ species_code: "石斑" });
  assert.equal(invalid.status, 201);
  assert.equal(invalid.body.data.species_code, null);

  const unknown = await create({ species_code: 999999 });
  assert.equal(unknown.status, 201);
  assert.equal(unknown.body.data.species_code, 999999);
});

test("商品改價不影響其他欄位", async function () {
  const created = await create();
  const id = created.body.data.id;

  const detail = await call("GET", "/api/products/" + id);
  assert.equal(detail.status, 200);
  assert.equal("market_snapshot" in detail.body.data, false);
});

test("未知魚種不呼叫行情 API，商品仍可建立", async function () {
  const fetcher = useRows([raw()]);
  const res = await create({ fish_species: "鮭魚", species_id: null, condition: "冷凍" });

  assert.equal(res.status, 201);
  assert.equal(fetcher.calls, 0);
  assert.equal("market_snapshot" in res.body.data, false);
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

  const product = await create();
  assert.equal(product.body.data.market_reference_price, undefined);
});
