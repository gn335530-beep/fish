/* 重試流程：前置條件與重試期間的新訊息都不會改變原本的嘗試。 */

import test from "node:test";
import assert from "node:assert/strict";
import { IDLE, setupAiTest } from "./ai-fixtures.js";

let replies = {};
let replyGate = null;
let retryStarted = null;

const ai = await setupAiTest({
  handle: async function (path, requestOptions) {
    if (path !== "/api/ai/reply") throw new Error("unexpected path: " + path);
    const id = requestOptions.body.message_id;
    const data = (replies[id] || []).shift();
    if (replyGate && data && data.reply_text === "重試回覆") {
      const gate = replyGate;
      replyGate = null;
      retryStarted();
      await gate;
    }
    return { data: data };
  }
});

const store = ai.store;
const flow = ai.flow;
const aiPaths = ai.aiPaths;
const assistantTexts = ai.assistantTexts;

test.beforeEach(function () {
  ai.reset();
  replies = {};
  replyGate = null;
  retryStarted = null;
});

test("有其他等待中的 AI 回覆或房間不同時不重試", async function () {
  replies = { msg_1: [{ handled: false, error_code: "LLM_RATE_LIMITED", retryable: true }] };
  await flow.submitText("今天天氣如何");
  const before = aiPaths().length;

  store.update({ aiPending: 1 });
  await flow.retryReply();
  assert.equal(aiPaths().length, before);

  store.update({ aiPending: 0, room: ai.room(IDLE, { id: "conv_2" }) });
  await flow.retryReply();
  assert.equal(aiPaths().length, before);
});

test("重試期間送出的新訊息不影響重試結果", async function () {
  replies = {
    msg_1: [
      { handled: false, error_code: "LLM_RATE_LIMITED", retryable: true },
      { handled: true, intent: "CHAT", reply_text: "重試回覆", sources: [], slots: {}, tool_results: {} }
    ],
    msg_2: [
      { handled: true, intent: "CHAT", reply_text: "新訊息回覆", sources: [], slots: {}, tool_results: {} }
    ]
  };
  await flow.submitText("第一句");

  let release;
  replyGate = new Promise(function (resolve) { release = resolve; });
  let started;
  retryStarted = function () { started(); };
  const startedPromise = new Promise(function (resolve) { started = resolve; });

  const retrying = flow.retryReply();
  await startedPromise;
  await flow.submitText("第二句");
  release();
  await retrying;

  const texts = assistantTexts();
  assert.equal(texts.length, 2);
  assert.ok(texts.indexOf("重試回覆") !== -1);
  assert.ok(texts.indexOf("新訊息回覆") !== -1);
  assert.deepEqual(aiPaths().map(function (entry) { return entry.body.message_id; }),
    ["msg_1", "msg_1", "msg_2"]);
  assert.equal(store.state.aiRetry, null);
});
