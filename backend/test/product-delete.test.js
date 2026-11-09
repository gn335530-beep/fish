/* 商品刪除：資格、硬刪、訂單快照、草稿／洽談副作用與 ID 不重用。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { initiate, propose, respond, messagesOf } = require("./deal-helpers");
const { patch } = require("../lib/store");
const {
  resetLifecycleData, createProduct, delist, removeProduct
} = require("./product-lifecycle-helpers");

test.before(start);
test.after(stop);
test.beforeEach(resetLifecycleData);

function serialOf(id) {
  return Number(String(id).split("_").pop());
}

test("上架中或洽談中商品必須先下架才能刪除；非擁有者與未登入也被擋下", async function () {
  const product = await createProduct({ quantity: 2 });
  const blocked = await removeProduct(product.id);
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.code, "PRODUCT_MUST_BE_DELISTED");

  const room = (await initiate(product.id, 1, tokens.buyer)).body.data;
  await propose(room.deal.id, tokens.seller);
  const reserved = await removeProduct(product.id);
  assert.equal(reserved.status, 409);
  assert.equal(reserved.body.code, "PRODUCT_MUST_BE_DELISTED");

  const forbidden = await removeProduct(product.id, tokens.otherSeller);
  assert.equal(forbidden.status, 403);
  const anonymous = await call("DELETE", "/api/products/" + product.id);
  assert.equal(anonymous.status, 401);
});

test("已售出商品可直接刪除，商品消失但成交訂單快照保留", async function () {
  const product = await createProduct({ quantity: 1 });
  const room = (await initiate(product.id, 1, tokens.buyer)).body.data;
  await propose(room.deal.id, tokens.seller);
  await respond(room.deal.id, "AGREE", tokens.buyer);
  const review = await call("POST", "/api/reviews/submit", {
    token: tokens.buyer,
    body: { deal_id: room.deal.id, rating: 5, tags: ["魚貨新鮮"] }
  });
  assert.equal(review.status, 201);

  const result = await removeProduct(product.id);
  assert.equal(result.status, 200);
  assert.equal(result.body.data.product_id, product.id);

  const detail = await call("GET", "/api/products/" + product.id);
  assert.equal(detail.status, 404);
  assert.equal(detail.body.code, "PRODUCT_NOT_FOUND");
  const mine = await call("GET", "/api/products/mine", { token: tokens.seller });
  assert.deepEqual(mine.body.data, []);

  const deal = await call("GET", "/api/deals/" + room.deal.id, { token: tokens.buyer });
  assert.equal(deal.status, 200);
  assert.equal(deal.body.data.deal_status, "CONFIRMED");
  assert.equal(deal.body.data.items[0].title, product.title);
  assert.equal(deal.body.data.items[0].photo_url, product.photo_url);

  const reviews = await call("GET", "/api/reviews?user_id=" + product.seller_id);
  assert.equal(reviews.body.data.reviews.length, 1);
  assert.equal(reviews.body.data.reviews[0].rating, 5);
  assert.deepEqual(reviews.body.data.reviews[0].tags, ["魚貨新鮮"]);
});

test("刪除已下架商品後，等待確認的協議仍可成交", async function () {
  const product = await createProduct({ quantity: 2 });
  const room = (await initiate(product.id, 1, tokens.buyer)).body.data;
  await propose(room.deal.id, tokens.seller);
  await delist(product.id);

  const deleted = await removeProduct(product.id);
  assert.equal(deleted.status, 200);

  const agreed = await respond(room.deal.id, "AGREE", tokens.buyer);
  assert.equal(agreed.status, 200);
  assert.equal(agreed.body.data.deal.deal_status, "CONFIRMED");
});

test("刪除時草稿移除、洽談中取消、等待確認照走", async function () {
  const product = await createProduct({ quantity: 3 });

  const draft = (await initiate(product.id, 1, tokens.otherSeller)).body.data;
  const negotiating = (await initiate(product.id, 1, tokens.third)).body.data;
  await propose(negotiating.deal.id, tokens.third);
  await respond(negotiating.deal.id, "REJECT", tokens.seller);

  const pending = (await initiate(product.id, 1, tokens.buyer)).body.data;
  await propose(pending.deal.id, tokens.seller);

  patch("products", product.id, { delisted_at: new Date().toISOString() });
  const result = await removeProduct(product.id);
  assert.equal(result.body.data.removed_drafts, 1);
  assert.equal(result.body.data.cancelled_deals, 1);

  const draftDeal = await call("GET", "/api/deals/" + draft.deal.id, { token: tokens.otherSeller });
  assert.deepEqual(draftDeal.body.data.items, []);
  assert.ok((await messagesOf(draft.conversation.id, tokens.otherSeller)).some(function (message) {
    return message.text.indexOf("已刪除，已從訂單草稿移除") !== -1;
  }));

  const cancelled = await call("GET", "/api/deals/" + negotiating.deal.id, { token: tokens.third });
  assert.equal(cancelled.body.data.deal_status, "CANCELLED");
  assert.equal(cancelled.body.data.cancel_note, "商品已刪除");

  const stillPending = await call("GET", "/api/deals/" + pending.deal.id, { token: tokens.buyer });
  assert.equal(stillPending.body.data.deal_status, "PENDING_REVIEW");
});

test("商品已刪除時，買家退回待確認協議直接取消", async function () {
  const product = await createProduct({ quantity: 1 });
  const room = (await initiate(product.id, 1, tokens.buyer)).body.data;
  await propose(room.deal.id, tokens.seller);
  await delist(product.id);
  await removeProduct(product.id);

  const result = await respond(room.deal.id, "REJECT", tokens.buyer);
  assert.equal(result.status, 200);
  assert.equal(result.body.data.deal.deal_status, "CANCELLED");
  assert.equal(result.body.data.deal.cancel_note, "商品已刪除");

  const messages = await messagesOf(room.conversation.id, tokens.buyer);
  assert.ok(messages.some(function (message) {
    return message.type === "system" && message.text === "商品已刪除，協議已取消。";
  }));
});

test("刪除後商品 ID 不會被新商品重用", async function () {
  const first = await createProduct({ quantity: 1 });
  await delist(first.id);
  await removeProduct(first.id);

  const second = await createProduct({ quantity: 1 });
  assert.notEqual(second.id, first.id);
  assert.ok(serialOf(second.id) > serialOf(first.id));
});

test("已刪除商品不能再開啟交易房，單筆讀取回 404", async function () {
  const product = await createProduct({ quantity: 1 });
  await delist(product.id);
  await removeProduct(product.id);

  const blocked = await initiate(product.id, 1, tokens.buyer);
  assert.equal(blocked.status, 404);
  assert.equal(blocked.body.code, "PRODUCT_NOT_FOUND");
  assert.equal((await call("GET", "/api/products/" + product.id)).status, 404);
});
