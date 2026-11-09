/* 商品生命週期（ticket 01/02）：公開可見性、上架時間與上架紀錄。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { setAll, all } = require("../lib/store");
const { normalizeProductData } = require("../lib/product-data");
const { create } = require("./product-helpers");

function product(id, overrides) {
  return Object.assign({
    id: id,
    seller_id: 1,
    title: "石斑（2尾 / 活體）",
    fish_species: "石斑",
    species_code: null,
    weight_kg: 2,
    quantity: 2,
    sold_quantity: 0,
    condition: "活體",
    photo_url: "/uploads/" + id + ".jpg",
    price: 1000,
    price_per_taijin: null,
    region: "新北市",
    location: "新北市瑞芳區",
    catch_time: "2026-10-25T05:00:00+08:00",
    created_at: "2026-10-25T05:00:00.000Z",
    listed_at: "2026-10-25T05:00:00.000Z",
    delisted_at: null
  }, overrides || {});
}

function seed(products, deals) {
  setAll("products", products);
  setAll("deals", deals || []);
}

test.before(start);
test.after(stop);

test("既有商品回填 listed_at 為 created_at", function () {
  seed([product("prd_old", { listed_at: undefined })]);
  normalizeProductData();

  const row = all("products")[0];
  assert.equal(row.created_at, "2026-10-25T05:00:00.000Z");
  assert.equal(row.listed_at, row.created_at);
  assert.equal(row.delisted_at, null);
});

test("公開列表只回 ACTIVE 與 PARTIALLY_RESERVED，單筆仍可讀其他狀態", async function () {
  seed([
    product("prd_active", { listed_at: "2026-10-25T01:00:00.000Z" }),
    product("prd_sold", { quantity: 1, sold_quantity: 1 }),
    product("prd_delisted", { delisted_at: "2026-10-26T00:00:00.000Z" }),
    product("prd_partial", { quantity: 2, sold_quantity: 1, listed_at: "2026-10-25T02:00:00.000Z" })
  ], [{
    id: "deal_active",
    buyer_id: 2,
    seller_id: 1,
    deal_status: "NEGOTIATING",
    items: [{ product_id: "prd_partial", quantity: 1 }]
  }]);

  const list = await call("GET", "/api/products");
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.data.map(function (row) { return row.id; }), [
    "prd_partial", "prd_active"
  ]);

  const sold = await call("GET", "/api/products/prd_sold");
  assert.equal(sold.status, 200);
  assert.equal(sold.body.data.status, "SOLD_OUT");
  assert.equal(sold.body.data.available, 0);

  const delisted = await call("GET", "/api/products/prd_delisted");
  assert.equal(delisted.status, 200);
  assert.equal(delisted.body.data.status, "DELISTED");
  assert.equal(delisted.body.data.available, 0);
  assert.equal(delisted.body.data.delisted_at, "2026-10-26T00:00:00.000Z");

  const hidden = await call("GET", "/api/products?status=DELISTED");
  assert.deepEqual(hidden.body.data, []);
});

test("公開列表用 listed_at 由新到舊排序，seller_id 只回公開商品", async function () {
  seed([
    product("prd_old", { listed_at: "2026-10-24T00:00:00.000Z" }),
    product("prd_new", { listed_at: "2026-10-26T00:00:00.000Z" }),
    product("prd_other", { seller_id: 4 }),
    product("prd_hidden", { delisted_at: "2026-10-26T00:00:00.000Z" })
  ]);

  const list = await call("GET", "/api/products?seller_id=1");
  assert.deepEqual(list.body.data.map(function (row) { return row.id; }), ["prd_new", "prd_old"]);
});

test("上架紀錄只回自己的商品，含四種狀態並依 listed_at 排序", async function () {
  seed([
    product("prd_delisted", { listed_at: "2026-10-24T00:00:00.000Z", delisted_at: "2026-10-25T00:00:00.000Z" }),
    product("prd_active", { listed_at: "2026-10-26T00:00:00.000Z" }),
    product("prd_sold", { quantity: 1, sold_quantity: 1, listed_at: "2026-10-25T00:00:00.000Z" }),
    product("prd_partial", { quantity: 2, sold_quantity: 1, listed_at: "2026-10-23T00:00:00.000Z" }),
    product("prd_other", { seller_id: 4 })
  ], [{
    id: "deal_active",
    buyer_id: 2,
    seller_id: 1,
    deal_status: "PENDING_REVIEW",
    items: [{ product_id: "prd_partial", quantity: 1 }]
  }]);

  const result = await call("GET", "/api/products/mine", { token: tokens.seller });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.data.map(function (row) { return row.id; }), [
    "prd_active", "prd_sold", "prd_delisted", "prd_partial"
  ]);
  assert.deepEqual(result.body.data.map(function (row) { return row.status; }), [
    "ACTIVE", "SOLD_OUT", "DELISTED", "PARTIALLY_RESERVED"
  ]);
  assert.ok(result.body.data.every(function (row) { return row.seller_id === 1; }));
  assert.equal(result.body.data[0].available, 2);
  assert.equal(result.body.data[2].available, 0);
});

test("未登入不能讀上架紀錄", async function () {
  const result = await call("GET", "/api/products/mine");
  assert.equal(result.status, 401);
});

test("建立商品時 listed_at 等於上架時間", async function () {
  seed([]);
  const result = await create();
  assert.equal(result.status, 201);
  assert.ok(Number.isFinite(Date.parse(result.body.data.listed_at)));
  assert.equal(result.body.data.delisted_at, null);
});
