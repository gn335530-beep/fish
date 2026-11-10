/* 角色評價列表：role 篩選、offset／limit、summary／total／has_more 與隱私欄位。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call } = require("./client");
const { insert, patch } = require("../lib/store");

const SELLER_RATINGS = [5, 5, 4, 4, 3, 3, 5];
const BUYER_RATINGS = [4, 3];

function addReview(index, reviewerId, targetId, role, rating) {
  const day = String(10 + index).padStart(2, "0");
  insert("reviews", {
    id: "rev_role_" + String(index).padStart(3, "0"),
    deal_id: "deal_role_" + String(index).padStart(3, "0"),
    reviewer_id: reviewerId,
    target_user_id: targetId,
    reviewer_role: role,
    rating: rating,
    tags: ["準時守約"],
    comment: "角色評價 " + index,
    created_at: "2026-11-" + day + "T10:00:00.000Z"
  });
}

test.before(async function () {
  await start();
  patch("users", 2, { avatar_url: "/uploads/reviewer.jpg" });
  SELLER_RATINGS.forEach(function (rating, index) {
    addReview(index + 1, 2, 1, "buyer", rating);
  });
  BUYER_RATINGS.forEach(function (rating, index) {
    addReview(index + 20, 3, 1, "seller", rating);
  });
});

test.after(stop);

test("role=seller 只回買家給的評價，支援 limit 與 offset", async function () {
  const first = await call("GET", "/api/reviews?user_id=1&role=seller&offset=0&limit=3");
  assert.equal(first.status, 200);
  assert.equal(first.body.data.role, "seller");
  assert.deepEqual(first.body.data.summary.count, 7);
  assert.equal(first.body.data.summary.score, 4.1);
  assert.equal(first.body.data.total, 7);
  assert.equal(first.body.data.reviews.length, 3);
  assert.equal(first.body.data.has_more, true);
  assert.equal(first.body.data.reviews[0].reviewer_role, "buyer");
  assert.equal(first.body.data.reviews[0].reviewer_name, "買家乙");
  assert.equal(first.body.data.reviews[0].reviewer_avatar_url, "/uploads/reviewer.jpg");
  assert.equal(typeof first.body.data.reviews[0].reviewer_id, "number");

  const last = await call("GET", "/api/reviews?user_id=1&role=seller&offset=6&limit=3");
  assert.equal(last.body.data.reviews.length, 1);
  assert.equal(last.body.data.has_more, false);
});

test("role=buyer 只回釣客給的評價", async function () {
  const result = await call("GET", "/api/reviews?user_id=1&role=buyer&limit=10");
  assert.equal(result.status, 200);
  assert.equal(result.body.data.summary.count, 2);
  assert.equal(result.body.data.summary.score, 3.5);
  assert.equal(result.body.data.total, 2);
  assert.equal(result.body.data.reviews.length, 2);
  assert.equal(result.body.data.reviews.every(function (review) {
    return review.reviewer_role === "seller";
  }), true);
});

test("省略 role 保留整體評價與舊欄位", async function () {
  const result = await call("GET", "/api/reviews?user_id=1");
  assert.equal(result.status, 200);
  assert.equal(result.body.data.summary.count, 9);
  assert.equal(result.body.data.summary.score, 4);
  assert.equal(result.body.data.total, 9);
  assert.equal(result.body.data.rating_score, 4);
  assert.equal(result.body.data.review_count, 9);
  assert.equal(result.body.data.reviews.length, 9);
  assert.equal(result.body.data.has_more, false);
});

test("評價者只回名字、頭像與 id，不含電話或地址", async function () {
  const result = await call("GET", "/api/reviews?user_id=1&role=seller&limit=1");
  const text = JSON.stringify(result.body.data);
  assert.doesNotMatch(text, /username|password|address_line|display_address|0911111111|0922222222/);
  assert.deepEqual(Object.keys(result.body.data.reviews[0]).sort(), [
    "comment", "created_at", "id", "product_count", "products", "rating",
    "reviewer_avatar_url", "reviewer_id", "reviewer_name", "reviewer_role", "tags"
  ]);
  assert.deepEqual(result.body.data.reviews[0].products, []);
  assert.equal(result.body.data.reviews[0].product_count, 0);
});
