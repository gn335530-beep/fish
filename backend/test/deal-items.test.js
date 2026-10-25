/* 訂單項目：加購、改尾數、刪除、清空與權限。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");

const seen = {};

function itemOf(deal, productId) {
  return deal.items.find(function (item) { return item.product_id === productId; });
}

async function addItem(productId, quantity, token) {
  return call("POST", "/api/deals/items", {
    token: token || tokens.buyer,
    body: { deal_id: seen.deal, product_id: productId, quantity: quantity }
  });
}

test.before(start);
test.after(stop);

test("買家可以加購同一釣客的另一個商品", async function () {
  const room = await call("POST", "/api/deals/initiate-channel", {
    token: tokens.buyer,
    body: { product_id: "prd_a", quantity: 1 }
  });
  seen.deal = room.body.data.deal.id;

  const result = await addItem("prd_b", 1);
  assert.equal(result.status, 201);
  assert.equal(result.body.data.deal.items.length, 2);
  assert.equal(result.body.data.deal.items_total, 2930);
});

test("不同釣客的商品不能加進同一筆訂單", async function () {
  const result = await addItem("prd_c", 1);
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "WRONG_SELLER");
});

test("釣客不能修改訂單內容", async function () {
  const result = await addItem("prd_b", 1, tokens.seller);
  assert.equal(result.status, 403);
});

test("買家可以把項目尾數改成可售範圍內", async function () {
  const deal = (await call("GET", "/api/deals/" + seen.deal, { token: tokens.buyer })).body.data;
  seen.item = itemOf(deal, "prd_a").item_id;

  const result = await call("PATCH", "/api/deals/items/" + seen.item, {
    token: tokens.buyer,
    body: { deal_id: seen.deal, quantity: 2 }
  });
  assert.equal(result.status, 200);
  assert.equal(itemOf(result.body.data.deal, "prd_a").quantity, 2);
  assert.equal(result.body.data.deal.items_total, 4330);
});

test("改尾數超過可售會被拒並保留原值", async function () {
  const result = await call("PATCH", "/api/deals/items/" + seen.item, {
    token: tokens.buyer,
    body: { deal_id: seen.deal, quantity: 3 }
  });
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "INSUFFICIENT_QUANTITY");
  assert.equal(result.body.available, 2);

  const deal = (await call("GET", "/api/deals/" + seen.deal, { token: tokens.buyer })).body.data;
  assert.equal(itemOf(deal, "prd_a").quantity, 2);
});

test("買家可以刪除單一項目", async function () {
  const deal = (await call("GET", "/api/deals/" + seen.deal, { token: tokens.buyer })).body.data;
  const item = itemOf(deal, "prd_b");

  const result = await call("DELETE", "/api/deals/items/" + item.item_id + "?deal_id=" + seen.deal, {
    token: tokens.buyer
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.deal.items.length, 1);
  assert.equal(result.body.data.deal.items_total, 2800);
});

test("買家可以清空整筆訂單", async function () {
  await addItem("prd_b", 1);
  const result = await call("DELETE", "/api/deals/items?deal_id=" + seen.deal, {
    token: tokens.buyer
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.deal.items.length, 0);
  assert.equal(result.body.data.deal.items_total, 0);
});

test("第三人不能讀取訂單", async function () {
  const result = await call("GET", "/api/deals/" + seen.deal, { token: tokens.third });
  assert.equal(result.status, 403);
  assert.equal(result.body.code, "FORBIDDEN");
});

test("沒有項目的草稿不能送出協議", async function () {
  const result = await call("POST", "/api/deals/propose", {
    token: tokens.buyer,
    body: {
      deal_id: seen.deal,
      final_price: 1000,
      meetup_location: "基隆火車站",
      meetup_time: "2026-10-25T17:30:00+08:00"
    }
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "EMPTY_DEAL");
});
