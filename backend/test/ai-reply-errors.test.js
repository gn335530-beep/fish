/* AI 回覆端點（錯誤）：逾時、5xx、格式錯誤、429 與不寫入訊息。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop } = require("./client");
const h = require("./ai-reply-helpers");

function providerError(fields) {
  const error = new Error(fields.message || "provider failed");
  Object.assign(error, fields);
  return error;
}

async function askAndReply() {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "吳郭魚口感如何");
  const before = (await h.messages(room.id)).length;
  const result = await h.reply(room.id, message.id);
  const after = (await h.messages(room.id)).length;
  return { result: result.body.data, before: before, after: after };
}

test.before(start);
test.after(stop);
test.beforeEach(function () { h.reset(); });

test("provider 逾時回 handled:false、LLM_TIMEOUT，且不寫入訊息", async function () {
  h.useError(providerError({ code: "LLM_TIMEOUT", message: "timeout" }));
  const run = await askAndReply();
  assert.equal(run.result.handled, false);
  assert.equal(run.result.error_code, "LLM_TIMEOUT");
  assert.equal(run.result.retryable, false);
  assert.equal(run.after, run.before);
});

test("provider 5xx 回 LLM_UPSTREAM_ERROR，可重試為 false", async function () {
  h.useError(providerError({ status: 503, message: "down" }));
  const run = await askAndReply();
  assert.equal(run.result.error_code, "LLM_UPSTREAM_ERROR");
  assert.equal(run.result.retryable, false);
  assert.equal(run.after, run.before);
});

test("非 JSON 或不合 schema 的輸出回 LLM_INVALID_OUTPUT", async function () {
  h.useJson("我不知道，請再說一次");
  const first = await askAndReply();
  assert.equal(first.result.error_code, "LLM_INVALID_OUTPUT");
  assert.equal(first.after, first.before);

  h.useJson({ intent: "NOT_A_REAL_INTENT", reply_text: "你好" });
  const second = await askAndReply();
  assert.equal(second.result.error_code, "LLM_INVALID_OUTPUT");
  assert.equal(second.after, second.before);
});

test("429 回 LLM_RATE_LIMITED 且 retryable:true", async function () {
  h.useError(providerError({ status: 429, message: "quota" }));
  const run = await askAndReply();
  assert.equal(run.result.error_code, "LLM_RATE_LIMITED");
  assert.equal(run.result.retryable, true);
  assert.equal(run.after, run.before);
});
