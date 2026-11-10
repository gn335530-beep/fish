/* 種子評價：每筆評價對到已成交訂單，訂單項目有商品快照照片，會員信用數字一致。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { averageRating } = require("../lib/reviews");

const seed = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "db.seed.json"), "utf8")
);

function dealsById() {
  return new Map(seed.deals.map(function (deal) { return [String(deal.id), deal]; }));
}

function reviewsOf(userId) {
  return seed.reviews.filter(function (review) {
    return String(review.target_user_id) === String(userId);
  });
}

function roleRating(userId, reviewerRole) {
  return averageRating(reviewsOf(userId).filter(function (review) {
    return review.reviewer_role === reviewerRole;
  }));
}

function confirmedDealsOf(userId) {
  return seed.deals.filter(function (deal) {
    return deal.deal_status === "CONFIRMED"
      && (String(deal.buyer_id) === String(userId) || String(deal.seller_id) === String(userId));
  });
}

test("種子有 8 到 10 筆雙向評價，且每筆都對到已成交訂單", function () {
  assert.ok(seed.reviews.length >= 8 && seed.reviews.length <= 10);
  const roles = new Set(seed.reviews.map(function (review) { return review.reviewer_role; }));
  assert.deepEqual(Array.from(roles).sort(), ["buyer", "seller"]);

  const deals = dealsById();
  for (const review of seed.reviews) {
    const deal = deals.get(String(review.deal_id));
    assert.ok(deal, "評價 " + review.id + " 找不到訂單");
    assert.equal(deal.deal_status, "CONFIRMED");
    assert.equal(review.rating >= 3 && review.rating <= 5, true);
  }
});

test("訂單項目快照有照片、魚種與標題，評價卡可顯示", function () {
  for (const deal of seed.deals) {
    assert.ok(deal.items.length > 0, deal.id + " 沒有項目");
    for (const item of deal.items) {
      assert.ok(item.photo_url, deal.id + " 項目缺少照片");
      assert.ok(item.fish_species, deal.id + " 項目缺少魚種");
      assert.ok(item.title, deal.id + " 項目缺少標題");
    }
  }
});

test("使用者 1 與 2 有頭像，且信用數字由評價與訂單重算", function () {
  [1, 2].forEach(function (userId) {
    const user = seed.users.find(function (row) { return row.id === userId; });
    assert.match(user.avatar_url, /^\/uploads\//, "使用者 " + userId + " 頭像需為 /uploads/ 路徑");

    const overall = averageRating(reviewsOf(userId));
    assert.equal(user.rating_score, overall.score, "使用者 " + userId + " 整體評分不一致");
    assert.equal(user.review_count, overall.count, "使用者 " + userId + " 評價數不一致");
    assert.equal(user.completed_deals, confirmedDealsOf(userId).length,
      "使用者 " + userId + " 成交筆數不一致");
  });

  const sellerOne = roleRating(1, "buyer");
  const buyerOne = roleRating(1, "seller");
  assert.equal(sellerOne.count, 6);
  assert.equal(buyerOne.count, 1);
  assert.equal(roleRating(2, "seller").count, 2);
  assert.equal(roleRating(2, "buyer").count, 1);
});
