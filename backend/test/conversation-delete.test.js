/* 交易房刪除：草稿與進行中不可刪；全部取消且無成交才可連帶移除。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { initiate, propose, respond, cancel, messagesOf } = require("./deal-helpers");

async function roomOf(conversationId) {
  const list = await call("GET", "/api/conversations", { token: tokens.buyer });
  return list.body.data.find(function (room) { return room.id === conversationId; });
}

test.before(start);
test.after(stop);

test("有草稿訂單的交易房不可刪", async function () {
  const opened = await initiate("prd_a", 1, tokens.buyer);
  const conversation = opened.body.data.conversation;
  assert.equal(conversation.deletable, false);

  const removed = await call("DELETE", "/api/conversations/" + conversation.id, { token: tokens.buyer });
  assert.equal(removed.status, 409);
  assert.equal(removed.body.code, "DEAL_NOT_DELETABLE");
});

test("全部訂單取消後可刪，訊息、訂單與項目一起消失", async function () {
  const opened = await initiate("prd_a", 1, tokens.buyer);
  const conversationId = opened.body.data.conversation.id;
  const first = opened.body.data.deal.id;
  await cancel(first, "BUYER_CHANGED_MIND", tokens.buyer);

  const secondRoom = await initiate("prd_a", 1, tokens.buyer);
  const second = secondRoom.body.data.deal.id;
  await cancel(second, "TERMS_MISMATCH", tokens.buyer);

  const row = await roomOf(conversationId);
  assert.equal(row.deletable, true);

  const removed = await call("DELETE", "/api/conversations/" + conversationId, { token: tokens.buyer });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.data.deleted, true);

  const history = await call("GET", "/api/deals", { token: tokens.buyer });
  assert.equal(history.body.data.some(function (deal) { return deal.id === first || deal.id === second; }), false);

  const missing = await call("GET", "/api/conversations/" + conversationId + "/messages", { token: tokens.buyer });
  assert.equal(missing.status, 404);
});

test("有 CONFIRMED 訂單的交易房不可刪", async function () {
  const opened = await initiate("prd_b", 1, tokens.buyer);
  const conversationId = opened.body.data.conversation.id;
  const dealId = opened.body.data.deal.id;
  await propose(dealId, tokens.buyer);
  await respond(dealId, "AGREE", tokens.seller);

  const row = await roomOf(conversationId);
  assert.equal(row.deletable, false);

  const removed = await call("DELETE", "/api/conversations/" + conversationId, { token: tokens.buyer });
  assert.equal(removed.status, 409);
  assert.equal(removed.body.code, "DEAL_NOT_DELETABLE");
});

test("非參與者不能刪交易房", async function () {
  const opened = await initiate("prd_c", 1, tokens.third);
  const conversationId = opened.body.data.conversation.id;
  const removed = await call("DELETE", "/api/conversations/" + conversationId, { token: tokens.buyer });
  assert.equal(removed.status, 403);
  assert.equal(removed.body.code, "FORBIDDEN");
  const messages = await messagesOf(conversationId, tokens.third);
  assert.ok(messages.length > 0);
});
