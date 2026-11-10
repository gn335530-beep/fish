/* 純聊天房：沒有訂單時不顯示浮動購物車，收件匣也不顯示訂單摘要。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = { HaisenAPI: { BASE: "http://api.test" } };

const { update } = await import("../assets/js/demo/store.js");
const { renderDealRoom } = await import("../assets/js/demo/views/deal.js");
const { renderInbox } = await import("../assets/js/demo/views/inbox.js");

function room(overrides) {
  return Object.assign({
    id: "conv_chat",
    type: "deal",
    peer: { id: 1, display_name: "陳阿海", username: "0912345678" },
    order: null,
    last_order: null,
    orders: [],
    last_message: { text: "已開啟對話。" },
    unread_count: 0,
    deletable: true,
    created_at: "2026-11-10T10:00:00.000Z",
    last_message_at: "2026-11-10T10:00:00.000Z"
  }, overrides || {});
}

test("純聊天房只顯示訊息流，不顯示浮動購物車", function () {
  update({
    user: { id: 2 },
    room: room(),
    deal: null,
    messages: [
      { seq: 1, sender_id: "system", type: "system", text: "已開啟對話。", created_at: "2026-11-10T10:00:00.000Z" },
      { seq: 2, sender_id: 1, type: "text", text: "你好", created_at: "2026-11-10T10:01:00.000Z" }
    ]
  });

  const html = renderDealRoom();
  assert.match(html, /已開啟對話/);
  assert.match(html, /你好/);
  assert.doesNotMatch(html, /fm-deal-strip|尚未加入商品|發送交易/);
});

test("有草稿訂單時仍顯示浮動購物車", function () {
  update({
    user: { id: 2 },
    room: room({ order: { id: "deal_1", status: "DRAFT", item_count: 0, total_quantity: 0, final_price: 0 } }),
    deal: { id: "deal_1", deal_status: "DRAFT", items: [] },
    messages: []
  });

  assert.match(renderDealRoom(), /fm-deal-strip/);
});

test("收件匣純聊天房不顯示洽談中，仍可刪除", function () {
  update({ room: null, conversations: [room()] });
  const html = renderInbox();
  assert.doesNotMatch(html, /洽談中/);
  assert.match(html, /純聊天/);
  assert.match(html, /data-action="delete-room"/);
});
