/* 取消流程與取消後重新發起。 */

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
const { renderDealStrip } = await import("../assets/js/demo/views/deal-strip.js");
const { draft, pendingDeal, reset } = await import("./deal-fixtures.js");

function pendingCard() {
  return {
    type: "deal", deal_id: "deal_1", status: "pending", initiator_id: 2,
    final_price: 4800, meetup_location: "基隆火車站南站",
    meetup_time: "2026-10-26T09:30:00.000Z",
    items: [{ fish_species: "石斑", quantity: 2, unit_price: 1400, price_per_taijin: 800 }]
  };
}

test("取消會先換成本地確認取消卡，取消可回到協議卡", async function () {
  dealActions.initDealActions({ notify: function () {}, render: function () {} });
  reset(pendingDeal(2), 1);
  await dealActions.handleDealAction("deal-cancel-open", { deal: "deal_1" });
  assert.equal(state.cancelOpen, "deal_1");

  let html = cards.renderCard(pendingCard(), "msg_1");
  assert.match(html, /確認取消/);
  assert.match(html, /請填寫取消原因/);
  assert.match(html, /data-cancel-note/);
  assert.match(html, /maxlength="200"/);
  assert.match(html, /data-action="cancel-dismiss">取消/);
  assert.match(html, /data-action="cancel-submit" data-deal="deal_1">送出/);
  assert.doesNotMatch(html, /deal-agree/);

  await dealActions.handleDealAction("cancel-dismiss", {});
  assert.equal(state.cancelOpen, null);
  html = cards.renderCard(pendingCard(), "msg_1");
  assert.match(html, /data-action="deal-cancel-open"/);
  assert.match(html, /data-action="deal-agree"/);
});

test("取消原因空白時不呼叫取消 API", async function () {
  const notices = [];
  calls.length = 0;
  dealActions.initDealActions({ notify: function (error) { notices.push(error.message); } });
  reset(pendingDeal(2), 1);
  update({ cancelOpen: "deal_1", cancelNote: "   " });
  await dealActions.handleDealAction("cancel-submit", { deal: "deal_1" });
  assert.deepEqual(notices, ["請填寫取消原因"]);
  assert.equal(calls.some(function (call) { return call.path === "/api/deals/cancel"; }), false);
});

test("送出取消會帶自由文字備註", async function () {
  calls.length = 0;
  dealActions.initDealActions({ notify: function () {}, render: function () {}, scrollEnd: function () {} });
  reset(pendingDeal(2), 1);
  update({ cancelOpen: "deal_1", cancelNote: "買家臨時有事" });
  await dealActions.handleDealAction("cancel-submit", { deal: "deal_1" });
  const cancel = calls.find(function (call) { return call.path === "/api/deals/cancel"; });
  assert.ok(cancel);
  assert.equal(cancel.body.note, "買家臨時有事");
  assert.equal(state.cancelOpen, null);
});

test("取消訊息卡顯示取消原因，空白顯示未填寫", function () {
  let html = cards.renderCard({ type: "deal_cancelled", deal_id: "deal_1", note: "買家臨時有事" });
  assert.match(html, /協議已被取消/);
  assert.match(html, /取消原因/);
  assert.match(html, /買家臨時有事/);

  html = cards.renderCard({ type: "deal_cancelled", deal_id: "deal_1", note: "" });
  assert.match(html, /未填寫/);
});

test("取消後商品條顯示最後訂單，發送交易會重新發起", async function () {
  calls.length = 0;
  dealActions.initDealActions({ notify: function () {}, render: function () {}, scrollEnd: function () {} });
  const canceled = draft();
  canceled.deal_status = "CANCELLED";
  canceled.cancel_reason = "OTHER";
  reset(canceled, 2);

  let html = renderDealStrip();
  assert.match(html, /石斑/);
  assert.match(html, /data-action="toggle-propose"/);
  assert.doesNotMatch(html, /toggle-addon/);

  await dealActions.handleDealAction("toggle-propose", {});
  const reinitiate = calls.find(function (call) { return call.path === "/api/deals/reinitiate"; });
  assert.ok(reinitiate);
  assert.equal(reinitiate.body.deal_id, "deal_1");
  assert.equal(state.proposeOpen, true);
});

test("釣客不會看到取消後重新發起", function () {
  const canceled = draft();
  canceled.deal_status = "CANCELLED";
  canceled.cancel_reason = "OTHER";
  reset(canceled, 1);
  const html = renderDealStrip();
  assert.match(html, /石斑/);
  assert.doesNotMatch(html, /toggle-propose|toggle-addon/);
});

test("逾時取消不會顯示重新發起", function () {
  const expired = draft();
  expired.deal_status = "CANCELLED";
  expired.cancel_reason = "LOCK_EXPIRED";
  reset(expired, 2);
  const html = renderDealStrip();
  assert.match(html, /石斑/);
  assert.doesNotMatch(html, /toggle-propose|toggle-addon/);
});
