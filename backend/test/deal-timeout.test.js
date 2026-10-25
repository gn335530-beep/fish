/* 逾時掃描：讀對話清單或訂單時取消過期協議，且不重複寫入。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { initiate, propose, messagesOf } = require("./deal-helpers");
const { patch } = require("../lib/store");

const seen = {};
const PAST = "2020-01-01T00:00:00.000Z";

function countText(messages, text) {
  return messages.filter(function (message) {
    return message.type === "system" && message.text.indexOf(text) !== -1;
  }).length;
}

test.after(stop);

test.before(async function () {
  await start();

  const roomA = await initiate("prd_a", 1, tokens.buyer);
  seen.dealA = roomA.body.data.deal.id;
  seen.convA = roomA.body.data.conversation.id;
  await propose(seen.dealA, tokens.buyer);

  const roomB = await initiate("prd_b", 1, tokens.third);
  seen.dealB = roomB.body.data.deal.id;
  seen.convB = roomB.body.data.conversation.id;
  await propose(seen.dealB, tokens.third);
  await call("POST", "/api/deals/respond", {
    token: tokens.seller,
    body: { deal_id: seen.dealB, action: "REJECT" }
  });

  const roomC = await initiate("prd_c", 1, tokens.third);
  seen.dealC = roomC.body.data.deal.id;
  seen.convC = roomC.body.data.conversation.id;
  await propose(seen.dealC, tokens.third);
});

test("讀取對話清單會取消逾時的待回覆協議", async function () {
  patch("deals", seen.dealA, { lock_expires_at: PAST });

  const list = await call("GET", "/api/conversations", { token: tokens.buyer });
  const room = list.body.data.find(function (item) { return item.id === seen.convA; });
  assert.equal(room.order, null);

  const messages = await messagesOf(seen.convA, tokens.buyer);
  assert.equal(countText(messages, "逾時未回覆"), 1);
  const card = messages.filter(function (message) {
    return message.card && message.card.deal_id === seen.dealA;
  }).pop();
  assert.equal(card.card.status, "expired");

  const product = await call("GET", "/api/products/prd_a", { token: tokens.buyer });
  assert.equal(product.body.data.reserved_quantity, 0);
  assert.equal(product.body.data.available, 2);
});

test("重複讀取不會重複取消或重複寫入系統訊息", async function () {
  await call("GET", "/api/conversations", { token: tokens.buyer });
  await call("GET", "/api/conversations", { token: tokens.buyer });

  const messages = await messagesOf(seen.convA, tokens.buyer);
  assert.equal(countText(messages, "逾時未回覆"), 1);
});

test("讀取訂單會取消逾時的協商中訂單", async function () {
  patch("deals", seen.dealB, { hold_expires_at: PAST });

  const result = await call("GET", "/api/deals/" + seen.dealB, { token: tokens.third });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.deal_status, "CANCELLED");
  assert.equal(result.body.data.cancel_reason, "HOLD_EXPIRED");
  assert.equal(result.body.data.hold_expires_at, null);

  const messages = await messagesOf(seen.convB, tokens.third);
  assert.equal(countText(messages, "協商已逾時"), 1);
  const card = messages.filter(function (message) {
    return message.card && message.card.deal_id === seen.dealB;
  }).pop();
  assert.equal(card.card.status, "expired");

  const product = await call("GET", "/api/products/prd_b", { token: tokens.third });
  assert.equal(product.body.data.reserved_quantity, 0);
  assert.equal(product.body.data.available, 2);

  await call("GET", "/api/deals/" + seen.dealB, { token: tokens.third });
  const repeated = await messagesOf(seen.convB, tokens.third);
  assert.equal(countText(repeated, "協商已逾時"), 1);
});

test("還沒逾時的協議不受掃描影響", async function () {
  const list = await call("GET", "/api/conversations", { token: tokens.third });
  const room = list.body.data.find(function (item) { return item.id === seen.convC; });
  assert.ok(room);
  assert.equal(room.order.status, "PENDING_REVIEW");

  const deal = await call("GET", "/api/deals/" + seen.dealC, { token: tokens.third });
  assert.equal(deal.body.data.deal_status, "PENDING_REVIEW");
});

test("未經讀取也不能同意已逾時的協議", async function () {
  const room = await initiate("prd_a", 1, tokens.buyer);
  const dealId = room.body.data.deal.id;
  await propose(dealId, tokens.buyer, { final_price: 1300 });
  patch("deals", dealId, { lock_expires_at: PAST });

  const result = await call("POST", "/api/deals/respond", {
    token: tokens.seller,
    body: { deal_id: dealId, action: "AGREE" }
  });
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "INVALID_DEAL_STATUS");

  const deal = await call("GET", "/api/deals/" + dealId, { token: tokens.buyer });
  assert.equal(deal.body.data.deal_status, "CANCELLED");
  assert.equal(deal.body.data.cancel_reason, "LOCK_EXPIRED");
});
