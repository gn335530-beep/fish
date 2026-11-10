/* 評價列表：分布、排序、星等篩選與訂單商品照片快照。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call } = require("./client");
const { insert } = require("../lib/store");

const SELLER_RATINGS = [5, 4, 3, 5, 1];
const BUYER_RATINGS = [2];

function addReview(id, reviewerId, role, rating, day) {
  insert("reviews", {
    id: id,
    deal_id: "deal_" + id,
    reviewer_id: reviewerId,
    target_user_id: 1,
    reviewer_role: role,
    rating: rating,
    tags: ["準時守約"],
    comment: "評價 " + id,
    created_at: "2026-11-" + day + "T10:00:00.000Z"
  });
}

function addDeal(id, items) {
  insert("deals", {
    id: id,
    conversation_id: "conv_" + id,
    buyer_id: 2,
    seller_id: 1,
    items: items,
    deal_status: "CONFIRMED",
    created_at: "2026-11-01T10:00:00.000Z"
  });
}

test.before(async function () {
  await start();
  SELLER_RATINGS.forEach(function (rating, index) {
    addReview("rev_list_" + index, 2, "buyer", rating, String(index + 1).padStart(2, "0"));
  });
  BUYER_RATINGS.forEach(function (rating, index) {
    addReview("rev_list_buyer_" + index, 3, "seller", rating, "20");
  });

  addDeal("deal_rev_list_3", [
    { item_id: "itm_01", product_id: "prd_a", title: "石斑（2尾 / 活體）", fish_species: "石斑", photo_url: "/uploads/a.jpg", quantity: 1 },
    { item_id: "itm_02", product_id: "prd_b", title: "黑鯛（2尾 / 活體）", fish_species: "黑鯛", photo_url: "/uploads/b.jpg", quantity: 1 },
    { item_id: "itm_03", product_id: "prd_c", title: "花枝（1尾 / 活體）", fish_species: "花枝", photo_url: "/uploads/c.jpg", quantity: 1 },
    { item_id: "itm_04", product_id: "prd_d", title: "嘉鱲（2尾 / 活體）", fish_species: "嘉鱲", photo_url: "/uploads/d.jpg", quantity: 1 }
  ]);
});

test.after(stop);

test("角色摘要含 5→1 分布，星等篩選只影響列表與 total", async function () {
  const all = await call("GET", "/api/reviews?user_id=1&role=seller&limit=10");
  assert.equal(all.status, 200);
  assert.equal(all.body.data.summary.count, 5);
  assert.equal(all.body.data.summary.score, 3.6);
  assert.deepEqual(all.body.data.summary.distribution, { "5": 2, "4": 1, "3": 1, "2": 0, "1": 1 });
  assert.equal(all.body.data.total, 5);

  const five = await call("GET", "/api/reviews?user_id=1&role=seller&rating=5&limit=10");
  assert.equal(five.body.data.summary.count, 5);
  assert.deepEqual(five.body.data.summary.distribution, all.body.data.summary.distribution);
  assert.equal(five.body.data.total, 2);
  assert.equal(five.body.data.reviews.length, 2);
  assert.equal(five.body.data.reviews.every(function (review) {
    return review.rating === 5;
  }), true);
});

test("排序支援最新、最高與最低", async function () {
  const newest = await call("GET", "/api/reviews?user_id=1&role=seller&sort=newest&limit=10");
  assert.deepEqual(newest.body.data.reviews.map(function (review) {
    return review.rating;
  }), [1, 5, 3, 4, 5]);

  const highest = await call("GET", "/api/reviews?user_id=1&role=seller&sort=highest&limit=10");
  assert.deepEqual(highest.body.data.reviews.map(function (review) {
    return review.rating;
  }), [5, 5, 4, 3, 1]);

  const lowest = await call("GET", "/api/reviews?user_id=1&role=seller&sort=lowest&limit=10");
  assert.deepEqual(lowest.body.data.reviews.map(function (review) {
    return review.rating;
  }), [1, 3, 4, 5, 5]);
});

test("offset 與 limit 以篩選後的列表計算 has_more", async function () {
  const page = await call("GET", "/api/reviews?user_id=1&role=seller&sort=highest&offset=2&limit=2");
  assert.deepEqual(page.body.data.reviews.map(function (review) {
    return review.rating;
  }), [4, 3]);
  assert.equal(page.body.data.total, 5);
  assert.equal(page.body.data.has_more, true);

  const last = await call("GET", "/api/reviews?user_id=1&role=seller&rating=1&offset=1&limit=6");
  assert.equal(last.body.data.total, 1);
  assert.deepEqual(last.body.data.reviews, []);
  assert.equal(last.body.data.has_more, false);
});

test("評價帶出訂單項目快照照片，最多 3 筆並回 product_count", async function () {
  const result = await call("GET", "/api/reviews?user_id=1&role=seller&sort=highest&limit=10");
  const review = result.body.data.reviews[0];
  assert.equal(review.id, "rev_list_3");
  assert.equal(review.products.length, 3);
  assert.equal(review.product_count, 4);
  assert.deepEqual(review.products[0], {
    title: "石斑（2尾 / 活體）",
    fish_species: "石斑",
    photo_url: "/uploads/a.jpg"
  });
  assert.equal("address_line" in review, false);
  assert.doesNotMatch(JSON.stringify(review), /0922222222|0911111111/);
});

test("沒有訂單或項目的評價回空 products 陣列", async function () {
  const result = await call("GET", "/api/reviews?user_id=1&role=seller&sort=newest&limit=10");
  const review = result.body.data.reviews.find(function (row) {
    return row.id === "rev_list_0";
  });
  assert.deepEqual(review.products, []);
  assert.equal(review.product_count, 0);
});

test("role=buyer 的摘要與分布只計算釣客給的評價", async function () {
  const result = await call("GET", "/api/reviews?user_id=1&role=buyer&limit=10");
  assert.equal(result.body.data.summary.count, 1);
  assert.equal(result.body.data.summary.score, 2);
  assert.deepEqual(result.body.data.summary.distribution, { "5": 0, "4": 0, "3": 0, "2": 1, "1": 0 });
  assert.equal(result.body.data.reviews[0].reviewer_role, "seller");
});
