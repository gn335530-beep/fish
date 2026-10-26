/* 收件匣與助手房空狀態：新增 AI 對話、可刪除的 X、最後一間刪掉後不自動補。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = { HaisenAPI: { BASE: "http://api.test" } };

const { state, update } = await import("../assets/js/demo/store.js");
const { renderInbox } = await import("../assets/js/demo/views/inbox.js");
const { renderAssistant } = await import("../assets/js/demo/views/assistant.js");

function room(overrides) {
  return Object.assign({
    id: "conv_1",
    type: "assistant",
    peer: { id: "ai", display_name: "小幫手", username: "" },
    order: null,
    last_message: { text: "你好" },
    unread_count: 0,
    created_at: "2026-10-27T00:00:00.000Z",
    last_message_at: "2026-10-27T00:00:00.000Z",
    deletable: true
  }, overrides || {});
}

test.beforeEach(function () {
  update({ room: null, messages: [] });
});

test("收件匣可新增 AI 對話，助手房有刪除 X", function () {
  update({ conversations: [room()], room: room() });
  const html = renderInbox();
  assert.match(html, /新增 AI 對話/);
  assert.match(html, /data-action="new-assistant"/);
  assert.match(html, /data-action="delete-room"/);
});

test("交易房只有可刪時才顯示 X", function () {
  const deal = function (deletable) {
    return room({
      id: "conv_deal",
      type: "deal",
      peer: { id: 1, display_name: "陳阿海", username: "0912345678" },
      order: { status: "CANCELLED", item_count: 1, total_quantity: 1, final_price: 100 },
      deletable: deletable
    });
  };
  update({ conversations: [deal(true)], room: null });
  assert.match(renderInbox(), /data-action="delete-room"/);

  update({ conversations: [deal(false)], room: null });
  assert.doesNotMatch(renderInbox(), /data-action="delete-room"/);
});

test("沒有任何對話時顯示新增 AI 對話的空狀態", function () {
  update({ conversations: [], room: null });
  const html = renderInbox();
  assert.match(html, /目前沒有 AI 對話/);
  assert.match(html, /新增 AI 對話/);
});

test("刪到最後一間助手房後，對話區顯示空狀態且不自動建立", function () {
  update({ conversations: [], room: null, user: { id: 2 } });
  const html = renderAssistant();
  assert.match(html, /目前沒有 AI 對話/);
  assert.match(html, /data-action="new-assistant"/);
  assert.doesNotMatch(html, /我要賣魚/);
});

test("有助手房但沒有訊息時仍顯示上架提示", function () {
  update({ conversations: [room()], room: room(), user: { id: 2 } });
  const html = renderAssistant();
  assert.match(html, /我要賣魚/);
});
