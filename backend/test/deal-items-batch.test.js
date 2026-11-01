/* 批次加購：同賣家、可售量、草稿狀態與單一系統訊息。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");

const seen = {};

async function initiate(productId, quantity, token) {
  return call("POST", "/api/deals/initiate-channel", {
    token: token || tokens.buyer,
    body: { product_id: productId, quantity: quantity }
  });
}

function batch(items, token) {
  return call("POST", "/api/deals/items/batch", {
    token: token || tokens.buyer,
    body: { deal_id: seen.deal, items: items }
  });
}

async function messagesOf() {
  const result = await call("GET", "/api/conversations/" + seen.conv + "/messages?limit=100", {
    token: tokens.buyer
  });
  return result.body.data;
}

test.before(start);
test.after(stop);

test("買家可一次加購多個同賣家商品，只留一則系統訊息", async function () {
  const room = await initiate("prd_a", 1);
  seen.deal = room.body.data.deal.id;
  seen.conv = room.body.data.conversation.id;
  const before = (await messagesOf()).filter(function (message) {
    return message.type === "system" && message.text.indexOf("加入訂單草稿") !== -1;
  }).length;

  const result = await batch([
    { product_id: "prd_a", quantity: 1 },
    { product_id: "prd_b", quantity: 2 }
  ]);
  assert.equal(result.status, 201);
  const items = result.body.data.deal.items;
  assert.equal(items.length, 2);
  const a = items.find(function (item) { return item.product_id === "prd_a"; });
  const b = items.find(function (item) { return item.product_id === "prd_b"; });
  assert.equal(a.quantity, 2);
  assert.equal(b.quantity, 2);
  assert.equal(a.fish_species, "石斑");
  assert.equal(b.fish_species, "黑鯛");
  assert.ok(Object.prototype.hasOwnProperty.call(a, "price_per_taijin"));

  const after = (await messagesOf()).filter(function (message) {
    return message.type === "system" && message.text.indexOf("加入訂單草稿") !== -1;
  }).length;
  assert.equal(after, before + 1);
});

test("不同賣家的商品不能批次加入", async function () {
  const result = await batch([{ product_id: "prd_c", quantity: 1 }]);
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "WRONG_SELLER");
});

test("批次加購超過可售量會被整批拒絕", async function () {
  const result = await batch([{ product_id: "prd_b", quantity: 1 }]);
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "INSUFFICIENT_QUANTITY");
});

test("批次加購需要至少一個項目", async function () {
  const result = await batch([]);
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "MISSING_ITEMS");
});

test("釣客不能批次加購", async function () {
  const result = await batch([{ product_id: "prd_b", quantity: 1 }], tokens.seller);
  assert.equal(result.status, 403);
});

test("送出協議後不能再批次加購", async function () {
  const result = await call("POST", "/api/deals/propose", {
    token: tokens.buyer,
    body: {
      deal_id: seen.deal,
      final_price: 4000,
      meetup_location: "基隆火車站",
      meetup_time: "2026-10-26T17:30:00+08:00"
    }
  });
  assert.equal(result.status, 200);

  const denied = await batch([{ product_id: "prd_b", quantity: 1 }]);
  assert.equal(denied.status, 409);
  assert.equal(denied.body.code, "INVALID_DEAL_STATUS");
});
