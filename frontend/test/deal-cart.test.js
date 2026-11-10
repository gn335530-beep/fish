/* 購物車：空車、有商品、唯讀三種狀態，以及逐項移除與改尾數。 */

import test from "node:test";
import assert from "node:assert/strict";

const requests = [];
let freshDeal = null;

globalThis.window = {
  HaisenAPI: {
    getToken: function () { return "token"; },
    request: async function (path, options) {
      requests.push({ path: path, method: (options && options.method) || "GET",
        body: options && options.body });
      if (path === "/api/conversations") return { data: [] };
      if (path === "/api/deals/deal_1") return { data: freshDeal };
      return { data: { deal: freshDeal } };
    }
  }
};

const { state, update } = await import("../assets/js/demo/store.js");
const { renderDealStrip } = await import("../assets/js/demo/views/deal-strip.js");
const dealActions = await import("../assets/js/demo/deal-actions.js");
const { draft, pendingDeal, reset } = await import("./deal-fixtures.js");

function setup(deal, userId) {
  freshDeal = deal;
  requests.length = 0;
  reset(deal, userId);
  dealActions.initDealActions({
    notify: function (error) { throw error; },
    render: function () {},
    scrollEnd: function () {}
  });
}

test("空草稿顯示尚未加入商品、選購與停用的發送交易", function () {
  const deal = draft();
  deal.items = [];
  setup(deal, 2);
  const html = renderDealStrip();
  assert.match(html, /尚未加入商品/);
  assert.match(html, /data-action="toggle-addon">選購</);
  assert.match(html, /data-action="toggle-propose" disabled>發送交易/);
  assert.doesNotMatch(html, /data-item-remove|data-item-qty|清空全部|clear-items/);
});

test("有商品時每列有數量控制與移除，底部是加購與發送交易", function () {
  setup(draft(), 2);
  const html = renderDealStrip();
  assert.match(html, /data-item-qty="itm_01"[^>]*value="2"/);
  assert.match(html, /max="2"[^>]*data-item-qty="itm_01"/);
  assert.match(html, /data-action="item-remove" data-item="itm_01">移除/);
  assert.match(html, /數量 2 尾/);
  assert.match(html, /data-action="toggle-addon">加購</);
  assert.match(html, /data-action="toggle-propose">發送交易/);
  assert.doesNotMatch(html, /清空全部|clear-items/);
});

test("釣客與已送出訂單看得到數量但沒有移除或改數量", function () {
  setup(draft(), 1);
  let html = renderDealStrip();
  assert.match(html, /數量 2 尾/);
  assert.doesNotMatch(html, /data-item-qty|data-item-remove|toggle-addon|toggle-propose/);

  setup(pendingDeal(2), 2);
  html = renderDealStrip();
  assert.doesNotMatch(html, /data-item-qty|data-item-remove|toggle-addon|toggle-propose/);
});

test("移除與改尾數呼叫對應 API 並重新載入房間", async function () {
  setup(draft(), 2);
  await dealActions.handleDealAction("item-remove", { item: "itm_02" });
  const removed = requests.find(function (request) { return request.method === "DELETE"; });
  assert.equal(removed.path, "/api/deals/items/itm_02?deal_id=deal_1");

  requests.length = 0;
  await dealActions.handleDealAction("item-qty", { item: "itm_01", value: "1" });
  const patched = requests.find(function (request) { return request.method === "PATCH"; });
  assert.equal(patched.path, "/api/deals/items/itm_01");
  assert.deepEqual(patched.body, { deal_id: "deal_1", quantity: 1 });
});

test("尾數不是正整數時不呼叫 API", async function () {
  setup(draft(), 2);
  const notices = [];
  dealActions.initDealActions({
    notify: function (error) { notices.push(error.message); },
    render: function () {},
    scrollEnd: function () {}
  });
  await dealActions.handleDealAction("item-qty", { item: "itm_01", value: "0" });
  assert.equal(notices[0], "請填寫正確尾數");
  assert.equal(requests.some(function (request) {
    return request.method === "PATCH";
  }), false);
});
