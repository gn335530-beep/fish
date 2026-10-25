/* 協議回應：同意成交、退回協商、重送與取消。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { initiate, propose, respond, cancel, messagesOf } = require("./deal-helpers");

const seen = {};

test.after(stop);

test.before(async function () {
  await start();

  const roomA = await initiate("prd_a", 1, tokens.buyer);
  seen.dealA = roomA.body.data.deal.id;
  seen.convA = roomA.body.data.conversation.id;
  await propose(seen.dealA, tokens.buyer);

  const roomB = await initiate("prd_b", 2, tokens.third);
  seen.dealB = roomB.body.data.deal.id;
  seen.convB = roomB.body.data.conversation.id;
  await propose(seen.dealB, tokens.third);

  const roomC = await initiate("prd_c", 1, tokens.third);
  seen.dealC = roomC.body.data.deal.id;
  seen.convC = roomC.body.data.conversation.id;
  await propose(seen.dealC, tokens.third);
});

test("回應動作只接受 AGREE 或 REJECT", async function () {
  const result = await respond(seen.dealA, "MAYBE", tokens.seller);
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "INVALID_ACTION");
});

test("發起方不能同意自己的協議", async function () {
  const result = await respond(seen.dealA, "AGREE", tokens.buyer);
  assert.equal(result.status, 403);
});

test("非參與者不能回應協議", async function () {
  const result = await respond(seen.dealA, "AGREE", tokens.otherSeller);
  assert.equal(result.status, 403);
});

test("對方同意後成交：已售、完成數與協議卡都更新", async function () {
  const result = await respond(seen.dealA, "AGREE", tokens.seller);
  assert.equal(result.status, 200);
  assert.equal(result.body.data.deal.deal_status, "CONFIRMED");
  assert.equal(result.body.data.deal.buyer_confirmed, true);
  assert.equal(result.body.data.deal.seller_confirmed, true);
  assert.ok(result.body.data.deal.confirmed_at);

  const product = await call("GET", "/api/products/prd_a", { token: tokens.buyer });
  assert.equal(product.body.data.sold_quantity, 1);
  assert.equal(product.body.data.reserved_quantity, 0);
  assert.equal(product.body.data.available, 1);
  assert.equal(product.body.data.status, "ACTIVE");

  const messages = await messagesOf(seen.convA, tokens.buyer);
  assert.ok(messages.some(function (message) {
    return message.type === "system" && message.text.indexOf("交易成立") !== -1;
  }));
  const card = messages.filter(function (message) {
    return message.card && message.card.deal_id === seen.dealA;
  }).pop();
  assert.equal(card.card.status, "confirmed");

  const me = await call("GET", "/api/auth/me", { token: tokens.buyer });
  assert.equal(me.body.data.completed_deals, 1);
  const seller = await call("GET", "/api/auth/me", { token: tokens.seller });
  assert.equal(seller.body.data.completed_deals, 1);
});

test("退回後進入協商中 15 分鐘，只有退回方能重送", async function () {
  const rejected = await respond(seen.dealB, "REJECT", tokens.seller);
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.data.deal.deal_status, "NEGOTIATING");
  assert.equal(rejected.body.data.deal.rejected_by, 1);
  const holdMinutes = (new Date(rejected.body.data.deal.hold_expires_at).getTime() - Date.now()) / 60000;
  assert.ok(holdMinutes > 14 && holdMinutes < 16);

  const messages = await messagesOf(seen.convB, tokens.third);
  const card = messages.filter(function (message) {
    return message.card && message.card.deal_id === seen.dealB;
  }).pop();
  assert.equal(card.card.status, "rejected");
  assert.ok(messages.some(function (message) {
    return message.type === "system" && message.text.indexOf("協議已退回") !== -1;
  }));

  const wrong = await propose(seen.dealB, tokens.third, { final_price: 2000 });
  assert.equal(wrong.status, 403);

  const resent = await propose(seen.dealB, tokens.seller, { final_price: 2000 });
  assert.equal(resent.status, 200);
  assert.equal(resent.body.data.deal.deal_status, "PENDING_REVIEW");
  assert.equal(resent.body.data.deal.initiator_id, 1);
  assert.equal(resent.body.data.deal.seller_confirmed, true);
  assert.equal(resent.body.data.deal.buyer_confirmed, false);
  assert.equal(resent.body.data.deal.deal_terms.final_price, 2000);
  assert.equal(resent.body.data.deal.rejected_by, null);

  const agreed = await respond(seen.dealB, "AGREE", tokens.third);
  assert.equal(agreed.status, 200);
  assert.equal(agreed.body.data.deal.deal_status, "CONFIRMED");

  const cards = (await messagesOf(seen.convB, tokens.third)).filter(function (message) {
    return message.card && message.card.deal_id === seen.dealB;
  });
  assert.equal(cards.length, 2);
  assert.equal(cards[0].card.status, "rejected");
  assert.equal(cards[1].card.status, "confirmed");

  const product = await call("GET", "/api/products/prd_b", { token: tokens.third });
  assert.equal(product.body.data.sold_quantity, 2);
  assert.equal(product.body.data.available, 0);

  const seller = await call("GET", "/api/auth/me", { token: tokens.seller });
  assert.equal(seller.body.data.completed_deals, 2);
  const third = await call("GET", "/api/auth/me", { token: tokens.third });
  assert.equal(third.body.data.completed_deals, 1);
});

test("取消要選原因，取消後立即釋放保留", async function () {
  const invalid = await cancel(seen.dealC, "WHATEVER", tokens.otherSeller);
  assert.equal(invalid.status, 400);
  assert.equal(invalid.body.code, "INVALID_CANCEL_REASON");

  const result = await cancel(seen.dealC, "SELLER_OUT_OF_STOCK", tokens.otherSeller);
  assert.equal(result.status, 200);
  assert.equal(result.body.data.deal.deal_status, "CANCELLED");
  assert.equal(result.body.data.deal.cancel_reason, "SELLER_OUT_OF_STOCK");
  assert.equal(result.body.data.deal.cancelled_by, 4);

  const product = await call("GET", "/api/products/prd_c", { token: tokens.third });
  assert.equal(product.body.data.reserved_quantity, 0);
  assert.equal(product.body.data.available, 1);

  const messages = await messagesOf(seen.convC, tokens.third);
  const card = messages.filter(function (message) {
    return message.card && message.card.deal_id === seen.dealC;
  }).pop();
  assert.equal(card.card.status, "cancelled");
  assert.ok(messages.some(function (message) {
    return message.type === "system" && message.text.indexOf("釣客缺貨") !== -1;
  }));
});

test("已結束的訂單不能再回應或取消", async function () {
  const again = await cancel(seen.dealC, "OTHER", tokens.third);
  assert.equal(again.status, 409);
  assert.equal(again.body.code, "INVALID_DEAL_STATUS");

  const confirmedCancel = await cancel(seen.dealA, "OTHER", tokens.buyer);
  assert.equal(confirmedCancel.status, 409);

  const confirmedAgree = await respond(seen.dealA, "AGREE", tokens.seller);
  assert.equal(confirmedAgree.status, 409);
});
