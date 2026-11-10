/* 交易房 peer 評價：依目前使用者的交易角色回傳角色評價，不混用整體平均。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { insert } = require("../lib/store");
const { recomputeUser } = require("../lib/reviews");

const seen = {};

function addReview(id, reviewerId, targetId, role, rating) {
  insert("reviews", {
    id: id,
    deal_id: "deal_peer_" + id,
    reviewer_id: reviewerId,
    target_user_id: targetId,
    reviewer_role: role,
    rating: rating,
    tags: [],
    comment: "",
    created_at: "2026-11-10T10:00:00.000Z"
  });
}

test.before(async function () {
  await start();
  const room = await call("POST", "/api/deals/initiate-channel", {
    token: tokens.buyer,
    body: { product_id: "prd_a", quantity: 1 }
  });
  seen.deal = room.body.data.deal.id;
  seen.conversation = room.body.data.conversation.id;

  addReview("as_seller", 2, 1, "buyer", 5);
  addReview("as_buyer", 3, 1, "seller", 1);
  addReview("only_overall", 3, 2, "buyer", 4);
  addReview("chat_overall", 2, 3, "seller", 3);
  recomputeUser(1);
  recomputeUser(2);
  recomputeUser(3);
});

test.after(stop);

test("買家看到的對方是釣客，使用買家給的評價", async function () {
  const result = await call("GET", "/api/deals/" + seen.deal, { token: tokens.buyer });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.peer.id, 1);
  assert.equal(result.body.data.peer.rating_score, 5);
  assert.equal(result.body.data.peer.review_count, 1);
  assert.equal(result.body.data.peer.username, "0911111111");
});

test("釣客看到的對方是買家；角色 0 則不退回整體平均", async function () {
  const result = await call("GET", "/api/deals/" + seen.deal, { token: tokens.seller });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.peer.id, 2);
  assert.equal(result.body.data.peer.rating_score, 0);
  assert.equal(result.body.data.peer.review_count, 0);

  const me = await call("GET", "/api/auth/me", { token: tokens.buyer });
  assert.equal(me.body.data.rating_score, 4);
  assert.equal(me.body.data.review_count, 1);
});

test("交易紀錄列表的 peer 維持整體評價，只有交易房明細用角色評價", async function () {
  const list = await call("GET", "/api/deals", { token: tokens.buyer });
  const row = list.body.data.find(function (deal) { return deal.id === seen.deal; });
  assert.equal(row.peer.id, 1);
  assert.equal(row.peer.rating_score, 3);
  assert.equal(row.peer.review_count, 2);
});

test("純聊天房沒有訂單，對話摘要維持整體評價", async function () {
  const room = await call("POST", "/api/deals/initiate-room", {
    token: tokens.buyer,
    body: { seller_id: 3 }
  });
  assert.equal(room.body.data.deal, null);

  const list = await call("GET", "/api/conversations", { token: tokens.buyer });
  const chat = list.body.data.find(function (row) {
    return row.id === room.body.data.conversation.id;
  });
  assert.equal(chat.peer.id, 3);
  assert.equal(chat.peer.rating_score, 3);
  assert.equal(chat.peer.review_count, 1);
});
