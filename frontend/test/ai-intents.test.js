/* LLM 平台意圖：slots 併入既有流程、平台意圖不寫 LLM 文字、防護失敗 fallback。 */

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
    if (path.indexOf("/api/market/codes") === 0) return { data: { candidates: [] } };
    if (path.indexOf("/api/market/quote") === 0) return { data: { found: false } };
    if (path.indexOf("/api/products") === 0) {
      return {
        data: [
          { id: "prd_a", fish_species: "石斑", region: "新北市", quantity: 2, price: 1000, condition: "活體" },
          { id: "prd_b", fish_species: "黑鯛", region: "新北市", quantity: 2, price: 900, condition: "活體" }
        ]
      };
    }
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

function aiTexts() {
  return store.state.messages.filter(function (message) {
    return message.sender_id === "ai";
  }).map(function (message) { return message.text; });
}

function latestAssistantText() {
  return aiTexts().join("\n");
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

test("明確行情由既有規則完成，不寫入重複 AI 文字", async function () {
  aiReply = {
    handled: true,
    intent: "MARKET",
    slots: { fish_species: "花枝", region: "高雄市" },
    reply_text: "AI 的行情回答",
    sources: [],
    tool_results: {}
  };

  await flow.submitText("今天行情如何");

  const quote = requests.find(function (entry) { return entry.path.indexOf("/api/market/quote") === 0; });
  assert.match(quote.path, /q=%E8%8A%B1%E6%9E%9D/);
  assert.match(quote.path, /region=%E9%AB%98%E9%9B%84%E5%B8%82/);
  assert.match(latestAssistantText(), /暫無行情/);
  assert.doesNotMatch(latestAssistantText(), /AI 的行情回答/);
});

test("找魚由既有規則完成，不寫入重複 AI 文字", async function () {
  aiReply = {
    handled: true,
    intent: "BUY",
    slots: { fish_species: "石斑", region: "新北市" },
    reply_text: "AI 的找魚回答",
    sources: [],
    tool_results: {}
  };

  await flow.submitText("今天有什麼魚");

  assert.doesNotMatch(latestAssistantText(), /AI 的找魚回答/);
  const cards = store.state.messages.filter(function (message) {
    return message.card && message.card.type === "product";
  });
  assert.equal(cards.length, 1);
  assert.equal(cards[0].card.product_id, "prd_a");
});

test("規則判為 BUY 但後端回 CHAT 時仍採用模型文字", async function () {
  aiReply = {
    handled: true,
    intent: "CHAT",
    slots: {},
    reply_text: "今天多雲短暫雨。",
    sources: [],
    tool_results: {}
  };

  await flow.submitText("有沒有下雨");

  assert.match(latestAssistantText(), /今天多雲短暫雨/);
});

test("取消上架與修改草稿由既有規則完成", async function () {
  aiReply = {
    handled: true,
    intent: "CANCEL",
    slots: {},
    reply_text: "AI 的取消文字",
    sources: [],
    tool_results: {}
  };
  await flow.submitText("重來");
  assert.match(latestAssistantText(), /已經重來/);
  assert.doesNotMatch(latestAssistantText(), /AI 的取消文字/);

  const listing = {
    mode: "listing",
    draft: { fish_species: "花枝", quantity: 2, condition: "放血冰鎮", photo_url: "/uploads/a.jpg", price: 1000 },
    last_cards: [],
    choosing_edit: true
  };
  store.update({
    room: { id: "conv_1", type: "assistant", context: listing },
    messages: [],
    lastSeq: 0
  });
  aiReply = {
    handled: true,
    intent: "EDIT",
    slots: { edit_field: "quantity", edit_value: 3 },
    reply_text: "AI 的修改文字",
    sources: [],
    tool_results: {}
  };

  await flow.submitText("尾數改成 3");
  assert.equal(store.state.room.context.draft.quantity, 3);
  assert.match(latestAssistantText(), /已更新尾數/);
  assert.doesNotMatch(latestAssistantText(), /AI 的修改文字/);
});
