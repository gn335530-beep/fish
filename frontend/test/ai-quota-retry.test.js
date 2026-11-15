/* 配額與重試：先跑規則、必要時顯示提示，重試沿用同一則使用者訊息。 */

import test from "node:test";
import assert from "node:assert/strict";
import { IDLE, setupAiTest } from "./ai-fixtures.js";

let replies = [];
let notifyError = null;

const ai = await setupAiTest({
  handle: async function (path) {
    if (path === "/api/ai/reply") return { data: replies.shift() };
    if (path.indexOf("/messages") !== -1) return { data: [] };
    if (path.indexOf("/read") !== -1) return { data: {} };
    throw new Error("unexpected path: " + path);
  },
  notify: function (error) { notifyError = error; }
});

const store = ai.store;
const flow = ai.flow;
const requests = ai.requests;
const aiPaths = ai.aiPaths;
const assistantTexts = ai.assistantTexts;
const rooms = await import("../assets/js/demo/rooms.js");
const assistantView = await import("../assets/js/demo/views/assistant.js");

function userPaths() {
  return requests.filter(function (entry) {
    return entry.path === "/api/chat/message" && !(entry.body && entry.body.sender_type);
  });
}

function html() {
  return assistantView.renderAssistant();
}

test.beforeEach(function () {
  ai.reset();
  replies = [];
  notifyError = null;
});

test("平台意圖能由規則完成時，可重試錯誤不顯示提示", async function () {
  replies = [{ handled: false, error_code: "LLM_RATE_LIMITED", retryable: true }];

  await flow.submitText("我要賣魚");

  assert.equal(store.state.aiRetry, null);
  assert.match(assistantTexts().join("\n"), /想要販售什麼魚類/);
  assert.doesNotMatch(html(), /data-action="ai-retry"/);
  assert.doesNotMatch(html(), /稍後再試/);
  assert.equal(notifyError, null);
});

test("規則無法處理時顯示提示與重試按鈕，不寫入一般引導句", async function () {
  replies = [{ handled: false, error_code: "SEARCH_RATE_LIMITED", retryable: true }];

  await flow.submitText("今天天氣如何");

  assert.equal(notifyError, null);
  assert.equal(store.state.aiRetry.messageId, "msg_1");
  assert.equal(store.state.aiRetry.roomId, "conv_1");
  assert.doesNotMatch(assistantTexts().join("\n"), /你是想賣魚/);
  assert.match(html(), /目前無法上網查詢/);
  assert.match(html(), /data-action="ai-retry"/);
  assert.match(html(), /重試/);
});

test("重試沿用同一個 message_id，不重複寫入使用者訊息", async function () {
  replies = [
    { handled: false, error_code: "LLM_RATE_LIMITED", retryable: true },
    { handled: true, intent: "CHAT", reply_text: "今天多雲短暫雨。", sources: [], slots: {}, tool_results: {} }
  ];

  await flow.submitText("今天天氣如何");
  await flow.retryReply();

  assert.equal(userPaths().length, 1);
  assert.equal(aiPaths().length, 2);
  assert.equal(aiPaths()[0].body.message_id, "msg_1");
  assert.equal(aiPaths()[1].body.message_id, "msg_1");
  assert.equal(store.state.aiRetry, null);
  assert.deepEqual(assistantTexts(), ["今天多雲短暫雨。"]);
  assert.doesNotMatch(html(), /data-action="ai-retry"/);
});

test("重試仍被配額限制時保留提示", async function () {
  replies = [
    { handled: false, error_code: "SEARCH_QUOTA_EXHAUSTED", retryable: true },
    { handled: false, error_code: "SEARCH_QUOTA_EXHAUSTED", retryable: true }
  ];

  await flow.submitText("今天天氣如何");
  await flow.retryReply();

  assert.equal(userPaths().length, 1);
  assert.equal(aiPaths().length, 2);
  assert.equal(store.state.aiRetry.messageId, "msg_1");
  assert.match(html(), /目前無法上網查詢/);
  assert.match(html(), /data-action="ai-retry"/);
});

test("非可重試錯誤維持靜默 fallback，不顯示技術錯誤", async function () {
  replies = [{ handled: false, error_code: "LLM_TIMEOUT", retryable: false }];

  await flow.submitText("今天天氣如何");

  assert.equal(store.state.aiRetry, null);
  assert.equal(notifyError, null);
  assert.match(assistantTexts().join("\n"), /你是想賣魚/);
  assert.doesNotMatch(html(), /LLM_TIMEOUT|data-action="ai-retry"/);
});

test("重試後變成非可重試錯誤時安靜回到規則", async function () {
  replies = [
    { handled: false, error_code: "LLM_RATE_LIMITED", retryable: true },
    { handled: false, error_code: "LLM_TIMEOUT", retryable: false }
  ];

  await flow.submitText("今天天氣如何");
  await flow.retryReply();

  assert.equal(store.state.aiRetry, null);
  assert.match(assistantTexts().join("\n"), /你是想賣魚/);
  assert.doesNotMatch(html(), /data-action="ai-retry"/);
});

test("切換房間後配額提示消失", async function () {
  replies = [{ handled: false, error_code: "SEARCH_RATE_LIMITED", retryable: true }];
  await flow.submitText("今天天氣如何");
  assert.ok(store.state.aiRetry);

  await rooms.openRoom({ id: "conv_2", type: "assistant", context: IDLE });

  assert.equal(store.state.aiRetry, null);
});
