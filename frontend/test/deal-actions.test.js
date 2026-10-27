/* 協議卡動作、退回重送與取消原因。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};

const { state, update } = await import("../assets/js/demo/store.js");
const order = await import("../assets/js/demo/views/deal-order.js");
const cards = await import("../assets/js/demo/views/cards.js");
const dealActions = await import("../assets/js/demo/deal-actions.js");
const dealReplies = await import("../assets/js/demo/deal-replies.js");
const { pendingDeal, reset } = await import("./deal-fixtures.js");

test("非發起方可以同意、退回或取消", function () {
  const deal = pendingDeal(2);
  reset(deal, 1);
  const html = cards.renderCard({
    type: "deal", deal_id: "deal_1", status: "pending", initiator_id: 2,
    final_price: 4800, meetup_location: "基隆火車站南站",
    meetup_time: "2026-10-26T09:30:00.000Z", items: []
  });
  assert.match(html, /data-action="deal-agree" data-deal="deal_1">同意/);
  assert.match(html, /data-action="deal-reject"/);
  assert.match(html, /data-action="deal-cancel"/);
  assert.match(html, /data-cancel-reason="deal_1"/);
  assert.match(html, /選擇原因…/);
});

test("發起方看不到同意與退回，只能取消", function () {
  reset(pendingDeal(2), 2);
  const html = cards.renderCard({
    type: "deal", deal_id: "deal_1", status: "pending", initiator_id: 2,
    final_price: 4800, meetup_location: "基隆火車站南站",
    meetup_time: "2026-10-26T09:30:00.000Z", items: []
  });
  assert.doesNotMatch(html, /deal-agree/);
  assert.doesNotMatch(html, /deal-reject/);
  assert.match(html, /deal-cancel/);
});

test("舊的協議卡不再顯示動作", function () {
  reset(pendingDeal(2), 1);
  const html = cards.renderCard({
    type: "deal", deal_id: "deal_1", status: "rejected", initiator_id: 2,
    final_price: 4800, meetup_location: "基隆火車站南站",
    meetup_time: "2026-10-26T09:30:00.000Z", items: []
  });
  assert.doesNotMatch(html, /deal-agree/);
  assert.doesNotMatch(html, /deal-reject/);
  assert.doesNotMatch(html, /deal-cancel/);
});

test("退回方可以修改條件後重送", async function () {
  const deal = pendingDeal(3);
  deal.deal_status = "NEGOTIATING";
  deal.rejected_by = 1;
  reset(deal, 1);

  let html = order.renderDealOrder();
  assert.match(html, /data-action="toggle-propose">修改條件並重送/);
  assert.match(html, /已退回，可修改條件後重新送出/);

  await dealActions.handleDealAction("toggle-propose", {});
  assert.equal(state.proposal.final_price, "4800");
  assert.equal(state.proposal.meetup_location, "基隆火車站南站");
  assert.match(state.proposal.meetup_time, /^2026-10-26T\d{2}:\d{2}$/);

  html = order.renderDealOrder();
  assert.match(html, /data-action="submit-proposal">重新送出/);
});

test("非退回方在協商中只能等待", function () {
  const deal = pendingDeal(3);
  deal.deal_status = "NEGOTIATING";
  deal.rejected_by = 1;
  reset(deal, 2);
  const html = order.renderDealOrder();
  assert.doesNotMatch(html, /toggle-propose/);
  assert.match(html, /等待對方重新送出/);
});

test("逾時的協議卡顯示已逾時且沒有動作", function () {
  reset(pendingDeal(2), 1);
  const html = cards.renderCard({
    type: "deal", deal_id: "deal_1", status: "expired", initiator_id: 2,
    final_price: 4800, meetup_location: "基隆火車站南站",
    meetup_time: "2026-10-26T09:30:00.000Z", items: []
  });
  assert.match(html, /已逾時/);
  assert.doesNotMatch(html, /deal-agree/);
  assert.doesNotMatch(html, /deal-cancel/);
});

test("成交與已取消的協議卡只顯示狀態，沒有操作", function () {
  const confirmed = pendingDeal(2);
  confirmed.deal_status = "CONFIRMED";
  reset(confirmed, 1);
  let html = cards.renderCard({
    type: "deal", deal_id: "deal_1", status: "confirmed", initiator_id: 2,
    final_price: 4800, meetup_location: "基隆火車站南站",
    meetup_time: "2026-10-26T09:30:00.000Z", items: []
  });
  assert.match(html, /已成交/);
  assert.match(html, /NT\$4,800/);
  assert.doesNotMatch(html, /deal-agree|deal-reject|deal-cancel|data-cancel-reason/);

  const cancelled = pendingDeal(2);
  cancelled.deal_status = "CANCELLED";
  reset(cancelled, 1);
  html = cards.renderCard({
    type: "deal", deal_id: "deal_1", status: "cancelled", initiator_id: 2,
    final_price: 4800, meetup_location: "基隆火車站南站",
    meetup_time: "2026-10-26T09:30:00.000Z", items: []
  });
  assert.match(html, /已取消/);
  assert.doesNotMatch(html, /deal-agree|deal-reject|deal-cancel|data-cancel-reason/);
});

test("協商中的協議卡仍可依身分取消", function () {
  const deal = pendingDeal(2);
  deal.deal_status = "NEGOTIATING";
  reset(deal, 1);
  const html = cards.renderCard({
    type: "deal", deal_id: "deal_1", status: "rejected", initiator_id: 2,
    final_price: 4800, meetup_location: "基隆火車站南站",
    meetup_time: "2026-10-26T09:30:00.000Z", items: []
  });
  assert.match(html, /data-action="deal-cancel"/);
  assert.doesNotMatch(html, /deal-agree|deal-reject/);
});

test("取消原因會留在 state", function () {
  update({ cancelReasons: {} });
  dealReplies.handleCancelReason("deal_1", "TERMS_MISMATCH");
  assert.equal(state.cancelReasons.deal_1, "TERMS_MISMATCH");
});

test("未選取消原因不會送出", async function () {
  const notices = [];
  dealReplies.initDealReplies({ notify: function (error) { notices.push(error.message); } });
  update({ cancelReasons: {} });

  await dealActions.handleDealAction("deal-cancel", { deal: "deal_1" });

  assert.deepEqual(notices, ["請選擇取消原因"]);
});
