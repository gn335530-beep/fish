/* 訂單摘要：明細、金額、買家操作、協議表單與協議卡。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};

const { state, update } = await import("../assets/js/demo/store.js");
const order = await import("../assets/js/demo/views/deal-order.js");
const cards = await import("../assets/js/demo/views/cards.js");
const dealActions = await import("../assets/js/demo/deal-actions.js");
const handleFieldInput = dealActions.handleFieldInput;
const selectAddon = dealActions.handleAddonSelect;

const ITEMS = [
  { item_id: "itm_01", product_id: "prd_a", title: "石斑（2kg / 2尾 / 活體）", unit_price: 1400, quantity: 2, available: 2 },
  { item_id: "itm_02", product_id: "prd_b", title: "嘉鱲（2kg / 2尾 / 活體）", unit_price: 1530, quantity: 1, available: 2 }
];

function draft() {
  return {
    id: "deal_1",
    conversation_id: "conv_1",
    buyer_id: 2,
    seller_id: 1,
    deal_status: "DRAFT",
    deal_terms: null,
    items_total: 4330,
    items: ITEMS.map(function (item) { return Object.assign({}, item); })
  };
}

function reset(deal, userId) {
  update({
    user: { id: userId },
    room: { id: "conv_1", type: "deal", order: { id: deal.id, status: deal.deal_status } },
    deal: deal,
    dealOpen: true,
    addonOpen: false,
    addons: [],
    addonQty: {},
    proposeOpen: false,
    proposal: { final_price: "", meetup_location: "", meetup_time: "" }
  });
}

test("買家看到項目明細、小計與可操作按鈕", function () {
  reset(draft(), 2);
  const html = order.renderDealOrder();
  assert.match(html, /2 項 · 3 尾 · NT\$4,330/);
  assert.match(html, /石斑（2kg \/ 2尾 \/ 活體）/);
  assert.match(html, /NT\$2,800/);
  assert.match(html, /data-action="qty-up"/);
  assert.match(html, /data-action="toggle-addon"/);
  assert.match(html, /data-action="clear-items"/);
  assert.match(html, /data-action="toggle-propose">協商完畢/);
});

test("沒有項目時「協商完畢」不可按", function () {
  const deal = draft();
  deal.items = [];
  deal.items_total = 0;
  reset(deal, 2);
  const html = order.renderDealOrder();
  assert.match(html, /0 項 · 0 尾 · NT\$0/);
  assert.match(html, /尚未加入商品/);
  assert.match(html, /data-action="toggle-propose" disabled>協商完畢/);
});

test("釣客看不到買家的改量、加購與清空", function () {
  reset(draft(), 1);
  const html = order.renderDealOrder();
  assert.doesNotMatch(html, /data-action="qty-up"/);
  assert.doesNotMatch(html, /data-action="toggle-addon"/);
  assert.doesNotMatch(html, /data-action="clear-items"/);
  assert.match(html, /data-action="toggle-propose">協商完畢/);
});

test("待回覆時顯示協議條件與狀態，不能再改", function () {
  const deal = draft();
  deal.deal_status = "PENDING_REVIEW";
  deal.deal_terms = {
    final_price: 4800,
    meetup_location: "基隆火車站南站",
    meetup_time: "2026-10-26T09:30:00.000Z"
  };
  reset(deal, 2);
  const html = order.renderDealOrder();
  assert.match(html, /等待確認/);
  assert.match(html, /整單金額/);
  assert.match(html, /NT\$4,800/);
  assert.match(html, /基隆火車站南站/);
  assert.match(html, /10\/26/);
  assert.match(html, /等待對方回覆/);
  assert.doesNotMatch(html, /data-action="toggle-propose"/);
  assert.doesNotMatch(html, /data-action="qty-up"/);
});

test("協議卡顯示品項、金額、地點、時間與等待確認", function () {
  const html = cards.renderCard({
    type: "deal",
    status: "pending",
    final_price: 4800,
    meetup_location: "基隆火車站南站",
    meetup_time: "2026-10-26T09:30:00.000Z",
    items: [{ title: "石斑", quantity: 1, unit_price: 1400 }]
  });
  assert.match(html, /等待確認/);
  assert.match(html, /石斑 × 1 尾/);
  assert.match(html, /NT\$4,800/);
  assert.match(html, /基隆火車站南站/);
  assert.match(html, /10\/26/);
});

test("加購清單保留已選的尾數", function () {
  reset(draft(), 2);
  update({
    addonOpen: true,
    addons: [{ id: "prd_c", title: "花枝（2kg / 3尾 / 活體）", available: 3, unit_price: 500 }],
    addonQty: { prd_c: "3" }
  });
  const html = order.renderDealOrder();
  assert.match(html, /<option value="3" selected>3 尾<\/option>/);
  assert.match(html, /data-action="add-item" data-product="prd_c"/);
});

test("表單與加購選擇會寫回 state", function () {
  update({ proposal: { final_price: "", meetup_location: "", meetup_time: "" }, addonQty: {} });
  handleFieldInput("meetup_location", "瑞芳火車站");
  selectAddon("prd_c", "2");
  assert.equal(state.proposal.meetup_location, "瑞芳火車站");
  assert.equal(state.addonQty.prd_c, "2");
});

test("協議必填欄位沒填就不會送出", async function () {
  const notices = [];
  dealActions.initDealActions({ notify: function (error) { notices.push(error.message); } });
  reset(draft(), 2);
  update({ proposeOpen: true, proposal: { final_price: "", meetup_location: "", meetup_time: "" } });

  await dealActions.handleDealAction("submit-proposal", {});

  assert.deepEqual(notices, ["請填寫整單金額"]);
});
