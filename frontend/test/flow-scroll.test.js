/* 批次回覆滾動：以第一則為錨點，不直接跳到底部。 */

import test from "node:test";
import assert from "node:assert/strict";

let seq = 0;
let scrolls = [];
let ends = 0;

globalThis.window = {
  HaisenAPI: {
    getToken: function () { return "token"; },
    BASE: "http://api.test",
    request: async function (path, options) {
      if (path === "/api/chat/message") {
        seq += 1;
        const body = options.body || {};
        return {
          data: {
            id: "msg_" + seq,
            seq: seq,
            sender_id: "ai",
            type: body.card ? "card" : "text",
            text: body.text || "",
            card: body.card || null,
            created_at: "2026-10-29T00:00:00.000Z"
          }
        };
      }
      if (path.indexOf("/clear") !== -1) return { data: {} };
      throw new Error("unexpected path: " + path);
    }
  }
};

const store = await import("../assets/js/demo/store.js");
const flow = await import("../assets/js/demo/flow.js");

flow.initFlow({
  render: function () {},
  scrollEnd: function () { ends += 1; },
  scrollToBatch: function (value) { scrolls.push(value); },
  notify: function (error) { throw error; }
});

test.beforeEach(function () {
  seq = 0;
  scrolls = [];
  ends = 0;
  store.update({
    user: { id: 2 },
    room: { id: "conv_1", type: "assistant", context: {} },
    messages: [],
    lastSeq: 0
  });
});

test("助手回多則訊息時以第一則為滾動錨點", async function () {
  await flow.runReplies({
    context: { mode: "listing" },
    replies: [
      { text: "第一則" },
      { card: { type: "draft", draft: {} } },
      { text: "第三則" }
    ]
  });
  assert.deepEqual(scrolls, [1]);
  assert.equal(ends, 0);
  assert.equal(store.state.messages.length, 3);
});

test("清除歷史後仍以保留的第一則為錨點", async function () {
  await flow.runReplies({
    context: { mode: "listing" },
    clear_history: true,
    replies: [{ text: "只留這則" }, { text: "還有這則" }]
  });
  assert.deepEqual(scrolls, [1]);
  assert.equal(store.state.messages.length, 2);
});
