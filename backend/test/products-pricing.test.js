/* 商品售價：整批／每台斤組合、自動計算與訂單金額。 */

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

test("只填每台斤時由後端計算整批並標自動計算", async function () {
  const res = await create({
    weight_kg: 4.5,
    quantity: 1,
    price: undefined,
    price_per_taijin: 200
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.price, 1500);
  assert.equal(res.body.data.price_per_taijin, 200);
  assert.equal(res.body.data.price_auto, true);
  assert.equal(res.body.data.unit_price, 1500);
});

test("兩者都填時都保留、可為折扣且不自動計算", async function () {
  const res = await create({
    weight_kg: 4.5,
    quantity: 1,
    price: 1000,
    price_per_taijin: 200
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.price, 1000);
  assert.equal(res.body.data.price_per_taijin, 200);
  assert.equal(res.body.data.price_auto, false);
});

test("兩個售價都沒填、或填了非正數，回對應錯誤碼", async function () {
  const missing = await create({ price: undefined, price_per_taijin: undefined });
  assert.equal(missing.status, 400);
  assert.equal(missing.body.code, "MISSING_PRICE");

  const zeroPrice = await create({ price: 0 });
  assert.equal(zeroPrice.status, 400);
  assert.equal(zeroPrice.body.code, "INVALID_PRICE");

  const zeroPerTaijin = await create({ price: undefined, price_per_taijin: 0 });
  assert.equal(zeroPerTaijin.status, 400);
  assert.equal(zeroPerTaijin.body.code, "INVALID_PRICE");
});

test("明確整批價保留小數，不四捨五入", async function () {
  const created = await create({ weight_kg: 4.5, quantity: 1, price: 999.5 });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.price, 999.5);
  assert.equal(created.body.data.price_auto, false);

  const detail = await call("GET", "/api/products/" + created.body.data.id);
  assert.equal(detail.body.data.price, 999.5);
});

test("自動計算使用未進位的原始總重", async function () {
  const created = await create({
    weight_kg: 4.55,
    quantity: 1,
    price: undefined,
    price_per_taijin: 200
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.price, 1517);
  assert.equal(created.body.data.price_auto, true);
  assert.equal(created.body.data.weight_kg, 4.6);
});

test("商品標題完整保留處理方式原句", async function () {
  const created = await create({ condition: "放血後冰鎮" });
  assert.equal(created.status, 201);
  assert.match(created.body.data.title, /放血後冰鎮/);
});

test("商品卡與詳情回應含 price、price_per_taijin、price_auto、unit_price", async function () {
  const created = await create({ weight_kg: 4.5, quantity: 2, price: undefined, price_per_taijin: 200 });
  const detail = await call("GET", "/api/products/" + created.body.data.id);
  for (const field of ["price", "price_per_taijin", "price_auto", "unit_price"]) {
    assert.ok(Object.prototype.hasOwnProperty.call(detail.body.data, field), field);
  }
  assert.equal(detail.body.data.price, 1500);
  assert.equal(detail.body.data.price_per_taijin, 200);
  assert.equal(detail.body.data.price_auto, true);
  assert.equal(detail.body.data.unit_price, 750);
});

test("訂單項目沿用整批售價換算的每尾均價", async function () {
  const created = await create({ weight_kg: 4.5, quantity: 2, price: undefined, price_per_taijin: 200 });
  const room = await call("POST", "/api/deals/initiate-channel", {
    token: tokens.buyer,
    body: { product_id: created.body.data.id, quantity: 2 }
  });
  assert.equal(room.status, 200);
  assert.equal(room.body.data.deal.items[0].unit_price, 750);
  assert.equal(room.body.data.deal.items_total, 1500);
});

test("買完整批時訂單小計等於整批售價", async function () {
  const created = await create({ weight_kg: 4.5, quantity: 3, price: 1000 });
  const room = await call("POST", "/api/deals/initiate-channel", {
    token: tokens.third,
    body: { product_id: created.body.data.id, quantity: 3 }
  });
  assert.equal(room.status, 200);
  assert.equal(room.body.data.deal.items_total, 1000);
});
