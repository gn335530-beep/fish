/* 協議卡、發送交易驗證與批次加購動作。 */

import test from "node:test";
import assert from "node:assert/strict";

const calls = [];

globalThis.window = {
  HaisenAPI: {
    getToken: function () { return "token"; },
    request: async function (path, options) {
      calls.push({ path: path, method: (options && options.method) || "GET",
        body: options && options.body });
      if (path.indexOf("/messages") !== -1) return { data: [] };
      if (path === "/api/conversations") return { data: [] };
      if (path.indexOf("/api/conversations/") === 0) return { data: {} };
      if (path === "/api/deals/deal_1") {
        return {
          data: {
            id: "deal_1", deal_status: "DRAFT", buyer_id: 2, seller_id: 1,
            items: [{ item_id: "itm_01", product_id: "prd_a", fish_species: "石斑", title: "石斑（2尾 / 活體）", quantity: 2, unit_price: 1400, price: 2800, price_per_taijin: 800, available: 2 }],
            items_total: 2800
          }
        };
      }
      return { data: {} };
    }
  }
};

const { state, update } = await import("../assets/js/demo/store.js");
const cards = await import("../assets/js/demo/views/cards.js");
const dealActions = await import("../assets/js/demo/deal-actions.js");
const addonActions = await import("../assets/js/demo/deal-order-actions.js");
const { draft, pendingDeal, reset } = await import("./deal-fixtures.js");

function pendingCard(overrides) {
  return Object.assign({
    type: "deal", deal_id: "deal_1", status: "pending", initiator_id: 2,
    final_price: 4800, meetup_location: "基隆火車站南站",
    meetup_time: "2026-10-26T09:30:00.000Z",
    items: [
      { fish_species: "石斑", quantity: 2, unit_price: 1400, price_per_taijin: 800 },
      { fish_species: "嘉鱲", quantity: 1, unit_price: 1530, price_per_taijin: 900 }
    ]
  }, overrides || {});
}

test("非發起方在等待確認時看到取消與確認", function () {
  reset(pendingDeal(2), 1);
  const html = cards.renderCard(pendingCard(), "msg_1");
  assert.match(html, /data-action="deal-cancel-open" data-deal="deal_1">取消/);
  assert.match(html, /data-action="deal-agree" data-deal="deal_1">確認/);
  assert.doesNotMatch(html, /deal-reject|data-cancel-reason|退回/);
});

test("協議卡顯示魚種、販售數量、最終價格與面交資訊", function () {
  reset(pendingDeal(2), 1);
  const html = cards.renderCard(pendingCard(), "msg_1");
  assert.match(html, /協議/);
  assert.match(html, /石斑/);
  assert.match(html, /嘉鱲/);
  assert.match(html, /販售數量/);
  assert.match(html, /3 尾/);
  assert.match(html, /最終價格/);
  assert.match(
    html,
    /<div class="fm-card__deal-price"><dt>最終價格<\/dt><dd><b>NT\$4,800<\/b><\/dd><\/div>/);
  assert.match(html, /NT\$4,800/);
  assert.match(html, /基隆火車站南站/);
  assert.match(html, /10\/26/);
  assert.match(html, /等待確認/);
});

test("發起人看不到確認，已結束狀態也沒有任何按鈕", function () {
  reset(pendingDeal(2), 2);
  assert.doesNotMatch(cards.renderCard(pendingCard(), "msg_1"), /deal-agree|deal-reject|deal-cancel/);

  const confirmed = pendingDeal(2);
  confirmed.deal_status = "CONFIRMED";
  reset(confirmed, 1);
  const html = cards.renderCard(pendingCard({ status: "confirmed" }), "msg_1");
  assert.match(html, /已確認/);
  assert.doesNotMatch(html, /deal-agree|deal-reject|deal-cancel/);
});

test("逾時與舊退回卡片顯示狀態但沒有操作", function () {
  const expired = pendingDeal(2);
  expired.deal_status = "CANCELLED";
  expired.cancel_reason = "LOCK_EXPIRED";
  reset(expired, 1);
  let html = cards.renderCard(pendingCard({ status: "expired" }), "msg_1");
  assert.match(html, /已逾時/);
  assert.doesNotMatch(html, /deal-agree|deal-reject|deal-cancel/);

  reset(pendingDeal(2), 1);
  html = cards.renderCard(pendingCard({ status: "rejected" }), "msg_1");
  assert.match(html, /已退回/);
  assert.doesNotMatch(html, /deal-agree|deal-reject|deal-cancel/);
});

