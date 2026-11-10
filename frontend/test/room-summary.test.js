/* 房間摘要：進行中訂單優先，否則顯示最新一筆；收件匣與訂單面板共用規則。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};

const { update } = await import("../assets/js/demo/store.js");
const { renderInbox } = await import("../assets/js/demo/views/inbox.js");
const { renderDealStrip } = await import("../assets/js/demo/views/deal-strip.js");
const poll = await import("../assets/js/demo/poll.js");

function order(overrides) {
  return Object.assign({
    id: "deal_1",
    status: "PENDING_REVIEW",
    item_count: 1,
    total_quantity: 2,
    final_price: 2800
  }, overrides || {});
}

function room(overrides) {
  return Object.assign({
    id: "conv_1",
    type: "deal",
    peer: { id: 1, display_name: "陳阿海", username: "0912345678" },
    order: null,
    last_order: null,
    orders: [],
    unread_count: 0,
    created_at: "2026-10-27T00:00:00.000Z",
    last_message_at: "2026-10-27T00:00:00.000Z",
    last_message: { text: "還有貨嗎" },
    deletable: false
  }, overrides || {});
}

test("進行中訂單存在時，收件匣與訂單面板都優先顯示它", function () {
  const active = order({ status: "PENDING_REVIEW", final_price: 2800 });
  const finished = order({ id: "deal_0", status: "CONFIRMED", final_price: 1400 });
  update({ conversations: [room({ order: active, last_order: finished })], room: null });

  const inbox = renderInbox();
  assert.match(inbox, /等待確認 · 1 項 · 2 尾 · NT\$2,800/);
  assert.doesNotMatch(inbox, /已成交/);

  update({ room: room({ order: active, last_order: finished }), deal: null });
  const panel = renderDealStrip();
  assert.match(panel, /尚未加入商品/);
  assert.doesNotMatch(panel, /等待確認|已成交 · 1 項/);
});

test("只有最新一筆已成交訂單時，收件匣顯示狀態與金額，面板不再顯示舊摘要", function () {
  const latest = order({ status: "CONFIRMED", item_count: 2, total_quantity: 3, final_price: 4330 });
  update({ conversations: [room({ last_order: latest })], room: null });
  assert.match(renderInbox(), /已成交 · 2 項 · 3 尾 · NT\$4,330/);

  update({ room: room({ last_order: latest }), deal: null });
  const panel = renderDealStrip();
  assert.match(panel, /尚未加入商品/);
  assert.doesNotMatch(panel, /已成交 · 2 項 · 3 尾|data-action="toggle-addon"|data-action="deal-agree"/);
});

test("最新訂單逾時取消時，兩處都顯示已逾時", function () {
  const latest = order({ status: "CANCELLED", cancel_reason: "LOCK_EXPIRED" });
  update({ conversations: [room({ last_order: latest })], room: null });

  assert.match(renderInbox(), /已逾時/);
  assert.doesNotMatch(renderInbox(), /已取消/);

  update({ room: room({ last_order: latest }), deal: null });
  const panel = renderDealStrip();
  assert.match(panel, /尚未加入商品/);
  assert.doesNotMatch(panel, /<button/);
});

test("兩者都沒有時，收件匣顯示純聊天、商品條顯示尚未加入商品", function () {
  update({ conversations: [room()], room: null });
  assert.match(renderInbox(), /純聊天/);

  update({ room: room(), deal: null });
  assert.match(renderDealStrip(), /尚未加入商品/);
});

test("已載入的已結束訂單仍顯示商品列，但沒有操作", function () {
  const latest = order({ status: "CONFIRMED", item_count: 2, total_quantity: 3, final_price: 4330 });
  update({
    room: room({ last_order: latest }),
    deal: {
      id: "deal_1",
      deal_status: "CONFIRMED",
      items: [{ item_id: "itm_1", title: "石斑", quantity: 2, unit_price: 1400 }],
      items_total: 2800
    }
  });

  const panel = renderDealStrip();
  assert.match(panel, /石斑/);
  assert.doesNotMatch(panel, /<button/);
  assert.doesNotMatch(panel, /整單金額|已成交 · 2 項/);
});

test("房間最新訂單是別筆時，商品條仍顯示已載入訂單的項目", function () {
  const latest = order({ id: "deal_2", status: "CONFIRMED", item_count: 1, total_quantity: 1, final_price: 100 });
  update({
    room: room({ last_order: latest }),
    deal: {
      id: "deal_1",
      deal_status: "CONFIRMED",
      items: [
        { item_id: "itm_1", title: "石斑", quantity: 2, unit_price: 1400 },
        { item_id: "itm_2", title: "黑鯛", quantity: 1, unit_price: 1530 }
      ],
      items_total: 4330
    }
  });

  const panel = renderDealStrip();
  assert.match(panel, /石斑/);
  assert.match(panel, /黑鯛/);
  assert.doesNotMatch(panel, /已成交 · 2 項 · 3 尾/);
});

test("3 秒輪詢更新對話清單後，收件匣摘要跟著變", async function () {
  const latest = order({ status: "CONFIRMED", item_count: 2, total_quantity: 3, final_price: 4330 });
  window.HaisenAPI = {
    request: async function () { return { data: [room({ last_order: latest })] }; }
  };

  try {
    await poll.refreshRooms();
    assert.match(renderInbox(), /已成交 · 2 項 · 3 尾 · NT\$4,330/);
  } finally {
    delete window.HaisenAPI;
  }
});

test("助手房仍顯示 AI 對話", function () {
  update({
    conversations: [room({ type: "assistant", peer: { id: "ai", display_name: "小幫手" } })],
    room: null
  });
  assert.match(renderInbox(), /AI 對話/);
});
