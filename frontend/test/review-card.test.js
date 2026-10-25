/* 評價卡：表單、星等、標籤上限與已評價狀態。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};

const { state, update } = await import("../assets/js/demo/store.js");
const cards = await import("../assets/js/demo/views/cards.js");
const reviews = await import("../assets/js/demo/deal-reviews.js");

function reviewCard(overrides) {
  return Object.assign({
    type: "review",
    deal_id: "deal_1",
    buyer_id: 2,
    seller_id: 1,
    buyer_reviewed: false,
    seller_reviewed: false
  }, overrides || {});
}

function reset(userId) {
  update({
    user: { id: userId },
    room: { id: "conv_1", type: "deal", order: { id: "deal_1", status: "CONFIRMED" } },
    deal: { id: "deal_1", deal_status: "CONFIRMED" },
    reviewDrafts: {}
  });
}

test("待評價時顯示星等、標籤與評語表單", function () {
  reset(2);
  const html = cards.renderCard(reviewCard());
  assert.match(html, /data-action="deal-review" data-deal="deal_1"/);
  assert.match(html, /data-review-deal="deal_1"/);
  assert.match(html, /data-review-field="rating"/);
  assert.match(html, /data-review-comment/);
  assert.match(html, /準時守約/);
  assert.match(html, /臨時放鳥/);
  assert.match(html, /<option value="5" selected>5 星<\/option>/);
});

test("星等與評語會留在 state", function () {
  reset(2);
  reviews.handleReviewField("deal_1", "rating", "3");
  reviews.handleReviewComment("deal_1", "魚很新鮮");
  assert.equal(state.reviewDrafts.deal_1.rating, 3);
  assert.equal(state.reviewDrafts.deal_1.comment, "魚很新鮮");

  const html = cards.renderCard(reviewCard());
  assert.match(html, /<option value="3" selected>3 星<\/option>/);
  assert.match(html, /魚很新鮮/);
});

test("最多只能選 3 個標籤", function () {
  const notices = [];
  let renders = 0;
  reviews.initDealReviews({
    notify: function (error) { notices.push(error.message); },
    render: function () { renders += 1; }
  });
  reset(2);

  reviews.handleReviewTag("deal_1", "準時守約", true);
  reviews.handleReviewTag("deal_1", "魚貨新鮮", true);
  reviews.handleReviewTag("deal_1", "溝通良好", true);
  reviews.handleReviewTag("deal_1", "包裝完善", true);

  assert.deepEqual(state.reviewDrafts.deal_1.tags, ["準時守約", "魚貨新鮮", "溝通良好"]);
  assert.deepEqual(notices, ["最多選 3 個標籤"]);
  assert.equal(renders, 1);

  reviews.handleReviewTag("deal_1", "魚貨新鮮", false);
  assert.deepEqual(state.reviewDrafts.deal_1.tags, ["準時守約", "溝通良好"]);
});

test("已評價後只顯示完成狀態，不再有表單", function () {
  reset(2);
  let html = cards.renderCard(reviewCard({ buyer_reviewed: true }));
  assert.match(html, /已評價/);
  assert.match(html, /等待對方評價/);
  assert.doesNotMatch(html, /deal-review/);

  html = cards.renderCard(reviewCard({ buyer_reviewed: true, seller_reviewed: true }));
  assert.match(html, /雙方都完成了/);
});

test("釣客看到的評價狀態以釣客身分判斷", function () {
  reset(1);
  const html = cards.renderCard(reviewCard({ buyer_reviewed: true }));
  assert.match(html, /data-action="deal-review"/);
});

test("點選 4 個標籤後重繪會還原成 state 的 3 個", function () {
  reviews.initDealReviews({
    notify: function () {},
    render: function () {}
  });
  reset(2);
  reviews.handleReviewTag("deal_1", "準時守約", true);
  reviews.handleReviewTag("deal_1", "魚貨新鮮", true);
  reviews.handleReviewTag("deal_1", "溝通良好", true);
  reviews.handleReviewTag("deal_1", "包裝完善", true);

  const html = cards.renderCard(reviewCard());
  assert.equal((html.match(/checked/g) || []).length, 3);
});
