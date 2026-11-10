/* 公開個人資訊：欄位白名單、404 與依評價方向計算的角色評分。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const { initiate, propose, respond } = require("./deal-helpers");
const { patch } = require("../lib/store");

test.before(start);
test.after(stop);

async function confirm(productId, buyerToken, sellerToken) {
  const room = await initiate(productId, 1, buyerToken);
  const dealId = room.body.data.deal.id;
  await propose(dealId, buyerToken);
  await respond(dealId, "AGREE", sellerToken);
  return dealId;
}

async function review(dealId, token, rating) {
  return call("POST", "/api/reviews/submit", {
    token: token,
    body: { deal_id: dealId, rating: rating, tags: [], comment: "" }
  });
}

test("公開個人資訊只回白名單，並用評價計算角色評分", async function () {
  patch("users", 1, { rating_score: 4.9, review_count: 18 });

  const sellerDeal = await confirm("prd_a", tokens.buyer, tokens.seller);
  await review(sellerDeal, tokens.buyer, 5);
  await review(sellerDeal, tokens.seller, 4);

  const created = await call("POST", "/api/products/create", {
    token: tokens.buyer,
    body: {
      fish_species: "黑鯛",
      quantity: 1,
      condition: "活體",
      price: 700,
      photo_url: "/uploads/buyer-fish.jpg"
    }
  });
  const buyerDeal = await confirm(created.body.data.id, tokens.seller, tokens.buyer);
  await review(buyerDeal, tokens.seller, 5);
  await review(buyerDeal, tokens.buyer, 4);

  const result = await call("GET", "/api/users/1");
  assert.equal(result.status, 200);
  const data = result.body.data;
  assert.deepEqual(Object.keys(data).sort(), [
    "avatar_url", "completed_deals", "display_name", "id",
    "is_verified", "rating", "region"
  ]);
  assert.equal(data.display_name, "釣客甲");
  assert.equal(data.avatar_url, "");
  assert.equal(data.region, "新北市");
  assert.equal(data.completed_deals, 2);
  assert.deepEqual(data.rating, {
    overall: { score: 4.5, count: 2 },
    as_seller: { score: 5, count: 1 },
    as_buyer: { score: 4, count: 1 }
  });

  const peer = await call("GET", "/api/users/2");
  assert.equal(peer.body.data.rating.as_buyer.score, 4);
  assert.equal(peer.body.data.rating.as_seller.score, 5);
});

test("找不到使用者回 404 USER_NOT_FOUND", async function () {
  const missing = await call("GET", "/api/users/999");
  assert.equal(missing.status, 404);
  assert.equal(missing.body.code, "USER_NOT_FOUND");
});
