/* 輪詢：資料沒變就不通知重畫，避免中斷正在輸入的畫面。 */

import test from "node:test";
import assert from "node:assert/strict";

let payload = [{ id: "conv_1", type: "assistant", unread_count: 0 }];

globalThis.window = {
  HaisenAPI: {
    getToken: function () { return "token"; },
    request: async function () { return { data: payload }; }
  }
};

const store = await import("../assets/js/demo/store.js");
const poll = await import("../assets/js/demo/poll.js");

test("相同資料只通知一次重畫，變了才再通知", async function () {
  store.state.conversations = [];
  let notified = 0;
  store.subscribe(function () { notified += 1; });

  await poll.refreshRooms();
  assert.equal(notified, 1);

  await poll.refreshRooms();
  assert.equal(notified, 1);

  payload = [{ id: "conv_1", type: "assistant", unread_count: 2 }];
  await poll.refreshRooms();
  assert.equal(notified, 2);
});

test("目前房間被刪除後，輪詢會離開房間並顯示提示", async function () {
  payload = [{ id: "conv_2", type: "assistant", unread_count: 0 }];
  store.update({
    user: { id: 2 },
    conversations: [],
    room: { id: "conv_gone", type: "deal" },
    messages: [{ id: "msg_1" }],
    lastSeq: 1,
    deal: { id: "deal_1" },
    view: "deal",
    notice: ""
  });

  await poll.pollNow();

  assert.equal(store.state.room, null);
  assert.deepEqual(store.state.messages, []);
  assert.equal(store.state.lastSeq, 0);
  assert.equal(store.state.deal, null);
  assert.equal(store.state.view, "inbox");
  assert.match(store.state.notice, /已被刪除/);
});
