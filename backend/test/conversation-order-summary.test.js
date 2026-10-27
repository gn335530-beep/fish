/* 對話摘要：last_order 保留最新訂單（含已結束），供對方輪詢重取訂單。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { initiate, propose, respond } = require("./deal-helpers");

const seen = {};

function roomOf(result, roomId) {
  return result.body.data.find(function (item) { return item.id === roomId; });
}

test.before(async function () {
  await start();
  const room = await initiate("prd_a", 1, tokens.buyer);
  seen.dealId = room.body.data.deal.id;
  seen.convId = room.body.data.conversation.id;
});

test.after(stop);

test("草稿與待回覆時 order 與 last_order 都是同一筆", async function () {
  let list = await call("GET", "/api/conversations", { token: tokens.buyer });
  let room = roomOf(list, seen.convId);
  assert.equal(room.order.status, "DRAFT");
  assert.equal(room.last_order.id, seen.dealId);
  assert.equal(room.last_order.status, "DRAFT");

  await propose(seen.dealId, tokens.buyer);
  list = await call("GET", "/api/conversations", { token: tokens.seller });
  room = roomOf(list, seen.convId);
  assert.equal(room.order.status, "PENDING_REVIEW");
  assert.equal(room.last_order.status, "PENDING_REVIEW");
});

test("成交後 order 清空，last_order 仍保留最新狀態與更新時間", async function () {
  const before = await call("GET", "/api/conversations", { token: tokens.buyer });
  const beforeRoom = roomOf(before, seen.convId);

  await respond(seen.dealId, "AGREE", tokens.seller);
  const after = await call("GET", "/api/conversations", { token: tokens.buyer });
  const afterRoom = roomOf(after, seen.convId);

  assert.equal(afterRoom.order, null);
  assert.equal(afterRoom.last_order.id, seen.dealId);
  assert.equal(afterRoom.last_order.status, "CONFIRMED");
  assert.ok(afterRoom.last_order.updated_at >= beforeRoom.last_order.updated_at);
});

test("評價送出後 last_order.updated_at 會變，對方可據此重取訂單", async function () {
  const before = await call("GET", "/api/conversations", { token: tokens.seller });
  const beforeRoom = roomOf(before, seen.convId);

  const submitted = await call("POST", "/api/reviews/submit", {
    token: tokens.buyer,
    body: { deal_id: seen.dealId, rating: 5, tags: [] }
  });
  assert.equal(submitted.status, 201);

  const after = await call("GET", "/api/conversations", { token: tokens.seller });
  const afterRoom = roomOf(after, seen.convId);
  assert.equal(afterRoom.last_order.status, "CONFIRMED");
  assert.notEqual(afterRoom.last_order.updated_at, beforeRoom.last_order.updated_at);

  const reviewed = afterRoom.orders.find(function (row) { return row.id === seen.dealId; });
  assert.equal(reviewed.review_status.buyer_reviewed, true);
  assert.equal(reviewed.review_status.seller_reviewed, false);
});

test("沒有訂單的助手房 last_order 為 null", async function () {
  const room = await call("POST", "/api/conversations/assistant", { token: tokens.buyer });
  assert.equal(room.body.data.order, null);
  assert.equal(room.body.data.last_order, null);
  assert.deepEqual(room.body.data.orders, []);
});