test("發送交易驗證數量、售價、地點與時間", async function () {
  const notices = [];
  dealActions.initDealActions({ notify: function (error) { notices.push(error.message); } });
  const deal = draft();
  deal.items = [deal.items[0]];
  reset(deal, 2);
  await dealActions.handleDealAction("toggle-propose", {});

  state.proposal.quantity = "0";
  await dealActions.handleDealAction("submit-proposal", {});
  assert.equal(notices.pop(), "請填寫數量");

  state.proposal.quantity = "3";
  await dealActions.handleDealAction("submit-proposal", {});
  assert.equal(notices.pop(), "數量不可超過可售 2 尾");

  state.proposal.quantity = "2";
  state.proposal.final_price = "0";
  await dealActions.handleDealAction("submit-proposal", {});
  assert.equal(notices.pop(), "請填寫售價");

  state.proposal.final_price = "2800";
  state.proposal.meetup_location = "";
  await dealActions.handleDealAction("submit-proposal", {});
  assert.equal(notices.pop(), "請填寫面交地點");

  state.proposal.meetup_location = "瑞芳火車站";
  state.proposal.meetup_time = "";
  await dealActions.handleDealAction("submit-proposal", {});
  assert.equal(notices.pop(), "請填寫面交時間");
});

test("單品改數量會先更新項目再送出協議", async function () {
  calls.length = 0;
  dealActions.initDealActions({ notify: function () {}, render: function () {}, scrollEnd: function () {} });
  const deal = draft();
  deal.items = [deal.items[0]];
  reset(deal, 2);
  await dealActions.handleDealAction("toggle-propose", {});
  state.proposal.quantity = "1";
  state.proposal.final_price = "1400";
  state.proposal.meetup_location = "瑞芳火車站";
  state.proposal.meetup_time = "2026-10-26T17:30";

  await dealActions.handleDealAction("submit-proposal", {});

  const patch = calls.find(function (call) { return call.method === "PATCH"; });
  assert.ok(patch);
  assert.equal(patch.path, "/api/deals/items/itm_01");
  assert.equal(patch.body.quantity, 1);
  const propose = calls.find(function (call) { return call.path === "/api/deals/propose"; });
  assert.ok(propose);
  assert.equal(propose.body.final_price, 1400);
});

test("收起面板會保留發送交易草稿，重新開啟仍在", async function () {
  const deal = draft();
  deal.items = [deal.items[0]];
  reset(deal, 2);
  await dealActions.handleDealAction("toggle-propose", {});
  state.proposal.final_price = "2500";
  state.proposal.meetup_location = "瑞芳火車站";
  await dealActions.handleDealAction("close-sheet", {});
  assert.equal(state.proposeOpen, false);
  assert.equal(state.proposal.final_price, "2500");

  await dealActions.handleDealAction("toggle-propose", {});
  assert.equal(state.proposal.final_price, "2500");
  assert.equal(state.proposal.meetup_location, "瑞芳火車站");
});

test("批次加購只送數量大於 0 的列", async function () {
  calls.length = 0;
  addonActions.initOrderActions({ notify: function () {}, render: function () {}, scrollEnd: function () {} });
  reset(draft(), 2);
  update({
    addonOpen: true,
    addons: [
      { id: "prd_a", fish_species: "石斑", available: 5, price_per_taijin: 800, price: 2800 },
      { id: "prd_c", fish_species: "花枝", available: 3, price_per_taijin: null, price: 500 }
    ],
    addonQty: { prd_a: "3", prd_c: "0" }
  });

  await dealActions.handleDealAction("addon-submit", {});

  const batch = calls.find(function (call) { return call.path === "/api/deals/items/batch"; });
  assert.ok(batch);
  assert.deepEqual(batch.body.items, [{ product_id: "prd_a", quantity: 3 }]);
});
