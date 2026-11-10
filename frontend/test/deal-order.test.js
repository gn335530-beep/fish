/* 交易房商品條、發送交易與加購面板。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};

const { state, update } = await import("../assets/js/demo/store.js");
const { renderDealStrip } = await import("../assets/js/demo/views/deal-strip.js");
const dealActions = await import("../assets/js/demo/deal-actions.js");
const { draft, reset } = await import("./deal-fixtures.js");

const handleFieldInput = dealActions.handleFieldInput;
const selectAddon = dealActions.handleAddonSelect;

test("買家草稿看到商品列、加購與發送交易，沒有舊摘要操作", function () {
  reset(draft(), 2);
  const html = renderDealStrip();
  assert.match(html, /<b>石斑<\/b>/);
  assert.match(html, /<b>嘉鱲<\/b>/);
  assert.match(html, /剩 2 尾/);
  assert.match(html, /NT\$800 元\/台斤/);
  assert.match(html, /data-action="toggle-addon"/);
  assert.match(html, /data-action="toggle-propose"/);
  assert.match(html, /發送交易/);
  assert.doesNotMatch(html, /qty-up|remove-item|clear-items|toggle-order|協商完畢|修改條件並重送/);
  assert.doesNotMatch(html, /2 項 · 3 尾/);
});

test("沒有商品時顯示尚未加入商品並停用發送交易", function () {
  const deal = draft();
  deal.items = [];
  deal.items_total = 0;
  reset(deal, 2);
  const html = renderDealStrip();
  assert.match(html, /尚未加入商品/);
  assert.match(html, /data-action="toggle-propose" disabled>發送交易/);
  assert.match(html, /data-action="toggle-addon"/);
});

test("釣客不會看到加購或發送交易", function () {
  reset(draft(), 1);
  const html = renderDealStrip();
  assert.doesNotMatch(html, /toggle-addon|toggle-propose|發送交易/);
});

test("面板展開時右側動作改成收起", function () {
  reset(draft(), 2);
  update({ proposeOpen: true });
  const html = renderDealStrip();
  assert.match(html, /data-action="close-sheet">收起/);
  assert.doesNotMatch(html, /toggle-addon|toggle-propose/);
});

test("發送交易面板單品可改數量，售價預填整單小計", async function () {
  const deal = draft();
  deal.items = [deal.items[0]];
  deal.items_total = 2800;
  reset(deal, 2);
  await dealActions.handleDealAction("toggle-propose", {});
  assert.equal(state.proposeOpen, true);
  assert.equal(state.proposal.quantity, "2");
  assert.equal(state.proposal.final_price, "2800");
  const html = renderDealStrip();
  assert.match(html, /data-field="quantity"[^>]*value="2"/);
  assert.match(html, /data-field="final_price"[^>]*value="2800"/);
  assert.match(html, /data-field="meetup_time"/);
  assert.match(html, /data-field="meetup_location"/);
  assert.match(html, /data-action="submit-proposal">確認/);
  assert.doesNotMatch(html, /toggle-propose">取消/);
});

test("多品時數量唯讀顯示整單總尾數", async function () {
  reset(draft(), 2);
  await dealActions.handleDealAction("toggle-propose", {});
  const html = renderDealStrip();
  assert.match(html, /fm-deal-sheet__readonly">3 尾/);
  assert.doesNotMatch(html, /data-field="quantity"/);
});

test("加購面板列出同釣客商品、已在訂單者與可再加購上限", function () {
  reset(draft(), 2);
  update({
    addonOpen: true,
    addons: [
      { id: "prd_a", fish_species: "石斑", condition: "活體", available: 5, price_per_taijin: 800, price: 2800 },
      { id: "prd_c", fish_species: "花枝", available: 3, price_per_taijin: null, price: 500 }
    ],
    addonQty: { prd_c: "2" }
  });
  const html = renderDealStrip();
  assert.match(html, /<b>石斑<\/b>/);
  assert.match(html, /<b>花枝<\/b>/);
  assert.match(html, /max="3"[^>]*data-addon-qty="prd_a"/);
  assert.match(html, /max="3"[^>]*data-addon-qty="prd_c"[^>]*value="2"/);
  assert.match(html, /整批 NT\$500/);
  assert.match(html, /data-action="addon-cancel">取消/);
  assert.match(html, /data-action="addon-submit">確認/);
});

test("商品條與發送交易摘要都含魚種、處理方式、剩餘尾數與價格", async function () {
  reset(draft(), 2);
  const strip = renderDealStrip();
  assert.match(strip, /<b>石斑<\/b>/);
  assert.match(strip, /活體/);
  assert.match(strip, /剩 2 尾/);
  assert.match(strip, /NT\$800 元\/台斤/);

  await dealActions.handleDealAction("toggle-propose", {});
  const proposal = renderDealStrip();
  assert.match(proposal, /<b>石斑<\/b>/);
  assert.match(proposal, /活體/);
  assert.match(proposal, /剩 2 尾/);
  assert.match(proposal, /NT\$800 元\/台斤/);
  assert.match(proposal, /<b>嘉鱲<\/b>/);
  assert.match(proposal, /剩 2 尾/);
  assert.match(proposal, /NT\$900 元\/台斤/);
});

test("加購列使用剩 N 尾，且不顯示 legacy 重量", function () {
  reset(draft(), 2);
  update({
    addonOpen: true,
    addons: [{
      id: "prd_a", fish_species: "石斑", condition: "活體", weight_kg: 3,
      available: 5, price_per_taijin: 800, price: 2800
    }]
  });
  const html = renderDealStrip();
  assert.match(html, /活體/);
  assert.match(html, /剩 5 尾 · NT\$800 元\/台斤/);
  assert.doesNotMatch(html, /售 5 尾/);
  assert.doesNotMatch(html, /3(?:\.0)? ?kg|公斤|重量/);
});

test("可再加購為 0 時停用輸入", function () {
  reset(draft(), 2);
  update({
    addonOpen: true,
    addons: [{ id: "prd_a", fish_species: "石斑", available: 2, price_per_taijin: 800, price: 2800 }]
  });
  assert.match(renderDealStrip(), /data-addon-qty="prd_a"[^>]*disabled/);
});

test("沒有可加購商品時顯示對應文案", function () {
  reset(draft(), 2);
  update({ addonOpen: true, addons: [] });
  assert.match(renderDealStrip(), /目前沒有可加購的商品/);
});

test("沒有每台斤價格時商品條顯示整批價", function () {
  const deal = draft();
  deal.items = [{
    item_id: "itm_01", product_id: "prd_a", title: "石斑（2尾 / 活體）",
    fish_species: "石斑", unit_price: 500, price: 500,
    price_per_taijin: null, quantity: 1, available: 1
  }];
  reset(deal, 2);
  const html = renderDealStrip();
  assert.match(html, /整批 NT\$500/);
  assert.doesNotMatch(html, /NT\$0/);
});

test("舊項目沒有魚種快照時從標題取魚種，不顯示長標題", function () {
  const deal = draft();
  deal.items = [{
    item_id: "itm_01", product_id: "prd_a", title: "石斑（2kg / 2尾 / 活體）",
    unit_price: 1400, price: 2800, price_per_taijin: 800, quantity: 2, available: 2
  }];
  reset(deal, 2);
  const html = renderDealStrip();
  assert.match(html, /<b>石斑<\/b>/);
  assert.doesNotMatch(html, /2kg \/ 2尾/);
});

test("表單與加購選擇會寫回 state", function () {
  reset(draft(), 2);
  update({ proposal: { quantity: "", final_price: "", meetup_location: "", meetup_time: "" }, addonQty: {} });
  handleFieldInput("meetup_location", "瑞芳火車站");
  handleFieldInput("quantity", "3");
  selectAddon("prd_c", "2");
  assert.equal(state.proposal.meetup_location, "瑞芳火車站");
  assert.equal(state.proposal.quantity, "3");
  assert.equal(state.addonQty.prd_c, "2");
});
