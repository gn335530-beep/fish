/* 雙向評價：評價卡、星等重算、重複評價、未到次數與黑名單。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { initiate, propose, respond, messagesOf } = require("./deal-helpers");
const { patch } = require("../lib/store");

const seen = {};

async function confirm(productId, quantity) {
  const room = await initiate(productId, quantity, tokens.buyer);
  const dealId = room.body.data.deal.id;
  await propose(dealId, tokens.buyer);
  await respond(dealId, "AGREE", tokens.seller);
  return dealId;
}

function submit(dealId, token, payload) {
  return call("POST", "/api/reviews/submit", {
    token: token,
    body: Object.assign({ deal_id: dealId }, payload)
  });
}

async function reviewCard(conversationId, dealId, token) {
  const messages = await messagesOf(conversationId, token);
  return messages.filter(function (message) {
    return message.card && message.card.type === "review"
      && message.card.deal_id === dealId;
  }).pop();
}

test.after(stop);

test.before(async function () {
  await start();
  const room = await initiate("prd_a", 1, tokens.buyer);
  seen.dealA = room.body.data.deal.id;
  seen.convA = room.body.data.conversation.id;
  await propose(seen.dealA, tokens.buyer);
  await respond(seen.dealA, "AGREE", tokens.seller);
});

test("成交後交易房出現評價卡", async function () {
  const card = await reviewCard(seen.convA, seen.dealA, tokens.buyer);
  assert.ok(card);
  assert.equal(card.card.buyer_reviewed, false);
  assert.equal(card.card.seller_reviewed, false);
});

test("公開列表用實際評價計算，不採信舊的星等數字", async function () {
  patch("users", 1, { rating_score: 4.9, review_count: 18 });

  const list = await call("GET", "/api/reviews?user_id=1");
  assert.equal(list.status, 200);
  assert.equal(list.body.data.rating_score, 0);
  assert.equal(list.body.data.review_count, 0);
  assert.deepEqual(list.body.data.reviews, []);
});

test("買家評價後重算釣客星等，公開列表看得到", async function () {
  const result = await submit(seen.dealA, tokens.buyer, {
    rating: 5,
    tags: ["準時守約", "魚貨新鮮"],
    comment: "魚很新鮮，準時到"
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.data.review.target_user_id, 1);
  assert.equal(result.body.data.target.rating_score, 5);
  assert.equal(result.body.data.target.review_count, 1);

  const card = await reviewCard(seen.convA, seen.dealA, tokens.buyer);
  assert.equal(card.card.buyer_reviewed, true);
  assert.equal(card.card.seller_reviewed, false);

  const list = await call("GET", "/api/reviews?user_id=1&limit=10");
  assert.equal(list.status, 200);
  assert.equal(list.body.data.review_count, 1);
  assert.equal(list.body.data.rating_score, 5);
  assert.equal(list.body.data.reviews[0].rating, 5);
  assert.equal(list.body.data.reviews[0].reviewer_name, "買家乙");
  assert.equal(JSON.stringify(list.body.data).indexOf("0922222222"), -1);
});

test("同一人對同一筆訂單不能重複評價", async function () {
  const result = await submit(seen.dealA, tokens.buyer, { rating: 4, tags: [] });
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "ALREADY_REVIEWED");

  const me = await call("GET", "/api/auth/me", { token: tokens.seller });
  assert.equal(me.body.data.review_count, 1);
});

test("釣客也可以評價買家", async function () {
  const result = await submit(seen.dealA, tokens.seller, {
    rating: 4,
    tags: ["溝通良好"],
    comment: "面交準時"
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.data.target.rating_score, 4);
  assert.equal(result.body.data.target.review_count, 1);

  const card = await reviewCard(seen.convA, seen.dealA, tokens.buyer);
  assert.equal(card.card.buyer_reviewed, true);
  assert.equal(card.card.seller_reviewed, true);
});

test("星等、標籤與評語都有上限", async function () {
  const dealB = await confirm("prd_b", 1);

  const badRating = await submit(dealB, tokens.buyer, { rating: 0, tags: [] });
  assert.equal(badRating.status, 400);
  assert.equal(badRating.body.code, "INVALID_RATING");

  const tooMany = await submit(dealB, tokens.buyer, {
    rating: 5, tags: ["準時守約", "魚貨新鮮", "溝通良好", "包裝完善"]
  });
  assert.equal(tooMany.status, 400);
  assert.equal(tooMany.body.code, "TOO_MANY_TAGS");

  const unknown = await submit(dealB, tokens.buyer, { rating: 5, tags: ["不存在"] });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.code, "INVALID_TAGS");

  const longComment = await submit(dealB, tokens.buyer, {
    rating: 5, tags: [], comment: "好".repeat(101)
  });
  assert.equal(longComment.status, 400);
  assert.equal(longComment.body.code, "COMMENT_TOO_LONG");

  const ok = await submit(dealB, tokens.buyer, { rating: 1, tags: ["臨時放鳥"] });
  assert.equal(ok.status, 201);
});

test("未成交的訂單不能評價", async function () {
  const room = await initiate("prd_c", 1, tokens.third);
  const dealId = room.body.data.deal.id;
  await propose(dealId, tokens.third);

  const result = await submit(dealId, tokens.third, { rating: 5, tags: [] });
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "DEAL_NOT_CONFIRMED");
});

test("非參與者不能評價", async function () {
  const result = await submit(seen.dealA, tokens.otherSeller, { rating: 5, tags: [] });
  assert.equal(result.status, 403);
});

test("三次臨時放鳥後列入黑名單", async function () {
  const dealC = await confirm("prd_a", 1);
  await submit(dealC, tokens.buyer, { rating: 1, tags: ["臨時放鳥"] });

  const dealD = await confirm("prd_b", 1);
  const last = await submit(dealD, tokens.buyer, { rating: 1, tags: ["臨時放鳥"] });
  assert.equal(last.status, 201);

  const seller = await call("GET", "/api/auth/me", { token: tokens.seller });
  assert.equal(seller.body.data.no_show_count, 3);
  assert.equal(seller.body.data.is_blacklisted, true);
  assert.equal(seller.body.data.review_count, 4);
  assert.equal(seller.body.data.rating_score, 2);

  const list = await call("GET", "/api/reviews?user_id=1&limit=10");
  assert.equal(list.body.data.reviews.length, 4);
  assert.ok(list.body.data.reviews[0].created_at >= list.body.data.reviews[1].created_at);
});
