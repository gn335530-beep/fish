/* 商品下架與重新上架：狀態、公開可見性、訂單副作用與退回邊界。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { initiate, propose, respond, messagesOf } = require("./deal-helpers");
const { patch } = require("../lib/store");
const {
  resetLifecycleData, createProduct, delist, relist
} = require("./product-lifecycle-helpers");

test.before(start);
test.after(stop);
test.beforeEach(resetLifecycleData);

function cardsOf(messages, dealId) {
  return messages.filter(function (message) {
    return message.card && message.card.type === "deal" && message.card.deal_id === dealId;
  });
}

test("下架 ACTIVE 商品：公開列表消失、上架紀錄保留、可售歸零", async function () {
  const product = await createProduct({ quantity: 2 });
  const result = await delist(product.id);

  assert.equal(result.status, 200);
  assert.equal(result.body.data.product.status, "DELISTED");
  assert.equal(result.body.data.product.available, 0);
  assert.ok(result.body.data.product.delisted_at);
  assert.equal(result.body.data.cancelled_deals, 0);
  assert.equal(result.body.data.removed_drafts, 0);

  const list = await call("GET", "/api/products");
  assert.equal(list.body.data.some(function (row) { return row.id === product.id; }), false);
  const mine = await call("GET", "/api/products/mine", { token: tokens.seller });
  assert.equal(mine.body.data.find(function (row) { return row.id === product.id; }).status, "DELISTED");
});

test("下架時草稿移除、洽談中取消、等待確認照走", async function () {
  const product = await createProduct({ quantity: 3 });

  const pending = (await initiate(product.id, 1, tokens.buyer)).body.data;
  await propose(pending.deal.id, tokens.seller);

  const negotiating = (await initiate(product.id, 1, tokens.third)).body.data;
  await propose(negotiating.deal.id, tokens.third);
  const rejected = await respond(negotiating.deal.id, "REJECT", tokens.seller);
  assert.equal(rejected.body.data.deal.deal_status, "NEGOTIATING");

  const draft = (await initiate(product.id, 1, tokens.otherSeller)).body.data;
  const result = await delist(product.id);
  assert.equal(result.body.data.cancelled_deals, 1);
  assert.equal(result.body.data.removed_drafts, 1);

  const draftDeal = await call("GET", "/api/deals/" + draft.deal.id, { token: tokens.otherSeller });
  assert.deepEqual(draftDeal.body.data.items, []);
  assert.equal(draftDeal.body.data.items_total, 0);
  assert.ok((await messagesOf(draft.conversation.id, tokens.otherSeller)).some(function (message) {
    return message.text.indexOf("已下架，已從訂單草稿移除") !== -1;
  }));

  const cancelled = await call("GET", "/api/deals/" + negotiating.deal.id, { token: tokens.third });
  assert.equal(cancelled.body.data.deal_status, "CANCELLED");
  assert.equal(cancelled.body.data.cancel_reason, "OTHER");
  assert.equal(cancelled.body.data.cancel_note, "商品已下架");
  const cancelledCards = cardsOf(await messagesOf(negotiating.conversation.id, tokens.third), negotiating.deal.id);
  assert.equal(cancelledCards[cancelledCards.length - 1].card.status, "cancelled");
  assert.ok((await messagesOf(negotiating.conversation.id, tokens.third)).some(function (message) {
    return message.type === "system" && message.text === "商品已下架，協議已取消。";
  }));

  const stillPending = await call("GET", "/api/deals/" + pending.deal.id, { token: tokens.buyer });
  assert.equal(stillPending.body.data.deal_status, "PENDING_REVIEW");
  const agreed = await respond(pending.deal.id, "AGREE", tokens.buyer);
  assert.equal(agreed.body.data.deal.deal_status, "CONFIRMED");

  const detail = await call("GET", "/api/products/" + product.id);
  assert.equal(detail.body.data.status, "DELISTED");
  assert.equal(detail.body.data.available, 0);
  assert.equal(detail.body.data.sold_quantity, 1);
});

test("重複下架、已售出下架、非擁有者與未登入都被擋下", async function () {
  const product = await createProduct({ quantity: 1 });
  await delist(product.id);
  const again = await delist(product.id);
  assert.equal(again.status, 409);
  assert.equal(again.body.code, "PRODUCT_ALREADY_DELISTED");

  const sold = await createProduct({ quantity: 1 });
  const room = (await initiate(sold.id, 1, tokens.buyer)).body.data;
  await propose(room.deal.id, tokens.seller);
  await respond(room.deal.id, "AGREE", tokens.buyer);
  const soldOut = await delist(sold.id);
  assert.equal(soldOut.status, 409);
  assert.equal(soldOut.body.code, "PRODUCT_SOLD_OUT");

  const forbidden = await delist(product.id, tokens.otherSeller);
  assert.equal(forbidden.status, 403);
  const anonymous = await call("POST", "/api/products/" + product.id + "/delist");
  assert.equal(anonymous.status, 401);
});

test("已下架商品不能再開啟交易房或加購", async function () {
  const delistedProduct = await createProduct({ quantity: 2 });
  const other = await createProduct({ quantity: 1 });
  await delist(delistedProduct.id);

  const blocked = await initiate(delistedProduct.id, 1, tokens.buyer);
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.code, "PRODUCT_DELISTED");
  assert.match(blocked.body.message, /已下架，無法購買/);

  const draft = (await initiate(other.id, 1, tokens.buyer)).body.data;
  const add = await call("POST", "/api/deals/items", {
    token: tokens.buyer,
    body: { deal_id: draft.deal.id, product_id: delistedProduct.id, quantity: 1 }
  });
  assert.equal(add.status, 409);
  assert.equal(add.body.code, "PRODUCT_DELISTED");

  const detail = await call("GET", "/api/products/" + delistedProduct.id);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.status, "DELISTED");
});

test("已下架商品不能再送出協議", async function () {
  const product = await createProduct({ quantity: 1 });
  const room = (await initiate(product.id, 1, tokens.buyer)).body.data;
  patch("products", product.id, { delisted_at: new Date().toISOString() });

  const result = await propose(room.deal.id, tokens.buyer);
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "PRODUCT_DELISTED");
  assert.match(result.body.message, /已下架，無法送出協議/);
});

test("商品已下架時，買家退回待確認協議直接取消", async function () {
  const product = await createProduct({ quantity: 1 });
  const room = (await initiate(product.id, 1, tokens.buyer)).body.data;
  await propose(room.deal.id, tokens.seller);
  await delist(product.id);

  const result = await respond(room.deal.id, "REJECT", tokens.buyer);
  assert.equal(result.status, 200);
  assert.equal(result.body.data.deal.deal_status, "CANCELLED");
  assert.equal(result.body.data.deal.cancel_note, "商品已下架");

  const messages = await messagesOf(room.conversation.id, tokens.buyer);
  assert.ok(messages.some(function (message) {
    return message.type === "system" && message.text === "商品已下架，協議已取消。";
  }));
});

test("重新上架會清空下架時間、更新上架時間並回到公開列表最前面", async function () {
  const first = await createProduct({ quantity: 1 });
  await createProduct({ quantity: 1 });
  await delist(first.id);
  await new Promise(function (resolve) { setTimeout(resolve, 5); });

  const result = await relist(first.id);
  assert.equal(result.status, 200);
  assert.equal(result.body.data.product.status, "ACTIVE");
  assert.equal(result.body.data.product.delisted_at, null);
  assert.ok(result.body.data.product.listed_at >= first.listed_at);

  const list = await call("GET", "/api/products");
  assert.equal(list.body.data[0].id, first.id);
});

test("未下架不能重新上架；已無未售尾數也不能重新上架", async function () {
  const active = await createProduct({ quantity: 1 });
  const notDelisted = await relist(active.id);
  assert.equal(notDelisted.status, 409);
  assert.equal(notDelisted.body.code, "PRODUCT_NOT_DELISTED");

  const sold = await createProduct({ quantity: 2 });
  const room = (await initiate(sold.id, 2, tokens.buyer)).body.data;
  await propose(room.deal.id, tokens.seller);
  await delist(sold.id);
  await respond(room.deal.id, "AGREE", tokens.buyer);

  const noStock = await relist(sold.id);
  assert.equal(noStock.status, 409);
  assert.equal(noStock.body.code, "PRODUCT_HAS_NO_STOCK");
  assert.equal((await relist(sold.id, tokens.otherSeller)).status, 403);
  assert.equal((await call("POST", "/api/products/" + sold.id + "/relist")).status, 401);
});
