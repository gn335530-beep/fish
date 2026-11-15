/* 聊天室窗刪除：未成交資料清除；已成交訂單與評價保留，房間直接移除。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { initiate, propose, respond, messagesOf } = require("./deal-helpers");
const store = require("../lib/store");

const seen = {};

async function roomOf(conversationId, token) {
  const list = await call("GET", "/api/conversations", { token: token });
  return list.body.data.find(function (room) { return room.id === conversationId; });
}

function submitReview(dealId, token, payload) {
  return call("POST", "/api/reviews/submit", {
    token: token,
    body: Object.assign({ deal_id: dealId }, payload)
  });
}

async function confirm(productId, quantity) {
  const opened = await initiate(productId, quantity, tokens.buyer);
  const dealId = opened.body.data.deal.id;
  await propose(dealId, tokens.buyer);
  await respond(dealId, "AGREE", tokens.seller);
  return { conversation: opened.body.data.conversation, dealId: dealId };
}

test.before(start);
test.after(stop);

test("沒有成交的房間可刪，訂單、訊息與保留尾數一起消失", async function () {
  const opened = await initiate("prd_a", 1, tokens.buyer);
  const conversation = opened.body.data.conversation;
  const dealId = opened.body.data.deal.id;
  await propose(dealId, tokens.buyer);
  assert.equal((await roomOf(conversation.id, tokens.buyer)).deletable, true);

  const before = await call("GET", "/api/products/prd_a");
  assert.equal(before.body.data.available, 1);

  const removed = await call("DELETE", "/api/conversations/" + conversation.id, { token: tokens.buyer });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.data.deleted, true);
  assert.equal(removed.body.data.kept_orders, 0);

  assert.equal(await roomOf(conversation.id, tokens.buyer), undefined);
  const messages = await call("GET", "/api/conversations/" + conversation.id + "/messages", {
    token: tokens.buyer
  });
  assert.equal(messages.status, 404);

  const history = await call("GET", "/api/deals", { token: tokens.buyer });
  assert.equal(history.body.data.some(function (deal) { return deal.id === dealId; }), false);

  const after = await call("GET", "/api/products/prd_a");
  assert.equal(after.body.data.available, 2);
});

test("已成交房間可刪，交易紀錄、評價、已售量與成交數保留", async function () {
  const confirmed = await confirm("prd_b", 1);
  const reviewed = await submitReview(confirmed.dealId, tokens.buyer, { rating: 5, tags: [] });
  assert.equal(reviewed.status, 201);
  assert.equal((await roomOf(confirmed.conversation.id, tokens.buyer)).deletable, true);

  const removed = await call("DELETE", "/api/conversations/" + confirmed.conversation.id, {
    token: tokens.buyer
  });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.data.kept_orders, 1);

  assert.equal(await roomOf(confirmed.conversation.id, tokens.buyer), undefined);
  const messages = await call("GET", "/api/conversations/" + confirmed.conversation.id + "/messages", {
    token: tokens.buyer
  });
  assert.equal(messages.status, 404);

  const history = await call("GET", "/api/deals", { token: tokens.buyer });
  assert.equal(history.body.data.some(function (deal) { return deal.id === confirmed.dealId; }), true);

  const detail = await call("GET", "/api/deals/" + confirmed.dealId, { token: tokens.buyer });
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.review_status.buyer_reviewed, true);

  const product = await call("GET", "/api/products/prd_b");
  assert.equal(product.body.data.sold_quantity, 1);

  const seller = await call("GET", "/api/users/1");
  assert.equal(seller.body.data.completed_deals, 1);
  assert.equal(seller.body.data.rating.overall.count, 1);

  const reviews = await call("GET", "/api/reviews?user_id=1");
  assert.equal(reviews.body.data.total, 1);
});

test("房間刪除後仍可評價，不會嘗試寫入不存在的聊天室", async function () {
  const confirmed = await confirm("prd_a", 1);
  const removed = await call("DELETE", "/api/conversations/" + confirmed.conversation.id, {
    token: tokens.buyer
  });
  assert.equal(removed.status, 200);

  const submitted = await submitReview(confirmed.dealId, tokens.seller, { rating: 4, tags: [] });
  assert.equal(submitted.status, 201);

  const detail = await call("GET", "/api/deals/" + confirmed.dealId, { token: tokens.seller });
  assert.equal(detail.body.data.review_status.seller_reviewed, true);
});

test("混合房間只保留已成交訂單，未成交草稿刪除並釋放尾數", async function () {
  const confirmed = await confirm("prd_b", 1);
  const draftRoom = await initiate("prd_a", 1, tokens.buyer);
  const draftId = draftRoom.body.data.deal.id;
  assert.equal(draftRoom.body.data.conversation.id, confirmed.conversation.id);
  seen.oldRoomId = confirmed.conversation.id;
  seen.keptDealId = confirmed.dealId;

  const removed = await call("DELETE", "/api/conversations/" + confirmed.conversation.id, {
    token: tokens.buyer
  });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.data.kept_orders, 1);

  const history = await call("GET", "/api/deals", { token: tokens.buyer });
  assert.equal(history.body.data.some(function (deal) { return deal.id === confirmed.dealId; }), true);
  assert.equal(history.body.data.some(function (deal) { return deal.id === draftId; }), false);

  const product = await call("GET", "/api/products/prd_a");
  assert.equal(product.body.data.available, 1);
});

test("刪除後再開交易會建立新房間，舊成交紀錄仍在", async function () {
  const opened = await initiate("prd_a", 1, tokens.buyer);
  const conversation = opened.body.data.conversation;
  assert.notEqual(conversation.id, seen.oldRoomId);
  assert.ok(await roomOf(conversation.id, tokens.buyer));
  assert.ok((await messagesOf(conversation.id, tokens.buyer)).length > 0);

  const history = await call("GET", "/api/deals", { token: tokens.buyer });
  assert.equal(history.body.data.some(function (deal) { return deal.id === seen.keptDealId; }), true);
});

test("非參與者不能刪交易房", async function () {
  const opened = await initiate("prd_c", 1, tokens.third);
  const conversationId = opened.body.data.conversation.id;
  seen.thirdRoomId = conversationId;
  const removed = await call("DELETE", "/api/conversations/" + conversationId, { token: tokens.buyer });
  assert.equal(removed.status, 403);
  assert.equal(removed.body.code, "FORBIDDEN");
  const messages = await messagesOf(conversationId, tokens.third);
  assert.ok(messages.length > 0);
});

test("刪除舊房間後，新房間 ID 不會重用舊序號", async function () {
  const base = seen.thirdRoomId.slice(0, seen.thirdRoomId.lastIndexOf("_") + 1);
  const oldId = base + "900";
  const now = new Date().toISOString();
  store.insert("conversations", {
    id: oldId,
    type: "deal",
    user_ids: [2, 4],
    buyer_id: 2,
    seller_id: 4,
    mode: "HUMAN",
    context: null,
    archived: false,
    read_at: {},
    created_at: now,
    last_message_at: now
  });

  const removed = await call("DELETE", "/api/conversations/" + oldId, { token: tokens.buyer });
  assert.equal(removed.status, 200);

  const opened = await initiate("prd_c", 1, tokens.buyer);
  const conversationId = opened.body.data.conversation.id;
  assert.equal(conversationId, base + "901");
});
