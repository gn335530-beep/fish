/* 交易房視圖與「交易房訊息不觸發助手」的護欄。 */

import test from "node:test";
import assert from "node:assert/strict";

const calls = [];

globalThis.window = {
  location: { pathname: "/pages/products.html", href: "" },
  HaisenAPI: {
    getToken: function () { return "token"; },
    request: async function (path) {
      calls.push(path);
      if (path === "/api/chat/message") return { data: { id: "msg_9", seq: 9 } };
      throw new Error("unexpected request: " + path);
    }
  }
};

const { state, update } = await import("../assets/js/demo/store.js");
const flow = await import("../assets/js/demo/flow.js");
const poll = await import("../assets/js/demo/poll.js");
const deal = await import("../assets/js/demo/views/deal.js");

const ROOM = {
  id: "conv_x",
  type: "deal",
  peer: { display_name: "陳阿海", username: "0912345678" },
  order: { status: "DRAFT", item_count: 2, total_quantity: 3, final_price: 4330 }
};

test("交易房顯示完整電話、訂單摘要與訊息流", function () {
  update({
    user: { id: 2 },
    room: ROOM,
    messages: [
      { seq: 1, sender_id: "system", type: "system", text: "已進入交易洽談。", created_at: "2026-10-25T10:00:00.000Z" },
      { seq: 2, sender_id: 1, type: "text", text: "還有貨嗎", created_at: "2026-10-25T10:01:00.000Z" }
    ]
  });

  const html = deal.renderDealRoom();
  assert.match(html, /href="tel:0912345678"/);
  assert.match(html, /2 項 · 3 尾 · NT\$4,330/);
  assert.match(html, /已進入交易洽談/);
  assert.match(html, /還有貨嗎/);
});

test("交易房訊息只送出一次，不呼叫助手回覆", async function () {
  update({ user: { id: 2 }, room: ROOM, messages: [], lastSeq: 0, view: "deal" });
  flow.initFlow({
    render: function () {},
    scrollEnd: function () {},
    notify: function (error) { throw error; }
  });

  calls.length = 0;
  await flow.submitText("有，想要 2 尾");

  assert.deepEqual(calls, ["/api/chat/message"]);
  assert.equal(state.messages.length, 1);
});

test("輪詢會同步目前房間的訂單摘要", async function () {
  const stale = Object.assign({}, ROOM, {
    order: { status: "DRAFT", item_count: 1, total_quantity: 1, final_price: 1400 }
  });
  update({ room: stale, conversations: [ROOM] });

  await poll.syncOpenRoom();

  assert.equal(state.room.order.item_count, 2);
  assert.equal(state.room.order.final_price, 4330);
});
