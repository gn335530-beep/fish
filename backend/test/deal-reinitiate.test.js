/* 重新發起協議：複製取消訂單、以可售量為上限、略過售完項目。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { initiate, propose, cancel, messagesOf } = require("./deal-helpers");
const { patch } = require("../lib/store");

const seen = {};

function reinitiate(dealId, token) {
  return call("POST", "/api/deals/reinitiate", {
    token: token || tokens.buyer,
    body: { deal_id: dealId }
  });
}

test.before(start);
test.after(stop);

test("取消後可建立新草稿，數量以目前可售為上限", async function () {
  const room = await initiate("prd_a", 2, tokens.buyer);
  seen.conv = room.body.data.conversation.id;
  const source = room.body.data.deal.id;
  seen.source = source;
  await propose(source, tokens.buyer);
  await cancel(source, "買家臨時有事", tokens.buyer);
  patch("products", "prd_a", { sold_quantity: 1 });

  const result = await reinitiate(source);
  assert.equal(result.status, 200);
  const deal = result.body.data.deal;
  assert.equal(deal.deal_status, "DRAFT");
  assert.notEqual(deal.id, source);
  assert.equal(deal.conversation_id, seen.conv);
  assert.equal(deal.items.length, 1);
  assert.equal(deal.items[0].quantity, 1);
  assert.equal(deal.items[0].fish_species, "石斑");

  const messages = await messagesOf(seen.conv, tokens.buyer);
  assert.ok(messages.some(function (message) {
    return message.type === "system" && message.text.indexOf("已重新發起交易") !== -1;
  }));

  const again = await reinitiate(source);
  assert.equal(again.status, 409);
  assert.equal(again.body.code, "DRAFT_EXISTS");
});

test("售完的項目會略過，只加入仍有可售的品項", async function () {
  const room = await initiate("prd_a", 1, tokens.third);
  const source = room.body.data.deal.id;
  await call("POST", "/api/deals/items/batch", {
    token: tokens.third,
    body: { deal_id: source, items: [{ product_id: "prd_b", quantity: 2 }] }
  });
  await propose(source, tokens.third);
  await cancel(source, "重新挑選", tokens.third);
  patch("products", "prd_b", { sold_quantity: 2 });

  const result = await reinitiate(source, tokens.third);
  assert.equal(result.status, 200);
  const deal = result.body.data.deal;
  assert.equal(deal.items.length, 1);
  assert.equal(deal.items[0].product_id, "prd_a");
  const messages = await messagesOf(room.body.data.conversation.id, tokens.third);
  assert.ok(messages.some(function (message) {
    return message.type === "system" && message.text.indexOf("略過") !== -1 &&
      message.text.indexOf("黑鯛") !== -1;
  }));
});

test("全部商品都售完時回沒有可重新發起的商品", async function () {
  const room = await initiate("prd_c", 1, tokens.buyer);
  const source = room.body.data.deal.id;
  await propose(source, tokens.buyer);
  await cancel(source, "取消了", tokens.buyer);
  patch("products", "prd_c", { sold_quantity: 1 });

  const result = await reinitiate(source, tokens.buyer);
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "NO_AVAILABLE_ITEMS");
  assert.equal(result.body.message, "目前沒有可重新發起的商品");
});

test("只有買家可以重新發起", async function () {
  const result = await reinitiate(seen.source, tokens.seller);
  assert.equal(result.status, 403);
  assert.equal(result.body.code, "FORBIDDEN");
});

test("只有已取消的訂單可以重新發起", async function () {
  const room = await initiate("prd_a", 1, tokens.otherSeller);
  const result = await reinitiate(room.body.data.deal.id, tokens.otherSeller);
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "INVALID_DEAL_STATUS");
});

test("逾時取消的訂單不能重新發起", async function () {
  patch("deals", seen.source, { cancel_reason: "LOCK_EXPIRED" });
  const result = await reinitiate(seen.source);
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "INVALID_DEAL_STATUS");
});
