/* 取消核心：使用者取消與逾時取消共用狀態、保留釋放與卡片同步。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { initiate, propose, cancel, messagesOf } = require("./deal-helpers");
const { patch } = require("../lib/store");

const PAST = "2020-01-01T00:00:00.000Z";

function lastDealCard(messages, dealId) {
  return messages.filter(function (message) {
    return message.card && message.card.type === "deal" && message.card.deal_id === dealId;
  }).pop();
}

test.before(start);
test.after(stop);

test("使用者取消與逾時取消產生相同狀態與釋放，操作者與訊息不同", async function () {
  const userRoom = await initiate("prd_a", 1, tokens.buyer);
  const userDealId = userRoom.body.data.deal.id;
  await propose(userDealId, tokens.buyer);
  await cancel(userDealId, "TERMS_MISMATCH", tokens.buyer);

  const timedRoom = await initiate("prd_b", 1, tokens.third);
  const timedDealId = timedRoom.body.data.deal.id;
  await propose(timedDealId, tokens.third);
  patch("deals", timedDealId, { lock_expires_at: PAST });
  await call("GET", "/api/conversations", { token: tokens.third });

  const userDeal = (await call("GET", "/api/deals/" + userDealId, { token: tokens.buyer })).body.data;
  const timedDeal = (await call("GET", "/api/deals/" + timedDealId, { token: tokens.third })).body.data;
  assert.equal(userDeal.deal_status, "CANCELLED");
  assert.equal(timedDeal.deal_status, "CANCELLED");
  assert.equal(userDeal.lock_expires_at, null);
  assert.equal(timedDeal.lock_expires_at, null);
  assert.equal(userDeal.hold_expires_at, null);
  assert.equal(timedDeal.hold_expires_at, null);

  const userProduct = (await call("GET", "/api/products/prd_a", { token: tokens.buyer })).body.data;
  const timedProduct = (await call("GET", "/api/products/prd_b", { token: tokens.third })).body.data;
  assert.equal(userProduct.reserved_quantity, 0);
  assert.equal(timedProduct.reserved_quantity, 0);
  assert.equal(userProduct.available, 2);
  assert.equal(timedProduct.available, 2);

  const userMessages = await messagesOf(userRoom.body.data.conversation.id, tokens.buyer);
  const timedMessages = await messagesOf(timedRoom.body.data.conversation.id, tokens.third);
  assert.equal(lastDealCard(userMessages, userDealId).card.status, "cancelled");
  assert.equal(lastDealCard(timedMessages, timedDealId).card.status, "expired");

  assert.equal(userDeal.cancelled_by, 2);
  assert.equal(timedDeal.cancelled_by, "system");
  assert.ok(userMessages.some(function (message) {
    return message.type === "system" && message.text.indexOf("條件不合") !== -1;
  }));
  assert.ok(timedMessages.some(function (message) {
    return message.type === "system" && message.text.indexOf("逾時未回覆") !== -1;
  }));
});
