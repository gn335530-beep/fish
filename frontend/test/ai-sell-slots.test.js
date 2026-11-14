/* LLM SELL slots 與複合意圖：只處理平台意圖、不重問已提供的欄位。 */

import test from "node:test";
import assert from "node:assert/strict";
import { USER, IDLE, createMessageFactory, installApi } from "./ai-fixtures.js";

let requests = [];
let aiReply = null;

const messageOf = createMessageFactory();

installApi({
  messageOf: messageOf,
  onRequest: function (path, body) {
    requests.push({ path: path, body: body });
  },
  handle: async function (path) {
    if (path === "/api/ai/reply") return { data: aiReply };
    throw new Error("unexpected path: " + path);
  }
});

const store = await import("../assets/js/demo/store.js");
const flow = await import("../assets/js/demo/flow.js");

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
  messageOf.reset();
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

test("平台意圖優先於商品推薦", async function () {
  aiReply = {
    handled: true,
    intent: "PRODUCT_RECOMMEND",
    slots: {},
    reply_text: "推薦這些商品。",
    sources: [],
    tool_results: { products: [{ id: "prd_1", fish_species: "石斑" }] }
  };

  await flow.submitText("我要賣花枝 2 尾 放血冰鎮");

  assert.equal(store.state.room.context.mode, "listing");
  assert.equal(store.state.room.context.draft.fish_species, "花枝");
  assert.doesNotMatch(assistantText(), /推薦這些商品/);
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
