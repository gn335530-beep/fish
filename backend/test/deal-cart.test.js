/* 購物車（訂單草稿）：逐項移除與改尾數不留訊息、釣客唯讀、空車不能送協議。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");

const seen = {};

async function messages() {
  const result = await call("GET", "/api/conversations/" + seen.conversation + "/messages?limit=100", {
    token: tokens.buyer
  });
  return result.body.data;
}

function systemCount(rows) {
  return rows.filter(function (message) { return message.type === "system"; }).length;
}

test.before(async function () {
  await start();
  const room = await call("POST", "/api/deals/initiate-channel", {
    token: tokens.buyer,
    body: { product_id: "prd_a", quantity: 1 }
  });
  seen.deal = room.body.data.deal.id;
  seen.conversation = room.body.data.conversation.id;
  seen.item = room.body.data.deal.items[0].item_id;
});

test.after(stop);

test("訂單回應標記對方目前是否有公開商品", async function () {
  const result = await call("GET", "/api/deals/" + seen.deal, { token: tokens.buyer });
  assert.equal(result.body.data.has_products, true);
});

test("改尾數與移除商品都不留系統訊息", async function () {
  const before = systemCount(await messages());

  const changed = await call("PATCH", "/api/deals/items/" + seen.item, {
    token: tokens.buyer,
    body: { deal_id: seen.deal, quantity: 2 }
  });
  assert.equal(changed.status, 200);
  assert.equal(systemCount(await messages()), before);

  const removed = await call("DELETE", "/api/deals/items/" + seen.item + "?deal_id=" + seen.deal, {
    token: tokens.buyer
  });
  assert.equal(removed.status, 200);
  assert.deepEqual(removed.body.data.deal.items, []);
  assert.equal(systemCount(await messages()), before);
});

test("加購（含批次）仍只留一則系統訊息", async function () {
  const before = systemCount(await messages());

  const added = await call("POST", "/api/deals/items/batch", {
    token: tokens.buyer,
    body: {
      deal_id: seen.deal,
      items: [{ product_id: "prd_a", quantity: 1 }, { product_id: "prd_b", quantity: 1 }]
    }
  });
  assert.equal(added.status, 201);
  assert.equal(added.body.data.deal.items.length, 2);
  assert.equal(systemCount(await messages()), before + 1);
});

test("釣客看得到購物車但不能改尾數或移除", async function () {
  const deal = (await call("GET", "/api/deals/" + seen.deal, { token: tokens.seller })).body.data;
  const item = deal.items[0];

  const patched = await call("PATCH", "/api/deals/items/" + item.item_id, {
    token: tokens.seller,
    body: { deal_id: seen.deal, quantity: 1 }
  });
  assert.equal(patched.status, 403);

  const removed = await call("DELETE", "/api/deals/items/" + item.item_id + "?deal_id=" + seen.deal, {
    token: tokens.seller
  });
  assert.equal(removed.status, 403);
});

test("草稿為空時不能發送交易", async function () {
  const deal = (await call("GET", "/api/deals/" + seen.deal, { token: tokens.buyer })).body.data;
  for (const item of deal.items) {
    await call("DELETE", "/api/deals/items/" + item.item_id + "?deal_id=" + seen.deal, {
      token: tokens.buyer
    });
  }

  const result = await call("POST", "/api/deals/propose", {
    token: tokens.buyer,
    body: {
      deal_id: seen.deal,
      final_price: 1000,
      meetup_location: "基隆火車站",
      meetup_time: "2026-11-11T17:30:00+08:00"
    }
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "EMPTY_DEAL");
});

test("對方商品全部下架後 has_products 為 false", async function () {
  const mine = await call("GET", "/api/products/mine", { token: tokens.seller });
  for (const product of mine.body.data) {
    await call("POST", "/api/products/" + product.id + "/delist", { token: tokens.seller });
  }

  const result = await call("GET", "/api/deals/" + seen.deal, { token: tokens.buyer });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.has_products, false);
});
