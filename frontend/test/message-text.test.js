/* 訊息文字：AI 氣泡保留換行，卡片不套用文字換行樣式。 */

import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};

const { update } = await import("../assets/js/demo/store.js");
const messages = await import("../assets/js/demo/views/messages.js");

test("AI 文字保留換行並使用文字樣式類別", function () {
  update({
    user: { id: 1 },
    room: { id: "room_1", peer: { display_name: "小幫手" } },
    messages: [{
      id: "msg_1",
      seq: 1,
      type: "text",
      sender_id: "ai",
      text: "第一行\n第二行",
      created_at: "2026-11-20T02:00:00.000Z"
    }]
  });

  const html = messages.renderMessages();
  assert.match(html, /class="fm-msg__text"/);
  assert.match(html, /第一行\n第二行/);
});

test("卡片內容不使用文字換行類別", function () {
  update({
    user: { id: 1 },
    room: { id: "room_1", peer: { display_name: "小幫手" } },
    messages: [{
      id: "msg_2",
      seq: 2,
      type: "card",
      sender_id: "ai",
      card: { type: "sources", sources: [{ title: "中央氣象署", url: "https://example.com" }] },
      created_at: "2026-11-20T02:01:00.000Z"
    }]
  });

  const html = messages.renderMessages();
  assert.doesNotMatch(html, /class="fm-msg__text"/);
  assert.match(html, /fm-sources/);
});
