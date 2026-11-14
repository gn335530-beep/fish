/* LLM SELL slots 與複合意圖：只處理平台意圖、不重問已提供的欄位。 */

import test from "node:test";
import assert from "node:assert/strict";

let seq = 0;
let requests = [];
let aiReply = null;

function messageOf(body) {
  seq += 1;
  return {
    id: "msg_" + seq,
    seq: seq,
    conversation_id: body.conversation_id,
    sender_id: body.sender_type === "ai" ? "ai" : 2,
    type: body.card ? "card" : "text",
    text: body.text || "",
    card: body.card || null,
    created_at: "2026-11-14T00:00:00.000Z"
  };
}

globalThis.window = {
  HaisenAPI: {
    getToken: function () { return "token"; },
    BASE: "http://api.test",
    request: async function (path, options) {
      requests.push({ path: path, body: options && options.body });
      if (path === "/api/chat/message") return { data: messageOf((options && options.body) || {}) };
      if (path === "/api/ai/reply") return { data: aiReply };
      throw new Error("unexpected path: " + path);
    }
  }
};

const store = await import("../assets/js/demo/store.js");
const flow = await import("../assets/js/demo/flow.js");

const USER = { id: 2, seller_terms_accepted_at: "2026-10-27T00:00:00.000Z" };
const IDLE = { mode: "idle", draft: null, last_cards: [] };

flow.initFlow({
  render: function () {},
  scrollEnd: function () {},
  scrollToBatch: function () {},
  notify: function (error) { throw error; }
});

function assistantText() {
  return store.state.messages.filter(function (message) {
    return message.sender_id === "ai";
  }).map(function (message) { return message.text; }).join("\n");
}

test.beforeEach(function () {
  seq = 0;
  requests = [];
  aiReply = { handled: false };
  store.update({
    user: USER,
    room: { id: "conv_1", type: "assistant", context: IDLE },
    messages: [],
    lastSeq: 0,
    aiPending: 0
  });
});

test("SELL slots 合併進草稿，只追問仍缺的非價格欄位", async function () {
  aiReply = {
    handled: true,
    intent: "SELL",
    slots: { fish_species: "花枝", quantity: 2, condition: "放血冰鎮" },
    reply_text: null,
    sources: [],
    tool_results: {}
  };

  await flow.submitText("我要賣這種 2 尾 放血冰鎮");

  const context = store.state.room.context;
  assert.equal(context.draft.fish_species, "花枝");
  assert.equal(context.draft.quantity, 2);
  assert.equal(context.draft.condition, "放血冰鎮");
  assert.match(assistantText(), /商品照片/);
  assert.doesNotMatch(assistantText(), /什麼魚類|總共幾尾|處理方式/);
});

test("一句話同時有賣魚與其他問題時只處理賣魚", async function () {
  aiReply = {
    handled: true,
    intent: "SELL",
    slots: { fish_species: "花枝", quantity: 2, condition: "放血冰鎮" },
    reply_text: null,
    sources: [],
    tool_results: {}
  };

  await flow.submitText("我要賣花枝 2 尾 放血冰鎮，今天天氣如何");

  assert.equal(store.state.room.context.mode, "listing");
  assert.doesNotMatch(assistantText(), /天氣|多雲|下雨/);
  assert.match(assistantText(), /商品照片/);
});

test("LLM_GUARD_REJECTED 時前端 fallback，不寫入訊息", async function () {
  aiReply = {
    handled: false,
    error_code: "LLM_GUARD_REJECTED",
    retryable: false,
    reply_text: "花枝每台斤 999 元"
  };

  await flow.submitText("吳郭魚口感如何");

  assert.doesNotMatch(assistantText(), /999|花枝每台斤/);
  assert.match(assistantText(), /你是想賣魚，還是想找魚/);
});
