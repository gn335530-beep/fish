/* 商品售價：整批必填、每台斤選填、不再自動計算與訂單金額。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { useRows, resetMarket } = require("./market-test-helpers");
const { create } = require("./product-helpers");

test.before(start);
test.after(stop);
test.beforeEach(function () {
  resetMarket();
  useRows([]);
});

test("只填整批時每台斤為 null、不自動計算", async function () {
  const res = await create({ price: 1000, price_per_taijin: undefined });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.price, 1000);
  assert.equal(res.body.data.price_per_taijin, null);
  assert.equal(res.body.data.price_auto, false);
  assert.equal(res.body.data.unit_price, 1000);
});

test("重量可以省略，商品仍可建立", async function () {
  const res = await create({ weight_kg: undefined });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.weight_kg, null);
  assert.equal(res.body.data.price, 1000);
});

test("只填每台斤時回傳請提供整批售價", async function () {
  const res = await create({
    weight_kg: 4.5,
    quantity: 1,
    price: undefined,
    price_per_taijin: 200
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.code, "MISSING_PRICE");
  assert.equal(res.body.message, "請提供整批售價");
});

test("兩者都填時都保留、可為折扣且不自動計算", async function () {
  const res = await create({
    quantity: 1,
    price: 1000,
    price_per_taijin: 200
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.price, 1000);
  assert.equal(res.body.data.price_per_taijin, 200);
  assert.equal(res.body.data.price_auto, false);
});

test("整批價必填、非正數回對應錯誤碼", async function () {
  const missing = await create({ price: undefined, price_per_taijin: undefined });
  assert.equal(missing.status, 400);
  assert.equal(missing.body.code, "MISSING_PRICE");

  const zeroPrice = await create({ price: 0 });
  assert.equal(zeroPrice.status, 400);
  assert.equal(zeroPrice.body.code, "INVALID_PRICE");

  const zeroPerTaijin = await create({ price: 1000, price_per_taijin: 0 });
  assert.equal(zeroPerTaijin.status, 400);
  assert.equal(zeroPerTaijin.body.code, "INVALID_PRICE");
});

test("明確整批價保留小數，不四捨五入", async function () {
  const created = await create({ quantity: 1, price: 999.5 });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.price, 999.5);
  assert.equal(created.body.data.price_auto, false);

  const detail = await call("GET", "/api/products/" + created.body.data.id);
  assert.equal(detail.body.data.price, 999.5);
});

test("商品標題為魚種、尾數與處理方式，不含重量", async function () {
  const created = await create({
    fish_species: "花枝",
    quantity: 2,
    condition: "放血後冰鎮",
    weight_kg: 4.5
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.title, "花枝（2尾 / 放血後冰鎮）");
});

test("商品回應含 price、price_per_taijin、price_auto、unit_price", async function () {
  const created = await create({ quantity: 2, price: 1500, price_per_taijin: 200 });
  const detail = await call("GET", "/api/products/" + created.body.data.id);
  for (const field of ["price", "price_per_taijin", "price_auto", "unit_price"]) {
    assert.ok(Object.prototype.hasOwnProperty.call(detail.body.data, field), field);
  }
  assert.equal(detail.body.data.price, 1500);
  assert.equal(detail.body.data.price_per_taijin, 200);
  assert.equal(detail.body.data.price_auto, false);
  assert.equal(detail.body.data.unit_price, 750);
});

test("訂單項目使用整批售價換算的每尾均價", async function () {
  const created = await create({ quantity: 2, price: 1500, price_per_taijin: 200 });
  const room = await call("POST", "/api/deals/initiate-channel", {
    token: tokens.buyer,
    body: { product_id: created.body.data.id, quantity: 2 }
  });
  assert.equal(room.status, 200);
  assert.equal(room.body.data.deal.items[0].unit_price, 750);
  assert.equal(room.body.data.deal.items_total, 1500);
});

test("買完整批時訂單小計等於整批售價", async function () {
  const created = await create({ quantity: 3, price: 1000 });
  const room = await call("POST", "/api/deals/initiate-channel", {
    token: tokens.third,
    body: { product_id: created.body.data.id, quantity: 3 }
  });
  assert.equal(room.status, 200);
  assert.equal(room.body.data.deal.items_total, 1000);
});
