/* 評價卡：可點星等、四個標籤、評語與已評價狀態。 */

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

test("待評價時顯示五顆可點星星、四個標籤與評語表單", function () {
  reset(2);
  const html = cards.renderCard(reviewCard());
  assert.match(html, /<b>評價<\/b>/);
  assert.match(html, /role="group" aria-label="整體評分"/);
  assert.equal((html.match(/data-action="review-star"/g) || []).length, 5);
  assert.match(html, /data-star="5"/);
  assert.equal((html.match(/is-on/g) || []).length, 5);
  assert.match(html, /魚貨新鮮/);
  assert.match(html, /準時守約/);
  assert.match(html, /溝通良好/);
  assert.match(html, /臨時放鳥/);
  assert.doesNotMatch(html, /包裝完善/);
  assert.match(html, /placeholder="留下你的評價吧！"/);
  assert.match(html, /maxlength="100"/);
  assert.match(html, /data-action="deal-review" data-deal="deal_1">確認/);
});

test("點星星會更新評分並重畫", async function () {
  let renders = 0;
  reviews.initDealReviews({ notify: function () {}, render: function () { renders += 1; } });
  reset(2);
  await reviews.handleReviewAction("review-star", { deal: "deal_1", star: "3" });
  assert.equal(state.reviewDrafts.deal_1.rating, 3);
  assert.equal(renders, 1);

  const html = cards.renderCard(reviewCard());
  assert.equal((html.match(/is-on/g) || []).length, 3);
  assert.match(html, /aria-pressed="true"[^>]*data-star="3"/);
});

test("星等與評語會留在 state", function () {
  reset(2);
  reviews.handleReviewField("deal_1", "rating", "4");
  reviews.handleReviewComment("deal_1", "魚很新鮮");
  assert.equal(state.reviewDrafts.deal_1.rating, 4);
  assert.equal(state.reviewDrafts.deal_1.comment, "魚很新鮮");
  assert.match(cards.renderCard(reviewCard()), /魚很新鮮/);
});

test("最多只能選 3 個標籤", function () {
  const notices = [];
  let renders = 0;
  reviews.initDealReviews({
    notify: function (error) { notices.push(error.message); },
    render: function () { renders += 1; }
  });
  reset(2);

  reviews.handleReviewTag("deal_1", "魚貨新鮮", true);
  reviews.handleReviewTag("deal_1", "準時守約", true);
  reviews.handleReviewTag("deal_1", "溝通良好", true);
  reviews.handleReviewTag("deal_1", "臨時放鳥", true);

  assert.deepEqual(state.reviewDrafts.deal_1.tags, ["魚貨新鮮", "準時守約", "溝通良好"]);
  assert.deepEqual(notices, ["最多選 3 個標籤"]);
  assert.equal(renders, 1);
});

test("已評價後只顯示完成狀態，不再有表單或評分 pill", function () {
  reset(2);
  let html = cards.renderCard(reviewCard({ buyer_reviewed: true }));
  assert.match(html, /你已經送出評價/);
  assert.match(html, /等待對方評價/);
  assert.doesNotMatch(html, /deal-review|review-star|已評價|待評價/);

  html = cards.renderCard(reviewCard({ buyer_reviewed: true, seller_reviewed: true }));
  assert.match(html, /雙方都完成了/);
});

test("釣客看到的評價狀態以釣客身分判斷", function () {
  reset(1);
  const html = cards.renderCard(reviewCard({ buyer_reviewed: true }));
  assert.match(html, /data-action="deal-review"/);
});
