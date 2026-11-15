/* 助手房 AI 回覆：送出後呼叫端點、CHAT 寫入、fallback、等待指示與房間隔離。 */

import test from "node:test";
import assert from "node:assert/strict";
import { IDLE, setupAiTest } from "./ai-fixtures.js";

let aiReply = null;
let aiDelay = 0;
let notifyError = null;

const ai = await setupAiTest({
  handle: async function (path) {
    if (path === "/api/ai/reply") {
      if (aiDelay) await new Promise(function (resolve) { setTimeout(resolve, aiDelay); });
      if (aiReply instanceof Error) throw aiReply;
      return { data: aiReply };
    }
    throw new Error("unexpected path: " + path);
  },
  notify: function (error) { notifyError = error; }
});

const store = ai.store;
const flow = ai.flow;
const requests = ai.requests;
const aiPaths = ai.aiPaths;
const assistantTexts = ai.assistantTexts;
const assistantView = await import("../assets/js/demo/views/assistant.js");

const CONTEXT = IDLE;

test.beforeEach(function () {
  ai.reset();
  aiReply = { handled: false };
  aiDelay = 0;
  notifyError = null;
});

test("送出使用者訊息後才以 message_id 與房間 context 呼叫 AI 端點", async function () {
  aiReply = {
    handled: true,
    intent: "CHAT",
    reply_text: "吳郭魚肉質細緻，適合乾煎。",
    sources: [],
    slots: {},
    tool_results: {}
  };

  await flow.submitText("吳郭魚口感如何");

  const paths = requests.map(function (entry) { return entry.path; });
  assert.deepEqual(paths.slice(0, 2), ["/api/chat/message", "/api/ai/reply"]);
  const ai = aiPaths()[0];
  assert.equal(ai.body.conversation_id, "conv_1");
  assert.equal(ai.body.message_id, "msg_1");
  assert.deepEqual(ai.body.context, CONTEXT);
  assert.deepEqual(assistantTexts(), ["吳郭魚肉質細緻，適合乾煎。"]);
});

test("handled:false 時走既有規則，不顯示技術錯誤", async function () {
  aiReply = { handled: false, error_code: "LLM_TIMEOUT", retryable: false };

  await flow.submitText("吳郭魚口感如何");

  assert.equal(notifyError, null);
  assert.equal(assistantTexts().length, 1);
  assert.match(assistantTexts()[0], /你是想賣魚，還是想找魚/);
});

test("等待期間顯示「小幫手正在輸入…」，回覆後消失", async function () {
  let resolveReply;
  aiReply = null;
  const pending = new Promise(function (resolve) {
    resolveReply = function () {
      aiReply = { handled: true, intent: "CHAT", reply_text: "好的。", sources: [], slots: {}, tool_results: {} };
      resolve();
    };
  });
  globalThis.window.HaisenAPI.request = (function (original) {
    return async function (path, options) {
      if (path === "/api/ai/reply") await pending;
      return original(path, options);
    };
  })(globalThis.window.HaisenAPI.request);

  const running = flow.submitText("吳郭魚口感如何");
  await new Promise(function (resolve) { setTimeout(resolve, 5); });
  assert.equal(store.state.aiPending, 1);
  assert.match(assistantView.renderAssistant(), /小幫手正在輸入/);

  resolveReply();
  await running;
  assert.equal(store.state.aiPending, 0);
  assert.doesNotMatch(assistantView.renderAssistant(), /小幫手正在輸入/);
});

test("交易房完全不呼叫 AI 端點", async function () {
  store.update({ room: { id: "conv_deal", type: "deal", context: null } });
  await flow.submitText("你好");
  assert.equal(aiPaths().length, 0);
});

test("上架流程進行中仍呼叫 AI，但 CHAT 文字被忽略並繼續追問", async function () {
  aiReply = {
    handled: true,
    intent: "CHAT",
    reply_text: "今天多雲短暫雨。",
    sources: [],
    slots: {},
    tool_results: {}
  };
  const listingContext = {
    mode: "listing",
    draft: { fish_species: "花枝", quantity: null, condition: "放血冰鎮", photo_url: "/uploads/a.jpg", price: null },
    last_cards: []
  };
  store.update({ room: { id: "conv_1", type: "assistant", context: listingContext } });

  await flow.submitText("今天天氣如何");

  assert.equal(aiPaths().length, 1);
  assert.equal(assistantTexts().indexOf("今天多雲短暫雨。"), -1);
  assert.match(assistantTexts().join("\n"), /尾數/);
});

test("等待中送出的第二則訊息不會遺失", async function () {
  aiDelay = 20;
  aiReply = { handled: true, intent: "CHAT", reply_text: "收到。", sources: [], slots: {}, tool_results: {} };

  await Promise.all([flow.submitText("第一句"), flow.submitText("第二句")]);

  const userTexts = store.state.messages.filter(function (message) {
    return message.sender_id === 2;
  }).map(function (message) { return message.text; });
  assert.deepEqual(userTexts, ["第一句", "第二句"]);
  assert.equal(assistantTexts().filter(function (text) { return text === "收到。"; }).length, 2);
});

test("每間助手房只用自己的 context 呼叫 AI", async function () {
  aiReply = { handled: true, intent: "CHAT", reply_text: "好的。", sources: [], slots: {}, tool_results: {} };
  const first = { mode: "listing", draft: { fish_species: "花枝", quantity: 2 } };
  const second = { mode: "shopping", draft: null, last_cards: ["prd_b"] };

  store.update({ room: { id: "conv_a", type: "assistant", context: first }, messages: [] });
  await flow.submitText("第一間");
  store.update({ room: { id: "conv_b", type: "assistant", context: second }, messages: [] });
  await flow.submitText("第二間");

  const calls = aiPaths();
  assert.deepEqual(calls[0].body.context, first);
  assert.deepEqual(calls[1].body.context, second);
});
